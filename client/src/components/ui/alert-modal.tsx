import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Star, Zap, Bell } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils/cn';
import { Button } from './button';
import type { AnnouncementSeverity } from '../../services/announcement-service';

// ============================================================================
// ALERT MODAL TYPES
// ============================================================================

export interface AlertModalConfig {
  id: string;
  title?: string;
  message: string;
  severity: AnnouncementSeverity;
  dismissible?: boolean;
  autoClose?: number; // Auto close after X milliseconds (0 = never)
  actions?: AlertAction[];
  showIcon?: boolean;
  variant?: 'standard' | 'highlight' | 'celebration';
  backdrop?: 'dark' | 'blur' | 'light';
}

export interface AlertAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  onClick: () => void;
}

// ============================================================================
// ALERT MODAL COMPONENT
// ============================================================================

interface AlertModalProps {
  config: AlertModalConfig;
  isOpen: boolean;
  onClose: () => void;
  onDismiss?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  config,
  isOpen,
  onClose,
  onDismiss
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto-close countdown
  useEffect(() => {
    if (!isOpen || !config.autoClose || config.autoClose <= 0) return;

    setCountdown(Math.ceil(config.autoClose / 1000));
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev && prev <= 1) {
          onClose();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, config.autoClose, onClose]);

  const getIcon = () => {
    if (!config.showIcon) return null;
    
    const iconClass = "w-8 h-8";
    switch (config.severity) {
      case 'success':
        return <CheckCircle className={cn(iconClass, "text-green-500")} />;
      case 'error':
        return <AlertCircle className={cn(iconClass, "text-red-500")} />;
      case 'warning':
        return <AlertTriangle className={cn(iconClass, "text-yellow-500")} />;
      case 'info':
      default:
        return <Info className={cn(iconClass, "text-blue-500")} />;
    }
  };

  const getVariantIcon = () => {
    if (config.variant === 'celebration') {
      return <Star className="w-6 h-6 text-yellow-400" />;
    }
    if (config.variant === 'highlight') {
      return <Zap className="w-6 h-6 text-purple-400" />;
    }
    return <Bell className="w-6 h-6 text-blue-400" />;
  };

  const getSeverityStyles = () => {
    const base = "relative rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl backdrop-blur-sm";
    
    switch (config.severity) {
      case 'success':
        return cn(base, "bg-green-50/95 dark:bg-green-900/80 border-2 border-green-200/60 dark:border-green-700/60");
      case 'error':
        return cn(base, "bg-red-50/95 dark:bg-red-900/80 border-2 border-red-200/60 dark:border-red-700/60");
      case 'warning':
        return cn(base, "bg-yellow-50/95 dark:bg-yellow-900/80 border-2 border-yellow-200/60 dark:border-yellow-700/60");
      case 'info':
      default:
        return cn(base, "bg-blue-50/95 dark:bg-blue-900/80 border-2 border-blue-200/60 dark:border-blue-700/60");
    }
  };

  const getBackdropStyles = () => {
    switch (config.backdrop) {
      case 'blur':
        return "backdrop-blur-lg bg-black/20 dark:bg-black/40";
      case 'light':
        return "bg-white/80 dark:bg-gray-900/80";
      case 'dark':
      default:
        return "bg-black/50 dark:bg-black/70";
    }
  };

  const getVariantStyles = () => {
    if (config.variant === 'celebration') {
      return "relative overflow-hidden";
    }
    if (config.variant === 'highlight') {
      return "relative border-4 border-purple-300/50 dark:border-purple-600/50";
    }
    return "";
  };

  const handleClose = () => {
    onClose();
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "fixed inset-0 z-[9999] flex items-center justify-center",
          getBackdropStyles()
        )}
        onClick={config.dismissible ? handleClose : undefined}
      >
        {/* Celebration particles effect */}
        {config.variant === 'celebration' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  x: Math.random() * window.innerWidth,
                  y: window.innerHeight + 100,
                  scale: 0,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  y: -100,
                  scale: [0, 1, 0.5],
                  rotate: 360,
                }}
                transition={{
                  duration: 3,
                  delay: i * 0.1,
                  ease: "easeOut",
                }}
                className="absolute w-3 h-3 bg-yellow-400 rounded-full"
              />
            ))}
          </div>
        )}

        <motion.div
          initial={{ 
            scale: 0.8, 
            opacity: 0, 
            y: 50,
            rotateX: -15 
          }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            y: 0,
            rotateX: 0 
          }}
          exit={{ 
            scale: 0.9, 
            opacity: 0, 
            y: 20,
            transition: { duration: 0.2 }
          }}
          transition={{ 
            type: "spring", 
            damping: 25, 
            stiffness: 300,
            duration: 0.5 
          }}
          className={cn(getSeverityStyles(), getVariantStyles())}
          onClick={(e) => e.stopPropagation()}
          style={{
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden'
          }}
        >
          {/* Close button */}
          {config.dismissible && (
            <motion.button
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200"
              aria-label="Close alert"
            >
              <X className="w-5 h-5" />
            </motion.button>
          )}

          {/* Auto-close countdown */}
          {countdown && countdown > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 left-4 px-2 py-1 bg-black/10 dark:bg-white/10 rounded-full text-xs font-medium"
            >
              Auto-close in {countdown}s
            </motion.div>
          )}

          {/* Content */}
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Icon section */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex items-center justify-center"
            >
              {config.variant !== 'standard' && (
                <div className="mb-2">
                  {getVariantIcon()}
                </div>
              )}
              {getIcon()}
            </motion.div>

            {/* Title */}
            {config.title && (
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-gray-900 dark:text-white"
              >
                {config.title}
              </motion.h2>
            )}

            {/* Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-700 dark:text-gray-300 leading-relaxed max-w-lg"
              dangerouslySetInnerHTML={{ __html: config.message }}
            />

            {/* Actions */}
            {config.actions && config.actions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-3 justify-center mt-6"
              >
                {config.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || 'primary'}
                    onClick={() => {
                      action.onClick();
                      handleClose();
                    }}
                    className="min-w-[100px]"
                  >
                    {action.label}
                  </Button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Highlight border animation */}
          {config.variant === 'highlight' && (
            <motion.div
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 rounded-2xl"
              style={{
                background: `linear-gradient(45deg, 
                  transparent 25%, 
                  rgba(147, 51, 234, 0.1) 25%, 
                  rgba(147, 51, 234, 0.1) 50%, 
                  transparent 50%, 
                  transparent 75%, 
                  rgba(147, 51, 234, 0.1) 75%
                )`,
                backgroundSize: '20px 20px',
              }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// ============================================================================
// ALERT MODAL HOOK
// ============================================================================

export const useAlertModal = () => {
  const [config, setConfig] = useState<AlertModalConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showAlert = (alertConfig: Omit<AlertModalConfig, 'id'> & { id?: string }) => {
    const id = alertConfig.id || `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setConfig({ ...alertConfig, id });
    setIsOpen(true);
  };

  const closeAlert = () => {
    setIsOpen(false);
    setTimeout(() => setConfig(null), 300); // Wait for exit animation
  };

  const showSuccess = (message: string, options?: Partial<AlertModalConfig>) =>
    showAlert({ severity: 'success', message, showIcon: true, ...options });

  const showError = (message: string, options?: Partial<AlertModalConfig>) =>
    showAlert({ severity: 'error', message, showIcon: true, ...options });

  const showWarning = (message: string, options?: Partial<AlertModalConfig>) =>
    showAlert({ severity: 'warning', message, showIcon: true, ...options });

  const showInfo = (message: string, options?: Partial<AlertModalConfig>) =>
    showAlert({ severity: 'info', message, showIcon: true, ...options });

  const showCelebration = (title: string, message: string, options?: Partial<AlertModalConfig>) =>
    showAlert({ 
      title, 
      message, 
      severity: 'success', 
      variant: 'celebration',
      showIcon: true,
      backdrop: 'dark',
      ...options 
    });

  return {
    config,
    isOpen,
    showAlert,
    closeAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showCelebration,
    AlertModalComponent: config ? (
      <AlertModal 
        config={config} 
        isOpen={isOpen} 
        onClose={closeAlert}
      />
    ) : null
  };
};

export default AlertModal;
