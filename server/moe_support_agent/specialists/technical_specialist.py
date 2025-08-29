"""
Technical Troubleshoot Agent - Specialized for technical debugging and API issues

This agent handles:
- Campaign delivery issues
- API errors and debugging
- Performance problems
- Technical investigation using MCP tools
- Follow-up technical questions
"""

import logging
from typing import Dict, Any, AsyncGenerator
from typing_extensions import override
from google.adk.agents import LlmAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.adk.events.event_actions import EventActions
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters, SseConnectionParams
from google.adk.planners import PlanReActPlanner
from google.genai import types
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import config

# Get MCP configuration
mcp_config = config.get_mcp_config()

logger = logging.getLogger(__name__)

class TechnicalTroubleshootAgent(LlmAgent):
    """Technical troubleshooting specialist for campaign debugging and API issues."""
    
    def __init__(self):
        super().__init__(
            name="TechnicalTroubleshootAgent",
            model=config.model_config["technical"],
            description="Technical specialist for campaign debugging, API troubleshooting, and performance issues",
            instruction=self._get_technical_prompt(),
            tools=[
                MCPToolset(
                    connection_params=SseConnectionParams(
                        url=mcp_config["sse"]["url"],
                        headers=mcp_config["sse"]["headers"],
                        timeout=mcp_config["sse"]["timeout"],
                    )
                ),
            ],
            planner=PlanReActPlanner()
        )
    
    def _get_technical_prompt(self) -> str:
        return """You are a Technical Troubleshooting Specialist for MoEngage Support Chat Extension.

## ROLE & EXPERTISE
You specialize in investigating and resolving technical issues including:
- WhatsApp campaign delivery problems
- Push notification issues  
- API errors and integration problems
- Performance and rate limiting issues
- Campaign logs analysis
- Debugging technical configurations

## CAPABILITIES & TOOLS
- **MCP Tools**: Access to campaign APIs, logs, and metrics
- **Technical Analysis**: Deep dive into delivery issues and error patterns
- **Root Cause Analysis**: Identify underlying technical problems
- **Solution Recommendations**: Provide step-by-step technical fixes

## CONVERSATION FLOW (ADK Delegation Pattern)
- **Initial Control**: You receive control when user has technical issues
- **Maintain Control**: Handle technical follow-up questions yourself
- **Transfer Control**: Only transfer if conversation shifts to non-technical topics
  - Transfer to FollowUpSpecialist for general follow-ups
  - Transfer to KnowledgeSpecialist for documentation questions
  - Transfer back to MoEngageSupportChatManager for completely different topics

## RESPONSE FORMAT
Provide concise, actionable technical responses. Adapt format based on issue complexity:

### For Simple Technical Issues:
**Issue**: [Problem identified in 1 sentence]
**Quick Fix**: [Solution in 2-3 steps]
💡 **Verify**: [How to confirm it worked]

### For Complex Technical Issues:
**🔍 Investigation Summary**: [Key findings in 2-3 sentences]
**🛠️ Root Cause**: [Main problem identified]
**✅ Solution Steps**:
1. [Step 1 - specific action]
2. [Step 2 - specific action]
3. [Step 3 - specific action]
[Max 5 steps]

**📊 Verification**: [How to confirm fix worked]
**💡 Prevention**: [Key tip to avoid recurrence]

### For Urgent/Critical Issues:
**🚨 URGENT FIX**: [Immediate action needed]
**⚡ Quick Steps**:
1. [Critical step 1]
2. [Critical step 2]
**🔍 Monitor**: [What to watch for]

## FOLLOW-UP HANDLING
- **Technical Follow-ups**: Handle directly (e.g., "What if rate limit is still hit?", "How to check logs?")
- **Non-technical Follow-ups**: Consider transferring to appropriate specialist
- **Context Awareness**: Always reference previous investigation findings

## CONVERSATION CONTINUITY
- Access session state for previous findings: `ctx.session.state`
- Reference conversation history for context
- Build upon previous technical analysis
- Maintain technical context across interactions

Remember: You are the technical expert. Provide thorough, actionable technical solutions and maintain control for technical discussions."""

    @override
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        """Technical investigation logic with conversation continuity"""
        
        # Get current user query FIRST
        current_query = ctx.session.state.get("current_query", "")
        
        # CHECK FOR IMMEDIATE TRANSFER BEFORE ANY MESSAGES OR STATE CHANGES
        should_transfer, target_agent = self._should_transfer_control(current_query, ctx.session.state)
        
        logger.info(f"[{self.name}] Transfer check result: should_transfer={should_transfer}, target_agent={target_agent}")
        logger.info(f"[{self.name}] Query being analyzed: '{current_query}'")
        
        if should_transfer:
            logger.info(f"[{self.name}] EARLY TRANSFER: Transferring to {target_agent} for query: '{current_query}'")
            yield Event(
                author=self.name,
                content=types.Content(
                    role='model',
                    parts=[types.Part(text="Let me connect you with the right specialist for this question...")]
                ),
                actions=EventActions(transfer_to_agent=target_agent)
            )
            return  # Exit early - don't continue with technical investigation
        
        # Only continue with technical logic if we're handling it
        # Mark this agent as active for follow-up routing
        ctx.session.state["last_active_agent"] = self.name
        ctx.session.state["conversation_context"] = "technical"
        
        # Initialize technical context if not exists
        if "technical_context" not in ctx.session.state:
            ctx.session.state["technical_context"] = {
                "investigation_started": True,
                "tools_used": [],
                "findings": {},
                "previous_queries": []
            }
        
        # Add current query to technical context
        ctx.session.state["technical_context"]["previous_queries"].append(current_query)
        
        transfer_reason = ctx.session.state.get("transfer_reason", "")
        logger.info(f"[{self.name}] Starting technical investigation for: '{current_query}'")
        logger.info(f"[{self.name}] Transfer reason: {transfer_reason}")
        
        # Check if this is a follow-up question
        conversation_history = ctx.session.state.get("conversation_history", [])
        is_followup = len(conversation_history) > 1 and transfer_reason != "technical_issue"
        
        if is_followup:
            # Handle follow-up with context
            yield Event(author=self.name, content=types.Content(
                role='model',
                parts=[types.Part(text="Let me continue our technical investigation with your follow-up question...")]
            ))
        else:
            # Initial technical investigation
            yield Event(author=self.name, content=types.Content(
                role='model',
                parts=[types.Part(text="🔍 Starting technical investigation of your issue...")]
            ))
        
        # Use parent LlmAgent's run logic with tools
        # This will use the MCP tools to investigate the technical issue
        async for event in super()._run_async_impl(ctx):
            yield event
        
        # Update technical context with completion
        ctx.session.state["technical_context"]["investigation_completed"] = True
        
        logger.info(f"[{self.name}] Technical investigation completed")
    
    def _should_transfer_control(self, user_query: str, session_state: Dict) -> tuple[bool, str]:
        """
        Determine if control should be transferred to another agent
        Returns: (should_transfer, target_agent)
        """
        query_lower = user_query.lower().strip()
        
        # Non-technical follow-up patterns
        non_technical_patterns = [
            "how to", "what is", "explain", "documentation", "guide", 
            "help", "tutorial", "setup", "configure"
        ]
        
        # If query is asking for documentation/guides rather than technical debugging
        if any(pattern in query_lower for pattern in non_technical_patterns):
            if not any(tech in query_lower for tech in ["error", "issue", "problem", "debug", "fix"]):
                return True, "KnowledgeSpecialist"
        
        # General follow-up patterns that aren't technical
        general_patterns = ["thank you", "thanks", "that's all", "no more questions"]
        if any(pattern in query_lower for pattern in general_patterns):
            return True, "MoEngageSupportChatManager"
        
        # Stay in control for technical follow-ups
        return False, ""
