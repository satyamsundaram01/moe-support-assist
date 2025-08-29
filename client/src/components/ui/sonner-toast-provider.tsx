import React from 'react';
import { Toaster, toast } from 'sonner';
import { createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

// Types for our toast context
type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'link';
}

interface ToastOptions {
  id?: string;
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  variant?: ToastVariant;
  description?: string;
  action?: ToastAction;
  icon?: React.ReactNode;
}

interface ToastContextType {
  toast: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  dismiss: (toastId: string) => void;
  dismissAll: () => void;
}

// Create context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook for using toast
export const useSonnerToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useSonnerToast must be used within a SonnerToastProvider');
  }
  return context;
};

// The provider component
export const SonnerToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Helper function to get icon for toast variant
  const getIconForVariant = (variant: ToastVariant) => {
    const iconClassName = "h-5 w-5";
    
    switch (variant) {
      case 'success':
        return <CheckCircle className={cn(iconClassName, "text-green-500")} />;
      case 'error':
        return <AlertCircle className={cn(iconClassName, "text-red-500")} />;
      case 'warning':
        return <AlertTriangle className={cn(iconClassName, "text-yellow-500")} />;
      case 'info':
        return <Info className={cn(iconClassName, "text-blue-500")} />;
      default:
        return null;
    }
  };

  // Toast methods with consistent styling
  const showToast = (message: string, options?: ToastOptions) => {
    const variant = options?.variant || 'default';
    const icon = options?.icon || getIconForVariant(variant);
    
    return toast(message, {
      id: options?.id,
      duration: options?.duration || 5000,
      position: options?.position,
      description: options?.description,
      icon,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: cn(
        variant === 'success' && "sonner-toast-success",
        variant === 'error' && "sonner-toast-error",
        variant === 'warning' && "sonner-toast-warning",
        variant === 'info' && "sonner-toast-info"
      ),
    });
  };

  // Convenience methods for different toast types
  const success = (message: string, options?: ToastOptions) => 
    showToast(message, { ...options, variant: 'success' });
  
  const error = (message: string, options?: ToastOptions) => 
    showToast(message, { ...options, variant: 'error' });
  
  const warning = (message: string, options?: ToastOptions) => 
    showToast(message, { ...options, variant: 'warning' });
  
  const info = (message: string, options?: ToastOptions) => 
    showToast(message, { ...options, variant: 'info' });

  // Create context value
  const contextValue: ToastContextType = {
    toast: showToast,
    success,
    error,
    warning,
    info,
    dismiss: toast.dismiss,
    dismissAll: toast.dismiss,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toaster 
        className="sonner-toast-container"
        toastOptions={{
          className: "sonner-toast",
          style: {
            borderRadius: '0.5rem',
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }}
        closeButton
        richColors
        expand
      />
    </ToastContext.Provider>
  );
};
