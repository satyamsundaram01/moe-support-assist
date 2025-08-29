import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentTextIcon, LightBulbIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../../lib/utils';

interface RichContentRendererProps {
  content: string;
  className?: string;
}

// Enhanced content parser for better formatting
const parseRichContent = (content: string) => {
  const lines = content.split('\n');
  const parsedLines = lines.map((line, index) => {
    const trimmedLine = line.trim();
    
    // Detect different content types
    if (trimmedLine.startsWith('* **') && trimmedLine.includes('** -')) {
      // Main category headers
      return { type: 'category', content: trimmedLine, key: index };
    } else if (trimmedLine.startsWith('* **') && trimmedLine.includes('**')) {
      // Sub-categories
      return { type: 'subcategory', content: trimmedLine, key: index };
    } else if (trimmedLine.startsWith('* **Reasons:**')) {
      return { type: 'reasons-header', content: trimmedLine, key: index };
    } else if (trimmedLine.startsWith('* **Remedy:**')) {
      return { type: 'remedy-header', content: trimmedLine, key: index };
    } else if (trimmedLine.startsWith('  * ')) {
      // Bullet points
      return { type: 'bullet', content: trimmedLine, key: index };
    } else if (trimmedLine === '') {
      return { type: 'spacer', content: '', key: index };
    } else {
      // Regular text
      return { type: 'text', content: trimmedLine, key: index };
    }
  });
  
  return parsedLines;
};

// Enhanced text formatting component
const FormattedText: React.FC<{ text: string; type: string }> = ({ text, type }) => {
  if (type === 'category') {
    const [title, description] = text.replace('* **', '').split('** - ');
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950/30 dark:to-secondary-950/30 border border-primary-200 dark:border-primary-800 mb-4"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
          <LightBulbIcon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-100 mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-primary-700 dark:text-primary-300">
              {description}
            </p>
          )}
        </div>
      </motion.div>
    );
  }
  
  if (type === 'subcategory') {
    const title = text.replace('* **', '').replace('**', '');
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 mb-3"
      >
        <div className="w-2 h-2 rounded-full bg-secondary-500"></div>
        <h4 className="text-base font-semibold text-secondary-900 dark:text-secondary-100">
          {title}
        </h4>
      </motion.div>
    );
  }
  
  if (type === 'reasons-header' || type === 'remedy-header') {
    const title = text.replace('* **', '').replace('**', '');
    const isRemedy = type === 'remedy-header';
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex items-center gap-2 mb-3 p-2 rounded-lg",
          isRemedy 
            ? "bg-success-50 dark:bg-success-950/30 border border-success-200 dark:border-success-800"
            : "bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800"
        )}
      >
        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center",
          isRemedy 
            ? "bg-success-500 text-white"
            : "bg-warning-500 text-white"
        )}>
          {isRemedy ? (
            <CheckCircleIcon className="w-4 h-4" />
          ) : (
            <DocumentTextIcon className="w-4 h-4" />
          )}
        </div>
        <span className={cn(
          "text-sm font-semibold",
          isRemedy 
            ? "text-success-800 dark:text-success-200"
            : "text-warning-800 dark:text-warning-200"
        )}>
          {title}
        </span>
      </motion.div>
    );
  }
  
  if (type === 'bullet') {
    const content = text.replace('  * ', '');
    return (
      <motion.li
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-start gap-2 mb-2 text-sm text-text-secondary dark:text-text-secondary"
      >
        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-text-tertiary dark:bg-text-tertiary mt-2"></div>
        <span className="leading-relaxed break-words overflow-wrap-anywhere">{content}</span>
      </motion.li>
    );
  }
  
  if (type === 'text') {
    return (
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm leading-relaxed text-text-secondary dark:text-text-secondary mb-3 break-words overflow-wrap-anywhere whitespace-pre-wrap"
      >
        {text}
      </motion.p>
    );
  }
  
  return null;
};

export const RichContentRenderer: React.FC<RichContentRendererProps> = memo(({ 
  content, 
  className 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const parsedContent = parseRichContent(content);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        'relative',
        'rounded-2xl p-6',
        className
      )}
    >
      {/* Content container */}
      <div className="relative z-10 min-w-0">
        <AnimatePresence>
          {parsedContent.map((item, index) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.3 + (index * 0.1), 
                duration: 0.5,
                ease: "easeOut"
              }}
              className="min-w-0"
            >
              {item.type === 'spacer' ? (
                <div className="h-2"></div>
              ) : (
                <FormattedText text={item.content} type={item.type} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

RichContentRenderer.displayName = 'RichContentRenderer';
