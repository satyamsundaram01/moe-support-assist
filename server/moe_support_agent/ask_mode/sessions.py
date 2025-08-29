from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
import asyncpg
import json
from datetime import datetime, timedelta
import logging

from moe_support_agent.ask_mode.db import get_db

sessions_router = APIRouter(prefix="/api", tags=["sessions"])
logger = logging.getLogger(__name__)

@sessions_router.get("/sessions")
async def get_sessions(
    db: asyncpg.Connection = Depends(get_db),
    limit: int = Query(50, ge=1, le=1000, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    start_date: Optional[str] = Query(None, description="Filter sessions created after this date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
    end_date: Optional[str] = Query(None, description="Filter sessions created before this date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
    last_n_days: Optional[int] = Query(None, description="Filter sessions created in the last N days")
):
    """
    Get sessions from the sessions table with optional date filtering and pagination.
    
    This endpoint returns sessions data with the following filters:
    - limit: Maximum number of results to return (default: 50, max: 1000)
    - offset: Number of results to skip for pagination
    - start_date: Filter sessions created on or after this date
    - end_date: Filter sessions created on or before this date
    - last_n_days: Filter sessions created within the last N days
    
    Either use start_date/end_date combination or last_n_days, but not both.
    """
    try:
        # Build dynamic WHERE conditions
        where_conditions = []
        params = []
        param_counter = 1
        
        # Date filtering
        if last_n_days is not None:
            # Calculate the date that's last_n_days ago
            start_date_from_days = datetime.now() - timedelta(days=last_n_days)
            where_conditions.append(f"create_time >= ${param_counter}")
            params.append(start_date_from_days)
            param_counter += 1
        else:
            # Start date filter
            if start_date:
                try:
                    # Convert string to datetime object
                    start_datetime = None
                    if len(start_date) == 10:  # YYYY-MM-DD format
                        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
                    else:
                        # Try to parse with time component
                        start_datetime = datetime.strptime(start_date, "%Y-%m-%dT%H:%M:%S" if "T" in start_date else "%Y-%m-%d %H:%M:%S")
                    
                    where_conditions.append(f"create_time >= ${param_counter}")
                    params.append(start_datetime)
                    param_counter += 1
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Invalid start_date format: {e}")
            
            # End date filter
            if end_date:
                try:
                    # Convert string to datetime object
                    end_datetime = None
                    if len(end_date) == 10:  # YYYY-MM-DD format
                        # Add end of day for inclusive filtering
                        end_datetime = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
                    else:
                        # Try to parse with time component
                        end_datetime = datetime.strptime(end_date, "%Y-%m-%dT%H:%M:%S" if "T" in end_date else "%Y-%m-%d %H:%M:%S")
                    
                    where_conditions.append(f"create_time <= ${param_counter}")
                    params.append(end_datetime)
                    param_counter += 1
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Invalid end_date format: {e}")
        
        # Build the count query for total results
        count_query = "SELECT COUNT(*) as total_sessions FROM sessions"
        if where_conditions:
            count_query += f" WHERE {' AND '.join(where_conditions)}"
        
        # Execute count query
        result = await db.fetchrow(count_query, *params)
        total_sessions = result['total_sessions'] if result else 0
        
        # Build the main query
        main_query = """
            SELECT 
                id, 
                user_id, 
                app_name, 
                create_time, 
                update_time, 
                state
            FROM sessions
        """
        
        if where_conditions:
            main_query += f" WHERE {' AND '.join(where_conditions)}"
        
        # Add sorting and pagination
        main_query += f" ORDER BY create_time DESC LIMIT ${param_counter} OFFSET ${param_counter + 1}"
        params.append(limit)
        param_counter += 1
        params.append(offset)
        
        # Execute main query
        rows = await db.fetch(main_query, *params)
        
        # Format results
        sessions = []
        for row in rows:
            # Parse state JSON with error handling
            state_data = {}
            if row['state']:
                try:
                    state_data = json.loads(row['state']) if isinstance(row['state'], str) else row['state']
                except (json.JSONDecodeError, TypeError):
                    state_data = {"error": "Invalid state format"}
            
            sessions.append({
                "session_id": row['id'],
                "user_id": row['user_id'],
                "app_name": row['app_name'],
                "created_at": row['create_time'].isoformat() if row['create_time'] else None,
                "updated_at": row['update_time'].isoformat() if row['update_time'] else None,
                "state": state_data
            })
        
        return {
            "success": True,
            "data": {
                "sessions": sessions,
                "total_count": total_sessions,
                "limit": limit,
                "offset": offset,
                "filters": {
                    "start_date": start_date,
                    "end_date": end_date,
                    "last_n_days": last_n_days
                }
            }
        }
        
    except Exception as e:
        error_msg = f"Error fetching sessions: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch sessions: {str(e)}"
        )

@sessions_router.get("/asksessions")
async def get_ask_sessions(
    db: asyncpg.Connection = Depends(get_db),
    limit: int = Query(50, ge=1, le=1000, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    start_date: Optional[str] = Query(None, description="Filter sessions created after this date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
    end_date: Optional[str] = Query(None, description="Filter sessions created before this date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
    last_n_days: Optional[int] = Query(None, description="Filter sessions created in the last N days"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    status: Optional[str] = Query(None, description="Filter by session status")
):
    """
    Get asksessions with optional filtering and pagination.
    
    This endpoint returns asksessions data with the following filters:
    - limit: Maximum number of results to return (default: 50, max: 1000)
    - offset: Number of results to skip for pagination
    - start_date: Filter sessions created on or after this date
    - end_date: Filter sessions created on or before this date
    - last_n_days: Filter sessions created within the last N days
    - user_id: Filter by specific user ID
    - status: Filter by session status
    
    Either use start_date/end_date combination or last_n_days, but not both.
    """
    try:
        # Build dynamic WHERE conditions
        where_conditions = []
        params = []
        param_counter = 1
        
        # User ID filter
        if user_id:
            where_conditions.append(f"user_id = ${param_counter}")
            params.append(user_id)
            param_counter += 1
        
        # Status filter
        if status:
            where_conditions.append(f"status = ${param_counter}")
            params.append(status)
            param_counter += 1
        
        # Date filtering
        if last_n_days is not None:
            # Calculate the date that's last_n_days ago
            start_date_from_days = datetime.now() - timedelta(days=last_n_days)
            where_conditions.append(f"created_at >= ${param_counter}")
            params.append(start_date_from_days)
            param_counter += 1
        else:
            # Start date filter
            if start_date:
                try:
                    # Convert string to datetime object
                    start_datetime = None
                    if len(start_date) == 10:  # YYYY-MM-DD format
                        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
                    else:
                        # Try to parse with time component
                        start_datetime = datetime.strptime(start_date, "%Y-%m-%dT%H:%M:%S" if "T" in start_date else "%Y-%m-%d %H:%M:%S")
                    
                    where_conditions.append(f"created_at >= ${param_counter}")
                    params.append(start_datetime)
                    param_counter += 1
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Invalid start_date format: {e}")
            
            # End date filter
            if end_date:
                try:
                    # Convert string to datetime object
                    end_datetime = None
                    if len(end_date) == 10:  # YYYY-MM-DD format
                        # Add end of day for inclusive filtering
                        end_datetime = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
                    else:
                        # Try to parse with time component
                        end_datetime = datetime.strptime(end_date, "%Y-%m-%dT%H:%M:%S" if "T" in end_date else "%Y-%m-%d %H:%M:%S")
                    
                    where_conditions.append(f"created_at <= ${param_counter}")
                    params.append(end_datetime)
                    param_counter += 1
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Invalid end_date format: {e}")
        
        # Build the count query for total results
        count_query = "SELECT COUNT(*) as total_sessions FROM asksessions"
        if where_conditions:
            count_query += f" WHERE {' AND '.join(where_conditions)}"
        
        # Execute count query
        result = await db.fetchrow(count_query, *params)
        total_sessions = result['total_sessions'] if result else 0
        
        # Build the main query
        main_query = """
            SELECT 
                session_id, 
                user_id, 
                api_session_id, 
                conversation_id, 
                title,
                created_at, 
                updated_at, 
                status, 
                session_metadata, 
                total_queries, 
                last_query_at
            FROM asksessions
        """
        
        if where_conditions:
            main_query += f" WHERE {' AND '.join(where_conditions)}"
        
        # Add sorting and pagination
        main_query += f" ORDER BY created_at DESC LIMIT ${param_counter} OFFSET ${param_counter + 1}"
        params.append(limit)
        param_counter += 1
        params.append(offset)
        
        # Execute main query
        rows = await db.fetch(main_query, *params)
        
        # Format results
        sessions = []
        for row in rows:
            # Parse session_metadata JSON with error handling
            metadata = {}
            if row['session_metadata']:
                try:
                    metadata = json.loads(row['session_metadata']) if isinstance(row['session_metadata'], str) else row['session_metadata']
                except (json.JSONDecodeError, TypeError):
                    metadata = {"error": "Invalid metadata format"}
            
            sessions.append({
                "session_id": row['session_id'],
                "user_id": row['user_id'],
                "api_session_id": row['api_session_id'],
                "conversation_id": row['conversation_id'],
                "title": row['title'],
                "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                "updated_at": row['updated_at'].isoformat() if row['updated_at'] else None,
                "status": row['status'],
                "session_metadata": metadata,
                "total_queries": row['total_queries'],
                "last_query_at": row['last_query_at'].isoformat() if row['last_query_at'] else None
            })
        
        return {
            "success": True,
            "data": {
                "sessions": sessions,
                "total_count": total_sessions,
                "limit": limit,
                "offset": offset,
                "filters": {
                    "user_id": user_id,
                    "status": status,
                    "start_date": start_date,
                    "end_date": end_date,
                    "last_n_days": last_n_days
                }
            }
        }
        
    except Exception as e:
        error_msg = f"Error fetching ask sessions: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch ask sessions: {str(e)}"
        )