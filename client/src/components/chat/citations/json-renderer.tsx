import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JsonRendererProps {
  data: string | Record<string, unknown>;
  title?: string;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

interface JsonValueProps {
  value: unknown;
  keyName?: string;
  level?: number;
  isLast?: boolean;
}

type JsonValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

const JsonValue: React.FC<JsonValueProps> = ({ value, keyName, level = 0, isLast = true }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  
  const indent = level * 20;
  
  const getValueType = (val: unknown): JsonValueType => {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val as JsonValueType;
  };
  
  const getValueColor = (type: JsonValueType): string => {
    switch (type) {
      case 'string': return 'text-green-600 dark:text-green-400';
      case 'number': return 'text-blue-600 dark:text-blue-400';
      case 'boolean': return 'text-purple-600 dark:text-purple-400';
      case 'null': return 'text-muted-foreground';
      case 'object': return 'text-orange-600 dark:text-orange-400';
      case 'array': return 'text-indigo-600 dark:text-indigo-400';
      default: return 'text-foreground';
    }
  };
  
  const formatValue = (val: unknown, type: JsonValueType): string => {
    switch (type) {
      case 'string': return `"${String(val)}"`;
      case 'null': return 'null';
      case 'boolean': return String(val);
      case 'number': return String(val);
      default: return String(val);
    }
  };
  
  const valueType = getValueType(value);
  const isComplex = valueType === 'object' || valueType === 'array';
  
  if (!isComplex) {
    return (
      <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
        {keyName && (
          <span className="text-blue-800 dark:text-blue-300 font-medium mr-2">
            "{keyName}":
          </span>
        )}
        <span className={`${getValueColor(valueType)} font-mono`}>
          {formatValue(value, valueType)}
        </span>
        {!isLast && <span className="text-muted-foreground">,</span>}
      </div>
    );
  }
  
  const isArray = Array.isArray(value);
  const entries = isArray 
    ? (value as unknown[]) 
    : Object.entries(value as Record<string, unknown>);
  const isEmpty = entries.length === 0;
  
  return (
    <div style={{ marginLeft: `${indent}px` }}>
      <div className="flex items-center">
        {keyName && (
          <span className="text-blue-800 dark:text-blue-300 font-medium mr-2">
            "{keyName}":
          </span>
        )}
        
        {!isEmpty && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors mr-2"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-4 h-4 flex items-center justify-center"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
          </button>
        )}
        
        <span className={`${getValueColor(valueType)} font-mono`}>
          {isArray ? '[' : '{'}
          {isEmpty && (isArray ? ']' : '}')}
        </span>
        
        {!isEmpty && !isExpanded && (
          <span className="text-muted-foreground ml-2 text-sm">
            {entries.length} {isArray ? 'items' : 'properties'}
          </span>
        )}
      </div>
      
      <AnimatePresence>
        {!isEmpty && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="py-2">
              {entries.map((item: unknown, index: number) => {
                const isLastItem = index === entries.length - 1;
                
                if (isArray) {
                  return (
                    <JsonValue
                      key={index}
                      value={item}
                      level={level + 1}
                      isLast={isLastItem}
                    />
                  );
                } else {
                  const [key, val] = item as [string, unknown];
                  return (
                    <JsonValue
                      key={key}
                      keyName={key}
                      value={val}
                      level={level + 1}
                      isLast={isLastItem}
                    />
                  );
                }
              })}
            </div>
            
            <div style={{ marginLeft: `${indent}px` }}>
              <span className={`${getValueColor(valueType)} font-mono`}>
                {isArray ? ']' : '}'}
              </span>
              {!isLast && <span className="text-muted-foreground">,</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isEmpty && !isExpanded && (
        <div style={{ marginLeft: `${indent}px` }}>
          <span className={`${getValueColor(valueType)} font-mono`}>
            {isArray ? ']' : '}'}
          </span>
          {!isLast && <span className="text-muted-foreground">,</span>}
        </div>
      )}
    </div>
  );
};

export const JsonRenderer: React.FC<JsonRendererProps> = ({
  data,
  title,
  className = '',
  collapsible = true,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Parse data if it's a string
  let parsedData: Record<string, unknown>;
  try {
    parsedData = typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    // If parsing fails, return null to not render anything
    return null;
  }
  
  return (
    <div className={`bg-white dark:bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden shadow-sm ${className}`}>
      {title && (
        <div className="bg-white dark:bg-muted/30 border-b border-border/50 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium text-sm text-foreground">{title}</span>
          </div>
          
          {collapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={isExpanded ? "Collapse JSON" : "Expand JSON"}
              title={isExpanded ? "Collapse JSON" : "Expand JSON"}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </button>
          )}
        </div>
      )}
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 font-mono text-sm bg-white dark:bg-background/20">
              <JsonValue value={parsedData} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isExpanded && title && (
        <div className="p-4 text-center text-muted-foreground text-sm bg-white dark:bg-background/20">
          Click to expand JSON
        </div>
      )}
    </div>
  );
};
