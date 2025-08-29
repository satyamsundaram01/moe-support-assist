import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProcessedCitation } from './types';
import { PlatformIcon } from './platform-icons';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';

interface CitationModalProps {
  citations: ProcessedCitation[];
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ citations, onClose }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handleNext = () => {
    if (currentIndex < citations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const citation = citations[currentIndex];
  const currentSource = citation.sources[0]; // Show first source for now

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-2xl mx-4 overflow-hidden rounded-2xl border bg-white/90 dark:bg-gray-900/90 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-[2px] shadow-lg">
          {/* Header with Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 dark:border-white/5">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <span className="text-sm font-medium text-muted-foreground">
                {currentIndex + 1}/{citations.length}
              </span>
              
              <button
                onClick={handleNext}
                disabled={currentIndex === citations.length - 1}
                className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              {/* Platform Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  <PlatformIcon 
                    platform={citation.platform} 
                    size="lg"
                  />
                </div>
                <div>
                  <h3 
                    className="text-lg font-semibold"
                    style={{ color: citation.platform.color }}
                  >
                    {citation.platform.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {citation.sourceCount} source{citation.sourceCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Article Content */}
              {currentSource && (
                <div className="space-y-4">
                  {currentSource.title && (
                    <div>
                      <h4 className="text-base font-medium mb-2 text-foreground">
                        {currentSource.title}
                      </h4>
                    </div>
                  )}
                  
                  {/* Cited Text */}
                  <div className="bg-muted/30 rounded-lg p-4 border-l-4" style={{ borderLeftColor: citation.platform.color }}>
                    <p className="text-sm text-muted-foreground mb-2">Cited text:</p>
                    <p className="text-sm leading-relaxed">
                      "{citation.cited_text}"
                    </p>
                  </div>

                  {/* Source URL */}
                  {currentSource.uri && (
                    <div className="pt-4 border-t border-white/10 dark:border-white/5">
                      <p className="text-xs text-muted-foreground mb-2">Source:</p>
                      <a
                        href={currentSource.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
                      >
                        <span className="truncate max-w-md">{currentSource.uri}</span>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )}

                  {/* Additional metadata */}
                  {currentSource.reference_id && (
                    <div className="text-xs text-muted-foreground">
                      Reference ID: {currentSource.reference_id}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
