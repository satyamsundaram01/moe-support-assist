# agent.py - MoEngage Support Chat Extension with Conversational Architecture
import asyncio
import logging
import json
from typing import Dict, Any, List, AsyncGenerator, Sequence, Optional
from datetime import datetime
from typing_extensions import override
from google.adk.agents import LlmAgent, BaseAgent
from google.adk.tools import FunctionTool
from google.adk.tools import LongRunningFunctionTool
from google.adk.tools.agent_tool import AgentTool
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.genai import types # Import types for content
from google.adk.planners import PlanReActPlanner
import os

# Import configuration
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config

# PHOENIX_COLLECTOR_ENDPOINT='http://10.66.69.240:6006'

# from phoenix.otel import register
# tracer_provider = register(
#   project_name="your-next-llm-project",
#   endpoint="http://10.66.69.240:6006/v1/traces",
#   auto_instrument=True
# )

# Import the new conversational architecture
from .llm_conversation_manager import LlmConversationManager
from .specialists import (
    TechnicalTroubleshootAgent,
    KnowledgeSpecialist,
    FollowUpSpecialist,
    TicketSpecialist,
    PushTroubleshootAgent,
    WhatsAppTroubleshootAgent
)
from .discovery_engine import search_help_docs_tool, search_runbooks_tool, search_zendesk_tickets_tool
from .prompts import KNOWLEDGE_AGENT_PROMPT, EXECUTION_AGENT_PROMPT, CAMPAIGN_LOGS_AGENT_PROMPT
from .solution_utils import generate_final_solution, analyze_root_cause, generate_recommendations
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters, SseConnectionParams

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- LLM Configuration ---
LLM_MODEL_NAME = "gemini-2.5-flash-preview-05-20" 
llm_instance = LLM_MODEL_NAME

# --- MCP Configuration ---
mcp_config = config.get_mcp_config()

# --- Model Configuration ---
model_config = config.model_config

# --- WhatsAppSupportOrchestrator Agent ---
class WhatsAppSupportOrchestrator(BaseAgent):
    """
    Simplified orchestrator agent that routes user queries to appropriate agents
    based on intent classification.
    """
    
    # Declare fields for Pydantic validation for sub-agents
    knowledge_agent: Optional[LlmAgent] = None
    execution_agent: Optional[LlmAgent] = None
    
    # Allow arbitrary types for agent references, required by Pydantic for non-primitive types
    model_config = {"arbitrary_types_allowed": True}
    
    def __init__(
        self,
        name: str,
        knowledge_agent: LlmAgent,
        execution_agent: LlmAgent,
    ):
        """
        Initialize the orchestrator with Knowledge and Execution agents.
        """
        sub_agents_list: Sequence[BaseAgent] = [knowledge_agent, execution_agent]
        
        # Initialize parent with name and sub_agents list
        super().__init__(
            name=name,
            sub_agents=sub_agents_list,
        )
        
        # Store agent references
        self.knowledge_agent = knowledge_agent
        self.execution_agent = execution_agent
    
    def _classify_user_intent(self, user_query: str) -> str:
        """Simple rule-based intent classification"""
        query_lower = user_query.lower().strip()
        
        # Greeting patterns
        greeting_patterns = ["hey", "hi", "hello", "good morning", "good afternoon", "good evening"]
        if any(greeting in query_lower for greeting in greeting_patterns) and len(query_lower) < 20:
            return "greeting"
        
        # Technical debug patterns (needs both knowledge and execution)
        technical_patterns = ["campaign id", "not delivering", "error", "failed", "issue with campaign", "debug", "logs", "api"]
        if any(pattern in query_lower for pattern in technical_patterns):
            return "technical_debug"
        
        # Knowledge-only patterns
        knowledge_patterns = ["how to", "what is", "explain", "documentation", "guide", "setup", "configure"]
        if any(pattern in query_lower for pattern in knowledge_patterns):
            return "knowledge_only"
        
        # Very short or unclear queries
        if len(query_lower.strip()) < 5:
            return "clarification"
        
        # Default to knowledge search for support queries
        return "knowledge_only"
    
    def _extract_latest_user_message(self, ctx: InvocationContext) -> str:
        """Extract the most recent user message from the conversation"""
        latest_user_message = "No query provided for this session."
        
        # ctx.messages holds the conversation history
        if hasattr(ctx, 'messages') and ctx.messages:
            # Iterate through messages in reverse order to get the latest user message
            for message in reversed(ctx.messages):
                if message.role == 'user' and message.parts:
                    for part in message.parts:
                        if part.text and part.text.strip():
                            latest_user_message = part.text.strip()
                            logger.info(f"[{self.name}] Extracted latest user message: '{latest_user_message[:100]}...'")
                            return latest_user_message
        
        logger.info(f"[{self.name}] No user message found, using default.")
        return latest_user_message
    
    @override
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        """
        Simplified orchestration logic with clean routing.
        """
        logger.info(f"[{self.name}] Starting WhatsApp support investigation.")
        yield Event(author=self.name, content=types.Content(role='model', parts=[types.Part(text=f"Hello! I'm your MoEngage WhatsApp Support Assistant.")]))

        # Extract the latest user query from conversation
        latest_user_query = self._extract_latest_user_message(ctx)
        previous_user_query = ctx.session.state.get("user_query", "")
        
        # Check if this is a new user input
        if latest_user_query != previous_user_query:
            logger.info(f"[{self.name}] New user input detected: '{latest_user_query}'")
            ctx.session.state["user_query"] = latest_user_query
            
            # Reset state for new queries
            if previous_user_query:
                logger.info(f"[{self.name}] Resetting state for new query.")
                ctx.session.state["knowledge_findings"] = ""
                ctx.session.state["execution_results"] = ""
        
        current_user_query = ctx.session.state.get("user_query", "No query provided")
        
        # Classify user intent
        user_intent = self._classify_user_intent(current_user_query)
        logger.info(f"[{self.name}] Classified user intent as: {user_intent}")
        
        # Route based on intent
        if user_intent == "greeting":
            await self._handle_greeting(ctx)
            
        elif user_intent == "clarification":
            await self._handle_clarification(ctx)
            
        elif user_intent == "knowledge_only":
            await self._handle_knowledge_only(ctx)
            
        elif user_intent == "technical_debug":
            await self._handle_technical_debug(ctx)
        
        # Generate events for all the async methods
        async for event in self._generate_events(ctx):
            yield event
    
    async def _handle_greeting(self, ctx: InvocationContext):
        """Handle greeting responses"""
        greeting_response = """Hello! I'm your MoEngage WhatsApp Support Assistant. I'm here to help you troubleshoot WhatsApp campaign issues, analyze delivery problems, and provide technical support.

How can I assist you today? You can ask me about:
• WhatsApp campaign delivery issues
• Push notification problems
• Campaign performance analysis
• Technical troubleshooting
• Error investigation

Please describe the issue you're experiencing, and I'll investigate it for you!"""
        
        ctx.session.state["response"] = greeting_response
        ctx.session.state["phase"] = "greeting_complete"
    
    async def _handle_clarification(self, ctx: InvocationContext):
        """Handle clarification requests"""
        clarification_response = """I'd be happy to help you with your WhatsApp campaign issue! However, I need a bit more information to provide the best assistance.

Could you please provide more details about:
• What specific issue are you experiencing?
• Which WhatsApp campaign is affected?
• Any error messages you've seen?
• When did the problem start?

The more details you can share, the better I can help troubleshoot and resolve your issue!"""
        
        ctx.session.state["response"] = clarification_response
        ctx.session.state["phase"] = "clarification_complete"
    
    async def _handle_knowledge_only(self, ctx: InvocationContext):
        """Handle knowledge-only queries"""
        logger.info(f"[{self.name}] Running Knowledge Agent for knowledge-only query.")
        
        # Run knowledge agent
        knowledge_results = ""
        async for event in self.knowledge_agent.run_async(ctx):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        knowledge_results += part.text + "\n"
        
        ctx.session.state["knowledge_findings"] = knowledge_results
        ctx.session.state["response"] = knowledge_results
        ctx.session.state["phase"] = "knowledge_complete"
    
    async def _handle_technical_debug(self, ctx: InvocationContext):
        """Handle technical debugging queries"""
        logger.info(f"[{self.name}] Running Knowledge Agent followed by Execution Agent for technical debugging.")
        
        # Step 1: Run knowledge agent
        knowledge_results = ""
        async for event in self.knowledge_agent.run_async(ctx):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        knowledge_results += part.text + "\n"
        
        ctx.session.state["knowledge_findings"] = knowledge_results
        
        # Step 2: Run execution agent
        execution_results = ""
        async for event in self.execution_agent.run_async(ctx):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        execution_results += part.text + "\n"
        
        ctx.session.state["execution_results"] = execution_results
        
        # Step 3: Generate comprehensive solution
        final_solution = self._generate_final_solution(ctx.session.state)
        ctx.session.state["response"] = final_solution
        ctx.session.state["phase"] = "technical_complete"
    
    async def _generate_events(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        """Generate events based on the stored response"""
        response = ctx.session.state.get("response", "")
        if response:
            yield Event(author=self.name, content=types.Content(role='model', parts=[types.Part(text=response)]))
    
    def _generate_final_solution(self, session_state: Dict[str, Any]) -> str:
        """Generate comprehensive final solution based on all gathered information"""
        return generate_final_solution(
            session_state,
            analyze_root_cause,
            generate_recommendations
        )


# --- Create Specialist Agents ---
# Prepare search tools for specialists
search_tools = [search_help_docs_tool, search_runbooks_tool, search_zendesk_tickets_tool]

# Technical Troubleshoot Agent - handles technical debugging with MCP tools
technical_agent = TechnicalTroubleshootAgent()

# Knowledge Specialist - handles documentation and how-to queries
knowledge_specialist = KnowledgeSpecialist(search_tools=search_tools)

# Follow-up Specialist - handles follow-up questions with context
followup_specialist = FollowUpSpecialist(search_tools=search_tools)

# Ticket Specialist - handles Zendesk ticket analysis
ticket_specialist = TicketSpecialist(search_tools=[search_zendesk_tickets_tool])

# Push Troubleshoot Agent - handles push notification issues
push_specialist = PushTroubleshootAgent()

# WhatsApp Troubleshoot Agent - handles WhatsApp-specific issues
whatsapp_specialist = WhatsAppTroubleshootAgent()

# --- Create Conversational Root Agent ---
# All specialist agents that can receive control via transfer_to_agent()
specialist_agents = [
    technical_agent,
    knowledge_specialist, 
    followup_specialist,
    ticket_specialist,
    push_specialist,
    whatsapp_specialist
]

# Root Conversation Manager using LlmAgent + AgentTool pattern
root_agent = LlmConversationManager(
    name="MoEngageSupportChatManager",
    model=model_config["root"],
    specialist_agents=specialist_agents,
    knowledge_specialist=knowledge_specialist
)

# --- Legacy Agents (for backward compatibility) ---
# Keep the old agents for any existing integrations
knowledge_agent = LlmAgent(
    name="MoEngageKnowledgeAgent",
    model=model_config["knowledge"],
    description="Knowledge specialist that searches runbooks and Zendesk tickets to provide comprehensive information.",
    instruction=KNOWLEDGE_AGENT_PROMPT,
    tools=[
        search_runbooks_tool,
        search_zendesk_tickets_tool
    ],
    planner=PlanReActPlanner()
)

execution_agent = LlmAgent(
    name="MoEngageExecutionAgent", 
    model=model_config["execution"],
    description="Execution specialist that performs technical investigation using campaign APIs.",
    instruction=EXECUTION_AGENT_PROMPT,
    tools=[
        MCPToolset(
            connection_params=SseConnectionParams(
                url=mcp_config["sse"]["url"],
                headers=mcp_config["sse"]["headers"],
                timeout=mcp_config["sse"]["timeout"],
            )
        )
    ],
    planner=PlanReActPlanner()
)

# Legacy orchestrator (kept for compatibility)
legacy_orchestrator = WhatsAppSupportOrchestrator(
    name="MoEngageWhatsAppSupportOrchestrator",
    knowledge_agent=knowledge_agent,
    execution_agent=execution_agent
)

logger.info("✅ MoEngage Support Chat Extension initialized with conversational architecture")
logger.info(f"🎯 Root Agent: {root_agent.name}")
logger.info(f"🔧 Specialist Agents: {[agent.name for agent in specialist_agents]}")
