"""
Solution utilities for MoEngage WhatsApp Support Agent.

This module provides functions for analyzing findings from knowledge and execution agents,
performing root cause analysis, and generating comprehensive solutions and recommendations.
"""

import logging
from typing import Dict, Any, Callable
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)


def analyze_root_cause(knowledge: str, execution: str) -> str:
    """
    Analyze the root cause of WhatsApp campaign issues based on knowledge and execution findings.
    
    Args:
        knowledge (str): Findings from knowledge agent (runbooks, Zendesk tickets)
        execution (str): Results from execution agent (campaign data, logs)
    
    Returns:
        str: Root cause analysis with identified issues and contributing factors
    """
    logger.info("Performing root cause analysis...")
    
    # Initialize analysis components
    root_causes = []
    contributing_factors = []
    
    # Analyze knowledge findings for known issues
    if knowledge and knowledge.strip():
        knowledge_lower = knowledge.lower()
        
        # Common WhatsApp campaign issues from knowledge base
        if any(term in knowledge_lower for term in ['delivery', 'failed', 'not delivered', 'bounce']):
            root_causes.append("Message delivery failure")
            contributing_factors.append("Delivery issues identified in knowledge base")
        
        if any(term in knowledge_lower for term in ['rate limit', 'throttle', 'quota', 'limit exceeded']):
            root_causes.append("API rate limiting")
            contributing_factors.append("Rate limiting constraints mentioned in documentation")
        
        if any(term in knowledge_lower for term in ['template', 'approval', 'rejected', 'not approved']):
            root_causes.append("Template approval issues")
            contributing_factors.append("Template-related problems found in knowledge base")
        
        if any(term in knowledge_lower for term in ['webhook', 'callback', 'status update']):
            root_causes.append("Webhook/status update issues")
            contributing_factors.append("Webhook configuration problems identified")
        
        if any(term in knowledge_lower for term in ['phone number', 'invalid', 'format', 'country code']):
            root_causes.append("Phone number formatting issues")
            contributing_factors.append("Phone number validation problems documented")
    
    # Analyze execution findings for technical issues
    if execution and execution.strip():
        execution_lower = execution.lower()
        
        # Technical issues from campaign data/logs
        if any(term in execution_lower for term in ['error', 'failed', 'exception', 'timeout']):
            root_causes.append("Technical execution errors")
            contributing_factors.append("Error conditions detected in campaign logs")
        
        if any(term in execution_lower for term in ['status: failed', 'delivery_status: failed']):
            root_causes.append("Campaign delivery failure")
            contributing_factors.append("Failed delivery status in campaign data")
        
        if any(term in execution_lower for term in ['no recipients', 'empty audience', 'zero users']):
            root_causes.append("Audience targeting issues")
            contributing_factors.append("No valid recipients found in campaign execution")
        
        if any(term in execution_lower for term in ['configuration', 'setup', 'missing parameter']):
            root_causes.append("Campaign configuration issues")
            contributing_factors.append("Configuration problems identified in execution data")
    
    # Build root cause analysis
    if not root_causes:
        if not knowledge.strip() and not execution.strip():
            analysis = """**ROOT CAUSE ANALYSIS:**

**Status:** Insufficient data for comprehensive analysis

**Primary Issue:** Unable to determine root cause due to limited information available.

**Analysis Summary:**
- No significant findings from knowledge base search
- No detailed execution data available
- Requires additional investigation or user input to proceed

**Recommendation:** Gather more specific information about the campaign issue, including error messages, campaign IDs, or specific symptoms."""
        else:
            analysis = """**ROOT CAUSE ANALYSIS:**

**Status:** No clear root cause identified

**Analysis Summary:**
- Information gathered but no specific issues pattern-matched
- May require manual review of findings
- Could be a novel issue not covered in existing knowledge base

**Available Information:**
- Knowledge findings available but no clear issues identified
- Execution data reviewed but no obvious problems detected"""
    else:
        # Format the root cause analysis
        analysis = "**ROOT CAUSE ANALYSIS:**\n\n"
        analysis += f"**Primary Root Causes Identified:** {len(root_causes)}\n\n"
        
        for i, cause in enumerate(root_causes, 1):
            analysis += f"{i}. **{cause}**\n"
        
        analysis += "\n**Contributing Factors:**\n"
        for factor in contributing_factors:
            analysis += f"• {factor}\n"
        
        analysis += f"\n**Analysis Confidence:** {'High' if len(root_causes) >= 2 else 'Medium'}"
        analysis += f"\n**Analysis Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    
    logger.info(f"Root cause analysis completed. Found {len(root_causes)} primary causes.")
    return analysis


def generate_recommendations(knowledge: str, execution: str) -> str:
    """
    Generate actionable recommendations based on knowledge and execution findings.
    
    Args:
        knowledge (str): Findings from knowledge agent (runbooks, Zendesk tickets)
        execution (str): Results from execution agent (campaign data, logs)
    
    Returns:
        str: Structured recommendations with specific action items
    """
    logger.info("Generating recommendations...")
    
    recommendations = []
    immediate_actions = []
    preventive_measures = []
    
    # Analyze knowledge for solution patterns
    if knowledge and knowledge.strip():
        knowledge_lower = knowledge.lower()
        
        # Delivery issue recommendations
        if any(term in knowledge_lower for term in ['delivery', 'failed', 'not delivered']):
            recommendations.append({
                "category": "Delivery Issues",
                "action": "Check WhatsApp Business API status and verify phone number validity",
                "priority": "High",
                "details": "Verify recipient phone numbers are in correct international format and WhatsApp-enabled"
            })
            immediate_actions.append("Validate phone number formats and WhatsApp availability")
        
        # Rate limiting recommendations
        if any(term in knowledge_lower for term in ['rate limit', 'throttle', 'quota']):
            recommendations.append({
                "category": "Rate Limiting",
                "action": "Implement rate limiting controls and review API usage patterns",
                "priority": "High",
                "details": "Check current API usage against limits and implement exponential backoff"
            })
            preventive_measures.append("Set up monitoring for API rate limit thresholds")
        
        # Template recommendations
        if any(term in knowledge_lower for term in ['template', 'approval', 'rejected']):
            recommendations.append({
                "category": "Template Issues",
                "action": "Review and resubmit template for approval",
                "priority": "Medium",
                "details": "Ensure template follows WhatsApp Business API guidelines and policies"
            })
            immediate_actions.append("Check template approval status in WhatsApp Business Manager")
        
        # Webhook recommendations
        if any(term in knowledge_lower for term in ['webhook', 'callback', 'status']):
            recommendations.append({
                "category": "Webhook Configuration",
                "action": "Verify webhook endpoint configuration and SSL certificate",
                "priority": "Medium",
                "details": "Ensure webhook URL is accessible and returns proper HTTP status codes"
            })
    
    # Analyze execution data for technical recommendations
    if execution and execution.strip():
        execution_lower = execution.lower()
        
        # Error handling recommendations
        if any(term in execution_lower for term in ['error', 'failed', 'exception']):
            recommendations.append({
                "category": "Error Resolution",
                "action": "Review error logs and implement proper error handling",
                "priority": "High",
                "details": "Analyze specific error messages and implement retry mechanisms"
            })
            immediate_actions.append("Review campaign error logs for specific failure patterns")
        
        # Configuration issue recommendations
        if any(term in execution_lower for term in ['configuration', 'setup', 'missing']):
            recommendations.append({
                "category": "Configuration",
                "action": "Review campaign configuration and required parameters",
                "priority": "Medium",
                "details": "Verify all required fields are properly configured"
            })
            preventive_measures.append("Implement configuration validation checks")
        
        # Audience targeting recommendations
        if any(term in execution_lower for term in ['no recipients', 'empty audience', 'zero users']):
            recommendations.append({
                "category": "Audience Targeting",
                "action": "Review audience segmentation and targeting criteria",
                "priority": "High",
                "details": "Verify audience filters and ensure valid recipients exist"
            })
            immediate_actions.append("Check audience size and targeting parameters")
    
    # Build recommendations output
    if not recommendations:
        rec_output = """**RECOMMENDATIONS:**

**Status:** No specific recommendations available

**General Guidance:**
- Review the original issue description for more specific details
- Check MoEngage documentation for WhatsApp campaign best practices
- Contact support if the issue persists with detailed error information

**Next Steps:**
1. Gather more specific error messages or symptoms
2. Provide campaign ID or specific configuration details
3. Check WhatsApp Business API status and account health"""
    else:
        rec_output = "**RECOMMENDATIONS:**\n\n"
        
        # High priority recommendations first
        high_priority = [r for r in recommendations if r["priority"] == "High"]
        medium_priority = [r for r in recommendations if r["priority"] == "Medium"]
        
        if high_priority:
            rec_output += "**🔴 HIGH PRIORITY ACTIONS:**\n"
            for i, rec in enumerate(high_priority, 1):
                rec_output += f"{i}. **{rec['category']}:** {rec['action']}\n"
                rec_output += f"   Details: {rec['details']}\n\n"
        
        if medium_priority:
            rec_output += "**🟡 MEDIUM PRIORITY ACTIONS:**\n"
            for i, rec in enumerate(medium_priority, 1):
                rec_output += f"{i}. **{rec['category']}:** {rec['action']}\n"
                rec_output += f"   Details: {rec['details']}\n\n"
        
        if immediate_actions:
            rec_output += "**⚡ IMMEDIATE ACTIONS:**\n"
            for action in immediate_actions:
                rec_output += f"• {action}\n"
            rec_output += "\n"
        
        if preventive_measures:
            rec_output += "**🛡️ PREVENTIVE MEASURES:**\n"
            for measure in preventive_measures:
                rec_output += f"• {measure}\n"
            rec_output += "\n"
        
        rec_output += f"**Total Recommendations:** {len(recommendations)}\n"
        rec_output += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    
    logger.info(f"Generated {len(recommendations)} recommendations.")
    return rec_output


def generate_final_solution(
    session_state: Dict[str, Any],
    analyze_root_cause_func: Callable[[str, str], str],
    generate_recommendations_func: Callable[[str, str], str]
) -> str:
    """
    Generate comprehensive final solution based on all gathered information.
    
    Args:
        session_state (Dict[str, Any]): Session state containing all investigation findings
        analyze_root_cause_func (Callable): Function to perform root cause analysis
        generate_recommendations_func (Callable): Function to generate recommendations
    
    Returns:
        str: Comprehensive final solution with analysis and recommendations
    """
    logger.info("Generating final comprehensive solution...")
    
    # Extract findings from session state
    user_query = session_state.get("user_query", "No query provided")
    knowledge_findings = session_state.get("knowledge_findings", "")
    execution_results = session_state.get("execution_results", "")
    investigation_phase = session_state.get("investigation_phase", "unknown")
    
    # Perform root cause analysis
    root_cause_analysis = analyze_root_cause_func(knowledge_findings, execution_results)
    
    # Generate recommendations
    recommendations = generate_recommendations_func(knowledge_findings, execution_results)
    
    # Build comprehensive solution
    solution = f"""# 🔍 MoEngage WhatsApp Campaign Support Analysis

## 📋 Investigation Summary

**Original Query:** {user_query}

**Investigation Phase:** {investigation_phase}

**Analysis Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---

## 🔎 Knowledge Base Findings

"""
    
    if knowledge_findings and knowledge_findings.strip():
        solution += f"""**Status:** ✅ Knowledge found

**Findings:**
{knowledge_findings}

"""
    else:
        solution += """**Status:** ❌ No relevant knowledge found

**Impact:** Limited historical context available for this specific issue.

"""
    
    solution += """---

## 🔧 Technical Investigation Results

"""
    
    if execution_results and execution_results.strip():
        solution += f"""**Status:** ✅ Technical data retrieved

**Results:**
{execution_results}

"""
    else:
        solution += """**Status:** ❌ No technical data available

**Impact:** Unable to perform detailed technical analysis of campaign execution.

"""
    
    solution += f"""---

{root_cause_analysis}

---

{recommendations}

---

## 📞 Next Steps

If this analysis doesn't fully resolve your issue:

1. **Provide Additional Context:** Share specific error messages, campaign IDs, or screenshots
2. **Check Recent Changes:** Review any recent configuration changes to your WhatsApp setup
3. **Monitor Status:** Keep an eye on WhatsApp Business API status and your account health
4. **Contact Support:** If the issue persists, contact MoEngage support with this analysis

---

*This analysis was generated by the MoEngage WhatsApp Support Agent using multi-agent investigation.*
"""
    
    logger.info("Final comprehensive solution generated successfully.")
    return solution
