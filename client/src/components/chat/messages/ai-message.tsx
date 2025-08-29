import React from 'react';
import { motion } from 'framer-motion';
import { ThinkingStatusButton } from '../thinking/thinking-status-button';
import { AITypingIndicator } from '../citations';
import { AIResponseContainer } from '../response';
import type { AIMessage as AIMessageType, StreamingState } from '../../../types/chat';
import { ChatMode } from '../../../types/chat';

interface AIMessageProps {
  message: AIMessageType;
  isLoading: boolean;
  streamingState: StreamingState;
  currentMode: ChatMode;
}

export const AIMessage: React.FC<AIMessageProps> = ({ 
  message, 
  isLoading, 
  streamingState, 
  currentMode 
}) => {
  const responseData = {
    answer: message.content,
    citations: message.citations || [],
  };

  const showThinkingButton = currentMode === 'investigate' && 
    (message.thinkingSteps.length > 0 || message.toolCalls.length > 0);

  return (
    <motion.div 
      className="flex mr-10 ml-4 p-3 justify-start mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-full pt-2">
        {showThinkingButton && (
          <ThinkingStatusButton
            streamingState={isLoading ? streamingState : { ...streamingState, isStreaming: false }}
            thinkingSteps={message.thinkingSteps}
            toolCalls={message.toolCalls}
          />
        )}
        {isLoading ? (
          <AITypingIndicator />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AIResponseContainer content={responseData.answer} citations={responseData.citations} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
