import React from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  delay?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = "", delay = 0 }) => (
  <motion.div
    className={`animate-pulse bg-muted rounded ${className}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay }}
  />
);

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      type: "spring", 
      stiffness: 300 
    } 
  }
};

export const ChatSkeleton: React.FC = () => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={itemVariants}
      className="space-y-4"
    >
      {/* User message skeleton */}
      <motion.div className="flex justify-end" variants={itemVariants}>
        <Skeleton className="h-6 w-6 rounded-full" />
        <motion.div className="space-y-2.5" variants={itemVariants}>
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-[92%]" delay={0.1} />
          <Skeleton className="h-3.5 w-[85%]" delay={0.2} />
        </motion.div>
      </motion.div>

      {/* AI message skeleton */}
      <motion.div className="flex justify-start" variants={itemVariants}>
        <Skeleton className="h-6 w-6 rounded-full" />
        <motion.div className="space-y-2.5" variants={itemVariants}>
          <Skeleton className="h-3.5 w-[96%]" delay={0.1} />
          <Skeleton className="h-3.5 w-full" delay={0.2} />
          <Skeleton className="h-3.5 w-[78%]" delay={0.3} />
        </motion.div>
      </motion.div>

      {/* Thinking skeleton */}
      <motion.div variants={itemVariants}>
        <Skeleton className="h-3.5 w-[45%]" />
      </motion.div>

      {/* Tool call skeleton */}
      <motion.div className="flex justify-start" variants={itemVariants}>
        <Skeleton className="h-6 w-6 rounded-full" />
        <motion.div className="space-y-2.5" variants={itemVariants}>
          <Skeleton className="h-3.5 w-[85%]" delay={0.1} />
          <Skeleton className="h-3.5 w-[70%]" delay={0.2} />
        </motion.div>
      </motion.div>

      {/* Code block skeleton */}
      <motion.div className="flex justify-start" variants={itemVariants}>
        <Skeleton className="h-6 w-6 rounded-full" />
        <motion.div className="space-y-2.5" variants={itemVariants}>
          <Skeleton className="h-3 w-[60%]" delay={0.4} />
          <Skeleton className="h-3 w-[80%]" delay={0.5} />
          <Skeleton className="h-3 w-[45%]" delay={0.6} />
          <Skeleton className="h-3 w-[90%]" delay={0.7} />
        </motion.div>
      </motion.div>

      {/* Final response skeleton */}
      <motion.div className="flex justify-start" variants={itemVariants}>
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3.5 w-[75%]" delay={0.8} />
      </motion.div>
    </motion.div>
  );
};

export const MessageSkeleton: React.FC = () => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={itemVariants}
      className="flex items-start space-x-3"
    >
      <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
      <motion.div className="space-y-2 flex-1" variants={itemVariants}>
        <Skeleton className="h-3 w-full" delay={0.1} />
        <Skeleton className="h-3 w-[75%]" delay={0.2} />
      </motion.div>
    </motion.div>
  );
};

export const ThinkingSkeleton: React.FC = () => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={itemVariants}
      className="flex items-center space-x-2"
    >
      <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
      <motion.div className="space-y-1 flex-1" variants={itemVariants}>
        <Skeleton className="h-2 w-[60%]" delay={0.1} />
        <Skeleton className="h-2 w-[40%]" delay={0.2} />
      </motion.div>
    </motion.div>
  );
};

// Add the missing exports that are being imported
export const ResponseSkeleton: React.FC = () => {
  return (
    <motion.div 
      className="flex space-x-4 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex-1 space-y-4">
        <div className="space-y-3">
          {[100, 95, 88, 72, 85, 60].map((width, index) => (
            <motion.div
              key={index}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${width}%`, opacity: 1 }}
              transition={{ 
                duration: 0.6, 
                delay: 0.3 + index * 0.1,
                ease: "easeOut"
              }}
            >
              <Skeleton className="h-4" delay={index * 0.1} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export const StreamingSkeleton: React.FC = () => {
  return (
    <motion.div 
      className="flex space-x-4 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex-1 space-y-4">
        <div className="space-y-3">
          {[100, 85, 60, 90, 45].map((width, index) => (
            <motion.div
              key={index}
              className="relative"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${width}%`, opacity: 1 }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.3,
                ease: "easeOut"
              }}
            >
              <Skeleton className="h-4" delay={index * 0.2} />
              
              {/* Blinking cursor on last line */}
              {index === 4 && (
                <motion.div
                  className="absolute right-0 top-0 w-0.5 h-4 bg-blue-500"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.div>
          ))}
        </div>
        
        {/* Progress indicator */}
        <motion.div
          className="flex items-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Generating...</span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export const AITypingIndicator: React.FC = () => {
  return (
    <motion.div 
      className="flex space-x-4 p-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-3 pt-1">
        <motion.span
          className="text-sm text-gray-500 dark:text-gray-400 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          AI is thinking...
        </motion.span>
      </div>
    </motion.div>
  );
};