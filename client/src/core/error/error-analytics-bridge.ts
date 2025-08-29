/**
 * Error Analytics Bridge
 * Integrates error handling with analytics tracking
 */

import type { AppError, ErrorSeverity, ErrorCategory } from './error-handler';
import { analyticsService } from '../../services/analytics-service';
import { logger } from '../logging/logger';
import { isFeatureEnabled } from '../config/feature-flags';

export interface ErrorAnalyticsData {
  error_id: string;
  error_code: string;
  error_category: ErrorCategory;
  error_severity: ErrorSeverity;
  error_message: string;
  user_message: string;
  component?: string;
  user_action?: string;
  session_id?: string;
  conversation_id?: string;
  recoverable: boolean;
  retryable: boolean;
  recovery_attempted?: boolean;
  recovery_successful?: boolean;
  stack_trace?: string;
  user_agent: string;
  url: string;
  timestamp: number;
}

/**
 * Error Analytics Bridge Class
 */
class ErrorAnalyticsBridge {
  private errorCounts: Map<string, number> = new Map();
  private lastErrorTime: Map<string, number> = new Map();
  private readonly DUPLICATE_THRESHOLD = 5000; // 5 seconds

  /**
   * Track error occurrence in analytics
   */
  trackError(error: AppError): void {
    if (!isFeatureEnabled('enableAnalytics') || !isFeatureEnabled('enableErrorReporting')) {
      return;
    }

    // Check for duplicate errors to avoid spam
    if (this.isDuplicateError(error)) {
      this.incrementErrorCount(error);
      return;
    }

    const analyticsData = this.createAnalyticsData(error);
    
    // Track the error event
    analyticsService.track('error_occurred', analyticsData);

    // Log the tracking
    logger.debug('Error tracked in analytics', {
      errorId: error.id,
      code: error.code,
      category: error.category,
      severity: error.severity,
    });

    // Update tracking state
    this.updateErrorTracking(error);
  }

  /**
   * Track error recovery attempt
   */
  trackErrorRecovery(error: AppError, successful: boolean): void {
    if (!isFeatureEnabled('enableAnalytics') || !isFeatureEnabled('enableErrorReporting')) {
      return;
    }

    const analyticsData = this.createAnalyticsData(error, {
      recovery_attempted: true,
      recovery_successful: successful,
    });

    analyticsService.track('error_recovery', analyticsData);

    logger.debug('Error recovery tracked', {
      errorId: error.id,
      successful,
    });
  }

  /**
   * Track error pattern (multiple similar errors)
   */
  trackErrorPattern(errorCode: string, count: number, timeWindow: number): void {
    if (!isFeatureEnabled('enableAnalytics')) {
      return;
    }

    analyticsService.track('error_pattern_detected', {
      error_code: errorCode,
      occurrence_count: count,
      time_window_ms: timeWindow,
      pattern_type: count > 10 ? 'high_frequency' : 'moderate_frequency',
    });

    logger.warn('Error pattern detected', {
      errorCode,
      count,
      timeWindow,
    });
  }

  /**
   * Create analytics data from error
   */
  private createAnalyticsData(
    error: AppError, 
    additionalData: Partial<ErrorAnalyticsData> = {}
  ): ErrorAnalyticsData {
    return {
      error_id: error.id,
      error_code: error.code,
      error_category: error.category,
      error_severity: error.severity,
      error_message: error.message,
      user_message: error.userMessage,
      component: error.context?.component,
      user_action: error.context?.action,
      session_id: error.context?.sessionId,
      conversation_id: error.context?.conversationId,
      recoverable: error.recoverable,
      retryable: error.retryable,
      stack_trace: error.stack,
      user_agent: navigator.userAgent,
      url: window.location.href,
      timestamp: error.timestamp,
      ...additionalData,
    };
  }

  /**
   * Check if error is a duplicate within threshold
   */
  private isDuplicateError(error: AppError): boolean {
    const errorKey = `${error.code}_${error.context?.component || 'unknown'}`;
    const lastTime = this.lastErrorTime.get(errorKey);
    
    if (!lastTime) {
      return false;
    }

    return (error.timestamp - lastTime) < this.DUPLICATE_THRESHOLD;
  }

  /**
   * Increment error count for duplicate tracking
   */
  private incrementErrorCount(error: AppError): void {
    const errorKey = `${error.code}_${error.context?.component || 'unknown'}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    const newCount = currentCount + 1;
    
    this.errorCounts.set(errorKey, newCount);

    // Track pattern if count reaches threshold
    if (newCount === 5 || newCount === 10 || newCount % 20 === 0) {
      const firstTime = this.lastErrorTime.get(errorKey) || error.timestamp;
      const timeWindow = error.timestamp - firstTime;
      this.trackErrorPattern(error.code, newCount, timeWindow);
    }
  }

  /**
   * Update error tracking state
   */
  private updateErrorTracking(error: AppError): void {
    const errorKey = `${error.code}_${error.context?.component || 'unknown'}`;
    this.lastErrorTime.set(errorKey, error.timestamp);
    this.errorCounts.set(errorKey, 1);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalUniqueErrors: number;
    errorCounts: Record<string, number>;
    recentErrors: string[];
  } {
    const errorCounts: Record<string, number> = {};
    this.errorCounts.forEach((count, key) => {
      errorCounts[key] = count;
    });

    const recentErrors = Array.from(this.lastErrorTime.entries())
      .filter(([, time]) => Date.now() - time < 300000) // Last 5 minutes
      .map(([key]) => key);

    return {
      totalUniqueErrors: this.errorCounts.size,
      errorCounts,
      recentErrors,
    };
  }

  /**
   * Clear tracking data
   */
  clearTracking(): void {
    this.errorCounts.clear();
    this.lastErrorTime.clear();
  }

  /**
   * Track user error feedback
   */
  trackUserErrorFeedback(errorId: string, feedback: {
    helpful: boolean;
    comment?: string;
    expectedBehavior?: string;
  }): void {
    if (!isFeatureEnabled('enableAnalytics')) {
      return;
    }

    analyticsService.track('error_user_feedback', {
      error_id: errorId,
      feedback_helpful: feedback.helpful,
      feedback_comment: feedback.comment,
      expected_behavior: feedback.expectedBehavior,
    });
  }

  /**
   * Track error resolution by user
   */
  trackErrorResolution(errorId: string, resolution: {
    method: 'retry' | 'refresh' | 'navigate' | 'ignore';
    successful: boolean;
    timeToResolve: number;
  }): void {
    if (!isFeatureEnabled('enableAnalytics')) {
      return;
    }

    analyticsService.track('error_user_resolution', {
      error_id: errorId,
      resolution_method: resolution.method,
      resolution_successful: resolution.successful,
      time_to_resolve_ms: resolution.timeToResolve,
    });
  }
}

// Export singleton instance
export const errorAnalyticsBridge = new ErrorAnalyticsBridge();

// Export convenience functions
export const trackError = (error: AppError): void => {
  errorAnalyticsBridge.trackError(error);
};

export const trackErrorRecovery = (error: AppError, successful: boolean): void => {
  errorAnalyticsBridge.trackErrorRecovery(error, successful);
};

export const trackUserErrorFeedback = (errorId: string, feedback: {
  helpful: boolean;
  comment?: string;
  expectedBehavior?: string;
}): void => {
  errorAnalyticsBridge.trackUserErrorFeedback(errorId, feedback);
};

export const trackErrorResolution = (errorId: string, resolution: {
  method: 'retry' | 'refresh' | 'navigate' | 'ignore';
  successful: boolean;
  timeToResolve: number;
}): void => {
  errorAnalyticsBridge.trackErrorResolution(errorId, resolution);
};

export const getErrorAnalyticsStats = () => {
  return errorAnalyticsBridge.getErrorStats();
};
