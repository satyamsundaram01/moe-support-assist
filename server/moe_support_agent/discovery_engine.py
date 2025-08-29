"""
Google Discovery Engine (Vertex AI Search) integration module for MoEngage support tools.

This module provides search functionality using Google's Generative AI App Builder
(Discovery Engine) to retrieve information from Confluence runbooks, Zendesk tickets,
and help documentation.
"""

import os
import logging
from typing import Dict, Any, List, Optional

from google.api_core.client_options import ClientOptions
from google.cloud import discoveryengine_v1 as discoveryengine
from google.oauth2 import service_account
from google.auth.transport.requests import Request

# Import configuration
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Get configuration from config module
discovery_config = config.discovery_engine_config

# Initialize credentials from configuration
try:
    credentials = service_account.Credentials.from_service_account_info(
        discovery_config["credentials"], 
        scopes=["https://www.googleapis.com/auth/cloud-platform"], 
        subject="agent.reader@moengage.com"
    )
    logger.info("✅ Google service account credentials loaded successfully")
except Exception as e:
    logger.warning(f"⚠️  Failed to load Google service account credentials: {e}")
    logger.warning("   Discovery Engine features will be limited. Some search functions may not work.")
    # Create a dummy credentials object for local development
    credentials = None

# Configuration values from config
DEFAULT_PROJECT_ID = discovery_config["project_id"]
DEFAULT_LOCATION = discovery_config["location"]
DEFAULT_ENGINE_ID = discovery_config["engine_id"]

# Datastore IDs from configuration
CONFLUENCE_RUNBOOKS_DATASTORE_ID = discovery_config["datastores"]["confluence_runbooks"]
ZENDESK_TICKETS_DATASTORE_ID = discovery_config["datastores"]["zendesk_tickets"]
HELP_DOCS_DATASTORE_ID = discovery_config["datastores"]["help_docs"]

# Shared Discovery Engine client instance for ADK compatibility
_discovery_client = None


# def _get_discovery_client() -> DiscoveryEngineClient:
#     """Base exception for Discovery Engine errors"""
#     pass


class DiscoveryEngineClient:
    """Client for interacting with Google Discovery Engine"""
    
    def __init__(
        self, 
        project_id: str = DEFAULT_PROJECT_ID,
        location: str = DEFAULT_LOCATION
    ):
        """
        Initialize the Discovery Engine client.
        
        Args:
            project_id: Google Cloud project ID
            location: Google Cloud region ("global", "us", "eu")
        """
        self.project_id = project_id
        self.location = location
        
        # Check if we have valid credentials
        if credentials is None:
            logger.warning("⚠️  No valid Google credentials available. Discovery Engine will return mock responses.")
            self.client = None
            return
        
        # Configure client options based on location
        self.client_options = (
            ClientOptions(api_endpoint=f"{location}-discoveryengine.googleapis.com")
            if location != "global"
            else None
        )
        
        # Initialize the client
        try:
            self.client = discoveryengine.ConversationalSearchServiceClient(
                credentials=credentials,
                client_options=self.client_options
            )
            logger.info(f"Discovery Engine client initialized for project {project_id} in {location}")
        except Exception as e:
            logger.exception(f"Failed to initialize Discovery Engine client: {e}")
            self.client = None
    
    def search(
        self,
        query_text: str,
        data_store_id: str,
        max_results: int = 3,
        session_id: Optional[str] = None,
        preamble: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Search using Discovery Engine and get a generated answer with citations.
        
        Args:
            query_text: The search query text
            data_store_id: The data store ID to search
            max_results: Maximum number of results to return
            session_id: Optional session ID for conversational search
            preamble: Optional preamble for answer generation
            
        Returns:
            Dictionary with search results and metadata
        """
        # If client is not available, return mock response
        if self.client is None:
            logger.warning(f"Discovery Engine client not available. Returning mock response for query: '{query_text}'")
            return {
                "status": "mock",
                "answer": f"This is a mock response for the query: '{query_text}'. Discovery Engine is not configured with valid credentials.",
                "citations": [],
                "mock_response": True
            }
        
        try:
            # The full resource name of the Search serving config
            serving_config = f"projects/{self.project_id}/locations/{self.location}/collections/default_collection/engines/{DEFAULT_ENGINE_ID}/servingConfigs/default_serving_config"
            
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
                "You are a MoEngage support assistant. Provide detailed technical information "
                "about the MoEngage platform. Focus on specific features, technical details, "
                "API endpoints, and troubleshooting steps."
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
                include_citations=True,
                answer_language_code="en",
            )
            
            # Configure search spec
            search_spec = discoveryengine.AnswerQueryRequest.SearchSpec(
                search_params=discoveryengine.AnswerQueryRequest.SearchSpec.SearchParams(
                    max_return_results=max_results,
                    data_store_specs=[
                        discoveryengine.SearchRequest.DataStoreSpec(
                            data_store=f"projects/{self.project_id}/locations/{self.location}/collections/default_collection/dataStores/{data_store_id}"
                        ),
                    ]
                )
            )
            
            # Initialize request
            request = discoveryengine.AnswerQueryRequest(
                serving_config=serving_config,
                query=discoveryengine.Query(text=query_text),
                search_spec=search_spec,
                session=session_id,
                user_pseudo_id="agent.reader@moengage.com",
                query_understanding_spec=query_understanding_spec,
                answer_generation_spec=answer_generation_spec,
            )
            
            # Make the request
            logger.info(f"Sending search request for query: '{query_text}' to datastore: {data_store_id}")
            response = self.client.answer_query(request)
            
            # Process the response
            answer_text = response.answer.answer_text if hasattr(response.answer, "answer_text") else ""
            logger.info(response.answer)
            for ref in response.answer.references:
                logger.info(f"Reference: {ref}")
                
            # Extract citations if available
            citations = []
            if hasattr(response.answer, "citations") and response.answer.citations:
                for citation in response.answer.citations:
                    logger.info(f"Citation: {citation}")
                    citation_data = {
                        "start_index": getattr(citation, "start_index", 0),
                        "end_index": getattr(citation, "end_index", 0),
                        "uri": getattr(citation, "uri", ""),
                        "title": getattr(citation, "title", "")
                    }
                    citations.append(citation_data)
            logger.info(citations)
            # Build response
            search_response = {
                "status": "success",
                "answer": answer_text,
                "citations": citations,
                "response_whole" : f"{response}",
            }
            
            return search_response
            
        except Exception as e:
            logger.exception(f"Error in Discovery Engine search: {e}")
            return {
                "status": "error",
                "error_message": str(e),
                "answer": "",
                "citations": []
            }


def search_runbooks_tool(
    query: str,
    max_results: int = 3
) -> Dict[str, Any]:
    """
    Search MoEngage Confluence support runbooks using Discovery Engine.
    
    This function searches through the Confluence-based support runbooks to find
    relevant troubleshooting guides, procedures, and technical documentation.
    
    Args:
        query (str): The search query text describing the issue or topic
        max_results (int, optional): Maximum number of results to return. 
            Defaults to 3.
    
    Returns:
        Dict[str, Any]: Dictionary containing:
            - status (str): "success" or "error"
            - answer (str): Generated answer from the search results
            - citations (List[Dict]): List of citations with source information
            - error_message (str, optional): Error description if status is "error"
    
    Example:
        >>> results = search_runbooks_tool(
        ...     query="Push notification delivery issues",
        ...     product_areas=["Push Campaigns"],
        ...     max_results=5
        ... )
        >>> print(results["answer"])
    """
    try:
        # Build enhanced query with product areas context
        enhanced_query = query
        # if product_areas:
        #     enhanced_query += f" Product areas: {', '.join(product_areas)}"
            
        # Custom preamble for runbooks
        preamble = (
            "You are a MoEngage technical support specialist. Provide detailed troubleshooting "
            "steps and technical guidance based on internal runbooks. Focus on specific "
            "procedures, configuration steps, and known solutions. Include relevant technical "
            "details and step-by-step instructions."
        )
        
        # Initialize client and perform search
        client = DiscoveryEngineClient()
        results = client.search(
            query_text=enhanced_query,
            data_store_id=CONFLUENCE_RUNBOOKS_DATASTORE_ID,
            max_results=max_results,
            preamble=preamble
        )
        
        logger.info(f"Runbooks search completed for query: '{query}' with {results.get('total_results', 0)} results")
        return results
        
    except Exception as e:
        logger.error(f"Runbooks search error: {e}")
        return {
            "status": "error", 
            "error_message": str(e),
            "answer": "",
            "citations": []
        }
    except Exception as e:
        logger.exception(f"Unexpected error in runbooks search: {e}")
        return {
            "status": "error",
            "error_message": f"Unexpected error: {e}",
            "answer": "",
            "citations": []
        }


def search_zendesk_tickets_tool(
    query: str,
    max_results: int = 3
) -> Dict[str, Any]:
    """
    Search Zendesk support tickets using Discovery Engine.
    
    This function searches through historical Zendesk tickets to find similar
    issues, resolutions, and support patterns that can help with current problems.
    
    Args:
        query (str): The search query text describing the issue or problem
        max_results (int, optional): Maximum number of results to return. 
            Defaults to 3.
    
    Returns:
        Dict[str, Any]: Dictionary containing:
            - status (str): "success" or "error"
            - answer (str): Generated answer based on ticket resolutions
            - citations (List[Dict]): List of citations with source information
            - error_message (str, optional): Error description if status is "error"
    
    Example:
        >>> results = search_zendesk_tickets_tool(
        ...     query="API rate limiting errors",
        ...     intent="integration_problem",
        ...     max_results=5
        ... )
        >>> print(results["answer"])
    """
    try:
        # Build enhanced query with intent context
        enhanced_query = query
            
        # Custom preamble for Zendesk tickets
        preamble = (
            "You are a MoEngage support agent analyzing historical support tickets. "
            "Provide solutions and insights based on how similar issues were resolved "
            "in the past. Focus on proven solutions, common patterns, and actionable "
            "steps that worked for other customers."
        )
        
        # Initialize client and perform search
        client = DiscoveryEngineClient()
        results = client.search(
            query_text=enhanced_query,
            data_store_id=ZENDESK_TICKETS_DATASTORE_ID,
            max_results=max_results,
            preamble=preamble
        )
        
        logger.info(f"Zendesk search completed for query: '{query}' with {results.get('total_results', 0)} results")
        return results
        
    except Exception as e:
        logger.error(f"Zendesk search error: {e}")
        return {
            "status": "error", 
            "error_message": str(e),
            "answer": "",
            "citations": []
        }
    except Exception as e:
        logger.exception(f"Unexpected error in Zendesk search: {e}")
        return {
            "status": "error",
            "error_message": f"Unexpected error: {e}",
            "answer": "",
            "citations": []
        }


def search_help_docs_tool(
    query: str,
    max_results: int = 3
) -> Dict[str, Any]:
    """
    Search MoEngage public help documentation using Discovery Engine.
    
    This function searches through the public help documentation to find
    relevant guides, API documentation, feature explanations, and user manuals.
    
    Args:
        query (str): The search query text describing the topic or feature
        max_results (int, optional): Maximum number of results to return. 
            Defaults to 3.
    
    Returns:
        Dict[str, Any]: Dictionary containing:
            - status (str): "success" or "error"
            - answer (str): Generated answer from the documentation
            - citations (List[Dict]): List of citations with source information
            - error_message (str, optional): Error description if status is "error"
    
    Example:
        >>> results = search_help_docs_tool(
        ...     query="How to set up push notification campaigns",
        ...     max_results=5
        ... )
        >>> print(results["answer"])
    """
    try:
        # Build enhanced query with product areas context
        enhanced_query = query
            
        # Custom preamble for help documentation
        preamble = (
            "You are a MoEngage documentation assistant. Provide clear, comprehensive "
            "explanations based on official documentation. Focus on step-by-step guides, "
            "feature descriptions, API usage examples, and best practices. Include specific "
            "configuration details and code examples where applicable."
        )
        
        # Initialize client and perform search
        client = DiscoveryEngineClient()
        results = client.search(
            query_text=enhanced_query,
            data_store_id=HELP_DOCS_DATASTORE_ID,
            max_results=max_results,
            preamble=preamble
        )
        
        logger.info(f"Help docs search completed for query: '{query}' with {results.get('total_results', 0)} results")
        return results
        
    except Exception as e:
        logger.error(f"Help docs search error: {e}")
        return {
            "status": "error", 
            "error_message": str(e),
            "answer": "",
            "citations": []
        }
    except Exception as e:
        logger.exception(f"Unexpected error in help docs search: {e}")
        return {
            "status": "error",
            "error_message": f"Unexpected error: {e}",
            "answer": "",
            "citations": []
        }


# Legacy function for backward compatibility
def answer_query(
    project_id: str,
    location: str,
    engine_id: str,
    data_store_id: str,
    query: str,
) -> discoveryengine.AnswerQueryResponse:
    """
    Legacy function for backward compatibility.
    
    This function maintains compatibility with existing code that uses the original
    answer_query function. For new implementations, use the specific search functions
    (search_runbooks_tool, search_zendesk_tickets_tool, search_help_docs_tool).
    
    Args:
        project_id: Google Cloud project ID
        location: Google Cloud region
        engine_id: Discovery Engine ID (deprecated, use data_store_id)
        data_store_id: Data store ID to search
        query: Search query text
        
    Returns:
        discoveryengine.AnswerQueryResponse: Raw Discovery Engine response
    """
    logger.warning("Using deprecated answer_query function. Consider using specific search functions instead.")
    
    client = DiscoveryEngineClient(project_id=project_id, location=location)
    
    # Use the new search method but return raw response for compatibility
    try:
        # The full resource name of the Search serving config
        serving_config = (
            f"projects/{project_id}/locations/{location}/"
            f"collections/default_collection/engines/{engine_id}/"
            f"servingConfigs/default_serving_config"
        )
        
        # Configure search spec
        search_spec = discoveryengine.AnswerQueryRequest.SearchSpec(
            search_params=discoveryengine.AnswerQueryRequest.SearchSpec.SearchParams(
                max_return_results=10,
                data_store_specs=[
                    discoveryengine.SearchRequest.DataStoreSpec(
                        data_store=f"projects/{project_id}/locations/{location}/collections/default_collection/dataStores/{data_store_id}"
                    ),
                ]
            )
        )
        
        # Initialize request
        request = discoveryengine.AnswerQueryRequest(
            serving_config=serving_config,
            query=discoveryengine.Query(text=query),
            search_spec=search_spec,
            user_pseudo_id="agent.reader@moengage.com",
        )
        
        # Make the request
        response = client.client.answer_query(request)
        return response
        
    except Exception as e:
        logger.exception(f"Error in legacy answer_query: {e}")
        raise


# Simple test if run directly
if __name__ == "__main__":
    import json
    
    # Test runbooks search
    # print("Testing Runbooks search...")
    # runbooks_results = search_runbooks_tool(
    #     query="push notification delivery issues",
    #     product_areas=["Push Campaigns"],
    #     max_results=3
    # )
    # print(json.dumps(runbooks_results, indent=2))
    
    # # Test Zendesk search
    # print("\nTesting Zendesk search...")
    # zendesk_results = search_zendesk_tickets_tool(
    #     query="API rate limiting errors",
    #     intent="integration_problem",
    #     max_results=3
    # )
    # print(json.dumps(zendesk_results, indent=2))
    
    # Test help docs search
    print("\nTesting Help Docs search...")
    help_docs_results = search_help_docs_tool(
        query="how to set up push campaigns",
        max_results=3
    )
    print(json.dumps(help_docs_results))
