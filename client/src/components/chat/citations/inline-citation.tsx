import React, { useState } from 'react';
import type { ProcessedCitation } from './types';
import { getCitationDisplayText } from './utils';

interface InlineCitationProps {
  citation: ProcessedCitation;
  onClick: (citation: ProcessedCitation) => void;
  className?: string;
}

export const InlineCitation: React.FC<InlineCitationProps> = ({
  citation,
  onClick,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const displayText = getCitationDisplayText(citation);
  
  const handleClick = () => {
    onClick(citation);
  };

  return (
    <span className="relative inline-block">
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          inline-flex items-center
          text-xs font-medium rounded-md
          transition-all duration-200 ease-out
          cursor-pointer select-none
          px-1.5 py-0.5 mx-0.5
          bg-surface-secondary/60 
          border border-border/50
          hover:bg-primary/10 hover:border-primary/30
          hover:scale-105 hover:shadow-sm
          active:scale-95
          text-text-secondary
          hover:text-primary
          backdrop-blur-sm
          focus:outline-none focus:ring-2 focus:ring-primary/20
          ${className}
        `}
        aria-label={`View ${citation.sourceCount} source${citation.sourceCount > 1 ? 's' : ''} from ${citation.platform.name}`}
      >
        <span className="text-[10px] leading-none">
          {displayText}
        </span>
      </button>

      {/* Minimal Glass Hover Card */}
      {isHovered && (
        <div 
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 z-50 pointer-events-none"
          style={{ minWidth: '180px', maxWidth: '250px' }}
        >
          <div 
            className="p-3 cursor-pointer pointer-events-auto rounded-lg border backdrop-blur-xl bg-surface-elevated/95 border-border shadow-lg hover:shadow-xl transition-all duration-200 animate-fade-in animate-slide-up"
            onClick={handleClick}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary/60" />
                <span className="text-xs font-medium text-text-primary">
                  {citation.platform.name}
                </span>
              </div>
              
              <div className="text-[10px] text-text-secondary">
                {citation.sourceCount} source{citation.sourceCount > 1 ? 's' : ''}
              </div>
              
              {citation.sources[0] && (
                <div className="text-[10px] text-text-primary line-clamp-2 leading-tight">
                  {citation.sources[0].title || citation.sources[0].uri}
                </div>
              )}
              
              <div className="text-[9px] text-text-tertiary italic">
                Click to view details
              </div>
            </div>
          </div>
        </div>
      )}
    </span>
  );
};
