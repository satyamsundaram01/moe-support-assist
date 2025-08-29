/**
 * Session Detail Cache Service
 * Handles caching of individual session details in localStorage
 */

import type { AskSessionRecord, AskConversationTurnRecord } from '../types/session-management';
import type { ChatSession } from './chat-api';

// Union type for session details
type SessionDetailData = 
  | { session: AskSessionRecord; turns: AskConversationTurnRecord[] } // Ask mode
  | ChatSession; // Investigate mode

interface SessionDetailCacheItem {
  data: SessionDetailData;
  timestamp: number;
  mode: 'ask' | 'investigate';
}

interface SessionDetailCache {
  [sessionId: string]: SessionDetailCacheItem;
}

class SessionDetailCacheService {
  private readonly CACHE_KEY = 'session_details_cache';
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached sessions

  /**
   * Get cached session detail
   */
  getSessionDetail(sessionId: string): SessionDetailData | null {
    try {
      const cache = this.getCache();
      const item = cache[sessionId];
      
      if (!item) return null;
      
      // Check if cache is still valid
      if (Date.now() - item.timestamp > this.CACHE_TTL) {
        this.removeSessionDetail(sessionId);
        return null;
      }
      
      return item.data;
    } catch (error) {
      console.error('Failed to get cached session detail:', error);
      return null;
    }
  }

  /**
   * Cache session detail
   */
  cacheSessionDetail(sessionId: string, data: SessionDetailData, mode: 'ask' | 'investigate'): void {
    try {
      const cache = this.getCache();
      
      // Add new item
      cache[sessionId] = {
        data,
        timestamp: Date.now(),
        mode,
      };
      
      // Cleanup old items if cache is too large
      this.cleanupCache(cache);
      
      // Save to localStorage
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to cache session detail:', error);
    }
  }

  /**
   * Remove session detail from cache
   */
  removeSessionDetail(sessionId: string): void {
    try {
      const cache = this.getCache();
      delete cache[sessionId];
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to remove cached session detail:', error);
    }
  }

  /**
   * Check if session detail is cached and valid
   */
  isSessionDetailCached(sessionId: string): boolean {
    const detail = this.getSessionDetail(sessionId);
    return detail !== null;
  }

  /**
   * Get multiple cached session details
   */
  getMultipleSessionDetails(sessionIds: string[]): { [sessionId: string]: SessionDetailData } {
    const results: { [sessionId: string]: SessionDetailData } = {};
    
    for (const sessionId of sessionIds) {
      const detail = this.getSessionDetail(sessionId);
      if (detail) {
        results[sessionId] = detail;
      }
    }
    
    return results;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; oldestTimestamp: number; newestTimestamp: number } {
    try {
      const cache = this.getCache();
      const items = Object.values(cache);
      
      if (items.length === 0) {
        return { size: 0, oldestTimestamp: 0, newestTimestamp: 0 };
      }
      
      const timestamps = items.map(item => item.timestamp);
      
      return {
        size: items.length,
        oldestTimestamp: Math.min(...timestamps),
        newestTimestamp: Math.max(...timestamps),
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { size: 0, oldestTimestamp: 0, newestTimestamp: 0 };
    }
  }

  /**
   * Clear all cached session details
   */
  clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear session detail cache:', error);
    }
  }

  /**
   * Clear expired cache items
   */
  clearExpiredCache(): void {
    try {
      const cache = this.getCache();
      const now = Date.now();
      let hasChanges = false;
      
      for (const [sessionId, item] of Object.entries(cache)) {
        if (now - item.timestamp > this.CACHE_TTL) {
          delete cache[sessionId];
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.error('Failed to clear expired cache:', error);
    }
  }

  /**
   * Get cache from localStorage
   */
  private getCache(): SessionDetailCache {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('Failed to parse session detail cache:', error);
      return {};
    }
  }

  /**
   * Cleanup cache by removing oldest items if over size limit
   */
  private cleanupCache(cache: SessionDetailCache): void {
    const items = Object.entries(cache);
    
    if (items.length <= this.MAX_CACHE_SIZE) return;
    
    // Sort by timestamp (oldest first)
    items.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    // Remove oldest items
    const itemsToRemove = items.length - this.MAX_CACHE_SIZE;
    for (let i = 0; i < itemsToRemove; i++) {
      delete cache[items[i][0]];
    }
  }
}

// Export singleton instance
export const sessionDetailCache = new SessionDetailCacheService();
export { SessionDetailCacheService };
