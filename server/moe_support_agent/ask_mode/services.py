"""
Service layer for Ask Mode API functionality.

This module provides business logic for interacting with Google Discovery Engine,
including session management and query processing.
"""

import logging
import json
import re
from datetime import datetime
from typing import Optional, List
from urllib.parse import urlparse

from google.cloud import discoveryengine_v1 as discoveryengine
from google.api_core.client_options import ClientOptions

from ..discovery_engine import (
    DEFAULT_PROJECT_ID, 
    DEFAULT_LOCATION, 
    DEFAULT_ENGINE_ID, 
    credentials,
    CONFLUENCE_RUNBOOKS_DATASTORE_ID,
    ZENDESK_TICKETS_DATASTORE_ID,
    HELP_DOCS_DATASTORE_ID
)
from .models import (
    CreateSessionResponse, 
    ErrorResponse, 
    QueryResponse, 
    MappedCitation, 
    CitationSource,
    RecommendationsResponse
)

logger = logging.getLogger(__name__)


class SessionService:
    """Service for managing Discovery Engine sessions."""
    
    def __init__(self):
        """Initialize the session service with existing Discovery Engine configuration."""
        self.project_id = DEFAULT_PROJECT_ID
        self.location = DEFAULT_LOCATION
        self.engine_id = DEFAULT_ENGINE_ID
        
        # Configure client options based on location
        self.client_options = (
            ClientOptions(api_endpoint=f"{self.location}-discoveryengine.googleapis.com")
            if self.location != "global"
            else None
        )
        
        # Initialize the Discovery Engine client
        try:
            self.client = discoveryengine.ConversationalSearchServiceClient(
                credentials=credentials,
                client_options=self.client_options
            )
            logger.info(f"SessionService initialized for project {self.project_id} in {self.location}")
        except Exception as e:
            logger.error(f"Failed to initialize Discovery Engine client: {e}")
            raise Exception(f"Failed to initialize Discovery Engine client: {e}")
    
    async def create_session(self, user_id: str) -> CreateSessionResponse:
        """
        Create a new Discovery Engine session for the specified user.
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            CreateSessionResponse: Response containing session details
            
        Raises:
            Exception: If session creation fails
        """
        try:
            logger.info(f"Creating Discovery Engine session for user: {user_id}")
            
            # Build the parent resource name
            parent = (
                f"projects/{self.project_id}/locations/{self.location}/"
                f"collections/default_collection/engines/{self.engine_id}"
            )
            
            # Create the session request
            session_request = discoveryengine.Session(
                user_pseudo_id=user_id
            )
            
            # Make the API call to create the session
            session = self.client.create_session(
                parent=parent,
                session=session_request
            )
            
            # Extract session ID from the full resource name
            session_id = session.name
            
            # Create response
            response = CreateSessionResponse(
                session_id=session_id,
                user_id=user_id,
                created_at=datetime.utcnow().isoformat() + "Z",
                status="active"
            )
            
            logger.info(f"Session created successfully: {session_id}")
            return response
            
        except Exception as e:
            error_msg = f"Failed to create session for user {user_id}: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def validate_user_id(self, user_id: str) -> Optional[str]:
        """
        Validate user ID format and return error message if invalid.
        
        Args:
            user_id: User ID to validate
            
        Returns:
            Optional[str]: Error message if validation fails, None if valid
        """
        if not user_id or not user_id.strip():
            return "User ID cannot be empty"
        
        if len(user_id.strip()) > 100:
            return "User ID cannot exceed 100 characters"
        
        # Additional validation rules can be added here
        # For example: alphanumeric only, specific format, etc.
        
        return None
    
    def get_session_parent_path(self) -> str:
        """
        Get the parent path for session creation.
        
        Returns:
            str: Parent resource path for the engine
        """
        return (
            f"projects/{self.project_id}/locations/{self.location}/"
            f"collections/default_collection/engines/{self.engine_id}"
        )
    
    def get_default_data_sources(self) -> List[str]:
        """
        Get the default data sources for queries.
        
        Returns:
            List[str]: List of default data store IDs
        """
        return [
            HELP_DOCS_DATASTORE_ID,
            CONFLUENCE_RUNBOOKS_DATASTORE_ID,
            ZENDESK_TICKETS_DATASTORE_ID
        ]
    
    def validate_data_sources(self, data_sources: List[str]) -> Optional[str]:
        """
        Validate that data sources exist and are accessible.
        
        Args:
            data_sources: List of data store IDs to validate
            
        Returns:
            Optional[str]: Error message if validation fails, None if valid
        """
        available_sources = self.get_default_data_sources()
        
        for source in data_sources:
            if source not in available_sources:
                return f"Invalid data source: {source}. Available sources: {', '.join(available_sources)}"
        
        return None
    
    def extract_title_from_uri(self, uri: str) -> str:
        """
        Extract title from URI for better citation display.
        
        Args:
            uri: The URI to extract title from
            
        Returns:
            str: Extracted title or URI if extraction fails
        """
        try:
            parsed = urlparse(uri)
            
            # Extract filename from path
            path_parts = parsed.path.strip('/').split('/')
            if path_parts and path_parts[-1]:
                filename = path_parts[-1]
                # Remove file extension and replace hyphens/underscores with spaces
                title = filename.split('.')[0].replace('-', ' ').replace('_', ' ')
                return title.title()
            
            # Fallback to domain name
            if parsed.netloc:
                return parsed.netloc.replace('www.', '').title()
            
            return uri
            
        except Exception:
            return uri
    
    def map_citations_to_references(self, answer) -> List[MappedCitation]:
        """
        Map citations to references with extracted text and source information.
        
        Args:
            answer: The Answer object from Discovery Engine response
            
        Returns:
            List[MappedCitation]: List of mapped citation objects
        """
        mapped_citations = []
        
        if not hasattr(answer, 'citations') or not answer.citations:
            return mapped_citations
        
        for citation in answer.citations:
            # Extract the actual cited text from the answer
            cited_text = answer.answer_text[citation.start_index:citation.end_index]
            
            citation_info = MappedCitation(
                cited_text=cited_text,
                start_index=citation.start_index,
                end_index=citation.end_index,
                sources=[]
            )
            
            # Map each source using reference_id as index
            for source in citation.sources:
                try:
                    ref_index = int(source.reference_id)
                    if ref_index < len(answer.references):
                        reference = answer.references[ref_index]
                        
                        # Handle structured document info
                        if hasattr(reference, 'structured_document_info') and reference.structured_document_info:
                            source_info = CitationSource(
                                reference_id=source.reference_id,
                                document_id=reference.structured_document_info.document,
                                uri=reference.structured_document_info.uri,
                                title=self.extract_title_from_uri(reference.structured_document_info.uri),
                                struct_data=dict(reference.structured_document_info.struct_data) if reference.structured_document_info.struct_data else None
                            )
                            citation_info.sources.append(source_info)
                        
                        # Handle unstructured document info
                        elif hasattr(reference, 'unstructured_document_info') and reference.unstructured_document_info:
                            source_info = CitationSource(
                                reference_id=source.reference_id,
                                document_id=reference.unstructured_document_info.document,
                                uri=reference.unstructured_document_info.uri,
                                title=self.extract_title_from_uri(reference.unstructured_document_info.uri),
                                struct_data=None
                            )
                            citation_info.sources.append(source_info)
                        
                        # Handle chunk info
                        elif hasattr(reference, 'chunk_info') and reference.chunk_info:
                            source_info = CitationSource(
                                reference_id=source.reference_id,
                                document_id=reference.chunk_info.document_metadata.document,
                                uri=reference.chunk_info.document_metadata.uri,
                                title=self.extract_title_from_uri(reference.chunk_info.document_metadata.uri),
                                struct_data=None
                            )
                            citation_info.sources.append(source_info)
                            
                except (ValueError, IndexError, AttributeError) as e:
                    logger.warning(f"Failed to process citation source {source.reference_id}: {e}")
                    continue
            
            mapped_citations.append(citation_info)
        
        return mapped_citations
    
    async def answer_query(
        self,
        query: str,
        session_id: Optional[str] = None,
        preamble: Optional[str] = None,
        data_sources: Optional[List[str]] = None,
        max_results: int = 10,
        include_citations: bool = True,
        user_pseudo_id: Optional[str] = None
    ) -> QueryResponse:
        """
        Execute a Discovery Engine query with full customization.
        
        Args:
            query: The search query text
            session_id: Optional session ID for conversational context
            preamble: Optional custom preamble for answer generation
            data_sources: Optional list of data store IDs to search
            max_results: Maximum number of results to return
            include_citations: Whether to include citations in response
            user_pseudo_id: Optional user pseudo ID for tracking
            
        Returns:
            QueryResponse: Response containing answer and citations
            
        Raises:
            Exception: If query execution fails
        """
        try:
            logger.info(f"Executing Discovery Engine query: '{query[:100]}...'")
            
            # Use default data sources if none provided
            if not data_sources:
                data_sources = self.get_default_data_sources()
            
            # Build serving config
            serving_config = (
                f"projects/{self.project_id}/locations/{self.location}/"
                f"collections/default_collection/engines/{self.engine_id}/"
                f"servingConfigs/default_serving_config"
            )
            
            # Configure query understanding spec
            query_understanding_spec = discoveryengine.AnswerQueryRequest.QueryUnderstandingSpec(
                query_rephraser_spec=discoveryengine.AnswerQueryRequest.QueryUnderstandingSpec.QueryRephraserSpec(
                    disable=False,
                    max_rephrase_steps=1,
                ),
                query_classification_spec=discoveryengine.AnswerQueryRequest.QueryUnderstandingSpec.QueryClassificationSpec(
                    types=[
                        discoveryengine.AnswerQueryRequest.QueryUnderstandingSpec.QueryClassificationSpec.Type.ADVERSARIAL_QUERY,
                        discoveryengine.AnswerQueryRequest.QueryUnderstandingSpec.QueryClassificationSpec.Type.NON_ANSWER_SEEKING_QUERY,
                    ]
                ),
            )
            
            # Configure answer generation spec
            default_preamble = (
                "You are MoEngage Support Assistant, a helpful AI assistant for MoEngage customers. "
                "Provide detailed, accurate answers based on MoEngage documentation. "
                "Use proper formatting and always include relevant citations and sources. "
                "Be specific and actionable in your responses."
            )
            
            answer_generation_spec = discoveryengine.AnswerQueryRequest.AnswerGenerationSpec(
                ignore_adversarial_query=False,
                ignore_non_answer_seeking_query=False,
                ignore_low_relevant_content=False,
                model_spec=discoveryengine.AnswerQueryRequest.AnswerGenerationSpec.ModelSpec(
                    model_version="gemini-2.5-flash/answer_gen/v1",
                ),
                prompt_spec=discoveryengine.AnswerQueryRequest.AnswerGenerationSpec.PromptSpec(
                    preamble=preamble or default_preamble,
                ),
                include_citations=include_citations,
                answer_language_code="en",
            )
            
            # Configure grounding spec
            grounding_spec = discoveryengine.AnswerQueryRequest.GroundingSpec(
                include_grounding_supports=True,
            )
            
            # Configure search spec
            data_store_specs = []
            for data_source in data_sources:
                data_store_spec = discoveryengine.SearchRequest.DataStoreSpec(
                    data_store=f"projects/{self.project_id}/locations/{self.location}/collections/default_collection/dataStores/{data_source}"
                )
                data_store_specs.append(data_store_spec)
            
            search_spec = discoveryengine.AnswerQueryRequest.SearchSpec(
                search_params=discoveryengine.AnswerQueryRequest.SearchSpec.SearchParams(
                    max_return_results=max_results,
                    data_store_specs=data_store_specs
                )
            )
            
            # Initialize request
            request = discoveryengine.AnswerQueryRequest(
                serving_config=serving_config,
                query=discoveryengine.Query(text=query),
                session=session_id,
                user_pseudo_id=user_pseudo_id or "ask-mode-api-user",
                search_spec=search_spec,
                query_understanding_spec=query_understanding_spec,
                answer_generation_spec=answer_generation_spec,
                grounding_spec=grounding_spec,
            )
            
            # Make the request
            logger.info(f"Sending Discovery Engine request for query: '{query[:50]}...'")
            response = self.client.answer_query(request)
            
            # Process the response
            answer_text = response.answer.answer_text if hasattr(response.answer, "answer_text") else ""
            
            # Map citations
            mapped_citations = []
            if include_citations and hasattr(response.answer, "citations"):
                mapped_citations = self.map_citations_to_references(response.answer)
            
            # Extract query classification if available
            query_classification = None
            if hasattr(response, "query_understanding_info") and response.query_understanding_info:
                query_classification = {
                    "query_classification_info": dict(response.query_understanding_info.query_classification_info) if hasattr(response.query_understanding_info, "query_classification_info") else None
                }
            
            # Extract grounding supports if available
            grounding_supports = []
            if hasattr(response.answer, "grounding_supports") and response.answer.grounding_supports:
                for support in response.answer.grounding_supports:
                    grounding_supports.append({
                        "segment": dict(support.segment) if hasattr(support, "segment") else None,
                        "grounding_check_required": getattr(support, "grounding_check_required", False)
                    })
            
            # Build response
            query_response = QueryResponse(
                answer=answer_text,
                citations=mapped_citations,
                session_id=session_id,
                query_classification=query_classification,
                grounding_supports=grounding_supports if grounding_supports else None,
                status="success"
            )
            
            logger.info(f"Query executed successfully, answer length: {len(answer_text)} chars, citations: {len(mapped_citations)}")
            return query_response
            
        except Exception as e:
            error_msg = f"Failed to execute query: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise Exception(error_msg)
    
    def validate_ticket_info(self, ticket_info: str) -> Optional[str]:
        """
        Validate ticket info contains minimum required information.
        
        Args:
            ticket_info: Formatted ticket information to validate
            
        Returns:
            Optional[str]: Error message if validation fails, None if valid
        """
        if not ticket_info or not ticket_info.strip():
            return "Ticket info cannot be empty"
        
        # Check for essential components
        required_indicators = ['Ticket Title:', 'Ticket Description:', 'Comment']
        if not any(indicator in ticket_info for indicator in required_indicators):
            return "Ticket info must contain at least title, description, or comments"
        
        # Check minimum length for meaningful analysis
        if len(ticket_info.strip()) < 100:
            return "Ticket info too short for meaningful analysis"
        
        return None
    
    def extract_ticket_context(self, ticket_info: str) -> str:
        """
        Extract and structure relevant context from formatted ticket information.
        
        Args:
            ticket_info: Formatted ticket information string
            
        Returns:
            str: Structured ticket context for analysis
        """
        context_parts = []
        
        # Extract title
        title_match = re.search(r'\*\*Ticket Title:\*\*\s*(.+)', ticket_info)
        if title_match:
            title = title_match.group(1).strip()
            context_parts.append(f"Issue: {title}")
        
        # Extract description
        desc_match = re.search(r'\*\*Ticket Description:\*\*\s*(.+?)(?=\*\*Ticket Comments:|$)', ticket_info, re.DOTALL)
        if desc_match:
            description = desc_match.group(1).strip()
            # Clean up formatting
            description = re.sub(r'\r\n', ' ', description)
            description = re.sub(r'\s+', ' ', description)
            context_parts.append(f"Description: {description}")
        
        # Extract key technical details from comments
        # Focus on error messages, technical configurations, and problem statements
        comment_pattern = r'Comment #\d+.*?Author ID:.*?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s*\n(.*?)(?=Comment #|\n\n|\Z)'
        comment_matches = re.findall(comment_pattern, ticket_info, re.DOTALL)
        
        technical_details = []
        moengage_features = []
        error_details = []
        
        for timestamp, comment_content in comment_matches[-8:]:  # Last 8 comments for relevance
            # Clean comment content
            clean_comment = re.sub(r'\n+', ' ', comment_content)
            clean_comment = re.sub(r'\s+', ' ', clean_comment)
            clean_comment = clean_comment.strip()
            
            if not clean_comment or len(clean_comment) < 20:
                continue
            
            # Extract MoEngage-specific features mentioned
            moe_features = re.findall(r'\b(Cards?|SDK|Push|Campaign|Notification|Integration|Analytics|Segmentation|API|Dashboard)\b', clean_comment, re.IGNORECASE)
            if moe_features:
                unique_features = list(set([f.lower() for f in moe_features]))
                moengage_features.extend(unique_features)
            
            # Extract error messages and technical issues
            if any(keyword in clean_comment.lower() for keyword in ['error', 'issue', 'problem', 'not working', 'failed', 'bug']):
                if len(clean_comment) > 400:
                    clean_comment = clean_comment[:400] + "..."
                error_details.append(clean_comment)
            
            # Extract technical configurations and solutions
            elif any(keyword in clean_comment.lower() for keyword in ['configuration', 'setup', 'implementation', 'version', 'upgrade', 'fix']):
                if len(clean_comment) > 300:
                    clean_comment = clean_comment[:300] + "..."
                technical_details.append(clean_comment)
        
        # Add MoEngage features context
        if moengage_features:
            unique_features = list(set(moengage_features))
            context_parts.append(f"MoEngage Features: {', '.join(unique_features)}")
        
        # Add error details
        if error_details:
            context_parts.append(f"Error Details: {' | '.join(error_details[:3])}")  # Top 3 error details
        
        # Add technical details
        if technical_details:
            context_parts.append(f"Technical Details: {' | '.join(technical_details[:2])}")  # Top 2 technical details
        
        return "\n".join(context_parts)
    
    def parse_recommendations_response(self, raw_answer: str) -> RecommendationsResponse:
        """
        Parse Discovery Engine response and extract structured recommendations.
        
        Args:
            raw_answer: Raw answer text from Discovery Engine
            
        Returns:
            RecommendationsResponse: Parsed recommendations
        """
        try:
            # Try to parse as JSON directly
            parsed = json.loads(raw_answer.strip())
            
            return RecommendationsResponse(
                related_questions=parsed.get('related_questions', []),
                relevant_tickets=parsed.get('relevant_tickets', []),
                status="success"
            )
            
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_answer, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(1))
                    return RecommendationsResponse(
                        related_questions=parsed.get('related_questions', []),
                        relevant_tickets=parsed.get('relevant_tickets', []),
                        status="success"
                    )
                except json.JSONDecodeError:
                    pass
            
            # Try to extract JSON from the response text using regex
            json_pattern = r'\{[^{}]*"related_questions"[^{}]*"relevant_tickets"[^{}]*\}'
            json_match = re.search(json_pattern, raw_answer, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(0))
                    return RecommendationsResponse(
                        related_questions=parsed.get('related_questions', []),
                        relevant_tickets=parsed.get('relevant_tickets', []),
                        status="success"
                    )
                except json.JSONDecodeError:
                    pass
            
            # Fallback: provide empty response with parsing failed status
            logger.warning(f"Failed to parse recommendations response: {raw_answer[:200]}...")
            return RecommendationsResponse(
                related_questions=[],
                relevant_tickets=[],
                status="parsing_failed"
            )
            
        except Exception as e:
            logger.error(f"Unexpected error parsing recommendations: {e}")
            return RecommendationsResponse(
                related_questions=[],
                relevant_tickets=[],
                status="error"
            )
    
    async def get_recommendations(
        self,
        ticket_info: str
    ) -> RecommendationsResponse:
        """
        Get recommendations based on comprehensive Zendesk ticket information.
        
        Args:
            ticket_info: Complete formatted ticket information string
            
        Returns:
            RecommendationsResponse: Structured recommendations
            
        Raises:
            Exception: If recommendation generation fails
        """
        try:
            logger.info("Generating recommendations for ticket information")
            
            # Extract ticket context
            ticket_context = self.extract_ticket_context(ticket_info)
            
            # Build query
            query = f"Analyze this comprehensive support ticket thread and provide recommendations:\n\n{ticket_context}"
            
            # Use all data sources (no filtering)
            data_sources = self.get_default_data_sources()
            
            # Enhanced recommendations-specific preamble for complex ticket analysis
            recommendations_preamble = """
You are a MoEngage support ticket analysis expert specializing in complex technical support threads. Analyze the provided comprehensive ticket information and return recommendations in strict JSON format.

The ticket information includes:
- Ticket title and description
- Complete comment history with timestamps
- Technical discussions and troubleshooting steps
- Multiple stakeholder interactions
- MoEngage-specific features and configurations

IMPORTANT: Your response must be valid JSON only, no additional text, explanations, or markdown formatting.

Return exactly this structure:
{
  "related_questions": [
    "Specific technical question 1 based on the MoEngage features mentioned",
    "Troubleshooting question 2 related to the core problem", 
    "Configuration question 3 for resolution",
    "Best practice question 4 for prevention",
    "Integration question 5 for similar scenarios"
  ],
  "relevant_tickets": [
    "TICKET-ID-1",
    "TICKET-ID-2", 
    "TICKET-ID-3",
    "TICKET-ID-4",
    "TICKET-ID-5"
  ]
}

Guidelines:
- Analyze the entire conversation thread to understand the core technical issue
- Generate questions that would help resolve similar MoEngage technical problems
- Focus on MoEngage-specific features mentioned (Cards, SDK, Push, Campaigns, Analytics, etc.)
- Identify patterns that could help with similar integration or configuration issues
- Provide actionable troubleshooting questions based on the technical details
- Reference real ticket IDs from similar technical issues in the knowledge base
- Consider escalation patterns and resolution complexity
- Questions should be practical and specific to MoEngage platform capabilities
- Return only valid JSON, no other text
"""
            
            # Execute query using existing answer_query method
            query_response = await self.answer_query(
                query=query,
                session_id=None,  # No session needed for recommendations
                preamble=recommendations_preamble,
                data_sources=data_sources,
                max_results=25,  # Higher limit to find more relevant tickets
                include_citations=False,  # Don't need citations for this use case
                user_pseudo_id="recommendations-api-user"
            )
            
            # Parse the JSON response
            recommendations = self.parse_recommendations_response(query_response.answer)
            
            logger.info(f"Generated {len(recommendations.related_questions)} questions and {len(recommendations.relevant_tickets)} ticket references")
            return recommendations
            
        except Exception as e:
            error_msg = f"Failed to generate recommendations: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise Exception(error_msg)


# Singleton instance for dependency injection
_session_service_instance: Optional[SessionService] = None


def get_session_service() -> SessionService:
    """
    Get or create a singleton SessionService instance.
    
    This function is used as a FastAPI dependency to ensure we reuse
    the same service instance across requests.
    
    Returns:
        SessionService: The session service instance
    """
    global _session_service_instance
    
    if _session_service_instance is None:
        _session_service_instance = SessionService()
    
    return _session_service_instance
