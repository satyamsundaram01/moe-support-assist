
// FeedbackModal.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { useAnalytics } from '../../../hooks/use-analytics';
import { useFeedbackService } from '../../../services/feedback-service';
import { useCurrentMode } from '../../../stores';
import { useParams } from 'react-router-dom';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedbackType: 'positive' | 'negative' | null;
  userQuery?: string;
  aiResponse?: string;
  sessionId?: string;
  userId?: string;
  buttonPosition?: { x: number; y: number } | null;
}

// Common problems for negative feedback
const negativeReasons = [
  { id: 'incorrect', label: 'Factually incorrect' },
  { id: 'not_relevant', label: 'Not relevant to my question' },
  { id: 'incomplete', label: 'Did not provide a full solution' },
  { id: 'unclear', label: 'Unclear or difficult to understand' },
];

// 5-point rating scale with emojis matching the reference image - using your color theme
const ratingOptions = [
  { 
    rating: 1, 
    emoji: '😢', 
    label: 'Terrible',
    color: 'text-destructive',
    selectedBg: 'bg-destructive/10',
    selectedBorder: 'border-destructive/30',
    hoverBg: 'hover:bg-destructive/5'
  },
  { 
    rating: 2, 
    emoji: '😕', 
    label: 'Bad',
    color: 'text-orange-500',
    selectedBg: 'bg-orange-500/10',
    selectedBorder: 'border-orange-500/30',
    hoverBg: 'hover:bg-orange-500/5'
  },
  { 
    rating: 3, 
    emoji: '😐', 
    label: 'Okay',
    color: 'text-muted-foreground',
    selectedBg: 'bg-muted/70',
    selectedBorder: 'border-muted-foreground/30',
    hoverBg: 'hover:bg-muted/70'
  },
  { 
    rating: 4, 
    emoji: '😊', 
    label: 'Good',
    color: 'text-green-600',
    selectedBg: 'bg-green-600/10',
    selectedBorder: 'border-green-600/30',
    hoverBg: 'hover:bg-green-600/5'
  },
  { 
    rating: 5, 
    emoji: '😍', 
    label: 'Amazing',
    color: 'text-primary',
    selectedBg: 'bg-primary/10',
    selectedBorder: 'border-primary/30',
    hoverBg: 'hover:bg-primary/5'
  },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ 
  isOpen, 
  onClose, 
  feedbackType,
  userQuery = '',
  aiResponse = '',
  sessionId = '',
  userId = '',
  buttonPosition = null
}) => {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { track } = useAnalytics();
  const { submitFeedback } = useFeedbackService();
  const params = useParams<{ sessionId?: string }>();
  const currentMode = useCurrentMode();
  const currentSessionId = params.sessionId;

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
  };
  
  const handleReasonToggle = (reasonId: string) => {
    setSelectedReasons(prev =>
      prev.includes(reasonId)
        ? prev.filter(id => id !== reasonId)
        : [...prev, reasonId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rating is required
    if (!selectedRating) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Use the current session ID from URL if not provided as prop
      const actualSessionId = currentSessionId || sessionId;

      // Track feedback submission with mode and proper session ID
      track('feedback_submitted', {
        rating: selectedRating,
        feedback_type: feedbackType,
        selected_reasons: selectedReasons,
        feedback_text: feedbackText,
        feedback_length: feedbackText.length,
        mode: currentMode, // Add chat mode (ask/investigate)
        session_id: actualSessionId, // Use proper session ID from URL
        timestamp: Date.now(),
      });

      // Submit feedback to service
      await submitFeedback({
        feedbackType: feedbackType || (selectedRating >= 4 ? 'positive' : 'negative'),
        selectedReasons,
        feedbackText: feedbackText || undefined,
        userQuery,
        aiResponse,
        sessionId: actualSessionId, // Use proper session ID
        userId,
      });

      console.log('Feedback submitted successfully:', { 
        feedbackType,
        rating: selectedRating,
        reasons: selectedReasons,
        text: feedbackText,
        timestamp: new Date().toISOString()
      });
      
      // Show thank you message first
      setIsSubmitted(true);
      
      // Auto close after showing thank you message
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Handle error - could show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    // Let the exit animation play before actually closing
    onClose();
    // Reset form state after a delay to allow exit animation
    setTimeout(() => {
      setSelectedRating(null);
      setFeedbackText('');
      setSelectedReasons([]);
      setIsSubmitted(false);
    }, 300);
  };

  if (!isOpen) return null;

  const modalTitle = feedbackType === 'positive'
    ? "Help us learn what was helpful!"
    : "How can we do better?";
  
  const modalIcon = feedbackType === 'positive'
    ? <ThumbsUp className="w-6 h-6 text-green-600" />
    : <ThumbsDown className="w-6 h-6 text-destructive" />;

  // Calculate initial position based on button position
  const getInitialPosition = () => {
    if (!buttonPosition) return { x: 0, y: 0 };
    
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    return {
      x: buttonPosition.x - centerX,
      y: buttonPosition.y - centerY
    };
  };

  const initialPos = getInitialPosition();

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ 
          duration: 0.4, 
          ease: [0.25, 0.46, 0.45, 0.94] 
        }}
        className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        onClick={handleClose}
      >
        <motion.div
          initial={{ 
            scale: 0.3, 
            opacity: 0, 
            x: initialPos.x,
            y: initialPos.y,
            rotateX: -15,
            rotateY: 15
          }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            x: 0,
            y: 0,
            rotateX: 0,
            rotateY: 0
          }}
          exit={{ 
            scale: 0.3, 
            opacity: 0, 
            x: initialPos.x,
            y: initialPos.y,
            rotateX: -15,
            rotateY: 15
          }}
          transition={{ 
            type: "spring", 
            damping: 20, 
            stiffness: 280,
            mass: 0.8,
            duration: 0.6
          }}
          className="bg-card border border-border rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl relative cursor-default"
          onClick={(e) => e.stopPropagation()}
          style={{
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden'
          }}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <AnimatePresence mode="wait">
            {/* Success State */}
            {isSubmitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", damping: 15 }}
                  className="w-20 h-20 bg-green-600/10 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-10 h-10" />
                </motion.div>
                <h4 className="text-2xl font-bold text-foreground mb-3">
                  Thank you!
                </h4>
                <p className="text-muted-foreground text-lg">
                  Your feedback helps us improve.
                </p>
              </motion.div>
            ) : (
              /* Main Feedback Form */
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
                onSubmit={handleSubmit}
                className="space-y-8"
              >
                {/* Header */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-center gap-2 text-center"
                >
                  {modalIcon}
                  <h2 className="text-2xl font-bold text-foreground">
                    {modalTitle}
                  </h2>
                </motion.div>
                
                {/* 5-Point Rating Scale */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <p className="text-muted-foreground text-center text-sm">
                    How was the response overall?
                  </p>
                  <div className="flex justify-center items-center gap-4">
                    {ratingOptions.map((option, index) => {
                      // Disable "Terrible" (1) and "Bad" (2) for positive feedback
                      const isDisabled = feedbackType === 'positive' && (option.rating === 1 || option.rating === 2);
                      
                      return (
                        <motion.button
                          key={option.rating}
                          type="button"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          onClick={() => !isDisabled && handleRatingSelect(option.rating)}
                          whileHover={!isDisabled ? { scale: 1.05 } : {}}
                          whileTap={!isDisabled ? { scale: 0.95 } : {}}
                          disabled={isDisabled}
                          className={cn(
                            "relative flex items-center justify-center p-2 rounded-full transition-all duration-200 w-12 h-12 group",
                            isDisabled 
                              ? "cursor-not-allowed opacity-30" 
                              : "cursor-pointer",
                            selectedRating === option.rating
                              ? `${option.selectedBg} ring-2 ${option.selectedBorder.replace('border-', 'ring-')} shadow-md`
                              : !isDisabled && `hover:bg-muted/50`
                          )}
                          title={isDisabled ? `${option.label} (disabled for positive feedback)` : option.label}
                        >
                        {/* Emoji */}
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="text-xl"
                        >
                          {option.emoji}
                        </motion.div>
                        
                        {/* Tooltip */}
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded-md text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                          {option.label}
                        </div>

                        {/* Selection indicator */}
                        {selectedRating === option.rating && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm"
                          >
                            <Check className="w-2.5 h-2.5" />
                          </motion.div>
                        )}
                      </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Conditional Feedback Section */}
                {feedbackType === 'negative' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="space-y-6"
                  >
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-3"
                    >
                      <label className="text-sm px-2 text-popover-foreground">
                        What went wrong?
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {negativeReasons.map(reason => (
                          <motion.button
                            key={reason.id}
                            type="button"
                            onClick={() => handleReasonToggle(reason.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              "flex items-center gap-2 p-3 rounded-xl border transition-all duration-200 text-sm font-medium",
                              selectedReasons.includes(reason.id)
                                ? "bg-muted border-primary text-primary"
                                : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                              selectedReasons.includes(reason.id)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-muted-foreground"
                            )}>
                              {selectedReasons.includes(reason.id) && <Check className="w-2.5 h-2.5" />}
                            </div>
                            {reason.label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* Optional Text Feedback */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className=""
                >
                  <div className="flex items-center  text-primary">
                    <label className="text-sm px-2">
                      {feedbackType === 'positive'
                        ? "What was most helpful?" 
                        : "How can we do better?"
                      }
                    </label>
                  </div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      feedbackType === 'positive'
                        ? "Tell us what you found most helpful about this response..."
                        : "Share how we can improve this experience..."
                    }
                    className="w-full h-24 p-4 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground text-base cursor-text"
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {feedbackText.length}/500
                  </div>
                </motion.div>

                {/* Submit Buttons */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex gap-4 pt-4"
                >
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-6 py-3 text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedRating}
                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </div>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
