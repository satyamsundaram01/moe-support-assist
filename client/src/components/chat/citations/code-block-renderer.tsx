import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CodeBlockRendererProps {
  data: string | Record<string, unknown>;
  title?: string;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  language?: string;
}

export const CodeBlockRenderer: React.FC<CodeBlockRendererProps> = ({
  data,
  title,
  className = '',
  collapsible = true,
  defaultExpanded = true,
  language = 'json'
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Format data as string
  let formattedData: string;
  try {
    if (typeof data === 'string') {
      // Try to parse and re-stringify for proper formatting
      try {
        const parsed = JSON.parse(data);
        formattedData = JSON.stringify(parsed, null, 2);
      } catch {
        // If parsing fails, use as-is
        formattedData = data;
      }
    } else {
      formattedData = JSON.stringify(data, null, 2);
    }
  } catch {
    formattedData = String(data);
  }
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formattedData);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="font-medium text-sm">{title}</span>
            {language && (
              <span className="ml-2 px-2 py-0.5 bg-gray-700 text-xs rounded uppercase">
                {language}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="text-gray-300 hover:text-white transition-colors p-1 rounded"
              title="Copy to clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            
            {collapsible && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-300 hover:text-white transition-colors p-1 rounded"
                title={isExpanded ? "Collapse" : "Expand"}
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
            <pre className="p-4 text-sm text-gray-100 font-mono overflow-x-auto whitespace-pre-wrap bg-gray-900">
              <code className="text-gray-100">
                {formattedData}
              </code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isExpanded && title && (
        <div className="p-4 text-center text-gray-400 text-sm">
          Click to expand code
        </div>
      )}
    </div>
  );
};
