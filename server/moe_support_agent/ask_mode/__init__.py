"""
Ask Mode API module for MoEngage Support Agent.

This module provides direct REST API access to Google Discovery Engine functionality,
allowing external applications to create sessions and perform queries without
going through the conversational agent interface.

Key Features:
- Session management for conversational context
- Direct Discovery Engine integration
- RESTful API with OpenAPI documentation
- Comprehensive error handling and validation

Usage:
    from moe_support_agent.ask_mode import ask_router
    app.include_router(ask_router)
"""

from .router import ask_router
from .models import (
    CreateSessionRequest, 
    CreateSessionResponse, 
    ErrorResponse,
    QueryRequest,
    QueryResponse,
    CitationSource,
    MappedCitation,
    RecommendationsRequest,
    RecommendationsResponse
)
from .services import SessionService, get_session_service
from .sessions import sessions_router
from .prompt_library import prompt_library_router

__all__ = [
    "ask_router",
    "CreateSessionRequest", 
    "CreateSessionResponse",
    "ErrorResponse",
    "QueryRequest",
    "QueryResponse", 
    "CitationSource",
    "MappedCitation",
    "RecommendationsRequest",
    "RecommendationsResponse",
    "SessionService",
    "get_session_service",
    "sessions_router",
    "prompt_library_router"
]

__version__ = "1.0.0"
