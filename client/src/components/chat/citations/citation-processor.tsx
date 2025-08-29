import React from 'react';
import type { Citation, ProcessedCitation } from './types';
import { InlineCitation } from './inline-citation';
import { processTextWithCitations } from './utils';

interface CitationProcessorProps {
  text: string;
  citations: Citation[];
  onCitationClick: (citation: ProcessedCitation) => void;
  className?: string;
}

export const CitationProcessor: React.FC<CitationProcessorProps> = ({
  text,
  citations,
  onCitationClick,
  className = ''
}) => {
  const segments = processTextWithCitations(text, citations);

  return (
    <div className={`citation-processed-text ${className}`}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <span key={`text-${index}`}>
              {segment.content}
            </span>
          );
        } else if (segment.type === 'citation' && segment.citation) {
          return (
            <InlineCitation
              key={`citation-${segment.citation.id}-${index}`}
              citation={segment.citation}
              onClick={onCitationClick}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

// Simple text renderer with citation badges (non-clickable)
interface CitationTextProps {
  text: string;
  citations: Citation[];
  className?: string;
}

export const CitationText: React.FC<CitationTextProps> = ({
  text,
  citations,
  className = ''
}) => {
  const segments = processTextWithCitations(text, citations);

  return (
    <div className={`citation-text ${className}`}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <span key={`text-${index}`}>
              {segment.content}
            </span>
          );
        } else if (segment.type === 'citation' && segment.citation) {
          return (
            <span
              key={`citation-${segment.citation.id}-${index}`}
              className="inline-flex items-center gap-1 px-1 py-0.5 mx-0.5 text-xs rounded"
              style={{
                backgroundColor: segment.citation.platform.color + '20',
                color: segment.citation.platform.color
              }}
            >
              [{segment.citation.inlinePosition + 1}]
            </span>
          );
        }
        return null;
      })}
    </div>
  );
};
