import React, { memo, useState, useEffect } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { trackButtonClick } from '../../../../services/analytics-service';
import { cn } from '../../../../lib/utils';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

import type { ExtraProps } from 'react-markdown';

interface CodeBlockRendererProps extends ExtraProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Check if content is plaintext (no special characters, just simple text)
const isPlainText = (content: string): boolean => {
  const trimmed = content.trim();
  
  // If it's just simple text without code-like patterns, treat as plaintext
  const hasCodePatterns = trimmed.includes('{') || 
                         trimmed.includes('}') || 
                         trimmed.includes('[') || 
                         trimmed.includes(']') || 
                         trimmed.includes('function') ||
                         trimmed.includes('const') ||
                         trimmed.includes('let') ||
                         trimmed.includes('var') ||
                         trimmed.includes('import') ||
                         trimmed.includes('export') ||
                         trimmed.includes('class') ||
                         trimmed.includes('=>') ||
                         trimmed.includes('//') ||
                         trimmed.includes('/*') ||
                         trimmed.includes('*/') ||
                         trimmed.includes(';') ||
                         trimmed.includes('=') ||
                         trimmed.includes('+') ||
                         trimmed.includes('-') ||
                         trimmed.includes('*') ||
                         trimmed.includes('/') ||
                         trimmed.includes('(') ||
                         trimmed.includes(')') ||
                         trimmed.includes('http') ||
                         trimmed.includes('https') ||
                         trimmed.includes('api') ||
                         trimmed.includes('url') ||
                         trimmed.includes('callback') ||
                         trimmed.includes('dlr');
  
  // Short content without code patterns is more likely plaintext
  return !hasCodePatterns && trimmed.length < 150;
};

export const CodeBlockRenderer: React.FC<CodeBlockRendererProps> = memo(({
  inline,
  className,
  children
}) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : 'plaintext';
  const code = String(children).replace(/\n$/, '');

  // For inline code, always use simple styling
  if (inline) {
    return (
      <code className={cn(
        'bg-gray-100 dark:bg-gray-800',
        'text-gray-800 dark:text-gray-200',
        'px-2 py-1 rounded-md font-mono text-sm',
        'border border-gray-200 dark:border-gray-700',
        className
      )}>
        {children}
      </code>
    );
  }

  // For plaintext or simple content, use inline-style rendering
  if (lang === 'plaintext' || isPlainText(code)) {
    return (
      <code className={cn(
        'bg-gray-100 dark:bg-gray-800',
        'text-gray-800 dark:text-gray-200',
        'px-2 py-1 rounded font-mono text-sm',
        'border border-gray-200 dark:border-gray-700',
        'inline-block',
        className
      )}>
        {code}
      </code>
    );
  }

  // For actual code, use the nice code block styling
  const highlightedCode = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative group my-6 rounded-xl overflow-hidden"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
      
      {/* Animated border */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 rounded-xl p-[1px]">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl"></div>
      </div>
      
      {/* Header with language and copy button */}
      <div className="relative flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-xs font-medium text-gray-300 ml-2">{lang}</span>
        </div>
        
        <CopyToClipboard text={code} onCopy={() => {
          setIsCopied(true);
          trackButtonClick('copy_code', { language: lang });
        }}>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-md hover:bg-gray-700"
          >
            <AnimatePresence mode="wait">
              {isCopied ? (
                <motion.div
                  key="check"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="text-green-400"
                >
                  <CheckIcon className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="clipboard"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <ClipboardIcon className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </CopyToClipboard>
      </div>
      
      {/* Code content */}
      <div className="relative dark:bg-background bg-gray-900 p-4">
        <pre className="text-sm overflow-x-auto">
          <code 
            className="text-gray-100 font-mono leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightedCode }} 
          />
        </pre>
        
        {/* Subtle gradient overlay */}
        {/* <div className="absolute inset-0 dark:bg-transparent  bg-gradient-to-t from-gray-900/50 via-transparent to-transparent pointer-events-none"></div> */}
      </div>
      
      {/* Bottom accent */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500"
      ></motion.div>
    </motion.div>
  );
});

CodeBlockRenderer.displayName = 'CodeBlockRenderer';
