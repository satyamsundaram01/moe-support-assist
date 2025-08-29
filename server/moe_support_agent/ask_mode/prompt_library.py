from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import asyncpg
import json
from datetime import datetime, timedelta
import logging
import uuid

from moe_support_agent.ask_mode.db import get_db

prompt_library_router = APIRouter(prefix="/api", tags=["prompt-library"])
logger = logging.getLogger(__name__)

# ----------------------------
# Pydantic Models
# ----------------------------

class PromptTemplate(BaseModel):
    """Model for prompt library templates."""
    id: Optional[str] = None
    title: str
    description: str
    content: str
    category: str
    tags: List[str]
    likes: int = 0
    isFavorite: bool = True  # Default to favorite
    createdAt: Optional[str] = None
    createdBy: Optional[str] = None
    isPublic: bool = True  # Default to public

# ----------------------------
# DB Schema Helpers
# ----------------------------

SCHEMA_INIT_DONE = False

CREATE_PROMPT_LIBRARY_SQL = """
CREATE TABLE IF NOT EXISTS prompt_library (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    likes INTEGER NOT NULL DEFAULT 0,
    is_favorite BOOLEAN NOT NULL DEFAULT true,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT
);
"""

async def ensure_schema(db: asyncpg.Connection):
    global SCHEMA_INIT_DONE
    if SCHEMA_INIT_DONE:
        return
    
    # Best-effort idempotent creation
    await db.execute(CREATE_PROMPT_LIBRARY_SQL)
    SCHEMA_INIT_DONE = True

# ----------------------------
# API Endpoints
# ----------------------------

@prompt_library_router.get("/prompt-library")
async def get_prompt_library(
    db: asyncpg.Connection = Depends(get_db),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    user_id: Optional[str] = Query(None, description="Filter by creator user ID"),
    limit: int = Query(50, ge=1, le=1000, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    include_private: bool = Query(False, description="Include private prompts (only for creator)")
):
    """
    Get prompt templates from the prompt library with optional filtering and pagination.
    
    This endpoint returns prompt templates with the following filters:
    - category: Filter by template category
    - search: Search in title and description
    - user_id: Filter by creator's user ID
    - limit: Maximum number of results to return (default: 50, max: 1000)
    - offset: Number of results to skip for pagination
    - include_private: Whether to include private prompts (only applies to prompts created by the requesting user)
    """
    try:
        await ensure_schema(db)
        
        # Build dynamic WHERE conditions
        where_conditions = []
        params = []
        param_counter = 1
        
        # Apply filters
        if category:
            where_conditions.append(f"category = ${param_counter}")
            params.append(category)
            param_counter += 1
            
        if search:
            search_term = f"%{search}%"
            where_conditions.append(f"(title ILIKE ${param_counter} OR description ILIKE ${param_counter})")
            params.append(search_term)
            param_counter += 1
            
        if user_id:
            where_conditions.append(f"created_by = ${param_counter}")
            params.append(user_id)
            param_counter += 1
        
        # Handle public/private filtering
        if not include_private:
            where_conditions.append("is_public = TRUE")
        elif user_id:  # Only include private prompts for the requesting user
            where_conditions.append(f"(is_public = TRUE OR created_by = ${param_counter})")
            params.append(user_id)
            param_counter += 1
        else:
            where_conditions.append("is_public = TRUE")
        
        # Build the count query for total results
        count_query = "SELECT COUNT(*) as total_prompts FROM prompt_library"
        if where_conditions:
            count_query += f" WHERE {' AND '.join(where_conditions)}"
        
        # Execute count query
        result = await db.fetchrow(count_query, *params)
        total_prompts = result['total_prompts'] if result else 0
        
        # Build the main query
        main_query = """
            SELECT 
                id, 
                title, 
                description, 
                content, 
                category, 
                tags, 
                likes, 
                is_favorite, 
                is_public,
                created_at, 
                created_by
            FROM prompt_library
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
        prompts = []
        for row in rows:
            # Parse tags JSON with error handling
            tags_data = []
            if row['tags']:
                try:
                    tags_data = json.loads(row['tags']) if isinstance(row['tags'], str) else row['tags']
                except (json.JSONDecodeError, TypeError):
                    tags_data = []
            
            prompts.append(PromptTemplate(
                id=row['id'],
                title=row['title'],
                description=row['description'],
                content=row['content'],
                category=row['category'],
                tags=tags_data,
                likes=row['likes'],
                isFavorite=row['is_favorite'],
                isPublic=row['is_public'],
                createdAt=row['created_at'].isoformat() if row['created_at'] else None,
                createdBy=row['created_by']
            ))
        
        return {
            "success": True,
            "data": {
                "prompts": [prompt.dict() for prompt in prompts],
                "total_count": total_prompts,
                "limit": limit,
                "offset": offset,
                "filters": {
                    "category": category,
                    "search": search,
                    "user_id": user_id
                }
            }
        }
        
    except Exception as e:
        error_msg = f"Error fetching prompt library: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch prompt library: {str(e)}"
        )

@prompt_library_router.post("/prompt-library")
async def add_prompt_template(
    prompt: PromptTemplate,
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Add a new prompt template to the prompt library.
    
    This endpoint creates a new prompt template with the provided details.
    """
    try:
        await ensure_schema(db)
        
        # Generate a unique ID if not provided
        if not prompt.id:
            prompt.id = str(uuid.uuid4())
        
        # Convert tags to JSON
        tags_json = json.dumps(prompt.tags)
        
        # Set created timestamp if not provided
        created_at = datetime.now() if not prompt.createdAt else datetime.fromisoformat(prompt.createdAt)
        
        # Insert the prompt template
        insert_query = """
            INSERT INTO prompt_library (
                id, 
                title, 
                description, 
                content, 
                category, 
                tags, 
                likes, 
                is_favorite, 
                is_public,
                created_at, 
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, created_at
        """
        
        result = await db.fetchrow(
            insert_query,
            prompt.id,
            prompt.title,
            prompt.description,
            prompt.content,
            prompt.category,
            tags_json,
            prompt.likes,
            prompt.isFavorite,
            prompt.isPublic,
            created_at,
            prompt.createdBy
        )
        
        # Return the created prompt
        return {
            "success": True,
            "data": {
                "prompt": {
                    **prompt.dict(),
                    "id": result['id'],
                    "createdAt": result['created_at'].isoformat()
                }
            }
        }
        
    except Exception as e:
        error_msg = f"Error adding prompt template: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to add prompt template: {str(e)}"
        )

@prompt_library_router.put("/prompt-library/{prompt_id}/like")
async def like_prompt(
    prompt_id: str,
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Increment the likes count for a prompt template.
    """
    try:
        await ensure_schema(db)
        
        # Check if the prompt exists
        exists = await db.fetchval("SELECT 1 FROM prompt_library WHERE id = $1", prompt_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Prompt template not found")
        
        # Increment the likes count
        update_query = "UPDATE prompt_library SET likes = likes + 1 WHERE id = $1 RETURNING likes"
        new_likes = await db.fetchval(update_query, prompt_id)
        
        return {
            "success": True,
            "data": {
                "prompt_id": prompt_id,
                "likes": new_likes
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error liking prompt template: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to like prompt template: {str(e)}"
        )

@prompt_library_router.put("/prompt-library/{prompt_id}/favorite")
async def toggle_favorite(
    prompt_id: str,
    user_id: str = Query(..., description="User ID of the requestor"),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Toggle the favorite status of a prompt template for the requesting user.
    
    This endpoint toggles whether a prompt is marked as a favorite for the specified user.
    """
    try:
        await ensure_schema(db)
        
        # Check if the prompt exists and if the user is the creator
        row = await db.fetchrow(
            "SELECT created_by, is_favorite FROM prompt_library WHERE id = $1", 
            prompt_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Prompt template not found")
        
        # Only allow the creator to toggle favorite status
        if row['created_by'] != user_id:
            raise HTTPException(
                status_code=403, 
                detail="Only the creator can toggle favorite status"
            )
        
        # Toggle the favorite status
        new_status = not row['is_favorite']
        update_query = "UPDATE prompt_library SET is_favorite = $1 WHERE id = $2 RETURNING is_favorite"
        updated_status = await db.fetchval(update_query, new_status, prompt_id)
        
        return {
            "success": True,
            "data": {
                "prompt_id": prompt_id,
                "isFavorite": updated_status
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error toggling favorite status: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to toggle favorite status: {str(e)}"
        )

@prompt_library_router.put("/prompt-library/{prompt_id}/visibility")
async def toggle_visibility(
    prompt_id: str,
    user_id: str = Query(..., description="User ID of the requestor"),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Toggle the public/private visibility of a prompt template.
    
    This endpoint toggles whether a prompt is public or private.
    Only the creator of the prompt can change its visibility.
    """
    try:
        await ensure_schema(db)
        
        # Check if the prompt exists and if the user is the creator
        row = await db.fetchrow(
            "SELECT created_by, is_public FROM prompt_library WHERE id = $1", 
            prompt_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Prompt template not found")
        
        # Only allow the creator to toggle visibility
        if row['created_by'] != user_id:
            raise HTTPException(
                status_code=403, 
                detail="Only the creator can toggle visibility"
            )
        
        # Toggle the visibility
        new_status = not row['is_public']
        update_query = "UPDATE prompt_library SET is_public = $1 WHERE id = $2 RETURNING is_public"
        updated_status = await db.fetchval(update_query, new_status, prompt_id)
        
        return {
            "success": True,
            "data": {
                "prompt_id": prompt_id,
                "isPublic": updated_status
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error toggling visibility: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to toggle visibility: {str(e)}"
        )

@prompt_library_router.delete("/prompt-library/{prompt_id}")
async def delete_prompt(
    prompt_id: str,
    user_id: str = Query(..., description="User ID of the requestor"),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Delete a prompt template from the library.
    
    This endpoint deletes a prompt template.
    Only the creator of the prompt can delete it.
    """
    try:
        await ensure_schema(db)
        
        # Check if the prompt exists and if the user is the creator
        created_by = await db.fetchval(
            "SELECT created_by FROM prompt_library WHERE id = $1", 
            prompt_id
        )
        
        if created_by is None:
            raise HTTPException(status_code=404, detail="Prompt template not found")
        
        # Only allow the creator to delete the prompt
        if created_by != user_id:
            raise HTTPException(
                status_code=403, 
                detail="Only the creator can delete this prompt"
            )
        
        # Delete the prompt
        await db.execute("DELETE FROM prompt_library WHERE id = $1", prompt_id)
        
        return {
            "success": True,
            "data": {
                "message": f"Prompt template with ID {prompt_id} deleted successfully"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error deleting prompt template: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete prompt template: {str(e)}"
        )
