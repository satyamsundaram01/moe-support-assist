import React from 'react';
import { motion } from 'framer-motion';
import { CpuChipIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../../lib/utils/cn';
import { ShimmerStep } from './ShimmerStep';

export const StreamingIndicator: React.FC = () => {
  return (
    <motion.div
      className="relative flex group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Timeline column */}
      <div className="relative flex flex-col items-center w-12 mr-4">
        <motion.div className="relative z-10 flex-shrink-0">
          <ShimmerStep
            className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center backdrop-blur-sm transition-all duration-300",
              "bg-primary/10 border-primary/30"
            )}
            isActive={true}
          >
            <div className="text-primary relative z-10">
              <CpuChipIcon className="w-3.5 h-3.5" />
            </div>
          </ShimmerStep>
        </motion.div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 pb-4">
        <motion.div
          className="relative rounded-lg p-3 bg-muted/10 backdrop-blur-sm border border-border/20"
        >
          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg bg-primary/20" />

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-primary/60" />
              <h4 className="text-xs font-medium text-muted-foreground/80">
                Processing...
              </h4>
            </div>
            
            {/* Animated dots */}
            <div className="flex items-center space-x-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full bg-primary/60"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
