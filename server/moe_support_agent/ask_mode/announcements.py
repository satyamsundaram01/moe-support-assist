from __future__ import annotations

import enum
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, validator
from moe_support_agent.ask_mode.db import get_db


announcement_router = router = APIRouter(tags=["announcements"])

# ----------------------------
# Enums and Pydantic Models
# ----------------------------

class AnnouncementType(str, enum.Enum):
    banner = "banner"
    toast = "toast"


class AnnouncementSeverity(str, enum.Enum):
    info = "info"
    success = "success"
    warning = "warning"
    error = "error"


class AnnouncementFrequency(str, enum.Enum):
    always = "always"
    once = "once"
    per_session = "per_session"  # treated as 30m cool-down server-side
    per_day = "per_day"


class AnnouncementIn(BaseModel):
    enabled: bool = True
    type: AnnouncementType = AnnouncementType.banner
    severity: AnnouncementSeverity = AnnouncementSeverity.info
    title: Optional[str] = None
    message: str = Field(..., min_length=1)
    dismissible: bool = True
    maxImpressionsPerUser: Optional[int] = Field(None, ge=0)  # None => unlimited
    frequency: AnnouncementFrequency = AnnouncementFrequency.once
    startsAt: Optional[int] = Field(None, description="Epoch ms")
    endsAt: Optional[int] = Field(None, description="Epoch ms")

    @validator("startsAt", "endsAt")
    def _validate_ms(cls, v):
        if v is None:
            return v
        if v < 0:
            raise ValueError("Timestamp must be epoch milliseconds >= 0")
        return v


class AnnouncementOut(AnnouncementIn):
    id: str
    createdAt: Optional[int] = Field(None, description="Epoch ms")
    updatedAt: Optional[int] = Field(None, description="Epoch ms")


class ImpressionIn(BaseModel):
    user_id: str = Field(..., min_length=3)
    seen_at: Optional[int] = Field(None, description="Epoch ms - optional override")


class DismissIn(BaseModel):
    user_id: str = Field(..., min_length=3)


# ----------------------------
# DB Schema Helpers
# ----------------------------

SCHEMA_INIT_DONE = False

CREATE_ANNOUNCEMENTS_SQL = """
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('banner','toast')),
  severity TEXT NOT NULL CHECK (severity IN ('info','success','warning','error')),
  title TEXT,
  message TEXT NOT NULL,
  dismissible BOOLEAN NOT NULL,
  max_impressions_per_user INT,
  frequency TEXT NOT NULL CHECK (frequency IN ('always','once','per_session','per_day')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

CREATE_IMPRESSIONS_SQL = """
CREATE TABLE IF NOT EXISTS announcement_impressions (
  id BIGSERIAL PRIMARY KEY,
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_impr_ann_user ON announcement_impressions(announcement_id, user_id);
"""

CREATE_DISMISSALS_SQL = """
CREATE TABLE IF NOT EXISTS announcement_dismissals (
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (announcement_id, user_id)
);
"""

SELECT_ANN_SQL = """
SELECT id, enabled, type, severity, title, message, dismissible, max_impressions_per_user,
       frequency, starts_at, ends_at, extract(epoch from created_at)*1000 AS created_ms,
       extract(epoch from updated_at)*1000 AS updated_ms
FROM announcements
"""

def _ms_to_dt(ms: Optional[int]) -> Optional[datetime]:
    if ms is None:
        return None
    return datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc)

def _dt_to_ms(dt: Optional[datetime]) -> Optional[int]:
    if dt is None:
        return None
    return int(dt.timestamp() * 1000)

async def ensure_schema(db: asyncpg.Connection):
    global SCHEMA_INIT_DONE
    if SCHEMA_INIT_DONE:
        return
    # Best-effort idempotent creation
    await db.execute(CREATE_ANNOUNCEMENTS_SQL)
    await db.execute(CREATE_IMPRESSIONS_SQL)
    await db.execute(CREATE_DISMISSALS_SQL)
    SCHEMA_INIT_DONE = True

def _row_to_out(row: asyncpg.Record) -> AnnouncementOut:
    return AnnouncementOut(
        id=row["id"],
        enabled=row["enabled"],
        type=row["type"],
        severity=row["severity"],
        title=row["title"],
        message=row["message"],
        dismissible=row["dismissible"],
        maxImpressionsPerUser=row["max_impressions_per_user"],
        frequency=row["frequency"],
        startsAt=_dt_to_ms(row["starts_at"]),
        endsAt=_dt_to_ms(row["ends_at"]),
        createdAt=int(row["created_ms"]) if row["created_ms"] is not None else None,
        updatedAt=int(row["updated_ms"]) if row["updated_ms"] is not None else None,
    )

# ----------------------------
# Admin Endpoints (/admin/announcements)
# ----------------------------

@router.get("/admin/announcements", response_model=List[AnnouncementOut])
async def list_announcements(db: asyncpg.Connection = Depends(get_db)):
    await ensure_schema(db)
    rows = await db.fetch(SELECT_ANN_SQL + " ORDER BY enabled DESC, updated_at DESC")
    return [_row_to_out(r) for r in rows]


@router.get("/admin/announcements/{announcement_id}", response_model=AnnouncementOut)
async def get_announcement(announcement_id: str, db: asyncpg.Connection = Depends(get_db)):
    await ensure_schema(db)
    row = await db.fetchrow(SELECT_ANN_SQL + " WHERE id=$1", announcement_id)
    if not row:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return _row_to_out(row)


@router.put("/admin/announcements/{announcement_id}", response_model=AnnouncementOut, status_code=status.HTTP_200_OK)
async def upsert_announcement(
    announcement_id: str,
    payload: AnnouncementIn,
    db: asyncpg.Connection = Depends(get_db)
):
    await ensure_schema(db)

    starts_dt = _ms_to_dt(payload.startsAt)
    ends_dt = _ms_to_dt(payload.endsAt)

    sql = """
    INSERT INTO announcements (id, enabled, type, severity, title, message, dismissible,
                               max_impressions_per_user, frequency, starts_at, ends_at, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      enabled=EXCLUDED.enabled,
      type=EXCLUDED.type,
      severity=EXCLUDED.severity,
      title=EXCLUDED.title,
      message=EXCLUDED.message,
      dismissible=EXCLUDED.dismissible,
      max_impressions_per_user=EXCLUDED.max_impressions_per_user,
      frequency=EXCLUDED.frequency,
      starts_at=EXCLUDED.starts_at,
      ends_at=EXCLUDED.ends_at,
      updated_at=NOW()
    """
    await db.execute(
        sql,
        announcement_id,
        payload.enabled,
        payload.type.value,
        payload.severity.value,
        payload.title,
        payload.message,
        payload.dismissible,
        payload.maxImpressionsPerUser,
        payload.frequency.value,
        starts_dt,
        ends_dt,
    )
    row = await db.fetchrow(SELECT_ANN_SQL + " WHERE id=$1", announcement_id)
    return _row_to_out(row)


@router.delete("/admin/announcements/{announcement_id}", status_code=status.HTTP_200_OK)
async def delete_announcement(announcement_id: str, db: asyncpg.Connection = Depends(get_db)):
    await ensure_schema(db)
    exists = await db.fetchval("SELECT 1 FROM announcements WHERE id=$1", announcement_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Announcement not found")
    await db.execute("DELETE FROM announcements WHERE id=$1", announcement_id)
    return {"success": True}


@router.post("/admin/announcements/{announcement_id}/impressions", status_code=status.HTTP_200_OK)
async def record_impression(
    announcement_id: str,
    body: ImpressionIn,
    db: asyncpg.Connection = Depends(get_db)
):
    await ensure_schema(db)
    ann = await db.fetchval("SELECT 1 FROM announcements WHERE id=$1", announcement_id)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    seen_at_dt = _ms_to_dt(body.seen_at) or datetime.now(tz=timezone.utc)
    await db.execute(
        "INSERT INTO announcement_impressions (announcement_id, user_id, seen_at) VALUES ($1,$2,$3)",
        announcement_id,
        body.user_id,
        seen_at_dt,
    )
    user_count = await db.fetchval(
        "SELECT COUNT(*) FROM announcement_impressions WHERE announcement_id=$1 AND user_id=$2",
        announcement_id,
        body.user_id,
    )
    total_count = await db.fetchval(
        "SELECT COUNT(*) FROM announcement_impressions WHERE announcement_id=$1",
        announcement_id,
    )
    return {"success": True, "userImpressions": int(user_count), "totalImpressions": int(total_count)}


@router.post("/admin/announcements/{announcement_id}/dismiss", status_code=status.HTTP_200_OK)
async def dismiss_announcement(
    announcement_id: str,
    body: DismissIn,
    db: asyncpg.Connection = Depends(get_db)
):
    await ensure_schema(db)
    ann = await db.fetchval("SELECT 1 FROM announcements WHERE id=$1", announcement_id)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    # Upsert dismissal (primary key (announcement_id, user_id))
    await db.execute(
        """
        INSERT INTO announcement_dismissals (announcement_id, user_id, dismissed_at)
        VALUES ($1,$2,NOW())
        ON CONFLICT (announcement_id, user_id) DO UPDATE SET dismissed_at=EXCLUDED.dismissed_at
        """,
        announcement_id,
        body.user_id,
    )
    return {"success": True}

# ----------------------------
# Public Endpoint (optional)
# ----------------------------

@router.get("/announcements/active", response_model=Optional[AnnouncementOut])
async def get_active_for_user(
    user_id: str = Query(..., min_length=3),
    type: AnnouncementType = Query(AnnouncementType.banner),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Returns the next eligible announcement for this user and type.
    Server applies schedule, dismiss, max impressions, and frequency logic.
    If none eligible, returns null.
    """
    await ensure_schema(db)
    # candidates
    rows = await db.fetch(
        SELECT_ANN_SQL + """
        WHERE enabled = TRUE
          AND type = $1
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at IS NULL OR ends_at >= NOW())
        ORDER BY updated_at DESC
        """,
        type.value,
    )

    for r in rows:
        ann = _row_to_out(r)
        # Dismissed?
        dismissed = await db.fetchval(
            "SELECT 1 FROM announcement_dismissals WHERE announcement_id=$1 AND user_id=$2",
            ann.id,
            user_id,
        )
        if dismissed and ann.dismissible:
            continue

        # Impressions for this user
        impr_count = await db.fetchval(
            "SELECT COUNT(*) FROM announcement_impressions WHERE announcement_id=$1 AND user_id=$2",
            ann.id,
            user_id,
        )
        impr_count = int(impr_count or 0)

        # Last seen
        last_seen = await db.fetchval(
            "SELECT MAX(seen_at) FROM announcement_impressions WHERE announcement_id=$1 AND user_id=$2",
            ann.id,
            user_id,
        )

        # Max per user
        if ann.maxImpressionsPerUser is not None and impr_count >= ann.maxImpressionsPerUser:
            continue

        # Frequency window
        if ann.frequency == AnnouncementFrequency.once:
            if impr_count >= 1:
                continue
        elif ann.frequency == AnnouncementFrequency.per_session:
            # Treat "session" as a 30-minute cool-down
            if last_seen and (datetime.now(tz=timezone.utc) - last_seen) < timedelta(minutes=30):
                continue
        elif ann.frequency == AnnouncementFrequency.per_day:
            if last_seen and (datetime.now(tz=timezone.utc) - last_seen) < timedelta(days=1):
                continue
        # 'always' => no additional gating

        return ann

    return None