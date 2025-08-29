import { CHAT_ERRORS, CHAT_CONSTANTS } from '../constants/chat';

export interface StoreError {
  message: string;
  code?: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface ErrorState {
  lastError: string | null;
  isConnected: boolean;
  isReconnecting: boolean;
}

/**
 * Standardized error handling utility for stores
 */
export class StoreErrorHandler {
  /**
   * Extract error message from various error types
   */
  static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return CHAT_ERRORS.UNKNOWN_ERROR;
  }

  /**
   * Create a standardized error object
   */
  static createError(
    error: unknown,
    code?: string,
    context?: Record<string, unknown>
  ): StoreError {
    return {
      message: this.extractErrorMessage(error),
      code,
      timestamp: Date.now(),
      context,
    };
  }

  /**
   * Log error with consistent formatting
   */
  static logError(
    operation: string,
    error: unknown,
    context?: Record<string, unknown>
  ): void {
    const errorMessage = this.extractErrorMessage(error);
    console.error(`[StoreError] ${operation}:`, {
      error: errorMessage,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle async operation with standardized error handling
   */
  static async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, unknown>
  ): Promise<{ success: true; data: T } | { success: false; error: StoreError }> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      this.logError(operationName, error, context);
      return {
        success: false,
        error: this.createError(error, undefined, context),
      };
    }
  }

  /**
   * Update error state in store draft
   */
  static updateErrorState(
    draft: { connection: ErrorState },
    error: string | null
  ): void {
    draft.connection.lastError = error;
    draft.connection.isConnected = !error;
  }

  /**
   * Clear error after delay
   */
  static scheduleErrorClear(
    clearFunction: () => void,
    delay: number = CHAT_CONSTANTS.ERROR_AUTO_CLEAR_DELAY
  ): NodeJS.Timeout {
    return setTimeout(clearFunction, delay);
  }

  /**
   * Validate required parameters
   */
  static validateRequired(
    params: Record<string, unknown>,
    requiredFields: string[]
  ): void {
    const missing = requiredFields.filter(field => !params[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }
  }

  /**
   * Handle authentication errors specifically
   */
  static handleAuthError(error: unknown): StoreError {
    const errorMessage = this.extractErrorMessage(error);
    
    // Check if it's an authentication-related error
    if (errorMessage.toLowerCase().includes('auth') || 
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('forbidden')) {
      return this.createError(CHAT_ERRORS.NO_AUTH_USER, 'AUTH_ERROR');
    }
    
    return this.createError(error);
  }

  /**
   * Handle network errors specifically
   */
  static handleNetworkError(error: unknown): StoreError {
    const errorMessage = this.extractErrorMessage(error);
    
    // Check if it's a network-related error
    if (errorMessage.toLowerCase().includes('network') ||
        errorMessage.toLowerCase().includes('fetch') ||
        errorMessage.toLowerCase().includes('connection')) {
      return this.createError(CHAT_ERRORS.NETWORK_ERROR, 'NETWORK_ERROR');
    }
    
    return this.createError(error);
  }
}

/**
 * Decorator for async store actions to add consistent error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  operationName: string,
  context?: Record<string, unknown>
) {
  return function (
    // target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        StoreErrorHandler.logError(operationName, error, {
          ...context,
          method: propertyKey,
          args: args.length,
        });
        throw error;
      }
    };

    return descriptor;
  };
}
