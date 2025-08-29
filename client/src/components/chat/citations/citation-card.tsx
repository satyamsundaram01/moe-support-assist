import React from 'react';
import type { ProcessedCitation, CitationSource } from './types';
import { PlatformIcon } from './platform-icons';
import { formatCitationTitle, extractDomain } from './utils';

interface CitationCardProps {
  citation: ProcessedCitation;
  source?: CitationSource;
  onClick?: (uri: string) => void;
  className?: string;
}

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  source,
  onClick,
  className = ''
}) => {
  const displaySource = source || citation.sources[0];
  const title = formatCitationTitle(displaySource.title);
  const domain = extractDomain(displaySource.uri);

  const handleClick = () => {
    if (onClick) {
      onClick(displaySource.uri);
    } else {
      window.open(displaySource.uri, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`
        p-4 rounded-lg border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800
        hover:bg-gray-50 dark:hover:bg-gray-700
        transition-all duration-200
        cursor-pointer
        shadow-sm hover:shadow-md
        ${className}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <PlatformIcon 
            platform={citation.platform} 
            size="md"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span 
              className="text-sm font-medium"
              style={{ color: citation.platform.color }}
            >
              {citation.platform.name}
            </span>
            <span className="text-xs text-gray-500">
              {domain}
            </span>
          </div>
          
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
            {title}
          </h3>
          
          {citation.cited_text && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 mb-2">
              "{citation.cited_text}"
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Click to view source
            </span>
            {citation.sourceCount > 1 && (
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                +{citation.sourceCount - 1} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Compact citation card for sidebar
interface CompactCitationCardProps {
  citation: ProcessedCitation;
  source?: CitationSource;
  onClick?: (uri: string) => void;
  className?: string;
}

export const CompactCitationCard: React.FC<CompactCitationCardProps> = ({
  citation,
  source,
  onClick,
  className = ''
}) => {
  const displaySource = source || citation.sources[0];
  const title = formatCitationTitle(displaySource.title);
  const domain = extractDomain(displaySource.uri);

  const handleClick = () => {
    if (onClick) {
      onClick(displaySource.uri);
    } else {
      window.open(displaySource.uri, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`
        p-3 rounded-md border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800
        hover:bg-gray-50 dark:hover:bg-gray-700
        transition-all duration-200
        cursor-pointer
        ${className}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0">
          <PlatformIcon 
            platform={citation.platform} 
            size="sm"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
            {title}
          </h4>
          
          <p className="text-xs text-gray-500 mb-1">
            {domain}
          </p>
          
          {citation.cited_text && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              "{citation.cited_text.slice(0, 100)}..."
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
