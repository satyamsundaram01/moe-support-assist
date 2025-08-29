import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../../lib/utils/cn';
import { formatToolResult, shouldShowArgs, shouldShowResult } from '../utils/thinking-utils';
import type { ThinkingStep, ToolCall } from '../../../../types/chat';
import type { ToolConfig, ThinkingStepConfig } from '../config/thinking-config';

interface StepContentProps {
  step: ThinkingStep | ToolCall;
  config: ToolConfig | ThinkingStepConfig;
  isExpanded: boolean;
  isToolCall: boolean;
  isThinking: boolean;
  isTransferTool: boolean;
}

export const StepContent: React.FC<StepContentProps> = ({
  step,
  config,
  isExpanded,
  isToolCall,
  isThinking,
  isTransferTool
}) => {
  const getDisplayName = () => {
    if (isTransferTool && isToolCall && (step as ToolCall).args?.agent_name) {
      return `${config.displayName} to ${(step as ToolCall).args.agent_name}`;
    }
    return config.displayName;
  };

  const getStatusBadge = () => {
    if (!isToolCall || isTransferTool) return null;
    
    const toolCall = step as ToolCall;
    const statusColors = {
      completed: "bg-primary/5 text-primary/70 border border-primary/10",
      error: "bg-destructive/5 text-destructive/70 border border-destructive/10",
      calling: "bg-accent/5 text-accent-foreground/70 border border-accent/10",
      pending: "bg-muted/10 text-muted-foreground/60 border border-muted/20"
    };

    return (
      <span className={cn(
        "px-1.5 py-0.5 rounded text-xs font-medium",
        statusColors[toolCall.status]
      )}>
        {toolCall.status}
      </span>
    );
  };

  const hasExpandableContent = () => {
    if (isThinking && (step as ThinkingStep).content) return true;
    if (isToolCall && (shouldShowArgs(step as ToolCall) || shouldShowResult(step as ToolCall))) return true;
    return false;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {!isTransferTool && (
            <div className={cn(
              "w-2 h-2 rounded-full",
              config.theme.bgColor.replace('/10', '/60')
            )} />
          )}
          <h4 className={cn(
            "text-xs font-medium transition-colors duration-200",
            isTransferTool 
              ? "text-primary/80 text-sm font-semibold" 
              : "text-muted-foreground/80"
          )}>
            {getDisplayName()}
          </h4>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          
          {hasExpandableContent() && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center w-5 h-5 text-muted-foreground/50 transition-colors"
            >
              <ChevronDownIcon className="w-3 h-3" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {/* Thinking content */}
          {isThinking && (step as ThinkingStep).content && (
            <div className={cn(
              "text-xs text-muted-foreground/70 leading-relaxed",
              "bg-muted/5 backdrop-blur-lg rounded-lg p-2.5",
              "font-mono whitespace-pre-wrap max-h-40 overflow-y-auto"
            )}>
              {(step as ThinkingStep).content}
            </div>
          )}

          {/* Tool arguments */}
          {isToolCall && shouldShowArgs(step as ToolCall) && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide">
                Arguments
              </div>
              <div className={cn(
                "text-sm text-muted-foreground leading-relaxed",
                "bg-muted/20 backdrop-blur-lg rounded-2xl p-3",
                "font-mono whitespace-pre-wrap max-h-32 overflow-y-auto",
                "border-l-2 border-secondary/30"
              )}>
                {JSON.stringify((step as ToolCall).args, null, 2)}
              </div>
            </div>
          )}

          {/* Tool result */}
          {isToolCall && shouldShowResult(step as ToolCall) && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide">
                Response
              </div>
              <div className={cn(
                "text-xs text-muted-foreground/70 leading-relaxed",
                "bg-muted/5 backdrop-blur-lg rounded-lg p-2.5",
                "font-mono whitespace-pre-wrap max-h-40 overflow-y-auto",
                "border-l border-primary/20"
              )}>
                {formatToolResult(step as ToolCall)}
              </div>
            </div>
          )}

          {/* Tool metadata */}
          {isToolCall && (step as ToolCall).duration && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Duration: {(step as ToolCall).duration}ms</span>
              {(step as ToolCall).args && Object.keys((step as ToolCall).args).length > 0 && (
                <span>{Object.keys((step as ToolCall).args).length} args</span>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
