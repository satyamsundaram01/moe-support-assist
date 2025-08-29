/**
 * Centralized Error Handling System
 * Standardized error handling with recovery mechanisms
 */

import { logger } from '../logging/logger';
import { isFeatureEnabled } from '../config/feature-flags';
import { isDevelopment } from '../config/environment';
import { trackError, trackErrorRecovery } from './error-analytics-bridge';

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];

export const ErrorCategory = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  BUSINESS_LOGIC: 'business_logic',
  SYSTEM: 'system',
  USER_INPUT: 'user_input',
  EXTERNAL_SERVICE: 'external_service',
} as const;

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory];

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  conversationId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface AppError {
  id: string;
  code: string;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context?: ErrorContext;
  originalError?: Error;
  timestamp: number;
  stack?: string;
  recoverable: boolean;
  retryable: boolean;
}

export interface ErrorRecoveryStrategy {
  canRecover: (error: AppError) => boolean;
  recover: (error: AppError) => Promise<boolean>;
  description: string;
}

/**
 * Error Handler class with recovery strategies
 */
class ErrorHandler {
  private errorHistory: AppError[] = [];
  private maxHistorySize = 100;
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private errorListeners: Set<(error: AppError) => void> = new Set();

  constructor() {
    this.setupGlobalErrorHandlers();
    this.registerDefaultRecoveryStrategies();
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.createAppError({
        code: 'UNHANDLED_PROMISE_REJECTION',
        message: event.reason?.message || 'Unhandled promise rejection',
        userMessage: 'An unexpected error occurred. Please try again.',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM,
        originalError: event.reason,
        recoverable: false,
        retryable: true,
      });

      this.handleError(error);
      event.preventDefault();
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      const error = this.createAppError({
        code: 'UNCAUGHT_ERROR',
        message: event.message || 'Uncaught error',
        userMessage: 'An unexpected error occurred. Please refresh the page.',
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SYSTEM,
        originalError: event.error,
        recoverable: false,
        retryable: false,
        context: {
          component: event.filename,
          metadata: {
            line: event.lineno,
            column: event.colno,
          },
        },
      });

      this.handleError(error);
    });
  }

  /**
   * Register default recovery strategies
   */
  private registerDefaultRecoveryStrategies(): void {
    // Network error recovery
    this.addRecoveryStrategy({
      canRecover: (error) => error.category === ErrorCategory.NETWORK && error.retryable,
      recover: async () => {
        // Simple retry logic - could be enhanced with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      },
      description: 'Retry network request after delay',
    });

    // Authentication error recovery
    this.addRecoveryStrategy({
      canRecover: (error) => error.category === ErrorCategory.AUTHENTICATION,
      recover: async (error) => {
        // Redirect to login or refresh token
        if (error.code === 'TOKEN_EXPIRED') {
          // Attempt token refresh
          try {
            // This would integrate with your auth system
            return true;
          } catch {
            // Redirect to login
            window.location.href = '/login';
            return false;
          }
        }
        return false;
      },
      description: 'Refresh authentication token or redirect to login',
    });

    // Validation error recovery
    this.addRecoveryStrategy({
      canRecover: (error) => error.category === ErrorCategory.VALIDATION,
      recover: async () => {
        // Validation errors are typically user-fixable
        return true;
      },
      description: 'Show validation error to user for correction',
    });
  }

  /**
   * Create a standardized AppError
   */
  createAppError(params: {
    code: string;
    message: string;
    userMessage: string;
    severity: ErrorSeverity;
    category: ErrorCategory;
    originalError?: Error;
    context?: ErrorContext;
    recoverable?: boolean;
    retryable?: boolean;
  }): AppError {
    const error: AppError = {
      id: this.generateErrorId(),
      code: params.code,
      message: params.message,
      userMessage: params.userMessage,
      severity: params.severity,
      category: params.category,
      context: params.context,
      originalError: params.originalError,
      timestamp: Date.now(),
      stack: params.originalError?.stack || new Error().stack,
      recoverable: params.recoverable ?? true,
      retryable: params.retryable ?? false,
    };

    return error;
  }

  /**
   * Handle an error with logging and recovery attempts
   */
  async handleError(error: AppError): Promise<boolean> {
    // Add to history
    this.addToHistory(error);

    // Log the error
    this.logError(error);

    // Track error in analytics
    trackError(error);

    // Notify listeners
    this.notifyListeners(error);

    // Attempt recovery if the error is recoverable
    if (error.recoverable) {
      const recovered = await this.attemptRecovery(error);
      
      // Track recovery attempt
      trackErrorRecovery(error, recovered);
      
      if (recovered) {
        logger.info('Error recovered successfully', {
          errorId: error.id,
          code: error.code,
        });
        return true;
      }
    }

    // Send to remote error reporting if enabled
    if (isFeatureEnabled('enableErrorReporting')) {
      this.reportToRemote(error);
    }

    return false;
  }

  /**
   * Attempt to recover from an error
   */
  private async attemptRecovery(error: AppError): Promise<boolean> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error)) {
        try {
          logger.debug('Attempting error recovery', {
            errorId: error.id,
            strategy: strategy.description,
          });

          const recovered = await strategy.recover(error);
          if (recovered) {
            return true;
          }
        } catch (recoveryError) {
          logger.warn('Error recovery strategy failed', {
            errorId: error.id,
            strategy: strategy.description,
            recoveryError: recoveryError instanceof Error ? recoveryError.message : recoveryError,
          });
        }
      }
    }

    return false;
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: AppError): void {
    const context = {
      errorId: error.id,
      code: error.code,
      severity: error.severity,
      category: error.category,
      context: error.context,
      recoverable: error.recoverable,
      retryable: error.retryable,
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        logger.debug(error.message, context);
        break;
      case ErrorSeverity.MEDIUM:
        logger.info(error.message, context);
        break;
      case ErrorSeverity.HIGH:
        logger.warn(error.message, context);
        break;
      case ErrorSeverity.CRITICAL:
        logger.error(error.message, context);
        break;
    }
  }

  /**
   * Add error to history
   */
  private addToHistory(error: AppError): void {
    this.errorHistory.push(error);
    
    // Maintain max history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Notify error listeners
   */
  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        if (isDevelopment()) {
          console.error('Error in error listener:', listenerError);
        }
      }
    });
  }

  /**
   * Report error to remote service
   */
  private async reportToRemote(error: AppError): Promise<void> {
    try {
      const endpoint = process.env.VITE_ERROR_REPORTING_ENDPOINT;
      if (!endpoint) return;

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...error,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: error.timestamp,
        }),
      });
    } catch (reportingError) {
      if (isDevelopment()) {
        console.error('Failed to report error to remote service:', reportingError);
      }
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add recovery strategy
   */
  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  /**
   * Remove recovery strategy
   */
  removeRecoveryStrategy(description: string): void {
    this.recoveryStrategies = this.recoveryStrategies.filter(
      strategy => strategy.description !== description
    );
  }

  /**
   * Subscribe to error events
   */
  subscribe(listener: (error: AppError) => void): () => void {
    this.errorListeners.add(listener);
    
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * Get error history
   */
  getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errorHistory.filter(error => error.severity === severity);
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this.errorHistory.filter(error => error.category === category);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Export error history
   */
  exportHistory(): string {
    return JSON.stringify(this.errorHistory, null, 2);
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export convenience functions
export const handleError = (error: AppError): Promise<boolean> => {
  return errorHandler.handleError(error);
};

export const createError = (params: {
  code: string;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  originalError?: Error;
  context?: ErrorContext;
  recoverable?: boolean;
  retryable?: boolean;
}): AppError => {
  return errorHandler.createAppError(params);
};

export const subscribeToErrors = (listener: (error: AppError) => void): (() => void) => {
  return errorHandler.subscribe(listener);
};

// Common error creators
export const createNetworkError = (message: string, originalError?: Error, context?: ErrorContext): AppError => {
  return createError({
    code: 'NETWORK_ERROR',
    message,
    userMessage: 'Network connection failed. Please check your internet connection and try again.',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.NETWORK,
    originalError,
    context,
    recoverable: true,
    retryable: true,
  });
};

export const createValidationError = (message: string, context?: ErrorContext): AppError => {
  return createError({
    code: 'VALIDATION_ERROR',
    message,
    userMessage: 'Please check your input and try again.',
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.VALIDATION,
    context,
    recoverable: true,
    retryable: false,
  });
};

export const createAuthError = (message: string, context?: ErrorContext): AppError => {
  return createError({
    code: 'AUTH_ERROR',
    message,
    userMessage: 'Authentication failed. Please log in again.',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.AUTHENTICATION,
    context,
    recoverable: true,
    retryable: false,
  });
};
