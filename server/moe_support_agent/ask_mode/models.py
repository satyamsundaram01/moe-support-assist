"""
Pydantic models for Ask Mode API endpoints.

This module defines the request and response models for the Ask Mode API,
which provides direct access to Discovery Engine functionality.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CreateSessionRequest(BaseModel):
    """Request model for creating a new Discovery Engine session."""
    
    user_id: str = Field(
        ..., 
        description="Unique identifier for the user",
        min_length=1,
        max_length=100,
        example="user_12345"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_12345"
            }
        }


class CreateSessionResponse(BaseModel):
    """Response model for session creation."""
    
    session_id: str = Field(
        ..., 
        description="Generated Discovery Engine session ID (full resource name)"
    )
    user_id: str = Field(
        ..., 
        description="User ID that was provided in the request"
    )
    created_at: str = Field(
        ..., 
        description="Session creation timestamp in ISO format"
    )
    status: str = Field(
        default="active", 
        description="Session status"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "projects/agent-ai-initiatives/locations/us/collections/default_collection/engines/app-moe-support-agent-tech_1752497866942/sessions/12345",
                "user_id": "user_12345",
                "created_at": "2025-01-29T22:53:00Z",
                "status": "active"
            }
        }


class ErrorResponse(BaseModel):
    """Standard error response model."""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[str] = Field(None, description="Additional error details")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "session_creation_failed",
                "message": "Failed to create Discovery Engine session",
                "details": "Invalid user_id format"
            }
        }


class QueryRequest(BaseModel):
    """Request model for executing Discovery Engine queries."""
    
    query: str = Field(
        ..., 
        description="The search query text",
        min_length=1,
        max_length=1000,
        example="How do I set up push notifications?"
    )
    session_id: Optional[str] = Field(
        None, 
        description="Session ID for conversational context (from /ask/session)"
    )
    preamble: Optional[str] = Field(
        None, 
        description="Custom preamble for answer generation",
        max_length=2000
    )
    data_sources: Optional[List[str]] = Field(
        None, 
        description="List of data store IDs to search (defaults to all available)"
    )
    max_results: Optional[int] = Field(
        10, 
        description="Maximum number of results to return",
        ge=1,
        le=50
    )
    include_citations: Optional[bool] = Field(
        True, 
        description="Include citations in the response"
    )
    user_pseudo_id: Optional[str] = Field(
        None, 
        description="User pseudo ID for tracking (optional)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "How do I set up push notifications?",
                "session_id": "projects/agent-ai-initiatives/locations/us/collections/default_collection/engines/app-moe-support-agent-tech_1752497866942/sessions/12345",
                "preamble": "You are a helpful MoEngage support assistant...",
                "data_sources": ["moe-gs-public-docs-live-public_1752599761524_gcs_store"],
                "max_results": 5,
                "include_citations": True,
                "user_pseudo_id": "user_12345"
            }
        }


class CitationSource(BaseModel):
    """Source information for a citation."""
    
    reference_id: str = Field(..., description="Reference ID from Discovery Engine")
    document_id: Optional[str] = Field(None, description="Document ID if available")
    uri: Optional[str] = Field(None, description="Source URI/URL")
    title: Optional[str] = Field(None, description="Extracted title from URI")
    struct_data: Optional[dict] = Field(None, description="Structured data from the source")


class MappedCitation(BaseModel):
    """Mapped citation with extracted text and source information."""
    
    cited_text: str = Field(..., description="The actual text that was cited")
    start_index: int = Field(..., description="Start position of citation in answer text")
    end_index: int = Field(..., description="End position of citation in answer text")
    sources: List[CitationSource] = Field(default=[], description="Source information for this citation")


class QueryResponse(BaseModel):
    """Response model for Discovery Engine queries."""
    
    answer: str = Field(..., description="Generated answer text")
    citations: List[MappedCitation] = Field(
        default=[], 
        description="Mapped citations with source information"
    )
    session_id: Optional[str] = Field(
        None, 
        description="Session ID used for the query"
    )
    query_classification: Optional[dict] = Field(
        None, 
        description="Query classification results (adversarial, non-answer seeking, etc.)"
    )
    grounding_supports: Optional[List[dict]] = Field(
        None, 
        description="Grounding support information"
    )
    status: str = Field(
        default="success", 
        description="Response status"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "answer": "To set up push notifications in MoEngage, follow these steps[1]...",
                "citations": [
                    {
                        "cited_text": "follow these steps",
                        "start_index": 45,
                        "end_index": 63,
                        "sources": [
                            {
                                "reference_id": "0",
                                "uri": "https://help.moengage.com/push-setup",
                                "title": "Push Notification Setup Guide"
                            }
                        ]
                    }
                ],
                "session_id": "projects/.../sessions/12345",
                "status": "success"
            }
        }


class RecommendationsRequest(BaseModel):
    """Request model for getting recommendations based on comprehensive Zendesk ticket information."""
    
    ticket_info: str = Field(
        ..., 
        description="Complete formatted ticket information including title, description, and comment history"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "ticket_info": """* **Ticket Title:** Cards not working as expected
* **Ticket Description:** We have configured the cards on two screens in bhim app. We triggered two campaigns and with same segment, same image and different screens. We observed that the campaign was visible for one user at both places while for other it was not visible on one screen. After some time both campaigns are not visible, and they are still active please check
* **Ticket Comments:**
  ```
  Comment #1 (Public) - Author ID: 29875633107604 - 2025-06-16T11:31:14Z
  We have configured the cards on two screens in bhim app. We triggered two campaigns and with same segment, same image and different screens. We observed that the campaign was visible for one user at both places while for other it was not visible on one screen. After some time both campaigns are not visible, and they are still active please check

  Comment #2 (Private) - Author ID: 389020894711 - 2025-06-16T11:32:09Z
  --- AI Agent Analysis ---
  
  ## Issue Summary
  The user is experiencing an issue with MoEngage Cards displaying inconsistently in their "bhim app". They configured two card campaigns targeting the same segment with similar content but for different screens.
  
  ## Troubleshooting Plan
  1. **Verify Campaign Status and Configuration**
  2. **Check Campaign Segmentation and User Eligibility**
  3. **Inspect App-Side Card Fetching and Display Logic**
  ```"""
            }
        }


class RecommendationsResponse(BaseModel):
    """Response model for ticket recommendations."""
    
    related_questions: List[str] = Field(
        default=[], 
        description="List of related questions that might help resolve the issue"
    )
    relevant_tickets: List[str] = Field(
        default=[], 
        description="List of relevant ticket IDs that have similar issues"
    )
    status: str = Field(
        default="success", 
        description="Response status"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "related_questions": [
                    "How do I troubleshoot push notification delivery issues?",
                    "What are common causes of Android push notification failures?",
                    "How to verify push notification configuration?",
                    "What SDK version compatibility issues affect push notifications?",
                    "How to debug push notification registration problems?"
                ],
                "relevant_tickets": [
                    "TICKET-67890",
                    "TICKET-54321", 
                    "TICKET-98765",
                    "TICKET-11223",
                    "TICKET-44556"
                ],
                "status": "success"
            }
        }
