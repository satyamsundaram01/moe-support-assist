"""
Follow-up Specialist Agent - Specialized for handling follow-up questions and clarifications

This agent handles:
- Follow-up questions from ongoing conversations
- Clarifications and additional details
- Context-aware responses
- Cross-domain follow-ups
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

class FollowUpSpecialist(LlmAgent):
    """
    Specialized agent for handling follow-up questions with full context awareness
    Uses ADK delegation pattern - can transfer to other specialists as needed
    """
    
    def __init__(self, search_tools: list):
        super().__init__(
            name="FollowUpSpecialist",
            model=config.model_config["followup"],
            description="Follow-up specialist for contextual questions and clarifications",
            instruction=self._get_followup_prompt(),
            tools=search_tools,  # Access to all search tools for comprehensive responses
            planner=PlanReActPlanner()
        )
    
    def _get_followup_prompt(self) -> str:
        return """You are a Follow-Up Specialist for MoEngage Support Chat Extension.

## ROLE & EXPERTISE
You specialize in handling follow-up questions by:
- Analyzing conversation context and history
- Providing contextually relevant responses
- Leveraging multiple knowledge sources
- Bridging between different specialist domains
- Ensuring conversation continuity

## CAPABILITIES & TOOLS
- **Full Tool Access**: All search tools (Help Docs, Runbooks, Zendesk)
- **Context Analysis**: Deep understanding of conversation history
- **Cross-Domain Knowledge**: Can handle questions spanning multiple areas
- **Intelligent Routing**: Know when to transfer to other specialists

## CONVERSATION FLOW (ADK Delegation Pattern)
- **Receive Control**: When users ask follow-up questions
- **Context Awareness**: Always reference previous conversation context
- **Smart Routing**: Transfer to appropriate specialist when needed
  - Transfer to TechnicalTroubleshootAgent for technical deep-dives
  - Transfer to KnowledgeSpecialist for documentation-heavy questions
  - Transfer back to ConversationManager for topic changes

## RESPONSE FORMAT
Provide concise, context-aware follow-up responses. Adapt format based on follow-up type:

### For Simple Follow-ups:
**🔄 Context**: [Brief reference to previous discussion]
**💡 Answer**: [Direct response in 1-2 sentences]
**🎯 Next**: [Suggested next step if helpful]

### For Complex Follow-ups:
**🔄 Building on**: [What we discussed before]
**💡 Follow-up Response**: [Answer in 2-3 sentences]
**📚 Additional Context**: [Relevant new information]
**🎯 Suggested Actions**:
• [Action 1]
• [Action 2]
[Max 3 actions]

### For Clarification Follow-ups:
**🔄 To clarify**: [What needs clarification]
**💡 Here's the detail**: [Specific clarification]
**🔀 Need more?**: [Offer for deeper dive]

## FOLLOW-UP HANDLING STRATEGY
1. **Analyze Context**: Review conversation history and previous findings
2. **Identify Intent**: Understand what the user is really asking
3. **Leverage Previous Work**: Build upon previous specialist findings
4. **Provide Value**: Add new information, not just repeat previous answers
5. **Route Intelligently**: Transfer if specialized expertise is needed

## CONVERSATION CONTINUITY
- **Session State Access**: Full access to all previous context
- **Agent History**: Know which agents were involved previously
- **Finding Integration**: Combine findings from multiple specialists
- **Context Preservation**: Maintain conversation thread

## TRANSFER DECISIONS
Transfer to other agents when:
- **Technical Deep-dive Needed**: Complex debugging → TechnicalTroubleshootAgent
- **Documentation Heavy**: Extensive guides needed → KnowledgeSpecialist
- **Topic Change**: Completely different subject → ConversationManager
- **Specialized Tools**: Need specific agent's tools for investigation

Remember: You are the conversation continuity expert. Your job is to maintain context, provide comprehensive follow-up responses, and ensure users get the help they need across all domains."""

    @override
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        """Follow-up handling logic with full context awareness"""
        
        # Get current user query FIRST
        current_query = ctx.session.state.get("current_query", "")
        
        # CHECK FOR IMMEDIATE TRANSFER BEFORE ANY MESSAGES OR STATE CHANGES
        should_transfer, target_agent = self._analyze_transfer_need(current_query, ctx.session.state)
        
        if should_transfer:
            logger.info(f"[{self.name}] Transferring to {target_agent} for specialized handling")
            yield Event(
                author=self.name,
                content=types.Content(
                    role='model',
                    parts=[types.Part(text="Let me connect you with the right specialist for this question...")]
                ),
                actions=EventActions(transfer_to_agent=target_agent)
            )
            return  # Exit early - don't continue with follow-up handling
        
        # Only continue with follow-up logic if we're handling it
        # Mark this agent as active
        ctx.session.state["last_active_agent"] = self.name
        
        # Get comprehensive context
        conversation_context = ctx.session.state.get("conversation_context", "")
        conversation_history = ctx.session.state.get("conversation_history", [])
        previous_agent = ctx.session.state.get("previous_agent", "")
        
        # Initialize follow-up context
        if "followup_context" not in ctx.session.state:
            ctx.session.state["followup_context"] = {
                "followup_count": 0,
                "context_switches": [],
                "previous_findings": {}
            }
        
        # Increment follow-up count
        ctx.session.state["followup_context"]["followup_count"] += 1
        
        logger.info(f"[{self.name}] Handling follow-up question: '{current_query}'")
        logger.info(f"[{self.name}] Previous context: {conversation_context}")
        logger.info(f"[{self.name}] Follow-up count: {ctx.session.state['followup_context']['followup_count']}")
        
        # Handle follow-up directly
        yield Event(author=self.name, content=types.Content(
            role='model',
            parts=[types.Part(text="Let me help you with that follow-up question based on our previous conversation...")]
        ))
        
        # Use parent LlmAgent's run logic with all available tools
        async for event in super()._run_async_impl(ctx):
            yield event
        
        # Update follow-up context
        ctx.session.state["followup_context"]["last_handled"] = current_query
        
        logger.info(f"[{self.name}] Follow-up handling completed")
    
    def _analyze_transfer_need(self, user_query: str, session_state: Dict) -> tuple[bool, str]:
        """
        Analyze if the follow-up question needs specialized handling
        Returns: (should_transfer, target_agent)
        """
        query_lower = user_query.lower().strip()
        conversation_context = session_state.get("conversation_context", "")
        
        # Technical deep-dive patterns
        technical_deep_patterns = [
            "debug", "logs", "api error", "technical details", "investigate",
            "root cause", "performance", "rate limit", "configuration"
        ]
        
        if any(pattern in query_lower for pattern in technical_deep_patterns):
            return True, "TechnicalTroubleshootAgent"
        
        # Documentation-heavy patterns
        documentation_patterns = [
            "how to", "step by step", "guide", "documentation", "tutorial",
            "setup", "configure", "best practice", "feature explanation"
        ]
        
        if any(pattern in query_lower for pattern in documentation_patterns):
            return True, "KnowledgeSpecialist"
        
        # Topic change patterns
        topic_change_patterns = [
            "different question", "new issue", "another problem", "switch topic",
            "something else", "different matter"
        ]
        
        if any(pattern in query_lower for pattern in topic_change_patterns):
            return True, "ConversationManager"
        
        # Stay with follow-up specialist for general follow-ups
        return False, ""
