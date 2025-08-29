import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { cn } from '../../../../lib/utils';
import { CodeBlockRenderer, TableRenderer, MermaidRenderer } from './';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = memo(({ content, className }) => {
  // Sanitize the content before rendering to prevent XSS attacks
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span',
      'del', 'ins',
      'hr',
      'sup', 'sub'
    ],
    ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id'],
    FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror', 'onmouseover'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
    KEEP_CONTENT: true
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none bg-transparent',
        ' p-3',
        'backdrop-blur-sm',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const inline = !className || !className.includes('language-');
            
            
            if (inline) {
              return (
                <code 
                  className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded-lg text-sm font-mono border border-gray-200 dark:border-gray-700"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Check if it's a Mermaid diagram
            if (language === 'mermaid') {
              // Convert children to string properly
              let mermaidContent = '';
              if (Array.isArray(children)) {
                mermaidContent = children.map(child => String(child)).join('');
              } else {
                mermaidContent = String(children);
              }
              
              return <MermaidRenderer {...props}>{mermaidContent}</MermaidRenderer>;
            }

            return <CodeBlockRenderer inline={inline} className={className} {...props}>{children}</CodeBlockRenderer>;
          },
          table: TableRenderer,
          h1: ({children}: any) => (
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent"
            >
              {children}
            </motion.h1>
          ),
          h2: ({children}: any) => (
            <motion.h2 
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-xl font-semibold mb-3 text-primary-700 dark:text-primary-300"
            >
              {children}
            </motion.h2>
          ),
          h3: ({children}: any) => (
            <motion.h3 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-lg font-medium mb-2 text-secondary-700 dark:text-secondary-300"
            >
              {children}
            </motion.h3>
          ),
          // Enhanced paragraph with better spacing and animations
          p: ({children}: any) => (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-4 last:mb-0 text-gray-700 dark:text-gray-300 leading-relaxed"
            >
              {children}
            </motion.p>
          ),
          // Enhanced list styles
          ul: ({children}: any) => (
            <motion.ul 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="list-disc pl-6 mb-4 space-y-2"
            >
              {children}
            </motion.ul>
          ),
          ol: ({children}: any) => (
            <motion.ol 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="list-decimal pl-6 mb-4 space-y-2"
            >
              {children}
            </motion.ol>
          ),
          // Enhanced list items with custom bullets
          li: ({children}: any) => (
            <motion.li 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mb-1 text-gray-700 dark:text-gray-300 leading-relaxed"
            >
              {children}
            </motion.li>
          ),
          // Enhanced link styles
          a: ({children, ...props}: any) => (
            <a 
              className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 underline decoration-2 underline-offset-2 transition-colors duration-200"
              {...props}
            >
              {children}
            </a>
          ),
          // Enhanced blockquote with gradient border
          blockquote: ({children}: any) => (
            <motion.blockquote 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="border-l-4 border-gradient-to-b from-primary-500 to-secondary-500 pl-4 italic text-gray-600 dark:text-gray-400 bg-gradient-to-r from-primary-50/50 to-secondary-50/50 dark:from-primary-950/20 dark:to-secondary-950/20 rounded-r-lg py-2"
            >
              {children}
            </motion.blockquote>
          ),
          // Enhanced strong text
          strong: ({children, ...props}) => (
            <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
              {children}
            </strong>
          ),
          // Enhanced emphasis text
          em: ({children, ...props}) => (
            <em className="italic text-gray-800 dark:text-gray-200" {...props}>
              {children}
            </em>
          ),
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </motion.div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';
