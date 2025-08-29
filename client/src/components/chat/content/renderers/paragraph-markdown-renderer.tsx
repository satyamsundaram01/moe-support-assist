import React, { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import { cn } from '../../../../lib/utils';
import { CodeBlockRenderer, TableRenderer, MermaidRenderer } from './';
import { ParagraphCitationChip } from '../../citations/paragraph-citation-chip';
import { CitationModal } from '../../citations/citation-modal';
import type { ParagraphCitation } from '../processors/paragraph-citation-processor';
import './citation-styles.css';

interface ParagraphMarkdownRendererProps {
  content: string;
  paragraphCitations: ParagraphCitation[];
  className?: string;
}

export const ParagraphMarkdownRenderer: React.FC<ParagraphMarkdownRendererProps> = memo(({ 
  content, 
  paragraphCitations, 
  className 
}) => {
  const [selectedCitations, setSelectedCitations] = useState<ParagraphCitation | null>(null);

  const handleCitationClick = (paragraphCitation: ParagraphCitation) => {
    setSelectedCitations(paragraphCitation);
  };

  const handleCloseModal = () => {
    setSelectedCitations(null);
  };

  // Create a map of paragraph indices to their citations for quick lookup
  const citationMap = new Map<number, ParagraphCitation>();
  paragraphCitations.forEach(pc => {
    citationMap.set(pc.paragraphIndex, pc);
  });

  // Split content into paragraphs to match our citation grouping
  // But preserve mermaid code blocks as single units
  const paragraphs: string[] = [];
  let currentParagraph = '';
  let inMermaidBlock = false;
  let mermaidBlockContent = '';
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're starting a mermaid block
    if (line.trim().startsWith('```mermaid')) {
      // If we have accumulated content, save it as a paragraph
      if (currentParagraph.trim()) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }
      
      inMermaidBlock = true;
      mermaidBlockContent = line + '\n';
      continue;
    }
    
    // Check if we're ending a mermaid block
    if (inMermaidBlock && line.trim() === '```') {
      mermaidBlockContent += line;
      paragraphs.push(mermaidBlockContent);
      inMermaidBlock = false;
      mermaidBlockContent = '';
      continue;
    }
    
    // If we're inside a mermaid block, accumulate content
    if (inMermaidBlock) {
      mermaidBlockContent += line + '\n';
      continue;
    }
    
    // Regular paragraph logic
    if (line.trim() === '' || line.match(/^\*\s|\d+\.\s|^#/)) {
      // End of paragraph
      if (currentParagraph.trim()) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }
      if (line.trim()) {
        currentParagraph = line + '\n';
      }
    } else {
      currentParagraph += line + '\n';
    }
  }
  
  // Add any remaining content
  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim());
  }
  

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      {paragraphs.map((paragraph, index) => {
        const paragraphCitation = citationMap.get(index);
        
        // Sanitize each paragraph before rendering
        const sanitizedParagraph = DOMPurify.sanitize(paragraph, {
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
          <div key={index} className="paragraph-with-citations">
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
                        className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200 dark:border-gray-700"
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
                // Customize elements for a minimal, professional look
                h1: ({...props}) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                h2: ({...props}) => <h2 className="text-xl font-semibold mb-3" {...props} />,
                h3: ({...props}) => <h3 className="text-lg font-medium mb-2" {...props} />,
                p: ({children, ...props}) => (
                  <p className="mb-4 last:mb-0" {...props}>
                    {children}
                    {paragraphCitation && (
                      <span className="inline-block ml-2 align-baseline">
                        <ParagraphCitationChip
                          citations={paragraphCitation.citations}
                          onClick={() => handleCitationClick(paragraphCitation)}
                        />
                      </span>
                    )}
                  </p>
                ),
                ul: ({...props}) => <ul className="list-disc pl-6 mb-4" {...props} />,
                ol: ({...props}) => <ol className="list-decimal pl-6 mb-4" {...props} />,
                li: ({...props}) => <li className="mb-1" {...props} />,
                a: ({...props}) => <a className="text-primary hover:underline" {...props} />,
                blockquote: ({...props}) => <blockquote className="border-l-4 border-border pl-4 italic text-text-secondary" {...props} />,
              }}
            >
              {sanitizedParagraph.trim()}
            </ReactMarkdown>
          </div>
        );
      })}

      {/* Citation Modal */}
      {selectedCitations && createPortal(
        <CitationModal
          citations={selectedCitations.citations}
          onClose={handleCloseModal}
        />,
        document.body
      )}
    </div>
  );
});

ParagraphMarkdownRenderer.displayName = 'ParagraphMarkdownRenderer';
