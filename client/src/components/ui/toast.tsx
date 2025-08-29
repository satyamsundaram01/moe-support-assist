import React, { createContext, useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { useEventsStore } from '../../store/events-store';
import { useEventsStore as useEventsStoreState } from '../../store/events-store';

// ============================================================================
// TOAST TYPES
// ============================================================================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================================
// TOAST CONTEXT
// ============================================================================

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// ============================================================================
// TOAST PROVIDER
// ============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  defaultDuration = 5000,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const eventsState = useEventsStoreState();
  const { hideToast, clearToasts: clearStoreToasts } = useEventsStore();

  // Listen to toast events from the events store
  useEffect(() => {
    const checkToasts = () => {
      const storeToasts = eventsState.toasts;
      const newToasts: Toast[] = storeToasts.map((storeToast) => ({
        id: storeToast.id,
        type: storeToast.type,
        message: storeToast.message,
        duration: storeToast.duration || defaultDuration,
      }));
      setToasts(newToasts);
    };

    // Check toasts periodically
    const interval = setInterval(checkToasts, 100);
    checkToasts(); // Initial check

    return () => clearInterval(interval);
  }, [eventsState.toasts, defaultDuration]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };
    
    setToasts((prev) => {
      const updated = [...prev, newToast];
      return updated.slice(-maxToasts);
    });

    // Auto-remove toast after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || defaultDuration);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    hideToast(id);
  };

  const clearToasts = () => {
    setToasts([]);
    clearStoreToasts();
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
    </ToastContext.Provider>
  );
};

// ============================================================================
// TOAST VIEWPORT
// ============================================================================

export const ToastViewport: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// TOAST ITEM
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={cn(
        'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
        getBackgroundColor()
      )}
    >
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1">
          {toast.title && (
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {toast.title}
            </div>
          )}
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {toast.message}
          </div>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      </div>
      
      <button
        onClick={() => onRemove(toast.id)}
        className="absolute right-2 top-2 rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 dark:text-gray-500 dark:hover:text-gray-400"
        aria-label="Close toast"
        title="Close toast"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

// ============================================================================
// TOAST HOOKS
// ============================================================================

export const useToastEvents = () => {
  const eventsStore = useEventsStore();
  
  return {
    showSuccess: (message: string) =>
      eventsStore.showToast(message, 'success'),
    showError: (message: string) =>
      eventsStore.showToast(message, 'error'),
    showWarning: (message: string) =>
      eventsStore.showToast(message, 'warning'),
    showInfo: (message: string) =>
      eventsStore.showToast(message, 'info'),
    hideToast: (id: string) => eventsStore.hideToast(id),
    clearToasts: () => eventsStore.clearToasts(),
  };
}; 