"""
Conversation Manager - Root Agent for MoEngage Support Chat Extension

This agent handles:
- Initial user greetings and routing
- Intent classification with conversation context
- Delegation to specialist agents using transfer_to_agent()
- Maintaining conversation continuity
"""

import logging
from typing import Dict, Any, List, AsyncGenerator, Sequence, Optional
from typing_extensions import override
from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.adk.events.event_actions import EventActions
from google.genai import types

logger = logging.getLogger(__name__)

class ConversationManager(BaseAgent):
    """
    Root agent that handles conversation routing and maintains flow continuity
    """
    
    def __init__(self, name: str, sub_agents: Sequence[BaseAgent]):
        super().__init__(name=name, sub_agents=sub_agents)
    
    def _extract_latest_user_message(self, ctx: InvocationContext) -> str:
        """Extract the current user message from the invocation context"""
        if ctx.user_content and ctx.user_content.parts:
            for part in ctx.user_content.parts:
                if part.text and part.text.strip():
                    user_message = part.text.strip()
                    logger.info(f"[{self.name}] Extracted user message: '{user_message[:100]}...'")
                    return user_message
        
        logger.info(f"[{self.name}] No user message found, using default.")
        return "No query provided for this session."
    
    def _classify_intent(self, user_query: str, session_state: Dict) -> str:
        """Enhanced intent classification with conversation context"""
        query_lower = user_query.lower().strip()
        
        # Check conversation context for follow-ups
        current_context = session_state.get("conversation_context", "")
        last_agent = session_state.get("last_active_agent", "")
        
        logger.info(f"[{self.name}] Classifying query: '{query_lower}' with context: '{current_context}'")
        
        # Greeting patterns
        greeting_patterns = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"]
        if any(greeting in query_lower for greeting in greeting_patterns) and len(query_lower) < 25:
            return "greeting"
        
        # Follow-up detection - key for conversational flow
        followup_patterns = [
            "what about", "what if", "can you also", "how about", "and what", 
            "also", "additionally", "furthermore", "what else", "any other",
            "follow up", "more details", "explain more", "tell me more"
        ]
        if any(pattern in query_lower for pattern in followup_patterns) and current_context:
            return "followup"
        
        # Context-based follow-up detection
        if current_context and last_agent and len(query_lower) > 5:
            # If we're in a conversation context and user asks a related question
            context_keywords = {
                "technical": ["campaign", "delivery", "error", "issue", "problem", "debug", "fix"],
                "knowledge": ["how", "what", "explain", "guide", "setup", "configure"],
                "ticket": ["ticket", "summary", "analyze", "details"]
            }
            
            if current_context in context_keywords:
                if any(keyword in query_lower for keyword in context_keywords[current_context]):
                    return "followup"
        
        # Ticket-related queries
        ticket_patterns = ["ticket", "zendesk", "summarize", "summarise", "summary", "analyze ticket"]
        if any(pattern in query_lower for pattern in ticket_patterns):
            return "ticket_analysis"
        
        # Technical troubleshooting
        technical_patterns = [
            "campaign", "not delivering", "error", "failed", "debug", "issue", 
            "problem", "api", "logs", "delivery", "performance", "rate limit"
        ]
        if any(pattern in query_lower for pattern in technical_patterns):
            return "technical_troubleshooting"
        
        # Knowledge queries
        knowledge_patterns = [
            "how to", "what is", "explain", "setup", "configure", "guide", 
            "documentation", "help", "best practice", "feature"
        ]
        if any(pattern in query_lower for pattern in knowledge_patterns):
            return "knowledge_search"
        
        # Clarification needed for very short queries
        if len(query_lower.strip()) < 5:
            return "clarification"
        
        return "general"
    
    @override
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        """Main conversation routing logic using ADK delegation pattern"""
        
        logger.info(f"[{self.name}] Starting conversation management")
        
        # Extract user query
        user_query = self._extract_latest_user_message(ctx)
        
        # Initialize or update session state
        if "conversation_history" not in ctx.session.state:
            ctx.session.state["conversation_history"] = []
        
        # Update session state with current query
        ctx.session.state["current_query"] = user_query
        ctx.session.state["conversation_history"].append({
            "role": "user", 
            "content": user_query,
            "timestamp": str(ctx.session.state.get("message_count", 0))
        })
        
        # Classify intent with conversation context
        intent = self._classify_intent(user_query, ctx.session.state)
        logger.info(f"[{self.name}] Classified intent: {intent}")
        
        # Route based on intent using ADK delegation pattern
        if intent == "greeting":
            async for event in self._handle_greeting(ctx):
                yield event
            
        elif intent == "followup":
            # Delegate to follow-up specialist
            logger.info(f"[{self.name}] Transferring to FollowUpSpecialist for follow-up question")
            ctx.session.state["transfer_reason"] = "followup_question"
            yield Event(
                author=self.name, 
                content=types.Content(
                    role='model',
                    parts=[types.Part(text="Let me help you with that follow-up question...")]
                ),
                actions=EventActions(transfer_to_agent="FollowUpSpecialist")
            )
            
        elif intent == "knowledge_search":
            # Delegate to knowledge specialist
            logger.info(f"[{self.name}] Transferring to KnowledgeSpecialist for knowledge query")
            ctx.session.state["conversation_context"] = "knowledge"
            ctx.session.state["transfer_reason"] = "knowledge_search"
            yield Event(
                author=self.name, 
                content=types.Content(
                    role='model',
                    parts=[types.Part(text="I'll search our knowledge base for you...")]
                ),
                actions=EventActions(transfer_to_agent="KnowledgeSpecialist")
            )
            
        elif intent == "technical_troubleshooting":
            # Delegate to technical specialist
            logger.info(f"[{self.name}] Transferring to TechnicalTroubleshootAgent for technical issue")
            ctx.session.state["conversation_context"] = "technical"
            ctx.session.state["transfer_reason"] = "technical_issue"
            yield Event(
                author=self.name, 
                content=types.Content(
                    role='model',
                    parts=[types.Part(text="I'll investigate this technical issue for you...")]
                ),
                actions=EventActions(transfer_to_agent="TechnicalTroubleshootAgent")
            )
            
        elif intent == "ticket_analysis":
            # Delegate to ticket specialist
            logger.info(f"[{self.name}] Transferring to TicketSpecialist for ticket analysis")
            ctx.session.state["conversation_context"] = "ticket"
            ctx.session.state["transfer_reason"] = "ticket_analysis"
            yield Event(
                author=self.name, 
                content=types.Content(
                    role='model',
                    parts=[types.Part(text="I'll analyze that ticket for you...")]
                ),
                actions=EventActions(transfer_to_agent="TicketSpecialist")
            )
            
        elif intent == "clarification":
            async for event in self._handle_clarification(ctx):
                yield event
            
        else:
            # Handle general queries
            async for event in self._handle_general(ctx):
                yield event
    
    async def _handle_greeting(self, ctx: InvocationContext):
        """Handle greeting responses"""
        greeting_response = """Hello! I'm your MoEngage Support Assistant. I can help you with:

🔧 **Technical Issues**: Campaign delivery, API errors, debugging
📚 **Knowledge & Guides**: How-to guides, feature explanations, setup
🎫 **Ticket Analysis**: Zendesk ticket summaries and analysis
💬 **Follow-up Questions**: Clarifications and additional help

What can I assist you with today?"""
        
        ctx.session.state["conversation_context"] = "greeting"
        ctx.session.state["last_active_agent"] = self.name
        
        yield Event(author=self.name, content=types.Content(
            role='model', 
            parts=[types.Part(text=greeting_response)]
        ))
    
    async def _handle_clarification(self, ctx: InvocationContext):
        """Handle clarification requests"""
        clarification_response = """I'd be happy to help you! However, I need a bit more information to provide the best assistance.

Could you please provide more details about:
• What specific issue are you experiencing?
• Which feature or campaign is affected?
• Any error messages you've seen?
• What you're trying to accomplish?

The more details you can share, the better I can help you!"""
        
        ctx.session.state["conversation_context"] = "clarification"
        ctx.session.state["last_active_agent"] = self.name
        
        yield Event(author=self.name, content=types.Content(
            role='model',
            parts=[types.Part(text=clarification_response)]
        ))
    
    async def _handle_general(self, ctx: InvocationContext):
        """Handle general queries that don't fit specific categories"""
        general_response = """I understand you have a question. Let me help you find the right information.

Based on your query, I can:
• Search our knowledge base and documentation
• Look up technical troubleshooting guides
• Analyze support tickets and historical solutions
• Provide step-by-step guidance

Could you provide a bit more context about what you're looking for? This will help me direct you to the most relevant specialist."""
        
        ctx.session.state["conversation_context"] = "general"
        ctx.session.state["last_active_agent"] = self.name
        
        yield Event(author=self.name, content=types.Content(
            role='model',
            parts=[types.Part(text=general_response)]
        ))
