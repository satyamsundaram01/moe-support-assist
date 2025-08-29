import React, { useCallback, useEffect } from 'react';
import { 
  analyticsService, 
  trackEvent, 
  trackPageView, 
  trackButtonClick, 
  trackFormSubmit, 
  trackError, 
  trackChatMessage, 
  trackToolUsage, 
  trackModeSwitch,
  getSessionInfo,
  getQueueStatus,
  type AnalyticsAttributes 
} from '../services/analytics-service';

export const useAnalytics = () => {
  // Initialize analytics on mount - removed automatic page view tracking
  useEffect(() => {
    // Only track page unload for session cleanup
    const handleBeforeUnload = () => {
      trackEvent('page_unload', {
        session_duration: getSessionInfo().sessionDuration,
        queue_length: getQueueStatus().queueLength,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Custom tracking function
  const track = useCallback((eventName: string, attributes: AnalyticsAttributes = {}) => {
    trackEvent(eventName, attributes);
  }, []);

  // Page view tracking
  const trackPage = useCallback((pageName: string, additionalAttributes: AnalyticsAttributes = {}) => {
    trackPageView(pageName, additionalAttributes);
  }, []);

  // Button click tracking
  const trackClick = useCallback((buttonName: string, additionalAttributes: AnalyticsAttributes = {}) => {
    trackButtonClick(buttonName, additionalAttributes);
  }, []);

  // Form submit tracking
  const trackSubmit = useCallback((formName: string, additionalAttributes: AnalyticsAttributes = {}) => {
    trackFormSubmit(formName, additionalAttributes);
  }, []);

  // Error tracking
  const trackErrorEvent = useCallback((errorType: string, errorMessage: string, additionalAttributes: AnalyticsAttributes = {}) => {
    trackError(errorType, errorMessage, additionalAttributes);
  }, []);

  // Chat message tracking
  const trackMessage = useCallback((messageType: 'user' | 'ai', messageLength: number, additionalAttributes: AnalyticsAttributes = {}) => {
    trackChatMessage(messageType, messageLength, additionalAttributes);
  }, []);

  // Tool usage tracking
  const trackTool = useCallback((toolName: string, toolStatus: 'success' | 'error', additionalAttributes: AnalyticsAttributes = {}) => {
    trackToolUsage(toolName, toolStatus, additionalAttributes);
  }, []);

  // Mode switch tracking
  const trackMode = useCallback((fromMode: string, toMode: string, additionalAttributes: AnalyticsAttributes = {}) => {
    trackModeSwitch(fromMode, toMode, additionalAttributes);
  }, []);

  // Session info
  const getSession = useCallback(() => {
    return getSessionInfo();
  }, []);

  // Queue status
  const getQueue = useCallback(() => {
    return getQueueStatus();
  }, []);

  // Manual flush
  const flush = useCallback(async () => {
    await analyticsService.manualFlush();
  }, []);

  // Enable/disable tracking
  const enable = useCallback(() => {
    analyticsService.enable();
  }, []);

  const disable = useCallback(() => {
    analyticsService.disable();
  }, []);

  return {
    // Core tracking functions
    track,
    trackPage,
    trackClick,
    trackSubmit,
    trackError: trackErrorEvent,
    trackMessage,
    trackTool,
    trackMode,
    
    // Utility functions
    getSession,
    getQueue,
    flush,
    enable,
    disable,
    
    // Service instance (for advanced usage)
    service: analyticsService,
  };
};

// Higher-order component for automatic tracking
export const withAnalytics = <P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  trackingProps?: {
    pageName?: string;
    componentName?: string;
  }
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    const { trackPage } = useAnalytics();

    useEffect(() => {
      if (trackingProps?.pageName) {
        trackPage(trackingProps.pageName, {
          component_name: trackingProps.componentName || Component.displayName || Component.name,
        });
      }
    }, [trackPage]);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withAnalytics(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for tracking component interactions
export const useComponentAnalytics = (componentName: string) => {
  const { trackClick, track } = useAnalytics();

  const trackComponentClick = useCallback((elementName: string, additionalAttributes: AnalyticsAttributes = {}) => {
    trackClick(`${componentName}_${elementName}`, {
      component_name: componentName,
      ...additionalAttributes,
    });
  }, [componentName, trackClick]);

  const trackComponentEvent = useCallback((eventName: string, additionalAttributes: AnalyticsAttributes = {}) => {
    track(`${componentName}_${eventName}`, {
      component_name: componentName,
      ...additionalAttributes,
    });
  }, [componentName, track]);

  return {
    trackClick: trackComponentClick,
    trackEvent: trackComponentEvent,
  };
};
