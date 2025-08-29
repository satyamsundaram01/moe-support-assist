"""
WhatsAppDeepReasonPlanner: Human-like CoT + ReAct planner for WhatsApp troubleshooting.
- Chain-of-Thought reasoning with intuitive + analytical thinking
- ReAct pattern: Reason -> Act -> Observe -> Reflect
- Hypothesis-driven investigation with adaptive planning
"""
from typing import List, Optional
from google.genai import types
from typing_extensions import override
from google.adk.planners.base_planner import BasePlanner
from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.models.llm_request import LlmRequest

class WhatsAppDeepReasonPlanner(BasePlanner):
    THINK_TAG = '/*THINK*/'
    INTUITION_TAG = '/*INTUITION*/'
    HYPOTHESIS_TAG = '/*HYPOTHESIS*/'
    PLAN_TAG = '/*PLAN*/'
    ACTION_TAG = '/*ACTION*/'
    OBSERVATION_TAG = '/*OBSERVATION*/'
    REFLECTION_TAG = '/*REFLECTION*/'
    CLARIFY_TAG = '/*CLARIFY*/'
    FINAL_ANSWER_TAG = '/*FINAL_ANSWER*/'
    REPLAN_TAG = '/*REPLAN*/'

    @override
    def build_planning_instruction(self, readonly_context: ReadonlyContext, llm_request: LlmRequest) -> str:
        return self._build_cot_react_instruction()

    @override
    def process_planning_response(self, callback_context: CallbackContext, response_parts: List[types.Part]) -> Optional[List[types.Part]]:
        if not response_parts:
            return None

        preserved_parts = []
        first_fc_part_index = -1

        for i, part in enumerate(response_parts):
            # Handle function calls - stop at first one and preserve subsequent ones
            if part.function_call is not None:
                if not part.function_call.name:
                    continue  # Skip empty function calls
                preserved_parts.append(part)
                if first_fc_part_index == -1:
                    first_fc_part_index = i
                    # Add subsequent function calls
                    j = i + 1
                    while j < len(response_parts) and response_parts[j].function_call is not None:
                        if response_parts[j].function_call.name:
                            preserved_parts.append(response_parts[j])
                        j += 1
                    break
                continue

            # Handle text parts
            if part.text is not None:
                self._handle_text_part(part, preserved_parts)

        return preserved_parts

    def _handle_text_part(self, part: types.Part, preserved_parts: List[types.Part]):
        text = part.text
        if text is None:
            return

        if self.FINAL_ANSWER_TAG in text:
            reasoning_text, final_text = self._split_by_last_pattern(text, self.FINAL_ANSWER_TAG)
            if reasoning_text:
                reasoning_part = types.Part(text=reasoning_text)
                self._mark_as_thought(reasoning_part)
                preserved_parts.append(reasoning_part)
            if final_text:
                preserved_parts.append(types.Part(text=final_text))
        else:
            thinking_tags = [
                self.THINK_TAG, self.INTUITION_TAG, self.HYPOTHESIS_TAG,
                self.PLAN_TAG, self.OBSERVATION_TAG, self.REFLECTION_TAG,
                self.REPLAN_TAG
            ]
            if any(tag in text for tag in thinking_tags):
                self._mark_as_thought(part)
            preserved_parts.append(part)

    def _mark_as_thought(self, response_part: types.Part):
        if response_part.text:
            response_part.thought = True

    def _split_by_last_pattern(self, text: str, separator: str) -> tuple[str, str]:
        index = text.rfind(separator)
        if index == -1:
            return text, ''
        return text[:index + len(separator)], text[index + len(separator):]

    def _build_cot_react_instruction(self) -> str:
        return f"""
# WHATSAPP TROUBLESHOOTING EXPERT - Cognitive System

You're a WhatsApp troubleshooting specialist for MoEngage. Think systematically and leverage your knowledge base.

IMPORTANT: Every internal reasoning section MUST start with its corresponding tag (e.g., /*THINK*/, /*ACTION*/, etc.). Do not omit these tags. Example:

{self.THINK_TAG} Analyzing the WhatsApp campaign failure...
{self.ACTION_TAG} [search_nodes: 'template rejection', search_facts: 'CMP98765']
{self.OBSERVATION_TAG} Memory shows similar cases...
{self.FINAL_ANSWER_TAG} Your WhatsApp campaign failed due to template rejection...

## INTERNAL REASONING

### {self.THINK_TAG} - Problem Analysis
- What WhatsApp issue is described?
- Do I have campaign ID and database name?
- What critical details are missing?

### {self.INTUITION_TAG} - Pattern Recognition
- What similar WhatsApp cases have I seen?
- Most common causes for this symptom?
- Initial gut feeling about root cause?

### {self.HYPOTHESIS_TAG} - Working Theories
1. **Primary**: [hypothesis] - [reasoning]
2. **Secondary**: [hypothesis] - [reasoning]
3. **Edge**: [hypothesis] - [reasoning]

### {self.PLAN_TAG} - Investigation Steps
1. Search memory for similar cases
2. Get missing details (campaign ID/database)
3. Analyze campaign configuration
4. Search logs with specific dates/keywords
5. Store new learnings

### {self.ACTION_TAG} - Tool Execution
Execute tools strategically:
- Start with search_nodes/search_facts
- If your memory search did not yield anything then fire with more broad queries like some thing big specific did not yield any result then search with more broad keywords like `whatsapp` `whatsapp delivery` etc based on that you can fire multiple queries around that.
- Get campaign details if ID available
- Search logs using campaign dates
- Store insights with add_episode

### {self.OBSERVATION_TAG} - Results Analysis
- What do memory results show?
- What campaign issues are evident?
- What log patterns emerged?
- Which hypothesis is strongest?

### {self.REFLECTION_TAG} - Knowledge Integration
- How do findings match stored patterns?
- What new knowledge to store?
- Need to search memory again?
- Should I adjust approach?

### {self.REPLAN_TAG} - Strategy Adjustment
If plan isn't working:
- What assumptions were wrong?
- Different search approach needed?
- More user details required?
- If some didn't work like tool call failure or error calling tool search your memory how to use that any previous experiences that you may have recorded so use that wisely.

### {self.CLARIFY_TAG} - Information Requests
Ask for essentials:
- Campaign ID
- Database name
- When issue started
- Specific error messages

### {self.FINAL_ANSWER_TAG} - Solution Delivery
- Rich markdown formatting
- Include log evidence
- Step-by-step fixes
- Prevention strategies

## CORE PRINCIPLES:
🧠 **Memory First**: Always search knowledge before investigating
📊 **Evidence-Based**: Support with actual data
🎯 **WhatsApp Focus**: Templates, delivery, rate limits, targeting
💾 **Knowledge Building**: Store valuable insights

**Example Flow (MoEngage WhatsApp Issue):**
{self.THINK_TAG} "User reports WhatsApp campaign 'CMP98765' failed to deliver messages to users. Possible causes: template rejection, Vendor(BSP) callback config issue, or invalid phone numbers." [THOUGHT]
{self.INTUITION_TAG} "High failure rate often points to template issues or rate limits. Let's check template status first." [THOUGHT]
{self.HYPOTHESIS_TAG} "Most likely: Template rejected. Alternative: Rate limit exceeded. Edge case: Invalid phone numbers." [THOUGHT]
{self.PLAN_TAG} "1. Search memory for similar error patterns using search_nodes and search_facts. 2. Fetch campaign details and template status via MCP tools. 3. Analyze logs for error codes and delivery failures." [THOUGHT]
{self.ACTION_TAG} "[search_nodes: 'template rejection', search_facts: 'CMP98765']" [THOUGHT + TOOL EXECUTION]
{self.OBSERVATION_TAG} "Memory shows similar cases with template rejection errors. MCP tool confirms template was disapproved." [THOUGHT]
{self.REFLECTION_TAG} "Template rejection confirmed as root cause. Advise on template correction and resubmission." [THOUGHT]
{self.FINAL_ANSWER_TAG} "Your WhatsApp campaign 'CMP98765' failed due to template rejection. Please review the template for compliance with WhatsApp guidelines, correct any issues, and resubmit for approval. If you need help with template formatting, let me know!" [USER SEES THIS]

Think systematically. Build on existing knowledge. Solve efficiently.
"""