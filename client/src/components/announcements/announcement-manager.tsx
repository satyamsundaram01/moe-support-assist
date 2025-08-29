import React, { useEffect, useState, useCallback } from 'react';
import { useAnnouncementStore } from '../../stores/announcement-store';
import { useAuthStore } from '../../store/auth-store';
import { announcementService } from '../../services/announcement-service';
import { useAlertModal, useEnhancedToast } from '../ui';
import { ExternalLink, Copy } from 'lucide-react';
import type { Announcement, UserAnnouncementState } from '../../stores/announcement-store';
import type { AlertAction } from '../ui/alert-modal';
import type { ToastAction } from '../ui/enhanced-toast';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function canShowAnnouncement(announcement: Announcement, userState: UserAnnouncementState): boolean {
  const now = Date.now();
  
  // Check if dismissed
  if (userState.dismissed) return false;
  
  // Check max impressions
  if (announcement.maxImpressionsPerUser && 
      userState.impressions >= announcement.maxImpressionsPerUser) {
    return false;
  }
  
  // Check frequency
  if (!userState.lastSeenAt) return true; // First time
  
  switch (announcement.frequency) {
    case 'once':
      return userState.impressions === 0;
    case 'per_session':
      // 30 minutes window
      return now - userState.lastSeenAt > 30 * 60 * 1000;
    case 'per_day':
      return now - userState.lastSeenAt > 24 * 60 * 60 * 1000;
    case 'always':
      return true;
    default:
      return true;
  }
}

function createAnnouncementActions(announcement: Announcement): {
  alertActions: AlertAction[];
  toastActions: ToastAction[];
} {
  const alertActions: AlertAction[] = [];
  const toastActions: ToastAction[] = [];

  // Parse message for action links (simple markdown-like syntax)
  const actionRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const actions: Array<{ label: string; url: string }> = [];
  
  let match;
  while ((match = actionRegex.exec(announcement.message)) !== null) {
    actions.push({ label: match[1], url: match[2] });
  }

  // Convert to action objects
  actions.forEach(action => {
    const isExternal = action.url.startsWith('http');
    
    const alertAction: AlertAction = {
      label: action.label,
      variant: 'primary',
      onClick: () => {
        if (isExternal) {
          window.open(action.url, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = action.url;
        }
      }
    };

    const toastAction: ToastAction = {
      label: action.label,
      variant: 'link',
      icon: isExternal ? <ExternalLink className="w-3 h-3" /> : undefined,
      onClick: alertAction.onClick
    };

    alertActions.push(alertAction);
    toastActions.push(toastAction);
  });

  // Add copy action if announcement contains code or long text
  if (announcement.message.includes('`') || announcement.message.length > 200) {
    const copyText = announcement.message.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    
    const copyAction = {
      label: 'Copy',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(copyText);
        } catch (error) {
          console.warn('Failed to copy text:', error);
        }
      }
    };

    alertActions.push({
      ...copyAction,
      variant: 'outline' as const
    });

    toastActions.push({
      ...copyAction,
      variant: 'button' as const,
      icon: <Copy className="w-3 h-3" />
    });
  }

  return { alertActions, toastActions };
}


function showToastAnnouncement(
  announcement: Announcement, 
  actions: { toastActions: ToastAction[] },
  enhancedToast: ReturnType<typeof useEnhancedToast>
) {
  // Determine variant and animation based on severity
  let variant: 'standard' | 'compact' | 'rich' | 'floating' = 'standard';
  let animation: 'slide' | 'fade' | 'bounce' | 'scale' = 'slide';
  let duration = 5000;
  
  if (announcement.severity === 'error') {
    variant = 'floating';
    animation = 'bounce';
    duration = 8000;
  } else if (announcement.severity === 'success') {
    animation = 'scale';
  } else if (actions.toastActions.length > 0) {
    variant = 'rich';
    duration = 0; // Don't auto-close rich toasts
  }

  enhancedToast.addToast({
    title: announcement.title,
    message: announcement.message.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1'), // Remove action links from display
    severity: announcement.severity,
    variant,
    animation,
    duration,
    dismissible: announcement.dismissible,
    actions: actions.toastActions,
    showIcon: true,
    progress: duration > 0
  });
}

// ============================================================================
// ANNOUNCEMENT MANAGER COMPONENT
// ============================================================================

export const AnnouncementManager: React.FC = () => {
  const { user } = useAuthStore();
  const storeState = useAnnouncementStore();
  const { 
    announcements, 
    setAnnouncements,
    getUserState, 
    markSeen
  } = storeState;
  
  const [processedAnnouncements, setProcessedAnnouncements] = useState<Set<string>>(new Set());
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const alertModal = useAlertModal();
  const enhancedToast = useEnhancedToast();

  // Process individual announcement with loop prevention
  const processAnnouncement = useCallback(async (announcement: Announcement, userId: string) => {
    if (!userId || processedAnnouncements.has(announcement.id)) {
      return;
    }

    const userState = getUserState(announcement.id, userId);
    
    // Check if user should see this announcement
    const canShow = canShowAnnouncement(announcement, userState);
    if (!canShow) {
      return;
    }

    // Mark as processed to avoid duplicates
    setProcessedAnnouncements(prev => new Set(prev).add(announcement.id));

    // Mark as seen
    markSeen(announcement.id, userId);

    // Record server-side impression (with error handling to prevent loops)
    try {
      await announcementService.recordImpression(announcement.id, userId);
    } catch (error) {
      console.warn('Failed to record impression:', error);
      // Don't throw error to prevent processing loop
    }

    // Create actions based on announcement content
    const actions = createAnnouncementActions(announcement);

    // Show based on type
    if (announcement.type === 'banner') {
      // Banner announcements are handled by the EnhancedBanner component
      // We just mark them as seen here and let the banner component display them
      console.log('Banner announcement processed by AnnouncementManager:', announcement.title);
      return; // Don't show banner announcements as modals - let EnhancedBanner handle them
    } else {
      // Show toast announcement
      showToastAnnouncement(announcement, actions, enhancedToast);
    }
  }, [getUserState, markSeen, processedAnnouncements, enhancedToast]);

  // Initial load - only once on mount with proper loop prevention
  useEffect(() => {
    let mounted = true;
    
    const loadInitialData = async () => {
      if (hasLoaded || isProcessing) return;
      setIsProcessing(true);
      
      try {
        const serverAnnouncements = await announcementService.list();
        if (mounted) {
          setAnnouncements(serverAnnouncements);
          setHasLoaded(true);
        }
      } catch (error) {
        console.warn('Failed to load announcements:', error);
      } finally {
        if (mounted) {
          setIsProcessing(false);
        }
      }
    };
    
    loadInitialData();
    
    return () => {
      mounted = false;
    };
  }, [hasLoaded, isProcessing, setAnnouncements]);

  // Process announcements when they change or user changes (with throttling)
  useEffect(() => {
    if (!hasLoaded || !user?.email || isProcessing) return;
    
    const userId = user.email;
    const now = Date.now();
    
    // Throttle checks - only check every 2 minutes
    if (now - lastCheckTime < 120000) return;
    
    setIsProcessing(true);
    setLastCheckTime(now);

    const processActiveAnnouncements = async () => {
      try {
        // Get active announcements for user
        const activeAnnouncements = announcements.filter(ann => {
          if (!ann.enabled) return false;
          
          // Check schedule
          if (ann.startsAt && now < ann.startsAt) return false;
          if (ann.endsAt && now > ann.endsAt) return false;
          
          return true;
        });

        // Process each announcement
        for (const announcement of activeAnnouncements) {
          await processAnnouncement(announcement, userId);
        }
      } catch (error) {
        console.warn('Error processing announcements:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    // Debounce the processing
    const timeoutId = setTimeout(() => {
      processActiveAnnouncements();
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasLoaded, user?.email, announcements.length, lastCheckTime, isProcessing, processAnnouncement, announcements]);

  // Periodic check - separate from content changes
  useEffect(() => {
    if (!hasLoaded) return;
    
    // Check every 5 minutes for new announcements
    const intervalId = setInterval(() => {
      if (!isProcessing) {
        setLastCheckTime(0); // Reset to allow next check
      }
    }, 300000); // 5 minutes
    
    return () => {
      clearInterval(intervalId);
    };
  }, [hasLoaded, isProcessing]);

  // Reset processed announcements when user changes
  useEffect(() => {
    setProcessedAnnouncements(new Set());
    setHasLoaded(false); // Force reload when user changes
  }, [user?.email]);

  return (
    <>
      {/* Alert Modal */}
      {alertModal.AlertModalComponent}
      
      {/* Enhanced Toast Container */}
      {enhancedToast.ToastContainer}
    </>
  );
};

// ============================================================================
// DEMO FUNCTIONS (for testing/demo purposes)
// ============================================================================

export const useAnnouncementDemo = () => {
  const alertModal = useAlertModal();
  const enhancedToast = useEnhancedToast();

  const showDemoAlerts = () => {
    // Success celebration
    setTimeout(() => {
      alertModal.showCelebration(
        "🎉 Welcome to the Enhanced System!",
        "You've successfully integrated the new announcement system with cool animations and better UX!",
        {
          actions: [
            {
              label: "Explore Features",
              variant: "primary",
              onClick: () => console.log("Exploring features...")
            },
            {
              label: "View Docs",
              variant: "outline",
              onClick: () => window.open("https://docs.example.com", "_blank")
            }
          ]
        }
      );
    }, 1000);

    // Error alert
    setTimeout(() => {
      alertModal.showError(
        "This is an important error that requires your attention. The system has detected an issue that needs to be resolved.",
        {
          title: "System Error Detected",
          variant: "highlight",
          autoClose: 10000,
          actions: [
            {
              label: "Troubleshoot",
              variant: "primary",
              onClick: () => console.log("Troubleshooting...")
            }
          ]
        }
      );
    }, 2000);
  };

  const showDemoToasts = () => {
    // Rich toast with actions
    enhancedToast.showRichToast(
      "New Feature Available",
      "Enhanced announcements are now live with better animations and more configuration options!",
      [
        {
          label: "Learn More",
          variant: "link",
          icon: <ExternalLink className="w-3 h-3" />,
          onClick: () => console.log("Learning more...")
        },
        {
          label: "Copy Code",
          variant: "button", 
          icon: <Copy className="w-3 h-3" />,
          onClick: () => console.log("Copying code...")
        }
      ],
      { severity: 'info', variant: 'rich' }
    );

    // Floating error toast
    setTimeout(() => {
      enhancedToast.showError(
        "Connection failed. Please check your network and try again.",
        {
          variant: 'floating',
          animation: 'bounce',
          duration: 8000
        }
      );
    }, 1000);

    // Success toast with scale animation
    setTimeout(() => {
      enhancedToast.showSuccess(
        "Settings saved successfully!",
        {
          animation: 'scale',
          variant: 'standard'
        }
      );
    }, 2000);

    // Compact info toast
    setTimeout(() => {
      enhancedToast.showInfo(
        "Quick tip: You can hover over toasts to pause the auto-close timer.",
        {
          variant: 'compact',
          animation: 'fade'
        }
      );
    }, 3000);
  };

  return {
    showDemoAlerts,
    showDemoToasts,
    alertModal,
    enhancedToast
  };
};

export default AnnouncementManager;
