/**
 * Error Handling System
 * Centralized error handling and reporting
 */

import { logger } from '../lib/logger';
import { EVENT_NAMES } from '../constants';

export interface ErrorDetails {
  message: string;
  code?: string;
  component?: string;
  context?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Set up global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  logger.debug('Setting up global error handlers...');

  // Global error handler
  window.addEventListener('error', (event) => {
    const errorDetail = {
      message: event.error?.message || event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    };
    
    logger.error('Global error caught:', errorDetail);
    dispatchErrorEvent('global_error', {
      message: errorDetail.message as string,
      context: errorDetail
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || 'Unknown reason';
    logger.error('Unhandled promise rejection:', { reason });
    
    dispatchErrorEvent('unhandled_rejection', {
      message: reason,
      context: { originalReason: event.reason }
    });
  });

  logger.debug('Global error handlers setup completed');
}

/**
 * Dispatch an error event
 */
export function dispatchErrorEvent(errorType: string, details: ErrorDetails): void {
  const errorEvent = new CustomEvent(EVENT_NAMES.ERROR_OCCURRED, { 
    detail: {
      type: errorType,
      ...details,
      timestamp: details.timestamp || Date.now()
    }
  });
  
  window.dispatchEvent(errorEvent);
}

/**
 * Dispatch a custom application event
 */
export function dispatchCustomEvent(eventName: string, detail: Record<string, unknown>): void {
  const event = new CustomEvent(eventName, { 
    detail: {
      ...detail,
      timestamp: detail.timestamp || Date.now()
    }
  });
  
  window.dispatchEvent(event);
  logger.debug(`Event dispatched: ${eventName}`, { detail });
}