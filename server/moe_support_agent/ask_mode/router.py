"""
FastAPI router for Ask Mode API endpoints.

This module defines the REST API endpoints for direct Discovery Engine access,
including session management and query processing.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json

from .models import (
    CreateSessionRequest, 
    CreateSessionResponse, 
    ErrorResponse,
    QueryRequest,
    QueryResponse,
    RecommendationsRequest,
    RecommendationsResponse
)
from .services import SessionService, get_session_service

# --- Database Dependency ---
from moe_support_agent.ask_mode.db import get_db

logger = logging.getLogger(__name__)

# --- Pydantic Models ---
class CreateAskSessionRequest(BaseModel):
    session_id: str
    user_id: str
    api_session_id: str
    conversation_id: Optional[str] = None
    title: Optional[str] = None
    session_metadata: Dict[str, Any] = Field(default_factory=dict)

class StoreConversationTurnRequest(BaseModel):
    session_id: str
    user_query: str
    ai_response: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    citations: Optional[List[Dict[str, Any]]] = None

# Create the router with prefix and tags
ask_router = APIRouter(
    prefix="/ask",
    tags=["ask-mode"],
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
        400: {"model": ErrorResponse, "description": "Bad request"},
    }
)


@ask_router.post(
    "/session",
    response_model=CreateSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Discovery Engine Session",
    description="""
    Create a new Discovery Engine conversational session for a user.
    
    This endpoint creates a session that can be used for subsequent queries
    to maintain conversation context and history. The session ID returned
    should be used in follow-up API calls to maintain conversational context.
    
    **Usage:**
    - Provide a unique user_id to identify the user
    - Store the returned session_id for subsequent queries
    - Sessions are managed by Google Discovery Engine
    
    **Example:**
    ```json
    {
        "user_id": "user_12345"
    }
    ```
    """,
    responses={
        201: {
            "description": "Session created successfully",
            "model": CreateSessionResponse
        },
        400: {
            "description": "Invalid request data",
            "model": ErrorResponse
        },
        500: {
            "description": "Internal server error",
            "model": ErrorResponse
        }
    }
)
async def create_session(
    request: CreateSessionRequest,
    service: SessionService = Depends(get_session_service)
) -> CreateSessionResponse:
    """
    Create a new Discovery Engine session for a user.
    
    Args:
        request: Session creation request containing user_id
        service: Injected session service dependency
        
    Returns:
        CreateSessionResponse: Session details including session_id
        
    Raises:
        HTTPException: If session creation fails or validation errors occur
    """
    try:
        logger.info(f"Received session creation request for user: {request.user_id}")
        
        # Validate user ID
        validation_error = service.validate_user_id(request.user_id)
        if validation_error:
            logger.warning(f"User ID validation failed: {validation_error}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "validation_error",
                    "message": validation_error,
                    "details": f"Invalid user_id: {request.user_id}"
                }
            )
        
        # Create the session
        response = await service.create_session(request.user_id)
        
        logger.info(f"Session created successfully for user {request.user_id}: {response.session_id}")
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors, etc.)
        raise
        
    except Exception as e:
        # Handle unexpected errors
        error_msg = f"Failed to create session: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "session_creation_failed",
                "message": "Failed to create Discovery Engine session",
                "details": str(e)
            }
        )


@ask_router.post(
    "/query",
    response_model=QueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Discovery Engine Query",
    description="""
    Execute a query against Google Discovery Engine with full customization options.
    
    This endpoint allows you to perform searches across MoEngage documentation,
    runbooks, and support tickets with advanced features like:
    
    **Features:**
    - Custom preamble for answer generation
    - Configurable data sources (help docs, runbooks, tickets)
    - Session-based conversational context
    - Comprehensive citation mapping with source details
    - Query classification and grounding support
    - Flexible result limits and filtering
    
    **Data Sources:**
    - `moe-gs-public-docs-live-public_1752599761524_gcs_store` - Public help documentation
    - `moe-confluence-support-runbooks-live-p_1752497946721_page` - Internal runbooks
    - `moe-gs-zendesk-live-private_1752599941188_gcs_store` - Support tickets
    
    **Usage:**
    1. Create a session using `/ask/session` (optional for conversational context)
    2. Send queries with custom parameters
    3. Receive structured responses with citations and source information
    
    **Example:**
    ```json
    {
        "query": "How do I set up push notifications?",
        "session_id": "projects/.../sessions/12345",
        "preamble": "You are a technical support expert...",
        "data_sources": ["moe-gs-public-docs-live-public_1752599761524_gcs_store"],
        "max_results": 5,
        "include_citations": true
    }
    ```
    """,
    responses={
        200: {
            "description": "Query executed successfully",
            "model": QueryResponse
        },
        400: {
            "description": "Invalid request data",
            "model": ErrorResponse
        },
        500: {
            "description": "Internal server error",
            "model": ErrorResponse
        }
    }
)
async def execute_query(
    request: QueryRequest,
    service: SessionService = Depends(get_session_service)
) -> QueryResponse:
    """
    Execute a Discovery Engine query with full customization.
    
    Args:
        request: Query request with search parameters
        service: Injected session service dependency
        
    Returns:
        QueryResponse: Response containing answer, citations, and metadata
        
    Raises:
        HTTPException: If query execution fails or validation errors occur
    """
    try:
        logger.info(f"Received query request: '{request.query[:100]}...'")
        
        # Validate query
        if not request.query or not request.query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "validation_error",
                    "message": "Query cannot be empty",
                    "details": "Please provide a valid search query"
                }
            )
        
        # Validate data sources if provided
        if request.data_sources:
            validation_error = service.validate_data_sources(request.data_sources)
            if validation_error:
                logger.warning(f"Data sources validation failed: {validation_error}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "validation_error",
                        "message": validation_error,
                        "details": f"Available data sources: {', '.join(service.get_default_data_sources())}"
                    }
                )
        
        # Execute the query
        response = await service.answer_query(
            query=request.query.strip(),
            session_id=request.session_id,
            preamble=request.preamble,
            data_sources=request.data_sources,
            max_results=request.max_results or 10,
            include_citations=request.include_citations if request.include_citations is not None else True,
            user_pseudo_id=request.user_pseudo_id
        )
        
        logger.info(f"Query executed successfully for: '{request.query[:50]}...', answer length: {len(response.answer)} chars")
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors, etc.)
        raise
        
    except Exception as e:
        # Handle unexpected errors
        error_msg = f"Failed to execute query: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "query_execution_failed",
                "message": "Failed to execute Discovery Engine query",
                "details": str(e)
            }
        )


@ask_router.post(
    "/recommendations",
    response_model=RecommendationsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Ticket Recommendations",
    description="""
    Analyze comprehensive Zendesk ticket information and provide structured recommendations.
    
    This endpoint takes complete formatted ticket information including conversation history
    and uses Discovery Engine to analyze it against all available data sources to provide
    actionable recommendations for resolving complex support issues.
    
    **Features:**
    - Analyzes complete ticket conversation threads
    - Extracts technical details from multi-stakeholder discussions
    - Generates MoEngage-specific troubleshooting questions
    - Identifies relevant similar tickets from historical data
    - Returns structured JSON response optimized for support workflows
    - Handles complex ticket threads with AI agent analysis
    
    **Input Requirements:**
    - Complete formatted ticket information as string
    - Must include ticket title, description, or comment history
    - Supports complex conversation threads with timestamps
    
    **Output Format:**
    ```json
    {
      "related_questions": [
        "How to troubleshoot MoEngage Cards not appearing for specific users?",
        "What are common SDK integration issues affecting Cards delivery?",
        "How to debug campaign segmentation problems in Cards?",
        "What app version filtering strategies work best for Cards?",
        "How to implement proper Cards tracking for analytics?"
      ],
      "relevant_tickets": ["TICKET-259559", "TICKET-260076", "TICKET-261815"],
      "status": "success"
    }
    ```
    
    **Example:**
    ```json
    {
        "ticket_info": "* **Ticket Title:** Cards not working as expected\\n* **Ticket Description:** We have configured the cards on two screens in bhim app. We triggered two campaigns and with same segment, same image and different screens. We observed that the campaign was visible for one user at both places while for other it was not visible on one screen.\\n* **Ticket Comments:**\\n  ```\\n  Comment #1 (Public) - Author ID: 29875633107604 - 2025-06-16T11:31:14Z\\n  We have configured the cards on two screens in bhim app..."
    }
    ```
    """,
    responses={
        200: {
            "description": "Recommendations generated successfully",
            "model": RecommendationsResponse
        },
        400: {
            "description": "Invalid ticket data",
            "model": ErrorResponse
        },
        500: {
            "description": "Internal server error",
            "model": ErrorResponse
        }
    }
)
async def get_recommendations(
    request: RecommendationsRequest,
    service: SessionService = Depends(get_session_service)
) -> RecommendationsResponse:
    """
    Generate recommendations based on comprehensive Zendesk ticket information.
    
    Args:
        request: Request containing formatted ticket information
        service: Injected session service dependency
        
    Returns:
        RecommendationsResponse: Structured recommendations
        
    Raises:
        HTTPException: If recommendation generation fails
    """
    try:
        logger.info("Received recommendations request")
        
        # Validate ticket info
        validation_error = service.validate_ticket_info(request.ticket_info)
        if validation_error:
            logger.warning(f"Ticket info validation failed: {validation_error}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "validation_error",
                    "message": validation_error,
                    "details": "Please provide valid ticket info with title, description, or comments"
                }
            )
        
        # Generate recommendations
        response = await service.get_recommendations(request.ticket_info)
        
        logger.info(f"Recommendations generated successfully: {len(response.related_questions)} questions, {len(response.relevant_tickets)} tickets")
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors, etc.)
        raise
        
    except Exception as e:
        # Handle unexpected errors
        error_msg = f"Failed to generate recommendations: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "recommendations_generation_failed",
                "message": "Failed to generate ticket recommendations",
                "details": str(e)
            }
        )


@ask_router.get(
    "/health",
    summary="Health Check",
    description="Check the health status of the Ask Mode API",
    responses={
        200: {
            "description": "Service is healthy",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "service": "ask-mode-api",
                        "timestamp": "2025-01-29T22:53:00Z"
                    }
                }
            }
        }
    }
)
async def health_check():
    """
    Health check endpoint for the Ask Mode API.
    
    Returns:
        dict: Health status information
    """
    from datetime import datetime
    
    return {
        "status": "healthy",
        "service": "ask-mode-api",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0"
    }


@ask_router.post("/ask-sessions")
async def create_ask_session(request: CreateAskSessionRequest, db=Depends(get_db)):
    """Create a new Ask session record"""
    try:
        existing = await db.fetchrow(
            "SELECT session_id FROM asksessions WHERE session_id = $1",
            request.session_id
        )
        if existing:
            raise HTTPException(status_code=409, detail="Session already exists")
        now = datetime.now(timezone.utc)
        await db.execute(
            """
            INSERT INTO asksessions (
                session_id, user_id, api_session_id, conversation_id, 
                title, created_at, updated_at, status, session_metadata,
                total_queries, last_query_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            request.session_id,
            request.user_id,
            request.api_session_id,
            request.conversation_id,
            request.title,
            now,
            now,
            "active",
            json.dumps(request.session_metadata),
            0,
            None
        )
        return {
            "success": True,
            "data": {
                "session_id": request.session_id,
                "user_id": request.user_id,
                "created_at": now.isoformat(),
                "status": "active"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@ask_router.post("/ask-sessions/turns")
async def store_conversation_turn(request: StoreConversationTurnRequest, db=Depends(get_db)):
    """Store a conversation turn"""
    try:
        session = await db.fetchrow(
            "SELECT session_id FROM asksessions WHERE session_id = $1",
            request.session_id
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        turn_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        await db.execute(
            """
            INSERT INTO ask_conversation_turns (
                id, session_id, user_query, ai_response, created_at, metadata, citations
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            turn_id,
            request.session_id,
            request.user_query,
            request.ai_response,
            now,
            json.dumps(request.metadata),
            json.dumps(request.citations) if request.citations else None
        )
        return {
            "success": True,
            "data": {
                "turn_id": turn_id,
                "session_id": request.session_id,
                "created_at": now.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@ask_router.get("/ask-sessions")
async def get_session_history(
    user_id: Optional[str] = Query(None, description="Optional: Filter by User ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    status: Optional[str] = Query(None, description="Optional: Filter by status"),
    start_date: Optional[str] = Query(None, description="Optional: Filter sessions created after this date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
    end_date: Optional[str] = Query(None, description="Optional: Filter sessions created before this date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"),
    last_n_days: Optional[int] = Query(None, description="Optional: Filter sessions created in the last N days"),
    db=Depends(get_db)
):
    """Get all sessions with optional filtering by user_id, status, date range, and pagination"""
    try:
        # Build dynamic WHERE clause based on provided filters
        where_clauses = []
        params = []
        param_count = 0
        
        if user_id:
            param_count += 1
            where_clauses.append(f"user_id = ${param_count}")
            params.append(user_id)
        if status:
            param_count += 1
            where_clauses.append(f"status = ${param_count}")
            params.append(status)
        if last_n_days:
            param_count += 1
            where_clauses.append(f"created_at >= NOW() - INTERVAL '${last_n_days} days'")
        else:
            if start_date:
                param_count += 1
                where_clauses.append(f"created_at >= ${param_count}")
                params.append(start_date)
            if end_date:
                param_count += 1
                where_clauses.append(f"created_at <= ${param_count}")
                params.append(end_date)
        where_clause = ""
        if where_clauses:
            where_clause = "WHERE " + " AND ".join(where_clauses)
        count_query = f"SELECT COUNT(*) FROM asksessions {where_clause}"
        total_count = await db.fetchval(count_query, *params)
        query = f"""
            SELECT session_id, user_id, api_session_id, conversation_id, title,
                   created_at, updated_at, status, session_metadata, total_queries, last_query_at
            FROM asksessions 
            {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_count + 1} OFFSET ${param_count + 2}
        """
        params: list[Any] = params
        params.extend([limit, offset])
        rows = await db.fetch(query, *params)
        sessions = []
        for row in rows:
            sessions.append({
                "session_id": row['session_id'],
                "user_id": row['user_id'],
                "api_session_id": row['api_session_id'],
                "conversation_id": row['conversation_id'],
                "title": row['title'],
                "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                "updated_at": row['updated_at'].isoformat() if row['updated_at'] else None,
                "status": row['status'],
                "session_metadata": json.loads(row['session_metadata']) if row['session_metadata'] else {},
                "total_queries": row['total_queries'],
                "last_query_at": row['last_query_at'].isoformat() if row['last_query_at'] else None
            })
        return {
            "success": True,
            "data": {
                "sessions": sessions,
                "total_count": total_count
            }
        }
    except Exception as e:
        logger.error(f"Database error in get_session_history: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@ask_router.get("/ask-sessions/{session_id}")
async def get_session_with_turns(
    session_id: str,
    user_id: str = Query(..., description="User ID for security"),
    db=Depends(get_db)
):
    """Get a specific session with its conversation turns"""
    try:
        session_row = await db.fetchrow(
            """
            SELECT session_id, user_id, api_session_id, conversation_id, title,
                   created_at, updated_at, status, session_metadata, total_queries, last_query_at
            FROM asksessions 
            WHERE session_id = $1 AND user_id = $2
            """,
            session_id, user_id
        )
        if not session_row:
            raise HTTPException(status_code=404, detail="Session not found")
        turn_rows = await db.fetch(
            """
            SELECT id, session_id, user_query, ai_response, created_at, metadata, citations
            FROM ask_conversation_turns 
            WHERE session_id = $1
            ORDER BY created_at ASC
            """,
            session_id
        )
        session = {
            "session_id": session_row['session_id'],
            "user_id": session_row['user_id'],
            "api_session_id": session_row['api_session_id'],
            "conversation_id": session_row['conversation_id'],
            "title": session_row['title'],
            "created_at": session_row['created_at'].isoformat(),
            "updated_at": session_row['updated_at'].isoformat(),
            "status": session_row['status'],
            "session_metadata": json.loads(session_row['session_metadata']) if session_row['session_metadata'] else {},
            "total_queries": session_row['total_queries'],
            "last_query_at": session_row['last_query_at'].isoformat() if session_row['last_query_at'] else None
        }
        turns = []
        for turn_row in turn_rows:
            turns.append({
                "id": turn_row['id'],
                "session_id": turn_row['session_id'],
                "user_query": turn_row['user_query'],
                "ai_response": turn_row['ai_response'],
                "created_at": turn_row['created_at'].isoformat(),
                "metadata": json.loads(turn_row['metadata']) if turn_row['metadata'] else {},
                "citations": json.loads(turn_row['citations']) if turn_row['citations'] else None
            })
        return {
            "success": True,
            "data": {
                "session": session,
                "turns": turns
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@ask_router.get("/ask-sessions/count")
async def get_session_count(
    user_id: str = Query(..., description="User ID"),
    db=Depends(get_db)
):
    """Get session count for a user"""
    try:
        count = await db.fetchval(
            "SELECT COUNT(*) FROM asksessions WHERE user_id = $1",
            user_id
        )
        return {
            "success": True,
            "data": {"count": count}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# Note: Exception handlers are handled within individual endpoint functions
# using try/catch blocks, as APIRouter doesn't support exception_handler decorators
