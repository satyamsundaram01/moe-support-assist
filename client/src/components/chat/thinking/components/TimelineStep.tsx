import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils/cn';
import { getToolConfig, getThinkingConfig } from '../utils/thinking-utils';
import type { ThinkingStep, ToolCall } from '../../../../types/chat';
import { ShimmerStep } from './ShimmerStep';
import { StepContent } from './StepContent';

interface TimelineStepProps {
  step: ThinkingStep | ToolCall;
  index: number;
  isLast: boolean;
}

export const TimelineStep: React.FC<TimelineStepProps> = ({ step, index, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isToolCall = 'status' in step;
  const isThinking = 'type' in step;
  
  const config = isToolCall 
    ? getToolConfig((step as ToolCall).name) 
    : getThinkingConfig((step as ThinkingStep).type);
  
  const IconComponent = config.icon;
  
  // Special handling for transfer_to_agent
  const isTransferTool = isToolCall && (step as ToolCall).name === 'transfer_to_agent';
  
  return (
    <motion.div
      className="relative flex group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      {/* Timeline column */}
      <div className="relative flex flex-col items-center w-12 mr-4">
        {!isLast && (
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-border/60 to-border/30 z-0" />
        )}
        
        <motion.div className="relative z-10 flex-shrink-0">
          <ShimmerStep
            className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center backdrop-blur-sm transition-all duration-300",
              config.theme.bgColor,
              config.theme.borderColor
            )}
            isActive={isThinking || (isToolCall && (step as ToolCall).status === 'calling')}
          >
            <div className={cn(config.theme.color, "relative z-10")}>
              <IconComponent className="w-3.5 h-3.5" />
            </div>
          </ShimmerStep>
        </motion.div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 pb-4">
        <motion.div
          className={cn(
            "relative rounded-lg p-3 transition-all duration-300 cursor-pointer",
            isTransferTool 
              ? "bg-transparent border-none shadow-none" 
              : "bg-muted/10 backdrop-blur-sm border border-border/20"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {!isTransferTool && (
            <div 
              className={cn(
                "absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg transition-all duration-300",
                config.theme.borderColor.replace('border-', 'bg-').replace('/30', '/20')
              )} 
            />
          )}

          <StepContent
            step={step}
            config={config}
            isExpanded={isExpanded}
            isToolCall={isToolCall}
            isThinking={isThinking}
            isTransferTool={isTransferTool}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
