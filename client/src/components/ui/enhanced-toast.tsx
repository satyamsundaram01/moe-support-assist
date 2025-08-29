import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import type { AnnouncementSeverity } from '../../services/announcement-service';

// ============================================================================
// ENHANCED TOAST TYPES
// ============================================================================

export interface EnhancedToastConfig {
  id: string;
  title?: string;
  message: string;
  severity: AnnouncementSeverity;
  duration?: number; // 0 = never auto-close
  dismissible?: boolean;
  actions?: ToastAction[];
  showIcon?: boolean;
  variant?: 'standard' | 'compact' | 'rich' | 'floating';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  animation?: 'slide' | 'fade' | 'bounce' | 'scale';
  progress?: boolean; // Show progress bar for auto-close
}

export interface ToastAction {
  label: string;
  variant?: 'link' | 'button';
  icon?: React.ReactNode;
  onClick: () => void;
}

// ============================================================================
// ENHANCED TOAST ITEM COMPONENT
// ============================================================================

interface EnhancedToastItemProps {
  config: EnhancedToastConfig;
  onRemove: (id: string) => void;
  index: number;
}

export const EnhancedToastItem: React.FC<EnhancedToastItemProps> = ({
  config,
  onRemove,
  index
}) => {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Progress bar animation for auto-close
  useEffect(() => {
    if (!config.duration || config.duration <= 0 || !config.progress) return;

    const startTime = Date.now();
    startTimeRef.current = startTime;

    const updateProgress = () => {
      if (isHovered) return; // Pause on hover

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, ((config.duration! - elapsed) / config.duration!) * 100);
      
      setProgress(remaining);
      
      if (remaining <= 0) {
        onRemove(config.id);
      }
    };

    progressRef.current = setInterval(updateProgress, 50);

    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, [config.duration, config.progress, config.id, onRemove, isHovered]);

  // Handle hover pause/resume
  useEffect(() => {
    if (isHovered) {
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    } else if (config.duration && config.duration > 0 && config.progress) {
      // Resume from current progress
      const remainingTime = (progress / 100) * config.duration;
      startTimeRef.current = Date.now() - (config.duration - remainingTime);
      
      const updateProgress = () => {
        if (isHovered) return;
        
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, ((config.duration! - elapsed) / config.duration!) * 100);
        
        setProgress(remaining);
        
        if (remaining <= 0) {
          onRemove(config.id);
        }
      };

      progressRef.current = setInterval(updateProgress, 50);
    }
  }, [isHovered, config.duration, config.progress, config.id, onRemove, progress]);

  const getIcon = () => {
    if (!config.showIcon) return null;
    
    const iconClass = config.variant === 'compact' ? "w-4 h-4" : "w-5 h-5";
    
    switch (config.severity) {
      case 'success':
        return <CheckCircle className={cn(iconClass, "text-green-500 flex-shrink-0")} />;
      case 'error':
        return <AlertCircle className={cn(iconClass, "text-red-500 flex-shrink-0")} />;
      case 'warning':
        return <AlertTriangle className={cn(iconClass, "text-yellow-500 flex-shrink-0")} />;
      case 'info':
      default:
        return <Info className={cn(iconClass, "text-blue-500 flex-shrink-0")} />;
    }
  };

  const getSeverityStyles = () => {
    const base = "relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300";
    
    switch (config.severity) {
      case 'success':
        return cn(base, "bg-green-50/95 dark:bg-green-900/90 border-green-200/60 dark:border-green-700/60");
      case 'error':
        return cn(base, "bg-red-50/95 dark:bg-red-900/90 border-red-200/60 dark:border-red-700/60");
      case 'warning':
        return cn(base, "bg-yellow-50/95 dark:bg-yellow-900/90 border-yellow-200/60 dark:border-yellow-700/60");
      case 'info':
      default:
        return cn(base, "bg-blue-50/95 dark:bg-blue-900/90 border-blue-200/60 dark:border-blue-700/60");
    }
  };

  const getVariantStyles = () => {
    switch (config.variant) {
      case 'compact':
        return "p-3 max-w-sm";
      case 'rich':
        return "p-6 max-w-md";
      case 'floating':
        return "p-4 max-w-sm shadow-2xl border-2";
      case 'standard':
      default:
        return "p-4 max-w-sm";
    }
  };

  const getAnimationVariants = () => {
    const baseY = index * 10; // Stagger effect
    
    switch (config.animation) {
      case 'fade':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
        };
      case 'bounce':
        return {
          initial: { opacity: 0, y: 100 + baseY, scale: 0.3 },
          animate: { 
            opacity: 1, 
            y: 0, 
            scale: 1
          },
          exit: { 
            opacity: 0, 
            y: -50, 
            scale: 0.8,
            transition: { duration: 0.3 }
          }
        };
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0, rotate: -10 },
          animate: { 
            opacity: 1, 
            scale: 1, 
            rotate: 0
          },
          exit: { 
            opacity: 0, 
            scale: 0, 
            rotate: 10,
            transition: { duration: 0.2 }
          }
        };
      case 'slide':
      default:
        return {
          initial: { opacity: 0, x: 400, y: baseY },
          animate: { opacity: 1, x: 0, y: 0 },
          exit: { 
            opacity: 0, 
            x: 400, 
            transition: { duration: 0.3 }
          }
        };
    }
  };

  const variants = getAnimationVariants();

  return (
    <motion.div
      initial={variants.initial}
      animate={variants.animate as any}
      exit={variants.exit}
      className={cn(
        getSeverityStyles(),
        getVariantStyles(),
        "pointer-events-auto group cursor-default"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      layout
    >
      {/* Progress bar */}
      {config.progress && config.duration && config.duration > 0 && (
        <motion.div
          className="absolute top-0 left-0 h-1 bg-current opacity-30"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        {getIcon()}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {config.title && (
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {config.title}
            </div>
          )}
          <div 
            className={cn(
              "text-gray-700 dark:text-gray-300",
              config.variant === 'compact' ? "text-xs" : "text-sm"
            )}
            dangerouslySetInnerHTML={{ __html: config.message }}
          />

          {/* Actions */}
          {config.actions && config.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {config.actions.map((action, actionIndex) => (
                <motion.button
                  key={actionIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + (actionIndex * 0.05) }}
                  onClick={action.onClick}
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium transition-colors",
                    action.variant === 'button'
                      ? "px-2 py-1 bg-black/10 dark:bg-white/10 rounded hover:bg-black/20 dark:hover:bg-white/20"
                      : "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2"
                  )}
                >
                  {action.icon}
                  {action.label}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        {config.dismissible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => onRemove(config.id)}
            className={cn(
              "flex-shrink-0 rounded-md p-1.5 text-gray-400 transition-colors",
              "hover:text-gray-600 dark:hover:text-gray-300",
              "hover:bg-black/5 dark:hover:bg-white/5",
              "opacity-0 group-hover:opacity-100 focus:opacity-100",
              config.variant === 'compact' && "p-1"
            )}
            aria-label="Close notification"
          >
            <X className={cn(config.variant === 'compact' ? "w-3 h-3" : "w-4 h-4")} />
          </motion.button>
        )}
      </div>

      {/* Floating variant glow effect */}
      {config.variant === 'floating' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-lg bg-current opacity-20 blur-xl -z-10"
        />
      )}
    </motion.div>
  );
};

// ============================================================================
// ENHANCED TOAST CONTAINER
// ============================================================================

interface EnhancedToastContainerProps {
  toasts: EnhancedToastConfig[];
  onRemove: (id: string) => void;
  position?: EnhancedToastConfig['position'];
  maxToasts?: number;
}

export const EnhancedToastContainer: React.FC<EnhancedToastContainerProps> = ({
  toasts,
  onRemove,
  position = 'top-right',
  maxToasts = 5
}) => {
  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return "top-4 left-4";
      case 'top-center':
        return "top-4 left-1/2 transform -translate-x-1/2";
      case 'top-right':
        return "top-4 right-4";
      case 'bottom-left':
        return "bottom-4 left-4";
      case 'bottom-center':
        return "bottom-4 left-1/2 transform -translate-x-1/2";
      case 'bottom-right':
        return "bottom-4 right-4";
      default:
        return "top-4 right-4";
    }
  };

  const getFlexDirection = () => {
    return position.includes('bottom') ? 'flex-col-reverse' : 'flex-col';
  };

  const visibleToasts = toasts.slice(-maxToasts);

  return (
    <div 
      className={cn(
        "fixed z-[9998] flex gap-2 pointer-events-none",
        getPositionStyles(),
        getFlexDirection()
      )}
    >
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast, index) => (
          <EnhancedToastItem
            key={toast.id}
            config={toast}
            onRemove={onRemove}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// ENHANCED TOAST HOOK
// ============================================================================

export const useEnhancedToast = () => {
  const [toasts, setToasts] = useState<EnhancedToastConfig[]>([]);

  const addToast = (config: Omit<EnhancedToastConfig, 'id'> & { id?: string }) => {
    const id = config.id || `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const toastConfig: EnhancedToastConfig = {
      duration: 5000,
      dismissible: true,
      showIcon: true,
      variant: 'standard',
      position: 'top-right',
      animation: 'slide',
      progress: true,
      ...config,
      id
    };

    setToasts(prev => [...prev, toastConfig]);

    // Auto-remove if duration is set
    if (toastConfig.duration && toastConfig.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toastConfig.duration);
    }

    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  // Convenience methods
  const showSuccess = (message: string, options?: Partial<EnhancedToastConfig>) =>
    addToast({ severity: 'success', message, ...options });

  const showError = (message: string, options?: Partial<EnhancedToastConfig>) =>
    addToast({ severity: 'error', message, duration: 8000, ...options });

  const showWarning = (message: string, options?: Partial<EnhancedToastConfig>) =>
    addToast({ severity: 'warning', message, ...options });

  const showInfo = (message: string, options?: Partial<EnhancedToastConfig>) =>
    addToast({ severity: 'info', message, ...options });

  const showRichToast = (title: string, message: string, actions: ToastAction[], options?: Partial<EnhancedToastConfig>) =>
    addToast({ 
      title, 
      message, 
      actions,
      severity: 'info', // Default severity
      variant: 'rich',
      duration: 0, // Don't auto-close rich toasts
      ...options 
    });

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showRichToast,
    ToastContainer: (
      <EnhancedToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position="top-right"
        maxToasts={5}
      />
    )
  };
};

export default EnhancedToastItem;
