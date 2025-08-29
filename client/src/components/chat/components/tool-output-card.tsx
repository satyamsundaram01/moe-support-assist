import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../../lib/utils/cn';
import type { ToolCall } from '../../../types/chat';

interface ToolOutputCardProps {
  toolCall: ToolCall;
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

// Get tool type and styling based on tool name
const getToolInfo = (toolName: string) => {
  const name = toolName.toLowerCase();
  
  if (name.includes('knowledge') || name.includes('search')) {
    return {
      type: 'knowledge',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    };
  }
  
  if (name.includes('log') || name.includes('debug')) {
    return {
      type: 'debug',
      icon: <CodeBracketIcon className="w-5 h-5" />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800'
    };
  }
  
  if (name.includes('campaign') || name.includes('analytics')) {
    return {
      type: 'analytics',
      icon: <InformationCircleIcon className="w-5 h-5" />,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800'
    };
  }
  
  // Default
  return {
    type: 'tool',
    icon: <WrenchScrewdriverIcon className="w-5 h-5" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800'
  };
};

// Get status icon and styling
const getStatusInfo = (status: string) => {
  switch (status) {
    case 'completed':
      return {
        icon: <CheckCircleIcon className="w-4 h-4" />,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        label: 'Completed'
      };
    case 'error':
      return {
        icon: <ExclamationTriangleIcon className="w-4 h-4" />,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        label: 'Failed'
      };
    case 'calling':
      return {
        icon: <ClockIcon className="w-4 h-4 animate-spin" />,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        label: 'Running'
      };
    default:
      return {
        icon: <ClockIcon className="w-4 h-4" />,
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        label: 'Pending'
      };
  }
};

// Format duration
const formatDuration = (duration?: number) => {
  if (!duration) return '';
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(1)}s`;
};

// Format timestamp
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const ToolOutputCard: React.FC<ToolOutputCardProps> = ({
  toolCall,
  isExpanded: externalExpanded,
  onToggle: externalToggle,
  className
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const handleToggle = externalToggle || (() => setInternalExpanded(!internalExpanded));
  
  const toolInfo = getToolInfo(toolCall.name);
  const statusInfo = getStatusInfo(toolCall.status);
  
  const hasContent = toolCall.result || (toolCall.args && Object.keys(toolCall.args).length > 0);
  
  return (
    <motion.div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border shadow-sm hover:shadow-md transition-all duration-200',
        toolInfo.borderColor,
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div 
        className={cn(
          'p-4 cursor-pointer transition-colors duration-200',
          hasContent && 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
        )}
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Tool Icon */}
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              toolInfo.bgColor
            )}>
              <div className={toolInfo.color}>
                {toolInfo.icon}
              </div>
            </div>
            
            {/* Tool Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {toolCall.name}
                </h4>
                <span className={cn(
                  'text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1',
                  statusInfo.bgColor,
                  statusInfo.color
                )}>
                  {statusInfo.icon}
                  <span>{statusInfo.label}</span>
                </span>
              </div>
              
              {/* Metadata */}
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatTime(toolCall.timestamp)}</span>
                {toolCall.duration && (
                  <span>{formatDuration(toolCall.duration)}</span>
                )}
                <span className="capitalize">{toolInfo.type}</span>
              </div>
            </div>
          </div>
          
          {/* Expand/Collapse Icon */}
          {hasContent && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-400"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && hasContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100 dark:border-gray-700"
          >
            <div className="p-4 space-y-4">
              {/* Arguments */}
              {toolCall.args && Object.keys(toolCall.args).length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-1">
                    <CodeBracketIcon className="w-3 h-3" />
                    <span>Arguments</span>
                  </h5>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {JSON.stringify(toolCall.args, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* Result/Output */}
              {toolCall.result && (
                <div>
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-1">
                    <DocumentTextIcon className="w-3 h-3" />
                    <span>Output</span>
                  </h5>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {toolCall.result}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* Error */}
              {toolCall.error && (
                <div>
                  <h5 className="text-xs font-medium text-red-700 dark:text-red-300 mb-2 flex items-center space-x-1">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    <span>Error</span>
                  </h5>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-3">
                    <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                      {toolCall.error}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Container component for multiple tool outputs
interface ToolOutputContainerProps {
  toolCalls: ToolCall[];
  className?: string;
}

export const ToolOutputContainer: React.FC<ToolOutputContainerProps> = ({
  toolCalls,
  className
}) => {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <motion.div
      className={cn('space-y-3', className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-2 mb-2">
        <WrenchScrewdriverIcon className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Tool Results ({toolCalls.length})
        </h3>
      </div>
      
      {toolCalls.map((toolCall) => (
        <ToolOutputCard
          key={toolCall.id}
          toolCall={toolCall}
        />
      ))}
    </motion.div>
  );
}; 