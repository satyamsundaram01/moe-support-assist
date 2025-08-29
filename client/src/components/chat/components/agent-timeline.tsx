import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CpuChipIcon, 
  WrenchScrewdriverIcon, 
  LightBulbIcon, 
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils/cn';
import type { ThinkingStep, ToolCall, StreamingState, ChatMode } from '../../../types/chat';

export interface TimelineStep {
  id: string;
  type: 'plan' | 'tool_call' | 'reason' | 'transfer';
  toolName?: string;
  status: 'pending' | 'completed' | 'failed' | 'calling';
  summary: string;
  arguments?: Record<string, unknown>;
  rawOutput?: string;
  timeTaken?: number;
  timestamp: number;
  content?: string;
}

interface AgentTimelineProps {
  thinkingSteps: ThinkingStep[];
  toolCalls: ToolCall[];
  streamingState: StreamingState;
  currentMode: ChatMode;
  className?: string;
  isVisible?: boolean;
}

// Convert thinking steps and tool calls to timeline steps
const convertToTimelineSteps = (
  thinkingSteps: ThinkingStep[], 
  toolCalls: ToolCall[]
): TimelineStep[] => {
  const steps: TimelineStep[] = [];

  // Add thinking steps
  thinkingSteps.forEach(step => {
    steps.push({
      id: step.id,
      type: step.type === 'planning' ? 'plan' : 
            step.type === 'reasoning' ? 'reason' : 'transfer',
      status: 'completed',
      summary: step.type.replace('_', ' ').charAt(0).toUpperCase() + 
               step.type.replace('_', ' ').slice(1),
      content: step.content,
      timestamp: step.timestamp,
      timeTaken: 0 // Thinking steps don't have duration
    });
  });

  // Add tool calls
  toolCalls.forEach(tool => {
    steps.push({
      id: tool.id,
      type: 'tool_call',
      toolName: tool.name,
      status: tool.status === 'completed' ? 'completed' :
              tool.status === 'error' ? 'failed' :
              tool.status === 'calling' ? 'calling' : 'pending',
      summary: `Using ${tool.name}`,
      arguments: tool.args,
      rawOutput: tool.result,
      timestamp: tool.timestamp,
      timeTaken: tool.duration
    });
  });

  // Sort by timestamp
  return steps.sort((a, b) => a.timestamp - b.timestamp);
};

// Get icon for step type
const getStepIcon = (type: TimelineStep['type'], status: TimelineStep['status']) => {
  const baseClasses = "w-5 h-5";
  
  switch (type) {
    case 'plan':
      return <LightBulbIcon className={cn(baseClasses, "text-blue-500")} />;
    case 'reason':
      return <CpuChipIcon className={cn(baseClasses, "text-purple-500")} />;
    case 'tool_call':
      if (status === 'completed') return <CheckCircleIcon className={cn(baseClasses, "text-green-500")} />;
      if (status === 'failed') return <ExclamationTriangleIcon className={cn(baseClasses, "text-red-500")} />;
      if (status === 'calling') return <ClockIcon className={cn(baseClasses, "text-yellow-500 animate-spin")} />;
      return <WrenchScrewdriverIcon className={cn(baseClasses, "text-gray-500")} />;
    case 'transfer':
      return <CogIcon className={cn(baseClasses, "text-orange-500")} />;
    default:
      return <CpuChipIcon className={cn(baseClasses, "text-gray-500")} />;
  }
};

// Get status color
const getStatusColor = (status: TimelineStep['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'calling':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'pending':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

// Individual timeline step component
const TimelineStepItem: React.FC<{
  step: TimelineStep;
  index: number;
  isLast: boolean;
}> = ({ step, index, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    return `${duration}ms`;
  };

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-6 top-8 w-0.5 h-12 bg-gray-200 dark:bg-gray-700" />
      )}
      
      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
          {getStepIcon(step.type, step.status)}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700  transition-shadow duration-200 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {step.summary}
                  </h4>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full font-medium',
                    getStatusColor(step.status)
                  )}>
                    {step.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(step.timestamp)}
                  </span>
                  {step.timeTaken && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDuration(step.timeTaken)}
                    </span>
                  )}
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  </motion.div>
                </div>
              </div>
              
              {/* Tool name if applicable */}
              {step.toolName && (
                <div className="mb-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Tool: <span className="font-medium">{step.toolName}</span>
                  </span>
                </div>
              )}
              
              {/* Expandable content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700"
                  >
                    {/* Content/Output */}
                    {step.content && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Content
                        </h5>
                        <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
                          {step.content}
                        </div>
                      </div>
                    )}
                    
                    {/* Arguments */}
                    {step.arguments && Object.keys(step.arguments).length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Arguments
                        </h5>
                        <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(step.arguments, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {/* Raw Output */}
                    {step.rawOutput && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Output
                        </h5>
                        <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">
                            {step.rawOutput}
                          </pre>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  thinkingSteps,
  toolCalls,
  streamingState,
  currentMode,
  className,
  isVisible = true
}) => {
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Convert steps to timeline format
  useEffect(() => {
    const steps = convertToTimelineSteps(thinkingSteps, toolCalls);
    setTimelineSteps(steps);
  }, [thinkingSteps, toolCalls]);

  // Only show in investigate mode
  if (currentMode !== 'investigate' || !isVisible) {
    return null;
  }

  const hasSteps = timelineSteps.length > 0 || streamingState.isStreaming;

  return (
    <motion.div
      className={cn(
        'bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-sm',
        className
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <CpuChipIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Agent Reasoning Timeline
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {timelineSteps.length} steps • {streamingState.isStreaming ? 'Live' : 'Complete'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {streamingState.isStreaming && (
            <motion.div
              className="w-2 h-2 bg-green-500 rounded-full"
              animate={{ scale: 1.2, opacity: 0.7 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isCollapsed ? "Expand timeline" : "Collapse timeline"}
            title={isCollapsed ? "Expand timeline" : "Collapse timeline"}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4"
          >
            {hasSteps ? (
              <div className="space-y-4">
                {timelineSteps.map((step, index) => (
                  <TimelineStepItem
                    key={step.id}
                    step={step}
                    index={index}
                    isLast={index === timelineSteps.length - 1}
                  />
                ))}
                
                {/* Live indicator */}
                {streamingState.isStreaming && (
                  <motion.div
                    className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <motion.div
                      className="w-3 h-3 bg-blue-500 rounded-full"
                      animate={{ scale: 1.2, opacity: 0.7 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                      Processing next step...
                    </span>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No reasoning steps yet. Start a conversation to see the AI's thinking process.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}; 