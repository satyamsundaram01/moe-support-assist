from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
import asyncpg
import json
from datetime import datetime
import logging

from moe_support_agent.ask_mode.db import get_db

analytics_router = APIRouter(prefix="/api/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)

@analytics_router.post("/events")
async def store_analytics_events(
    batch: Dict[str, Any],  # expects {"events": [...], "batch_timestamp": ...}
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Store analytics events in the database.
    Accepts any event with flexible attributes.
    """
    try:
        events = batch.get("events", [])
        if not events:
            raise HTTPException(status_code=400, detail="No events provided")
        for event in events:
            if not event.get("event_name") or not event.get("session_id"):
                raise HTTPException(
                    status_code=400,
                    detail="Missing required fields: event_name, session_id"
                )
        events_to_insert = [json.dumps(event) for event in events]
        insert_query = """
            INSERT INTO analytics_events (event_data)
            SELECT jsonb_array_elements($1::jsonb)
        """
        await db.execute(insert_query, json.dumps(events))
        logger.info(f"Stored {len(events)} analytics events")
        return {
            "success": True,
            "events_stored": len(events),
            "batch_timestamp": batch.get("batch_timestamp"),
            "message": f"Successfully stored {len(events)} events"
        }
    except Exception as e:
        logger.error(f"Error storing analytics events: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store analytics events: {str(e)}"
        )

@analytics_router.get("/events")
async def get_analytics_events(
    event_name: Optional[str] = None,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Retrieve analytics events with optional filters
    """
    try:
        conditions = []
        params = []
        param_count = 0
        if event_name:
            param_count += 1
            conditions.append(f"event_data->>'event_name' = ${param_count}")
            params.append(event_name)
        if user_id:
            param_count += 1
            conditions.append(f"event_data->>'user_id' = ${param_count}")
            params.append(user_id)
        if session_id:
            param_count += 1
            conditions.append(f"event_data->>'session_id' = ${param_count}")
            params.append(session_id)
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        query = f"""
            SELECT event_data, created_at
            FROM analytics_events
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_count + 1} OFFSET ${param_count + 2}
        """
        params.extend([limit, offset])
        rows = await db.fetch(query, *params)
        events = []
        for row in rows:
            event_data = dict(row['event_data'])
            event_data['stored_at'] = row['created_at'].isoformat()
            events.append(event_data)
        return {
            "success": True,
            "events": events,
            "count": len(events),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error retrieving analytics events: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve analytics events: {str(e)}"
        )

@analytics_router.get("/events/stats")
async def get_analytics_stats(
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Get analytics statistics
    """
    try:
        conditions = []
        params = []
        param_count = 0
        if user_id:
            param_count += 1
            conditions.append(f"event_data->>'user_id' = ${param_count}")
            params.append(user_id)
        if session_id:
            param_count += 1
            conditions.append(f"event_data->>'session_id' = ${param_count}")
            params.append(session_id)
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        query = f"""
            SELECT 
                event_data->>'event_name' as event_type,
                COUNT(*) as count
            FROM analytics_events
            WHERE {where_clause}
            GROUP BY event_data->>'event_name'
            ORDER BY count DESC
        """
        rows = await db.fetch(query, *params)
        stats = {
            "event_counts": {row['event_type']: row['count'] for row in rows},
            "total_events": sum(row['count'] for row in rows)
        }
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error getting analytics stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get analytics stats: {str(e)}"
        )

@analytics_router.post("/events/query")
async def query_analytics_events(
    query_params: Dict[str, Any],
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Custom query endpoint for complex analytics queries
    """
    try:
        conditions = []
        params = []
        param_count = 0
        for key, value in query_params.items():
            param_count += 1
            if key.startswith('attributes.'):
                attr_key = key.replace('attributes.', '')
                conditions.append(f"event_data->'attributes'->>${param_count} = ${param_count + 1}")
                params.extend([attr_key, str(value)])
                param_count += 1
            else:
                conditions.append(f"event_data->>${param_count} = ${param_count + 1}")
                params.extend([key, str(value)])
                param_count += 1
        if not conditions:
            conditions = ["1=1"]
        where_clause = " AND ".join(conditions)
        query = f"""
            SELECT event_data, created_at
            FROM analytics_events
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT 1000
        """
        rows = await db.fetch(query, *params)
        events = []
        for row in rows:
            event_data = dict(row['event_data'])
            event_data['stored_at'] = row['created_at'].isoformat()
            events.append(event_data)
        return {
            "success": True,
            "events": events,
            "count": len(events),
            "query_params": query_params
        }
    except Exception as e:
        logger.error(f"Error in custom analytics query: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute custom query: {str(e)}"
        )

@analytics_router.get("/getallsessions/investigate")
async def get_all_sessions_investigate(
    db: asyncpg.Connection = Depends(get_db),
    app_name: Optional[str] = Query(None, description="Filter by app name"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)"),
    session_id: Optional[str] = Query(None, description="Filter by specific session ID"),
    created_hours_ago: Optional[int] = Query(None, description="Filter sessions created within last N hours"),
    updated_hours_ago: Optional[int] = Query(None, description="Filter sessions updated within last N hours"),
    state_contains: Optional[str] = Query(None, description="Filter sessions where state contains this text")
):
    """
    Get count of sessions with filtering options for investigation
    """
    try:
        # Build dynamic WHERE conditions
        where_conditions = []
        params = []
        param_counter = 1
        
        # App name filter
        if app_name:
            where_conditions.append(f"app_name = ${param_counter}")
            params.append(app_name)
            param_counter += 1
        
        # User ID filter
        if user_id:
            where_conditions.append(f"user_id = ${param_counter}")
            params.append(user_id)
            param_counter += 1
            
        # Session ID filter
        if session_id:
            where_conditions.append(f"id = ${param_counter}")
            params.append(session_id)
            param_counter += 1
        
        # Date range filters
        if start_date:
            try:
                # Try to parse with time, if fails, add 00:00:00
                if len(start_date) == 10:  # YYYY-MM-DD format
                    start_date += " 00:00:00"
                where_conditions.append(f"create_time >= ${param_counter}::timestamp")
                params.append(start_date)
                param_counter += 1
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid start_date format: {e}")
        
        if end_date:
            try:
                # Try to parse with time, if fails, add 23:59:59
                if len(end_date) == 10:  # YYYY-MM-DD format
                    end_date += " 23:59:59"
                where_conditions.append(f"create_time <= ${param_counter}::timestamp")
                params.append(end_date)
                param_counter += 1
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid end_date format: {e}")
        
        # Recent hours filters
        if created_hours_ago is not None:
            where_conditions.append(f"create_time >= NOW() - INTERVAL '{created_hours_ago} hours'")
        
        if updated_hours_ago is not None:
            where_conditions.append(f"update_time >= NOW() - INTERVAL '{updated_hours_ago} hours'")
        
        # State content filter
        if state_contains:
            where_conditions.append(f"state::text ILIKE ${param_counter}")
            params.append(f"%{state_contains}%")
            param_counter += 1
        
        # Build the count query
        count_query = "SELECT COUNT(*) as total_sessions FROM sessions"
        
        if where_conditions:
            count_query += f" WHERE {' AND '.join(where_conditions)}"
        
        # Execute count query
        result = await db.fetchrow(count_query, *params)
        total_sessions = result['total_sessions'] if result else 0
        
        # Get additional analytics
        analytics_query = """
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(DISTINCT app_name) as unique_apps,
                COUNT(DISTINCT user_id) as unique_users,
                MIN(create_time) as oldest_session,
                MAX(create_time) as newest_session,
                MAX(update_time) as last_updated
            FROM sessions
        """
        
        if where_conditions:
            analytics_query += f" WHERE {' AND '.join(where_conditions)}"
        
        analytics_result = await db.fetchrow(analytics_query, *params)
        
        # Get breakdown by app
        app_breakdown_query = """
            SELECT 
                app_name,
                COUNT(*) as session_count
            FROM sessions
        """
        
        if where_conditions:
            app_breakdown_query += f" WHERE {' AND '.join(where_conditions)}"
        
        app_breakdown_query += " GROUP BY app_name ORDER BY session_count DESC"
        
        app_breakdown = await db.fetch(app_breakdown_query, *params)
        
        # Format response
        response = {
            "success": True,
            "total_sessions": total_sessions,
            "filters_applied": {
                "app_name": app_name,
                "user_id": user_id,
                "session_id": session_id,
                "start_date": start_date,
                "end_date": end_date,
                "created_hours_ago": created_hours_ago,
                "updated_hours_ago": updated_hours_ago,
                "state_contains": state_contains
            },
            "analytics": {
                "unique_apps": analytics_result['unique_apps'] if analytics_result else 0,
                "unique_users": analytics_result['unique_users'] if analytics_result else 0,
                "oldest_session": analytics_result['oldest_session'].isoformat() if analytics_result and analytics_result['oldest_session'] else None,
                "newest_session": analytics_result['newest_session'].isoformat() if analytics_result and analytics_result['newest_session'] else None,
                "last_updated": analytics_result['last_updated'].isoformat() if analytics_result and analytics_result['last_updated'] else None
            },
            "breakdown_by_app": [
                {
                    "app_name": row['app_name'],
                    "session_count": row['session_count']
                }
                for row in app_breakdown
            ]
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting sessions count: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get sessions count: {str(e)}"
        )