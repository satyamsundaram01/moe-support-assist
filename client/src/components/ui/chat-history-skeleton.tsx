import React from 'react';
import { motion } from 'framer-motion';

// used in sidebar: chat list::
interface ChatHistorySkeletonProps {
  count?: number;
}

export const ChatHistorySkeleton: React.FC<ChatHistorySkeletonProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="px-3 py-2.5 rounded-lg"
        >
          {/* Main skeleton content */}
          <div className="flex items-start space-x-3">
            {/* Mode indicator skeleton */}
            <div className="flex-shrink-0 mt-1">
              <div className="w-2 h-2 bg-muted-foreground/20 rounded-full animate-pulse" />
            </div>
            
            {/* Content skeleton */}
            <div className="flex-1 space-y-2">
              {/* Title skeleton */}
              <div className="h-4 bg-muted-foreground/20 rounded animate-pulse w-3/4" />
              
              {/* Metadata skeleton */}
              <div className="flex items-center space-x-2">
                <div className="h-3 bg-muted-foreground/15 rounded animate-pulse w-16" />
                <div className="h-3 bg-muted-foreground/15 rounded animate-pulse w-12" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

interface ChatHistoryLoadingProps {
  message?: string;
}

export const ChatHistoryLoading: React.FC<ChatHistoryLoadingProps> = ({ 
  message = "Loading chat history..." 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      {/* Animated loading indicator */}
      <motion.div
        className="flex space-x-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-2 h-2 bg-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2,
            }}
          />
        ))}
      </motion.div>
      
      {/* Loading message */}
      <motion.p
        className="text-sm text-muted-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {message}
      </motion.p>
    </div>
  );
};

interface ChatHistoryErrorProps {
  error: string;
  onRetry?: () => void;
  fallbackMode?: boolean;
}

export const ChatHistoryError: React.FC<ChatHistoryErrorProps> = ({ 
  error, 
  onRetry,
  fallbackMode = false 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      {/* Error icon */}
      <motion.div
        className="text-2xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {fallbackMode ? '⚠️' : '❌'}
      </motion.div>
      
      {/* Error message */}
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-foreground">
          {fallbackMode ? 'Using offline data' : 'Failed to load history'}
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {fallbackMode 
            ? 'Showing cached conversations. Some recent chats may be missing.'
            : error
          }
        </p>
      </div>
      
      {/* Retry button */}
      {onRetry && (
        <motion.button
          onClick={onRetry}
          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Try Again
        </motion.button>
      )}
    </div>
  );
};

export default ChatHistorySkeleton;
