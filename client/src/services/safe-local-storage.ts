/**
 * Safe Local Storage Service
 * 
 * This utility provides safe methods to interact with localStorage,
 * with proper error handling and fallbacks to prevent 500 errors.
 */

import { logger } from '../lib/logger';

/**
 * Safe wrapper for localStorage.getItem that never throws errors
 * @param key Storage key
 * @param defaultValue Default value to return if key not found or localStorage fails
 */
export function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      return defaultValue;
    }

    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    
    return JSON.parse(item) as T;
  } catch (err) {
    logger.warn('Failed to get item from localStorage', { 
      key, 
      error: err instanceof Error ? err.message : String(err)
    });
    return defaultValue;
  }
}

/**
 * Safe wrapper for localStorage.setItem that never throws errors
 * @param key Storage key
 * @param value Value to store
 * @returns true if successful, false otherwise
 */
export function safeSetItem(key: string, value: unknown): boolean {
  try {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      return false;
    }

    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    logger.warn('Failed to set item in localStorage', { 
      key, 
      error: err instanceof Error ? err.message : String(err)
    });
    return false;
  }
}

/**
 * Safe wrapper for localStorage.removeItem that never throws errors
 * @param key Storage key to remove
 * @returns true if successful, false otherwise
 */
export function safeRemoveItem(key: string): boolean {
  try {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      return false;
    }

    localStorage.removeItem(key);
    return true;
  } catch (err) {
    logger.warn('Failed to remove item from localStorage', { 
      key, 
      error: err instanceof Error ? err.message : String(err)
    });
    return false;
  }
}

/**
 * Check if localStorage is available in the current environment
 * @returns true if localStorage is available, false otherwise
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, testKey);
    const result = localStorage.getItem(testKey) === testKey;
    localStorage.removeItem(testKey);
    return result;
  } catch (_err) {
    return false;
  }
}

// Export all functions as a single object for convenience
/**
 * Unified safeLocalStorage object with all methods
 */
export const safeLocalStorage = {
  getItem: safeGetItem,
  setItem: safeSetItem,
  removeItem: safeRemoveItem,
  isAvailable: isLocalStorageAvailable
};

export default safeLocalStorage;
