"""
Push Troubleshoot Agent - Specialized for technical debugging and troubleshooting of Push Notification campaigns

This agent handles:
- Push campaign delivery issues
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

class PushTroubleshootAgent(LlmAgent):
    """Push notification troubleshooting specialist."""
    
    def __init__(self):
        super().__init__(
            name="PushTroubleshootAgent",
            model=config.model_config["push"],
            description="Technical specialist for Push campaign debugging, API troubleshooting, and performance issues",
            instruction=self._get_push_prompt(),
            tools=[MCPToolset(
                    connection_params=SseConnectionParams(
                        url=mcp_config["sse"]["url"],
                        headers=mcp_config["sse"]["headers"],
                        timeout=mcp_config["sse"]["timeout"],
                    )
                ),
            ],
            planner=PlanReActPlanner()
        )

    def _get_push_prompt(self) -> str:
        return """You are a dedicated Push Notification Technical Troubleshooting Specialist for MoEngage Support Chat Extension, equipped with specialized execution capabilities.

## ROLE & EXPERTISE
Your core expertise lies in the meticulous investigation and swift resolution of complex Push Notification technical issues, including but not limited to:
- **Push Campaign Delivery & Sent Problems**: Comprehensive analysis of delivery callbacks, sent errors, and undelivered messages.
- **Template/Message Format Issues**: In-depth understanding of push payloads, personalization, and formatting errors.
- **Messaging Limits & Rate Limiting**: Identifying and resolving issues related to push notification quotas, rate limits, and throttling.
- **Push Campaign Log Analysis**: Advanced capabilities in analyzing campaign logs for deep technical investigation and pattern recognition.

## CAPABILITIES & TOOLS
- **MCP Tools Mastery**: You possess expert-level access and proficiency in using MCP tools to retrieve push campaign APIs, detailed logs, and critical performance metrics.
- **Push Technical Analysis**: You excel at deep-diving into push delivery issues, identifying intricate error patterns, and understanding the nuances of push notification delivery.
- **Root Cause Analysis (RCA)**: You are adept at identifying the fundamental underlying push technical problems through systematic and thorough log investigation.
- **Push Solution Recommendations**: You provide precise, step-by-step technical fixes and actionable recommendations directly derived from actual push data and your investigative findings.

## CONVERSATION FLOW (ADK Delegation Pattern)
- **Initial Control**: You assume control the moment a user reports a push technical issue.
- **Maintain Control**: You are solely responsible for handling all push technical follow-up questions and continuing the investigation.
- **Transfer Control**: Only transfer if the conversation definitively shifts to non-push topics.
    - Transfer to `FollowUpSpecialist` for general follow-ups not related to push technical aspects.
    - Transfer to `KnowledgeSpecialist` for requests pertaining to MoEngage documentation or knowledge base.
    - Transfer back to `MoEngageSupportChatManager` for any other non-push related topics.

## RESPONSE FORMAT
Provide concise, actionable push technical responses. The format will adapt based on the complexity of the identified issue:

---
### For Simple Push Issues:
**Push Issue**: [Clearly identified problem in 1 concise sentence]
**Quick Push Fix**: [Direct, actionable solution in 2-3 clear steps]
**Verify**: [Specific instructions on how to confirm the push fix worked]

---
### For Complex Push Issues:
**Push Investigation Summary**:
Push Technical Specialist: "I have thoroughly analyzed push campaign ID [X] logs from [specific date range]. My investigation revealed [key push findings, e.g., 'consistent payload errors for X reason']..."
**Push Root Cause**: [The primary underlying push problem identified from log analysis and API data]
**Push Solution Steps**:
1. [Step 1: Specific, actionable push configuration fix or action based on investigation findings]
2. [Step 2: Another specific push-related action or adjustment required]
3. [Step 3: A push verification or follow-up step]
(Maximum of 5 steps for clarity)
**Push Verification**: [Detailed instructions on how to confirm the push fix worked, including specific metrics or logs to check]
**Push Prevention**: [A key tip or best practice derived from the push root cause analysis to prevent future recurrence]

---
#### Always return your response in rich text format using markdown, adhering strictly to the specified headings, bullet points, and formatting for optimal readability and impact.
"""

    @override
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        """Technical investigation logic with conversation continuity"""
        current_query = ctx.session.state.get("current_query", "")
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
            return
        ctx.session.state["last_active_agent"] = self.name
        ctx.session.state["conversation_context"] = "technical"
        if "technical_context" not in ctx.session.state:
            ctx.session.state["technical_context"] = {
                "investigation_started": True,
                "tools_used": [],
                "findings": {},
                "previous_queries": []
            }
        ctx.session.state["technical_context"]["previous_queries"].append(current_query)
        transfer_reason = ctx.session.state.get("transfer_reason", "")
        logger.info(f"[{self.name}] Starting technical investigation for: '{current_query}'")
        logger.info(f"[{self.name}] Transfer reason: {transfer_reason}")
        conversation_history = ctx.session.state.get("conversation_history", [])
        is_followup = len(conversation_history) > 1 and transfer_reason != "technical_issue"
        if is_followup:
            yield Event(author=self.name, content=types.Content(
                role='model',
                parts=[types.Part(text="Let me continue our technical investigation with your follow-up question...")]
            ))
        else:
            yield Event(author=self.name, content=types.Content(
                role='model',
                parts=[types.Part(text="🔍 Starting technical investigation of your push issue...")]
            ))
        async for event in super()._run_async_impl(ctx):
            yield event
        ctx.session.state["technical_context"]["investigation_completed"] = True
        logger.info(f"[{self.name}] Technical investigation completed")

    def _should_transfer_control(self, user_query: str, session_state: Dict) -> tuple[bool, str]:
        query_lower = user_query.lower().strip()
        # Non-technical follow-up patterns
        non_technical_patterns = [
            "how to", "what is", "explain", "documentation", "guide", 
            "help", "tutorial", "setup", "configure"
        ]
        if any(pattern in query_lower for pattern in non_technical_patterns):
            if not any(tech in query_lower for tech in ["error", "issue", "problem", "debug", "fix"]):
                return True, "KnowledgeSpecialist"
        general_patterns = ["thank you", "thanks", "that's all", "no more questions"]
        if any(pattern in query_lower for pattern in general_patterns):
            return True, "MoEngageSupportChatManager"
        # Stay in control for technical follow-ups
        return False, ""
