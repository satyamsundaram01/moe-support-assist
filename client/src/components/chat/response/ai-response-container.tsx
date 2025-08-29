// AIResponseContainer.tsx
import React, { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedContentProcessor, useProcessedCitations } from '../content/processors';
import { SourcesButton } from '../citations/sources-button';
import { CitationModal } from '../citations/citation-modal';
import { FeedbackModal } from '../modals/feedback-modal';
import { cn } from '../../../lib/utils';
import { useAnalytics } from '../../../hooks/use-analytics';
import type { Citation } from '../citations/types';

interface AIResponseContainerProps {
  content: string;
  citations: Citation[];
}

// Enhanced Copy Button with Animation and Feedback Buttons
const FeedbackButtons: React.FC<{
  onPositiveFeedback: () => void;
  onNegativeFeedback: () => void;
  onCopy: () => void;
  className?: string;
}> = ({ onPositiveFeedback, onNegativeFeedback, onCopy, className }) => {
  const { trackClick } = useAnalytics();
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');

  const handleCopy = async () => {
    if (copyState !== 'idle') return;
    
    setCopyState('copying');
    trackClick('copy_response', {
      location: 'ai_response',
      timestamp: Date.now(),
    });
    
    try {
      await onCopy();
      setCopyState('copied');
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopyState('idle');
      }, 2000);
    } catch {
      setCopyState('idle');
    }
  };

  const handlePositiveFeedback = () => {
    trackClick('feedback_positive', {
      location: 'ai_response',
      timestamp: Date.now(),
    });
    onPositiveFeedback();
  };

  const handleNegativeFeedback = () => {
    trackClick('feedback_negative', {
      location: 'ai_response',
      timestamp: Date.now(),
    });
    onNegativeFeedback();
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Enhanced Copy Button with Animation */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleCopy}
        disabled={copyState !== 'idle'}
        className={cn(
          "p-1.5 rounded-md transition-all duration-150 relative overflow-hidden cursor-pointer",
          "text-muted-foreground hover:text-foreground hover:bg-muted/30",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          copyState === 'copied' && "text-green-600 dark:text-green-400 bg-green-500/10"
        )}
        title={copyState === 'copied' ? 'Copied!' : 'Copy response'}
      >
        <AnimatePresence mode="wait">
          {copyState === 'copied' ? (
            <motion.div
              key="check"
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Check className="w-3.5 h-3.5" />
            </motion.div>
          ) : copyState === 'copying' ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Copy className="w-3.5 h-3.5" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Success ripple effect */}
        {copyState === 'copied' && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 bg-green-500/20 rounded-md"
          />
        )}
      </motion.button>
      
      {/* Spacing divider */}
      <div className="w-px h-4 bg-border/30 mx-1" />
      
      {/* Enhanced Thumbs Up with micro-interactions */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handlePositiveFeedback}
        className="p-1.5 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 hover:bg-green-500/10 dark:hover:bg-green-500/20 rounded-md transition-all duration-150 group relative overflow-hidden cursor-pointer"
        title="This response was helpful"
      >
        <motion.div
          whileHover={{ rotate: -5 }}
          transition={{ duration: 0.2 }}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </motion.div>
        
        {/* Hover effect */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-green-500/5 rounded-md"
        />
      </motion.button>
      
      {/* Enhanced Thumbs Down with micro-interactions */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleNegativeFeedback}
        className="p-1.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md transition-all duration-150 group relative overflow-hidden cursor-pointer"
        title="This response could be improved"
      >
        <motion.div
          whileHover={{ rotate: 5 }}
          transition={{ duration: 0.2 }}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </motion.div>
        
        {/* Hover effect */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-red-500/5 rounded-md"
        />
      </motion.button>
    </div>
  );
};

export const AIResponseContainer: React.FC<AIResponseContainerProps> = memo(({ 
  content, 
  citations 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    feedbackType: 'positive' | 'negative' | null;
  }>({ isOpen: false, feedbackType: null });
  
  const processedCitations = useProcessedCitations(citations);

  const handleToggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handlePositiveFeedback = () => {
    setFeedbackModal({ isOpen: true, feedbackType: 'positive' });
  };

  const handleNegativeFeedback = () => {
    setFeedbackModal({ isOpen: true, feedbackType: 'negative' });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy response:', err);
    }
  };

  const closeFeedbackModal = () => {
    setFeedbackModal({ isOpen: false, feedbackType: null });
  };

  return (
    <div className="space-y-4">
      <EnhancedContentProcessor 
        content={content} 
        citations={citations}
      />
      
      {/* Action buttons row */}
      <div className="flex items-center justify-between">
        {processedCitations.length > 0 && (
          <SourcesButton 
            citations={processedCitations}
            onClick={handleToggleModal}
          />
        )}
        
        <FeedbackButtons
          onPositiveFeedback={handlePositiveFeedback}
          onNegativeFeedback={handleNegativeFeedback}
          onCopy={handleCopy}
          className={processedCitations.length === 0 ? 'ml-auto' : ''}
        />
      </div>

      {isModalOpen && createPortal(
        <CitationModal
          citations={processedCitations}
          onClose={handleToggleModal}
        />,
        document.body
      )}

      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={closeFeedbackModal}
        feedbackType={feedbackModal.feedbackType}
        userQuery="Current user query"
        aiResponse={content}
        sessionId="current-session-id"
        userId="current-user-id"
      />
    </div>
  );
});

AIResponseContainer.displayName = 'AIResponseContainer';