/**
 * Enhanced Logging System
 * Environment-aware logging with structured context and filtering
 */

import { getEnvironmentConfig, isDevelopment } from '../config/environment';
import { isFeatureEnabled } from '../config/feature-flags';

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: LogContext;
  stack?: string;
  category?: string;
}

/**
 * Log categories for better organization
 */
export const LogCategory = {
  API: 'api',
  STORE: 'store',
  COMPONENT: 'component',
  ROUTING: 'routing',
  AUTH: 'auth',
  PERFORMANCE: 'performance',
  ERROR: 'error',
  USER_ACTION: 'user_action',
  SYSTEM: 'system',
} as const;

export type LogCategory = typeof LogCategory[keyof typeof LogCategory];

/**
 * Enhanced Logger class with environment awareness
 */
class EnhancedLogger {
  private logLevel: LogLevel;
  private enableConsole: boolean;
  private enableRemote: boolean;
  private maxEntries: number;
  private logEntries: LogEntry[] = [];
  private remoteEndpoint?: string;

  constructor() {
    const config = getEnvironmentConfig();
    this.logLevel = this.mapLogLevel(config.logging.level);
    this.enableConsole = config.logging.enableConsole;
    this.enableRemote = config.logging.enableRemote;
    this.maxEntries = config.logging.maxEntries;
    
    // Set remote endpoint if available
    if (this.enableRemote) {
      this.remoteEndpoint = process.env.VITE_LOG_ENDPOINT;
    }
  }

  /**
   * Map string log level to enum
   */
  private mapLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  /**
   * Check if logging is enabled for this level
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  /**
   * Format log message for console output
   */
  private formatConsoleMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = Object.keys(LogLevel)[Object.values(LogLevel).indexOf(entry.level)];
    const category = entry.category ? `[${entry.category}]` : '';
    const context = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
    
    return `[${timestamp}] ${levelName}${category}: ${entry.message}${context}`;
  }

  /**
   * Add log entry to internal storage
   */
  private addLogEntry(entry: LogEntry): void {
    this.logEntries.push(entry);
    
    // Maintain max entries limit
    if (this.logEntries.length > this.maxEntries) {
      this.logEntries = this.logEntries.slice(-this.maxEntries);
    }
  }

  /**
   * Send log to remote endpoint
   */
  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.remoteEndpoint || !this.enableRemote) return;

    try {
      await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Fallback to console for remote logging errors
      if (isDevelopment()) {
        console.error('Failed to send log to remote endpoint:', error);
      }
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    category?: LogCategory
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context,
      category,
    };

    // Add stack trace for errors
    if (level === LogLevel.ERROR) {
      entry.stack = new Error().stack;
    }

    // Store entry
    this.addLogEntry(entry);

    // Console output
    if (this.enableConsole) {
      const formattedMessage = this.formatConsoleMessage(entry);
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          if (entry.stack) console.error(entry.stack);
          break;
      }
    }

    // Remote logging (async, non-blocking)
    if (this.enableRemote && level >= LogLevel.WARN) {
      this.sendToRemote(entry).catch(() => {
        // Silent fail for remote logging
      });
    }
  }

  /**
   * Debug logging (development only)
   */
  debug(message: string, context?: LogContext, category?: LogCategory): void {
    this.log(LogLevel.DEBUG, message, context, category);
  }

  /**
   * Info logging
   */
  info(message: string, context?: LogContext, category?: LogCategory): void {
    this.log(LogLevel.INFO, message, context, category);
  }

  /**
   * Warning logging
   */
  warn(message: string, context?: LogContext, category?: LogCategory): void {
    this.log(LogLevel.WARN, message, context, category);
  }

  /**
   * Error logging
   */
  error(message: string, context?: LogContext, category?: LogCategory): void {
    this.log(LogLevel.ERROR, message, context, category);
  }

  /**
   * Performance timing (development only)
   */
  time(label: string): void {
    if (isDevelopment() && isFeatureEnabled('enablePerformanceMetrics')) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (isDevelopment() && isFeatureEnabled('enablePerformanceMetrics')) {
      console.timeEnd(label);
    }
  }

  /**
   * Group logging (development only)
   */
  group(label: string): void {
    if (isDevelopment() && this.enableConsole) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (isDevelopment() && this.enableConsole) {
      console.groupEnd();
    }
  }

  /**
   * Category-specific logging methods
   */
  api = {
    debug: (message: string, context?: LogContext) => this.debug(message, context, LogCategory.API),
    info: (message: string, context?: LogContext) => this.info(message, context, LogCategory.API),
    warn: (message: string, context?: LogContext) => this.warn(message, context, LogCategory.API),
    error: (message: string, context?: LogContext) => this.error(message, context, LogCategory.API),
  };

  store = {
    debug: (message: string, context?: LogContext) => this.debug(message, context, LogCategory.STORE),
    info: (message: string, context?: LogContext) => this.info(message, context, LogCategory.STORE),
    warn: (message: string, context?: LogContext) => this.warn(message, context, LogCategory.STORE),
    error: (message: string, context?: LogContext) => this.error(message, context, LogCategory.STORE),
  };

  component = {
    debug: (message: string, context?: LogContext) => this.debug(message, context, LogCategory.COMPONENT),
    info: (message: string, context?: LogContext) => this.info(message, context, LogCategory.COMPONENT),
    warn: (message: string, context?: LogContext) => this.warn(message, context, LogCategory.COMPONENT),
    error: (message: string, context?: LogContext) => this.error(message, context, LogCategory.COMPONENT),
  };

  routing = {
    debug: (message: string, context?: LogContext) => this.debug(message, context, LogCategory.ROUTING),
    info: (message: string, context?: LogContext) => this.info(message, context, LogCategory.ROUTING),
    warn: (message: string, context?: LogContext) => this.warn(message, context, LogCategory.ROUTING),
    error: (message: string, context?: LogContext) => this.error(message, context, LogCategory.ROUTING),
  };

  auth = {
    debug: (message: string, context?: LogContext) => this.debug(message, context, LogCategory.AUTH),
    info: (message: string, context?: LogContext) => this.info(message, context, LogCategory.AUTH),
    warn: (message: string, context?: LogContext) => this.warn(message, context, LogCategory.AUTH),
    error: (message: string, context?: LogContext) => this.error(message, context, LogCategory.AUTH),
  };

  performance = {
    debug: (message: string, context?: LogContext) => this.debug(message, context, LogCategory.PERFORMANCE),
    info: (message: string, context?: LogContext) => this.info(message, context, LogCategory.PERFORMANCE),
    warn: (message: string, context?: LogContext) => this.warn(message, context, LogCategory.PERFORMANCE),
    error: (message: string, context?: LogContext) => this.error(message, context, LogCategory.PERFORMANCE),
  };

  userAction = {
    debug: (message: string, context?: LogContext) => this.debug(message, context, LogCategory.USER_ACTION),
    info: (message: string, context?: LogContext) => this.info(message, context, LogCategory.USER_ACTION),
    warn: (message: string, context?: LogContext) => this.warn(message, context, LogCategory.USER_ACTION),
    error: (message: string, context?: LogContext) => this.error(message, context, LogCategory.USER_ACTION),
  };

  /**
   * Get all log entries
   */
  getLogEntries(): LogEntry[] {
    return [...this.logEntries];
  }

  /**
   * Get log entries by level
   */
  getLogEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === level);
  }

  /**
   * Get log entries by category
   */
  getLogEntriesByCategory(category: LogCategory): LogEntry[] {
    return this.logEntries.filter(entry => entry.category === category);
  }

  /**
   * Clear all log entries
   */
  clearLogs(): void {
    this.logEntries = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }

  /**
   * Set log level dynamically
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Enable/disable console logging
   */
  setConsoleLogging(enabled: boolean): void {
    this.enableConsole = enabled;
  }

  /**
   * Enable/disable remote logging
   */
  setRemoteLogging(enabled: boolean): void {
    this.enableRemote = enabled;
  }
}

// Export singleton instance
export const logger = new EnhancedLogger();

// Export convenience functions for backward compatibility
export const log = logger;

// Export type-safe logging functions
export const logDebug = (message: string, context?: LogContext, category?: LogCategory) => {
  logger.debug(message, context, category);
};

export const logInfo = (message: string, context?: LogContext, category?: LogCategory) => {
  logger.info(message, context, category);
};

export const logWarn = (message: string, context?: LogContext, category?: LogCategory) => {
  logger.warn(message, context, category);
};

export const logError = (message: string, context?: LogContext, category?: LogCategory) => {
  logger.error(message, context, category);
};
