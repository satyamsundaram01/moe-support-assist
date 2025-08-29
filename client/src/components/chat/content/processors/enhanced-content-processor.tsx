import React, { memo } from 'react';
import { MarkdownRenderer, JsonRenderer, RichContentRenderer } from '../renderers';
import { ParagraphMarkdownRenderer } from '../renderers/paragraph-markdown-renderer';
import { useParagraphCitations, processContentForParagraphCitations } from './paragraph-citation-processor';
import type { Citation } from '../../citations/types';

// Simple inline error boundary for content processing
const ContentErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="content-error-boundary">
      {children}
    </div>
  );
};

interface EnhancedContentProcessorProps {
  content: string;
  citations?: Citation[];
  className?: string;
}

const isJsonString = (str: string) => {
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
};

const isMarkdownContent = (str: string) => {
  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/m,           // Headers
    /^\*\s+/m,               // Unordered lists
    /^\d+\.\s+/m,            // Ordered lists
    /\*\*.*?\*\*/,           // Bold text
    /\*.*?\*/,               // Italic text
    /`.*?`/,                 // Inline code
    /```[\s\S]*?```/,        // Code blocks (including Mermaid)
    /\[.*?\]\(.*?\)/,        // Links
    /^>\s+/m,                // Blockquotes
    /\|.*\|/,                // Tables
  ];
  
  // Special check for Mermaid diagrams
  const hasMermaid = /```mermaid[\s\S]*?```/.test(str);
  
  return markdownPatterns.some(pattern => pattern.test(str)) || hasMermaid;
};

const isRichTextContent = (str: string) => {
  // Rich text is content that's not JSON, not markdown, but has formatting or structure
  const hasMultipleLines = str.includes('\n');
  const hasSpecialFormatting = /[^\w\s.,!?;:()-]/.test(str);
  const isLongContent = str.length > 100;
  
  return (hasMultipleLines || hasSpecialFormatting || isLongContent) && 
         !isJsonString(str) && 
         !isMarkdownContent(str);
};

export const EnhancedContentProcessor: React.FC<EnhancedContentProcessorProps> = memo(({ 
  content, 
  citations = [], 
  className 
}) => {
  const paragraphCitations = useParagraphCitations(content, citations);
  
  const renderContent = () => {

    if (isJsonString(content)) {
      return <JsonRenderer data={content} />;
    }
    
    // If we have citations, use the paragraph-based renderer
    if (citations.length > 0) {
      const cleanContent = processContentForParagraphCitations(content);
      return (
        <ParagraphMarkdownRenderer 
          content={cleanContent}
          paragraphCitations={paragraphCitations}
        />
      );
    }
    
    // Check if it's rich text content that should have custom background
    if (isRichTextContent(content)) {
      return <RichContentRenderer content={content} />;
    }
    
    // Check if it's markdown content
    if (isMarkdownContent(content)) {
      return <MarkdownRenderer content={content} />;
    }
    
    // Default to rich content renderer for anything else
    return <RichContentRenderer content={content} />;
  };

  return (
    <ContentErrorBoundary>
      <div className={className}>
        {renderContent()}
      </div>
    </ContentErrorBoundary>
  );
});

EnhancedContentProcessor.displayName = 'EnhancedContentProcessor';
