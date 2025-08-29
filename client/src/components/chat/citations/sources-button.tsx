import React from 'react';
import type { ProcessedCitation } from './types';
import { MultiPlatformIcon } from './platform-icons';
import { getUniquePlatforms } from './utils';
import { cn } from '../../../lib/utils';

interface SourcesButtonProps {
  citations: ProcessedCitation[];
  onClick: () => void;
  className?: string;
}

export const SourcesButton: React.FC<SourcesButtonProps> = ({
  citations,
  onClick,
  className = ''
}) => {
  const uniquePlatforms = getUniquePlatforms(citations);
  const totalSources = citations.reduce((sum, citation) => sum + citation.sourceCount, 0);

  if (citations.length === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 mt-2',
        'text-sm font-medium rounded-lg',
        'border border-border/50',
        'bg-surface-secondary/60',
        'hover:bg-primary/10 hover:border-primary/30',
        'transition-all duration-200 ease-out',
        'cursor-pointer',
        'shadow-sm hover:shadow-md hover:scale-105 active:scale-95',
        'backdrop-blur-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        className
      )}
      title={`View ${totalSources} source${totalSources > 1 ? 's' : ''} from ${uniquePlatforms.length} platform${uniquePlatforms.length > 1 ? 's' : ''}`}
    >
      <MultiPlatformIcon 
        platforms={uniquePlatforms}
        size="sm"
        maxVisible={4}
      />
      <span className="text-text-secondary group-hover:text-primary transition-colors">
        Source{totalSources > 1 ? 's' : ''}
      </span>
      {totalSources > 1 && (
        <span className="text-xs text-text-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded-full">
          {totalSources}
        </span>
      )}
    </button>
  );
};
