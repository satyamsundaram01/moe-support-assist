// utils/thinking-utils.ts
import { TOOL_CONFIGS, THINKING_STEP_CONFIGS, DEFAULT_TOOL_CONFIG, DEFAULT_THINKING_CONFIG } from '../config/thinking-config';
import type { ThinkingStep, ToolCall } from '../../../../types/chat';

export const getToolConfig = (toolName: string) => {
  return TOOL_CONFIGS[toolName] || {
    ...DEFAULT_TOOL_CONFIG,
    name: toolName,
    displayName: toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  };
};

export const getThinkingConfig = (stepType: string) => {
  return THINKING_STEP_CONFIGS[stepType] || DEFAULT_THINKING_CONFIG;
};

export const formatToolResult = (tool: ToolCall): string => {
  const config = getToolConfig(tool.name);
  
  if (config.resultFormatter && tool.result) {
    return config.resultFormatter(tool.result);
  }
  
  if (typeof tool.result === 'string') {
    return tool.result;
  }
  
  return JSON.stringify(tool.result, null, 2);
};

export const getStatusMessage = (tool: ToolCall): string => {
  const config = getToolConfig(tool.name);
  
  // Handle transfer_to_agent special case
  if (tool.name === 'transfer_to_agent' && tool.args?.agent_name) {
    const agentName = tool.args.agent_name;
    return `${config.statusMessages[tool.status]} ${agentName}`;
  }
  
  return config.statusMessages[tool.status];
};

export const shouldShowArgs = (tool: ToolCall): boolean => {
  const config = getToolConfig(tool.name);
  return config.showArgs === true && tool.args && Object.keys(tool.args).length > 0;
};

export const shouldShowResult = (tool: ToolCall): boolean => {
  const config = getToolConfig(tool.name);
  return config.showResult !== false && !!tool.result;
};

// Group tools by category
export const groupToolsByCategory = (tools: ToolCall[]) => {
  return tools.reduce((acc, tool) => {
    const config = getToolConfig(tool.name);
    const category = config.category;
    
    if (!acc[category]) {
      acc[category] = [];
    }
    
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, ToolCall[]>);
};

// Get dynamic status text for streaming
export const getDynamicStatusText = (
  allEvents: Array<ThinkingStep | ToolCall>,
  isStreaming: boolean
): string => {
  if (!isStreaming) return 'Agent Reasoning';
  
  const latestEvent = allEvents[allEvents.length - 1];
  if (!latestEvent) return 'Thinking...';
  
  if ('type' in latestEvent) {
    const config = getThinkingConfig(latestEvent.type);
    return config.description;
  } else {
    return getStatusMessage(latestEvent);
  }
};
