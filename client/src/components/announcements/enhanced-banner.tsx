import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { useAnnouncementStore, getActiveAnnouncementForUser } from '../../stores/announcement-store';
import { useAuthStore } from '../../store/auth-store';
import { useAdminConfigStore } from '../../stores/admin-config-store';
import { announcementService } from '../../services/announcement-service';
import type { Announcement } from '../../stores/announcement-store';
import type { AnnouncementSeverity } from '../../services/announcement-service';

// ============================================================================
// ENHANCED BANNER COMPONENT
// ============================================================================

export const EnhancedBanner: React.FC = () => {
  const { user } = useAuthStore();
  const storeState = useAnnouncementStore();
  const { 
    getUserState, 
    markSeen, 
    dismiss: dismissAnn 
  } = storeState;
  const { banner, clearBanner } = useAdminConfigStore();
  
  const [isVisible, setIsVisible] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Announcement | null>(null);

  // Get active banner from local store (announcements are managed by AnnouncementManager)
  const activeBannerLocal = (() => {
    const uid = user?.email || 'anonymous';
    return getActiveAnnouncementForUser(
      storeState,
      uid,
      'banner'
    );
  })();

  // Note: Remote fetching is handled by AnnouncementManager to prevent API loops
  // The banner component now only displays banners from the store
  
  // Determine which banner to show (priority: local > admin)
  const activeBanner = activeBannerLocal;
  const shouldShowAdminBanner = !activeBanner && banner?.enabled && banner.message;

  // Set current banner and visibility
  useEffect(() => {
    if (activeBanner) {
      setCurrentBanner(activeBanner);
      setIsVisible(true);
      
      // Mark as seen if this is the first time or after a period
      if (user?.email) {
        const state = getUserState(activeBanner.id, user.email);
        if (!state.lastSeenAt || state.lastSeenAt < Date.now() - 500) {
          markSeen(activeBanner.id, user.email);
        }
      }
    } else if (shouldShowAdminBanner) {
      // Convert admin banner to announcement format for consistent handling
      const adminBannerAnn: Announcement = {
        id: 'admin-banner',
        enabled: true,
        type: 'banner',
        severity: banner!.severity as AnnouncementSeverity,
        title: banner!.title,
        message: banner!.message,
        dismissible: banner!.dismissible,
        maxImpressionsPerUser: null,
        frequency: 'always'
      };
      setCurrentBanner(adminBannerAnn);
      setIsVisible(true);
    } else {
      setIsVisible(false);
      setCurrentBanner(null);
    }
  }, [activeBanner, shouldShowAdminBanner, banner, user?.email, getUserState, markSeen]);

  const handleDismiss = async () => {
    if (!currentBanner) return;

    setIsVisible(false);

    if (currentBanner.id === 'admin-banner') {
      // Dismiss admin banner
      clearBanner();
    } else {
      // Dismiss announcement banner
      if (user?.email) {
        dismissAnn(currentBanner.id, user.email);
        try {
          await announcementService.dismiss(currentBanner.id, user.email);
        } catch (e) {
          console.warn('dismiss failed', e);
        }
      }
    }
  };

  const getIcon = (severity: AnnouncementSeverity) => {
    const iconClass = "w-4 h-4 flex-shrink-0";
    
    switch (severity) {
      case 'success':
        return <CheckCircle className={cn(iconClass, "text-green-600 dark:text-green-400")} />;
      case 'error':
        return <AlertCircle className={cn(iconClass, "text-red-600 dark:text-red-400")} />;
      case 'warning':
        return <AlertTriangle className={cn(iconClass, "text-yellow-600 dark:text-yellow-400")} />;
      case 'info':
      default:
        return <Info className={cn(iconClass, "text-blue-600 dark:text-blue-400")} />;
    }
  };

  const getSeverityStyles = (severity: AnnouncementSeverity) => {
    switch (severity) {
      case 'success':
        return "bg-green-50/90 dark:bg-green-900/20 border-green-200/60 dark:border-green-800/60 text-green-900 dark:text-green-100";
      case 'error':
        return "bg-red-50/90 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/60 text-red-900 dark:text-red-100";
      case 'warning':
        return "bg-yellow-50/90 dark:bg-yellow-900/20 border-yellow-200/60 dark:border-yellow-800/60 text-yellow-900 dark:text-yellow-100";
      case 'info':
      default:
        return "bg-blue-50/90 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/60 text-blue-900 dark:text-blue-100";
    }
  };

  const getSpecialEffects = (message: string) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('celebration') || 
        lowerMessage.includes('congratulation') || 
        lowerMessage.includes('achievement')) {
      return 'celebration';
    }
    if (lowerMessage.includes('new feature') || 
        lowerMessage.includes('update') || 
        lowerMessage.includes('announcement')) {
      return 'highlight';
    }
    return null;
  };

  if (!isVisible || !currentBanner) {
    return null;
  }

  const specialEffect = getSpecialEffects(currentBanner.message);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ 
          type: "spring", 
          damping: 25, 
          stiffness: 300,
          duration: 0.5 
        }}
        className={cn(
          'relative px-4 py-3 border-b backdrop-blur-sm',
          getSeverityStyles(currentBanner.severity)
        )}
      >
        {/* Special effects background */}
        {specialEffect === 'celebration' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  x: Math.random() * 100 + '%',
                  y: '100%',
                  scale: 0,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  y: '-20%',
                  scale: [0, 1, 0.5],
                  rotate: 360,
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  ease: "easeOut",
                  repeat: Infinity,
                  repeatDelay: 3
                }}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              />
            ))}
          </div>
        )}

        {specialEffect === 'highlight' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10"
          />
        )}

        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            >
              {getIcon(currentBanner.severity)}
            </motion.div>

            {/* Special effect icon for celebration */}
            {specialEffect === 'celebration' && (
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              >
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </motion.div>
            )}

            {/* Content */}
            <div className="min-w-0 flex-1">
              {currentBanner.title && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm font-semibold mb-1"
                >
                  {currentBanner.title}
                </motion.div>
              )}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xs opacity-90 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: currentBanner.message.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
                    '<a href="$2" class="underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>'
                  )
                }}
              />
            </div>
          </div>

          {/* Dismiss button */}
          {currentBanner.dismissible && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              onClick={handleDismiss}
              className={cn(
                "flex-shrink-0 p-1.5 rounded-md transition-all duration-200",
                "text-current/60 hover:text-current/80",
                "hover:bg-current/10 focus:bg-current/10",
                "focus:outline-none focus:ring-2 focus:ring-current/20"
              )}
              aria-label="Dismiss banner"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Bottom highlight line for special effects */}
        {specialEffect && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-current/30 origin-left"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedBanner;
