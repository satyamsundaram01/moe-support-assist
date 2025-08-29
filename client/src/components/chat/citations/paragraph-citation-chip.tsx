import React, { memo } from 'react';
import { cn } from '../../../lib/utils';
import type { ProcessedCitation } from './types';

interface ParagraphCitationChipProps {
  citations: ProcessedCitation[];
  onClick: () => void;
  className?: string;
}

export const ParagraphCitationChip: React.FC<ParagraphCitationChipProps> = memo(({ 
  citations, 
  onClick, 
  className 
}) => {
  const citationCount = citations.length;
  const uniquePlatforms = Array.from(new Set(citations.map(c => c.platform.name)));
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5',
        'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30',
        'border border-blue-200 dark:border-blue-800',
        'rounded text-xs font-medium',
        'text-blue-700 dark:text-blue-300',
        'transition-all duration-200 ease-in-out',
        'hover:shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
        'cursor-pointer select-none',
        'align-baseline',
        className
      )}
      title={`View ${citationCount} source${citationCount > 1 ? 's' : ''} from ${uniquePlatforms.join(', ')}`}
    >
      <svg 
        className="w-3 h-3" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" 
        />
      </svg>
      <span>{citationCount}</span>
    </button>
  );
});

ParagraphCitationChip.displayName = 'ParagraphCitationChip';
