import React from 'react';
import { motion } from 'framer-motion';

interface StreamingIndicatorProps {
  isStreaming: boolean;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ isStreaming }) => {
  if (!isStreaming) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex mr-10 ml-4 p-4 justify-start mb-4"
    >
      <div className="flex items-start space-x-3 w-full max-w-3xl">
        <div className="flex-shrink-0 w-8 h-8 rounded-3xl bg-primary/10 flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-foreground">AI is thinking...</span>
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 bg-primary rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
          <div className="h-1 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/60"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}; 