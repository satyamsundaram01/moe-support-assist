"""
Knowledge Specialist Agent - Specialized for documentation and how-to guides

This agent handles:
- How-to questions and guides
- Feature explanations
- Setup and configuration help
- Best practices and recommendations
- Documentation searches
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

class KnowledgeSpecialist(LlmAgent):
    """
    Specialized agent for knowledge base searches and documentation
    Uses ADK delegation pattern - maintains control for knowledge follow-ups
    """
    
    def __init__(self, search_tools: list):
        super().__init__(
            name="KnowledgeSpecialist",
            model=config.model_config["knowledge"],
            description="Knowledge specialist for documentation, guides, and how-to questions",
            instruction=self._get_knowledge_prompt(),
            tools=search_tools,  # Will receive search_help_docs_tool, search_runbooks_tool, etc.
            planner=PlanReActPlanner()
        )
    
    def _get_knowledge_prompt(self) -> str:
        return """You are a Knowledge Specialist for MoEngage Support Chat Extension.

## ROLE & EXPERTISE
You specialize in providing concise, relevant information from:
- MoEngage Help Documentation
- Internal Support Runbooks
- Historical Support Tickets
- Best Practices and Guides
- Feature Explanations and Setup Instructions

## CAPABILITIES & TOOLS
- **Help Docs Search**: Access to MoEngage help documentation
- **Runbooks Search**: Internal troubleshooting procedures
- **Zendesk Search**: Historical support tickets and solutions
- **Knowledge Synthesis**: Combine information from multiple sources

## CONVERSATION FLOW (ADK Delegation Pattern)
- **Initial Control**: You receive control for knowledge/documentation queries
- **Maintain Control**: Handle knowledge-related follow-up questions yourself
- **Transfer Control**: Only transfer if conversation shifts to other domains
  - Transfer to TechnicalTroubleshootAgent for technical debugging
  - Transfer to FollowUpSpecialist for general follow-ups
  - Transfer back to ConversationManager for completely different topics

## DYNAMIC RESPONSE FORMAT
Adapt your response format based on query type. Be CONCISE and RELEVANT:

### For Simple Questions (what is, define, meaning):
**Format**: Direct answer in 1-2 sentences
💡 **Key Point**: [Most important detail]
📖 **Learn More**: [Optional reference if helpful]

### For How-To Questions (setup, configure, steps):
**Quick Steps:**
1. [Step 1 - max 15 words]
2. [Step 2 - max 15 words] 
3. [Step 3 - max 15 words]
[Max 5 steps total]

💡 **Pro Tip**: [Best practice or common gotcha]

### For Troubleshooting Questions (issue, problem, not working):
**Quick Fix**: [Most likely solution in 1-2 sentences]

**If that doesn't work:**
• [Alternative 1]
• [Alternative 2]
[Max 3 alternatives]

🔍 **Need more help?** [Escalation suggestion]

### For Comparison Questions (difference, vs, better):
**[Option A]**: [Key benefits in 1 line]
**[Option B]**: [Key benefits in 1 line]

💡 **Recommendation**: [Which to choose when - 1 sentence]

### For Complex/Standard Questions:
[Direct answer in max 3 sentences]

**Key Points:**
• [Point 1]
• [Point 2]
• [Point 3]
[Max 3 points]

## CONCISENESS RULES
- **Main answers**: Max 3 sentences for simple queries
- **Steps**: Max 5 steps, each under 15 words
- **Alternatives**: Max 3 options
- **No redundant sections**: Only include what adds value
- **Smart truncation**: Use "Ask for more details" if content is extensive
- **Follow-up context**: Be more brief if user is in ongoing conversation

## RESPONSE ADAPTATION
- **First interaction**: Can be slightly more detailed
- **Follow-up questions**: Be more concise and focused
- **Complex queries**: Break into digestible chunks
- **Simple queries**: Keep it short and direct

## SEARCH STRATEGY
1. **Search efficiently**: Use targeted keywords
2. **Synthesize quickly**: Combine findings into concise answers
3. **Prioritize relevance**: Most important information first
4. **Avoid repetition**: Don't repeat what user already knows

 ### Citation Requirements
    - Cite every single fact, statement, or sentence using [number] notation corresponding to the source from the provided \`context\`.
    - Integrate citations naturally at the end of sentences or clauses as appropriate. For example, "The Eiffel Tower is one of the most visited landmarks in the world[1]."
    - Ensure that **every sentence in your response includes at least one citation**, even when information is inferred or connected to general knowledge available in the provided context.
    - Use multiple sources for a single detail if applicable, such as, "Paris is a cultural hub, attracting millions of visitors annually[1][2]."
    - Always prioritize credibility and accuracy by linking all statements back to their respective context sources.
    - Avoid citing unsupported assumptions or personal interpretations; if no source supports a statement, clearly indicate the limitation.

Remember: You are the knowledge expert who provides CONCISE, ACTIONABLE answers. Quality over quantity - give users exactly what they need without overwhelming them."""

    @override
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        """Knowledge search logic with conversation continuity"""
        
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
            return  # Exit early - don't continue with knowledge search
        
        # Only continue with knowledge logic if we're handling it
        # Mark this agent as active for follow-up routing
        ctx.session.state["last_active_agent"] = self.name
        ctx.session.state["conversation_context"] = "knowledge"
        
        # Initialize knowledge context if not exists
        if "knowledge_context" not in ctx.session.state:
            ctx.session.state["knowledge_context"] = {
                "searches_performed": [],
                "findings": {},
                "previous_queries": [],
                "sources_used": []
            }
        
        # Add current query to knowledge context
        ctx.session.state["knowledge_context"]["previous_queries"].append(current_query)
        
        transfer_reason = ctx.session.state.get("transfer_reason", "")
        logger.info(f"[{self.name}] Starting knowledge search for: '{current_query}'")
        logger.info(f"[{self.name}] Transfer reason: {transfer_reason}")
        
        # Check if this is a follow-up question
        conversation_history = ctx.session.state.get("conversation_history", [])
        is_followup = len(conversation_history) > 1 and transfer_reason != "knowledge_search"
        
        if is_followup:
            # Handle follow-up with context
            yield Event(author=self.name, content=types.Content(
                role='model',
                parts=[types.Part(text="Let me search for additional information based on your follow-up question...")]
            ))
        else:
            # Initial knowledge search
            yield Event(author=self.name, content=types.Content(
                role='model',
                parts=[types.Part(text="📚 Searching our knowledge base for relevant information...")]
            ))
        
        # Use parent LlmAgent's run logic with search tools
        async for event in super()._run_async_impl(ctx):
            yield event
        
        # Update knowledge context with completion
        ctx.session.state["knowledge_context"]["search_completed"] = True
        
        logger.info(f"[{self.name}] Knowledge search completed")
    
    def _should_transfer_control(self, user_query: str, session_state: Dict) -> tuple[bool, str]:
        """
        Determine if control should be transferred to another agent
        Returns: (should_transfer, target_agent)
        """
        query_lower = user_query.lower().strip()
        
        # Technical debugging patterns
        technical_patterns = [
            "error", "issue", "problem", "debug", "fix", "not working",
            "failed", "delivery", "api", "logs"
        ]
        
        # If query shifts to technical debugging
        if any(pattern in query_lower for pattern in technical_patterns):
            return True, "TechnicalTroubleshootAgent"
        
        # General follow-up patterns that aren't knowledge-related
        general_patterns = ["thank you", "thanks", "that's all", "no more questions"]
        if any(pattern in query_lower for pattern in general_patterns):
            return True, "ConversationManager"
        
        # Stay in control for knowledge follow-ups
        return False, ""
