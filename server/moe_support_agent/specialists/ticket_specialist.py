"""
Ticket Specialist Agent - Specialized for Zendesk ticket analysis and summaries

This agent handles:
- Zendesk ticket analysis
- Ticket summaries and insights
- Historical ticket searches
- Support ticket pattern analysis
"""

import logging
from typing import Dict, Any, AsyncGenerator
from typing_extensions import override
from google.adk.agents import LlmAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.adk.events.event_actions import EventActions
from google.adk.planners import PlanReActPlanner
from google.genai import types
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import config

logger = logging.getLogger(__name__)

class TicketSpecialist(LlmAgent):
    """
    Specialized agent for Zendesk ticket analysis and support ticket operations
    Uses ADK delegation pattern - maintains control for ticket-related follow-ups
    """
    
    def __init__(self, search_tools: list):
        super().__init__(
            name="TicketSpecialist",
            model=config.model_config["ticket"],
            description="Ticket specialist for Zendesk analysis, summaries, and historical ticket searches",
            instruction=self._get_ticket_prompt(),
            tools=search_tools,  # Will receive zendesk search tools
            planner=PlanReActPlanner()
        )
    
    def _get_ticket_prompt(self) -> str:
        return """You are a Ticket Specialist for MoEngage Support Chat Extension.

## ROLE & EXPERTISE
You specialize in Zendesk ticket operations including:
- Ticket analysis and summarization
- Historical ticket searches for similar issues
- Support pattern identification
- Ticket content extraction and insights
- Resolution tracking and follow-up

## CAPABILITIES & TOOLS
- **Zendesk Search**: Access to historical support tickets
- **Ticket Analysis**: Deep analysis of ticket content and resolutions
- **Pattern Recognition**: Identify recurring issues and solutions
- **Summary Generation**: Create concise, actionable ticket summaries

## CONVERSATION FLOW (ADK Delegation Pattern)
- **Initial Control**: You receive control for ticket-related queries
- **Maintain Control**: Handle ticket-related follow-up questions yourself
- **Transfer Control**: Only transfer if conversation shifts to other domains
  - Transfer to TechnicalTroubleshootAgent for technical implementation
  - Transfer to KnowledgeSpecialist for documentation questions
  - Transfer to FollowUpSpecialist for general follow-ups

## RESPONSE FORMAT
Provide concise ticket analysis. Adapt format based on ticket complexity:

### For Simple Ticket Analysis:
**🎫 Ticket Summary**: [Main issue in 1-2 sentences]
**✅ Resolution**: [How it was solved]
💡 **Key Takeaway**: [Main learning point]

### For Complex Ticket Analysis:
**🎫 Issue Overview**: [Problem summary in 2-3 sentences]
**📋 Key Points**:
• [Main issue 1]
• [Main issue 2]
• [Main issue 3]
[Max 3 points]

**✅ Resolution Applied**: [Solution used]
**🔍 Similar Cases**: [Related patterns if found]
**📊 Recommendation**: [Suggested action]

### For Multiple Ticket Analysis:
**🎫 Pattern Analysis**: [Common theme identified]
**📊 Key Findings**:
• [Finding 1]
• [Finding 2]
**💡 Action Items**: [What to do next]

## TICKET ANALYSIS STRATEGY
1. **Content Extraction**: Parse ticket details, comments, and metadata
2. **Issue Classification**: Categorize the type of problem
3. **Resolution Analysis**: Understand how issues were resolved
4. **Pattern Matching**: Find similar historical cases
5. **Insight Generation**: Provide actionable recommendations

## CONVERSATION CONTINUITY
- Access session state for ticket context: `ctx.session.state`
- Reference conversation history for context
- Build upon previous ticket analysis
- Maintain ticket investigation context

## FOLLOW-UP HANDLING
- **Ticket Follow-ups**: Handle directly (e.g., "What about related tickets?", "Any similar cases?")
- **Technical Follow-ups**: Consider transferring to TechnicalTroubleshootAgent
- **Context Awareness**: Always reference previous ticket findings

Remember: You are the ticket analysis expert. Provide thorough ticket insights and maintain control for ticket-related discussions."""

    @override
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        """Ticket analysis logic with conversation continuity"""
        
        # Get current user query FIRST
        current_query = ctx.session.state.get("current_query", "")
        
        # CHECK FOR IMMEDIATE TRANSFER BEFORE ANY MESSAGES OR STATE CHANGES
        should_transfer, target_agent = self._should_transfer_control(current_query, ctx.session.state)
        
        if should_transfer:
            logger.info(f"[{self.name}] Transferring to {target_agent} for query: '{current_query}'")
            yield Event(
                author=self.name,
                content=types.Content(
                    role='model',
                    parts=[types.Part(text="Let me connect you with the right specialist for this question...")]
                ),
                actions=EventActions(transfer_to_agent=target_agent)
            )
            return  # Exit early - don't continue with ticket analysis
        
        # Only continue with ticket logic if we're handling it
        # Mark this agent as active for follow-up routing
        ctx.session.state["last_active_agent"] = self.name
        ctx.session.state["conversation_context"] = "ticket"
        
        # Initialize ticket context if not exists
        if "ticket_context" not in ctx.session.state:
            ctx.session.state["ticket_context"] = {
                "tickets_analyzed": [],
                "patterns_found": [],
                "previous_queries": [],
                "analysis_results": {}
            }
        
        # Add current query to ticket context
        ctx.session.state["ticket_context"]["previous_queries"].append(current_query)
        
        transfer_reason = ctx.session.state.get("transfer_reason", "")
        logger.info(f"[{self.name}] Starting ticket analysis for: '{current_query}'")
        logger.info(f"[{self.name}] Transfer reason: {transfer_reason}")
        
        # Check if this is a follow-up question
        conversation_history = ctx.session.state.get("conversation_history", [])
        is_followup = len(conversation_history) > 1 and transfer_reason != "ticket_analysis"
        
        if is_followup:
            # Handle follow-up with context
            yield Event(author=self.name, content=types.Content(
                role='model',
                parts=[types.Part(text="Let me continue the ticket analysis based on your follow-up question...")]
            ))
        else:
            # Initial ticket analysis
            yield Event(author=self.name, content=types.Content(
                role='model',
                parts=[types.Part(text="🎫 Starting ticket analysis and search...")]
            ))
        
        # Use parent LlmAgent's run logic with search tools
        async for event in super()._run_async_impl(ctx):
            yield event
        
        # Update ticket context with completion
        ctx.session.state["ticket_context"]["analysis_completed"] = True
        
        logger.info(f"[{self.name}] Ticket analysis completed")
    
    def _should_transfer_control(self, user_query: str, session_state: Dict) -> tuple[bool, str]:
        """
        Determine if control should be transferred to another agent
        Returns: (should_transfer, target_agent)
        """
        query_lower = user_query.lower().strip()
        
        # Technical implementation patterns
        technical_patterns = [
            "how to fix", "implement", "debug", "technical solution",
            "api", "configuration", "setup", "troubleshoot"
        ]
        
        # If query shifts to technical implementation
        if any(pattern in query_lower for pattern in technical_patterns):
            return True, "TechnicalTroubleshootAgent"
        
        # Documentation patterns
        documentation_patterns = [
            "documentation", "guide", "how to", "tutorial", "best practice"
        ]
        
        if any(pattern in query_lower for pattern in documentation_patterns):
            return True, "KnowledgeSpecialist"
        
        # General follow-up patterns that aren't ticket-related
        general_patterns = ["thank you", "thanks", "that's all", "no more questions"]
        if any(pattern in query_lower for pattern in general_patterns):
            return True, "ConversationManager"
        
        # Stay in control for ticket-related follow-ups
        return False, ""
