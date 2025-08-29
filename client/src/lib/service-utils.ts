/**
 * Service Utilities
 * Common utilities used across different services
 */

import type { APIResponse } from '../types';

/**
 * HTTP Response Utilities
 */
export class ResponseUtils {
  /**
   * Check if response indicates success
   */
  static isSuccess<T>(response: APIResponse<T>): response is APIResponse<T> & { success: true } {
    return response.success;
  }

  /**
   * Extract error message from response
   */
  static getErrorMessage<T>(response: APIResponse<T>): string {
    return response.error || 'Unknown error occurred';
  }

  /**
   * Create success response
   */
  static createSuccess<T>(data: T): APIResponse<T> {
    return {
      success: true,
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * Create error response
   */
  static createError<T>(error: string): APIResponse<T> {
    return {
      success: false,
      error,
      timestamp: Date.now(),
    };
  }
}

/**
 * Retry Utilities
 */
export class RetryUtils {
  /**
   * Execute function with retry logic
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts: number;
      delay: number;
      backoff?: boolean;
    } = { maxAttempts: 3, delay: 1000 }
  ): Promise<T> {
    const { maxAttempts, delay, backoff = false } = options;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxAttempts) {
          throw lastError;
        }

        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await this.wait(waitTime);
      }
    }

    throw lastError!;
  }

  /**
   * Wait for specified time
   */
  private static wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Validation Utilities
 */
export class ValidationUtils {
  /**
   * Validate required fields
   */
  static validateRequired(obj: Record<string, unknown>, fields: string[]): string[] {
    const missing: string[] = [];
    
    for (const field of fields) {
      if (!(field in obj) || obj[field] == null || obj[field] === '') {
        missing.push(field);
      }
    }

    return missing;
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .trim()
      .substring(0, 10000); // Limit length
  }
}

/**
 * Session Utilities
 */
export class SessionUtils {
  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate conversation ID
   */
  static generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate message ID
   */
  static generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if session is expired
   */
  static isSessionExpired(timestamp: number, timeoutMs: number): boolean {
    return Date.now() - timestamp > timeoutMs;
  }
}

/**
 * Data Transformation Utilities
 */
export class DataUtils {
  /**
   * Deep clone object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * Merge objects deeply
   */
  static deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const value = source[key];
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = this.deepMerge(
            result[key] as Record<string, unknown>,
            value as Record<string, unknown>
          ) as T[Extract<keyof T, string>];
        } else {
          result[key] = value as T[Extract<keyof T, string>];
        }
      }
    }

    return result;
  }

  /**
   * Remove undefined values from object
   */
  static removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    
    for (const key in obj) {
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    }

    return result;
  }
}

/**
 * Debounce Utilities
 */
export class DebounceUtils {
  private static timers = new Map<string, NodeJS.Timeout>();

  /**
   * Debounce function execution
   */
  static debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const existingTimer = this.timers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        func(...args);
        this.timers.delete(key);
      }, delay);

      this.timers.set(key, timer);
    };
  }

  /**
   * Clear all debounced functions
   */
  static clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

/**
 * Cache Utilities
 */
export class CacheUtils {
  private static cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

  /**
   * Set cache entry
   */
  static set<T>(key: string, data: T, ttlMs: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Get cache entry
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Clear cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  static clearExpired(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}
