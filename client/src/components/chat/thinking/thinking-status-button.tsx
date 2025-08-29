import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CpuChipIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils/cn';
import { ShimmeringText } from '../../ui/shimmering';
import { TimelineStep } from './components/TimelineStep';
import { StreamingIndicator } from './components/StreamingIndicator';
import { getDynamicStatusText } from './utils/thinking-utils';
import type { ThinkingStep, ToolCall, StreamingState } from '../../../types/chat';

interface ThinkingStatusButtonProps {
  streamingState: StreamingState;
  thinkingSteps: ThinkingStep[];
  toolCalls: ToolCall[];
  className?: string;
  maxVisibleSteps?: number;
  showCategories?: boolean;
}

export const ThinkingStatusButton: React.FC<ThinkingStatusButtonProps> = ({
  streamingState,
  thinkingSteps,
  toolCalls,
  className,
  maxVisibleSteps = 55,
  // showCategories = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Combine and sort events
  const allEvents = [
    ...thinkingSteps.map(step => ({ ...step, eventType: 'thinking' as const })),
    ...toolCalls.map(tool => ({ ...tool, eventType: 'tool' as const }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  const hasEvents = allEvents.length > 0 || streamingState.isStreaming;
  const displayEvents = allEvents.slice(-maxVisibleSteps);
  
  if (!hasEvents) return null;

  return (
    <motion.div
      className={cn('mb-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-2.5 rounded-lg border transition-all duration-300',
          'hover:bg-muted/30 active:scale-[0.99]',
          'focus:outline-none focus:ring-1 focus:ring-primary/20',
          'cursor-pointer bg-muted/15 backdrop-blur-sm border-border/20'
        )}
        whileHover={{ y: -0.5 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center space-x-3"> 
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-lg bg-muted/30 flex items-center justify-center border border-border/20">
              <CpuChipIcon className="w-3.5 h-3.5 text-muted-foreground/70" />
            </div>
            <div className="text-left">
              <div className="relative">
                <p className="text-xs font-medium text-muted-foreground/80">
                  {streamingState.isStreaming ? (
                    <ShimmeringText
                      text={getDynamicStatusText(allEvents, streamingState.isStreaming)}
                      duration={2}
                      repeat={true}
                      repeatDelay={0.5}
                      className="text-sm font-medium text-primary"
                      startOnView={false}
                    />
                  ) : (
                    getDynamicStatusText(allEvents, streamingState.isStreaming)
                  )}
                </p>
              </div>
              <p className="text-xs text-muted-foreground/60">
                {allEvents.length} {allEvents.length === 1 ? 'step' : 'steps'} • {streamingState.isStreaming ? 'Processing' : 'Complete'}
              </p>
            </div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center w-6 h-6 text-muted-foreground/60 rounded-md hover:bg-muted/20 transition-colors"
        >
          <ChevronDownIcon className="w-3.5 h-3.5" />
        </motion.div>
      </motion.button>

      {/* Timeline Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mt-4 pl-4"
          >
            <div className="space-y-0">
              {displayEvents.map((event, index) => (
                <TimelineStep
                  key={event.id}
                  step={event}
                  index={index}
                  isLast={index === displayEvents.length - 1 && !streamingState.isStreaming}
                />
              ))}
              
              {streamingState.isStreaming && <StreamingIndicator />}
              
              {allEvents.length > maxVisibleSteps && (
                <div className="text-xs text-muted-foreground/60 text-center py-2">
                  Showing last {maxVisibleSteps} of {allEvents.length} steps
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
