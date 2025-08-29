import type {
  UnifiedChatHistory,
  ChatHistoryCache,
  LoadHistoryOptions,
  HistoryLoadResult,
  AskSessionHistoryItem,
  InvestigateSessionHistoryItem,
} from '../types/chat-history';
import { askSessionStorage } from './ask-session-storage';
import { chatAPI } from './chat-api';
import { localStorageService } from './local-storage';
import { sessionDetailCache } from './session-detail-cache';
import { logger } from '../lib/logger';
import { appConfig } from '../config/app-config';
import { EVENT_NAMES, DEFAULTS } from '../constants';
import { dispatchErrorEvent } from '../core/error-handling';

/**
 * Unified Chat History Service
 * Handles fetching, merging, and caching of both Ask and Investigate mode sessions
 */
class ChatHistoryService {
  private cache = new Map<string, ChatHistoryCache>();
  private readonly CACHE_TTL = appConfig.storage.cacheTimeout;
  private readonly DEFAULT_LIMIT = 10;
  private listeners = new Set<(userId: string, sessions: UnifiedChatHistory[]) => void>();

  /**
   * Load initial chat history (10 Ask + 10 Investigate sessions)
   */
  async loadInitialHistory(options: LoadHistoryOptions): Promise<HistoryLoadResult> {
    const { userId, limit = this.DEFAULT_LIMIT, refresh = false } = options;
    
    logger.info('Loading initial history', { userId, limit, refresh });
    
    try {
      // Check cache first (unless refresh is requested)
      if (!refresh) {
        const cached = this.getCachedHistory(userId);
        if (cached && this.isCacheValid(cached)) {
          logger.info('Using cached history', { sessionCount: cached.data.length });
          return {
            success: true,
            data: cached.data,
            hasMore: cached.hasMoreAsk || cached.hasMoreInvestigate,
            fromCache: true,
          };
        }
      }

      logger.info('Fetching fresh data from APIs');

      // Fetch from both APIs concurrently
      const [askResult, investigateResult] = await Promise.allSettled([
        this.fetchAskSessions(userId, 0, limit),
        this.fetchInvestigateSessions(userId, 0, limit),
      ]);

      logger.info('API Results', {
        askStatus: askResult.status,
        askError: askResult.status === 'rejected' ? askResult.reason : null,
        investigateStatus: investigateResult.status,
        investigateError: investigateResult.status === 'rejected' ? investigateResult.reason : null,
      });

      // Process results
      const askSessions = askResult.status === 'fulfilled' ? askResult.value.sessions : [];
      const investigateSessions = investigateResult.status === 'fulfilled' ? investigateResult.value.sessions : [];
      
      const hasMoreAsk = askResult.status === 'fulfilled' ? askResult.value.hasMore : false;
      const hasMoreInvestigate = investigateResult.status === 'fulfilled' ? investigateResult.value.hasMore : false;

      logger.info('Session counts', {
        askSessions: askSessions.length,
        investigateSessions: investigateSessions.length,
        hasMoreAsk,
        hasMoreInvestigate
      });

      // Merge and sort by lastUpdated
      const mergedSessions = this.mergeAndSortSessions(askSessions, investigateSessions);

      logger.info('Merged sessions', { 
        count: mergedSessions.length, 
        sessions: mergedSessions.map(s => ({
          sessionId: s.sessionId,
          mode: s.mode,
          title: s.title,
          lastUpdated: new Date(s.lastUpdated).toISOString()
        }))
      });

      // Update cache
      this.updateCache(userId, {
        data: mergedSessions,
        timestamp: Date.now(),
        askOffset: limit,
        investigateOffset: limit,
        hasMoreAsk,
        hasMoreInvestigate,
      });

      return {
        success: true,
        data: mergedSessions,
        hasMore: hasMoreAsk || hasMoreInvestigate,
      };

    } catch (error) {
      logger.error('Failed to load initial history', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined 
      });
      
      // Attempt fallback to localStorage with error handling
      try {
        const fallbackData = this.getFallbackHistory();
        logger.info('Using fallback data from localStorage', { count: fallbackData.length });
        
        return {
          success: false,
          data: fallbackData,
          error: error instanceof Error ? error.message : 'Failed to load history',
          fallbackUsed: true,
        };
      } catch (fallbackError) {
        // If even the fallback fails, return an empty array but don't crash
        logger.error('Fallback mechanism also failed', { 
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) 
        });
        
        return {
          success: false,
          data: [],
          error: 'Failed to load history and fallback also failed',
          fallbackUsed: false,
        };
      }
    }
  }

  /**
   * Load more chat history (pagination)
   */
  async loadMoreHistory(options: LoadHistoryOptions): Promise<HistoryLoadResult> {
    const { userId, limit = this.DEFAULT_LIMIT } = options;
    
    try {
      const cached = this.getCachedHistory(userId);
      if (!cached) {
        // If no cache, load initial history instead
        return this.loadInitialHistory(options);
      }

      const promises: Promise<{ sessions: UnifiedChatHistory[]; hasMore: boolean }>[] = [];
      
      // Fetch more Ask sessions if available
      if (cached.hasMoreAsk) {
        promises.push(this.fetchAskSessions(userId, cached.askOffset, limit));
      }
      
      // Fetch more Investigate sessions if available
      if (cached.hasMoreInvestigate) {
        promises.push(this.fetchInvestigateSessions(userId, cached.investigateOffset, limit));
      }

      if (promises.length === 0) {
        // No more data to load
        return {
          success: true,
          data: cached.data,
          hasMore: false,
        };
      }

      const results = await Promise.allSettled(promises);
      
      let newAskSessions: UnifiedChatHistory[] = [];
      let newInvestigateSessions: UnifiedChatHistory[] = [];
      let hasMoreAsk = cached.hasMoreAsk;
      let hasMoreInvestigate = cached.hasMoreInvestigate;
      let askOffset = cached.askOffset;
      let investigateOffset = cached.investigateOffset;

      // Process results based on what was fetched
      let resultIndex = 0;
      
      if (cached.hasMoreAsk) {
        const askResult = results[resultIndex++];
        if (askResult.status === 'fulfilled') {
          newAskSessions = askResult.value.sessions;
          hasMoreAsk = askResult.value.hasMore;
          askOffset += limit;
        }
      }
      
      if (cached.hasMoreInvestigate) {
        const investigateResult = results[resultIndex];
        if (investigateResult.status === 'fulfilled') {
          newInvestigateSessions = investigateResult.value.sessions;
          hasMoreInvestigate = investigateResult.value.hasMore;
          investigateOffset += limit;
        }
      }

      // Merge new sessions with existing data
      const allNewSessions = [...newAskSessions, ...newInvestigateSessions];
      const mergedData = this.mergeAndSortSessions(cached.data, allNewSessions);

      // Update cache
      this.updateCache(userId, {
        data: mergedData,
        timestamp: Date.now(),
        askOffset,
        investigateOffset,
        hasMoreAsk,
        hasMoreInvestigate,
      });

      return {
        success: true,
        data: mergedData,
        hasMore: hasMoreAsk || hasMoreInvestigate,
      };

    } catch (error) {
      logger.error('Failed to load more history', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // If we have cached data, still return it despite the error
      const cached = this.getCachedHistory(userId);
      if (cached && cached.data && cached.data.length > 0) {
        logger.info('Returning cached data despite load more failure', { count: cached.data.length });
        return {
          success: false,
          data: cached.data,
          error: error instanceof Error ? error.message : 'Failed to load more history',
          hasMore: false,
          fromCache: true
        };
      }
      
      // Last resort fallback
      try {
        const fallbackData = this.getFallbackHistory();
        return {
          success: false,
          data: fallbackData,
          error: error instanceof Error ? error.message : 'Failed to load more history',
          fallbackUsed: true
        };
      } catch {
        // If even the fallback fails, return an empty array
        return {
          success: false,
          data: [],
          error: 'Failed to load more history and fallback also failed',
        };
      }
    }
  }

  /**
   * Refresh entire history (clear cache and reload)
   */
  async refreshHistory(userId: string): Promise<HistoryLoadResult> {
    this.clearCache(userId);
    return this.loadInitialHistory({ userId, refresh: true });
  }

  /**
   * Fetch Ask mode sessions with smart caching
   */
  private async fetchAskSessions(
    userId: string, 
    offset: number, 
    limit: number
  ): Promise<{ sessions: UnifiedChatHistory[]; hasMore: boolean }> {
    logger.info('Fetching Ask sessions', { userId, offset, limit });
    logger.debug('Ask API URL', { url: `${import.meta.env.VITE_API_BASE_URL}/ask/ask-sessions?user_id=${encodeURIComponent(userId)}&limit=${limit}&offset=${offset}` });
    
    try {
      // First, get the session list
      const result = await askSessionStorage.getSessionHistory(userId, limit, offset);
      
      logger.info('Ask sessions API raw result', { 
        success: result.success, 
        error: result.error,
        dataExists: !!result.data,
        rawData: result.data
      });
      
      if (!result.success) {
        logger.error('Ask sessions API returned failure', { error: result.error });
        throw new Error(result.error || 'Ask sessions API returned failure');
      }

      if (!result.data) {
        logger.error('Ask sessions API returned no data');
        throw new Error('Ask sessions API returned no data');
      }

      // Extract sessions using our helper
      const sessionList = this.safelyExtractData<AskSessionHistoryItem>(result.data, 'sessions');
      
      if (sessionList) {
        logger.info('Sessions found in API response', { count: sessionList.length });
      } else {
        // Log the actual structure to understand what we're getting
        logger.error('Ask sessions API data missing sessions array', { 
          dataKeys: result.data ? Object.keys(result.data) : [],
          dataType: typeof result.data,
          dataValue: result.data,
          rawResult: result
        });
        
        throw new Error('Ask sessions API data missing sessions array');
      }
      const hasMore = sessionList.length === limit;

      logger.info('Ask sessions processing', { 
        sessionCount: sessionList.length,
        hasMore,
        sessions: sessionList.map((s: AskSessionHistoryItem) => ({
          session_id: s.session_id,
          title: s.title,
          total_queries: s.total_queries,
          created_at: s.created_at
        }))
      });

      // Map sessions to unified format
      const sessions = sessionList.map((session: AskSessionHistoryItem) => {
        try {
          const unified = this.mapAskSessionToUnified(session);
          logger.debug('Successfully mapped Ask session', {
            original: { session_id: session.session_id, title: session.title },
            unified: { sessionId: unified.sessionId, title: unified.title, mode: unified.mode }
          });
          return unified;
        } catch (mappingError) {
          logger.error('Failed to map Ask session', { 
            session: session, 
            error: mappingError 
          });
          throw mappingError;
        }
      });

      logger.info('Final Ask sessions mapped successfully', { 
        count: sessions.length, 
        sessions: sessions.map((s: UnifiedChatHistory) => ({ 
          sessionId: s.sessionId, 
          title: s.title, 
          mode: s.mode,
          lastUpdated: new Date(s.lastUpdated).toISOString()
        }))
      });

      return { sessions, hasMore };

    } catch (error) {
      logger.error('Error in fetchAskSessions', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Fetch Investigate mode sessions with lazy loading (no details upfront)
   */
  private async fetchInvestigateSessions(
    userId: string, 
    offset: number, 
    limit: number
  ): Promise<{ sessions: UnifiedChatHistory[]; hasMore: boolean }> {
    // First, get the session list
    const result = await chatAPI.listSessions(userId);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch Investigate sessions');
    }

    if (!result.data) {
      logger.error('Investigate sessions API returned no data');
      throw new Error('Failed to fetch Investigate sessions: no data returned');
    }

    // Get sessions array using our helper or directly from result.data
    const allSessions = this.safelyExtractData<unknown>(result.data, 'sessions') || result.data;
                        
    if (!allSessions || !Array.isArray(allSessions)) {
      logger.error('Investigate sessions data structure unexpected', { 
        dataType: typeof result.data,
        isArray: Array.isArray(result.data),
        rawData: JSON.stringify(result.data).substring(0, 200) + '...' 
      });
      throw new Error('Failed to fetch Investigate sessions: invalid data structure');
    }

    // Apply pagination manually since the API doesn't support it yet
    const paginatedSessions = allSessions.slice(offset, offset + limit);
    const hasMore = offset + limit < allSessions.length;

    // Cast ChatSession to InvestigateSessionHistoryItem with safe type handling
    const investigateSessions: InvestigateSessionHistoryItem[] = paginatedSessions.map(session => {
      // Make sure we safely access potentially undefined properties
      const safeSession = session as Record<string, unknown>;
      return {
        id: String(safeSession.id || ''),
        userId: String(safeSession.userId || userId),
        appName: String(safeSession.appName || 'moe_support_agent'),
        state: typeof safeSession.state === 'object' && safeSession.state !== null 
          ? safeSession.state as Record<string, unknown> 
          : {},
        events: Array.isArray(safeSession.events) ? safeSession.events : [],
        lastUpdateTime: Number(safeSession.lastUpdateTime || Date.now() / 1000),
      };
    });

    // Map sessions to unified format WITHOUT fetching details (lazy loading)
    const sessions = investigateSessions.map(session => 
      this.mapInvestigateSessionToUnified(session)
    );

    return { sessions, hasMore };
  }

  /**
   * Fetch Ask session detail
   */
  private async fetchAskSessionDetail(sessionId: string, userId: string) {
    try {
      const result = await askSessionStorage.getSessionWithTurns(sessionId, userId);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      logger.error('Failed to fetch Ask session detail', { sessionId, error });
      return null;
    }
  }

  /**
   * Fetch Investigate session detail
   */
  private async fetchInvestigateSessionDetail(sessionId: string, userId: string) {
    try {
      const result = await chatAPI.getSession(userId, sessionId);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      logger.error('Failed to fetch Investigate session detail', { sessionId, error });
      return null;
    }
  }

  /**
   * Map Ask session to unified format with enhanced details
   */
  private mapAskSessionToUnifiedWithDetails = (
    session: AskSessionHistoryItem, 
    details?: { session: unknown; turns: unknown[] }
  ): UnifiedChatHistory => {
    const base = this.mapAskSessionToUnified(session);
    
    if (details && details.turns) {
      base.messageCount = details.turns.length;
      base.totalTurns = details.turns.length;
      
      // Get last message from turns
      if (details.turns.length > 0) {
        const lastTurn = details.turns[details.turns.length - 1] as { user_query?: string };
        base.lastMessage = lastTurn.user_query;
      }
    }
    
    return base;
  };

  /**
   * Map Investigate session to unified format with enhanced details
   */
  private mapInvestigateSessionToUnifiedWithDetails = (
    session: InvestigateSessionHistoryItem,
    details?: Record<string, unknown>
  ): UnifiedChatHistory => {
    const base = this.mapInvestigateSessionToUnified(session);
    
    if (details) {
      // Extract message count and other details from the full session
      if (Array.isArray(details.messages)) {
        base.messageCount = details.messages.length;
        
        // Get last message
        if (details.messages.length > 0) {
          const lastMessage = details.messages[details.messages.length - 1] as { content?: string };
          base.lastMessage = lastMessage.content;
        }
      }
      
      // Update title if available
      if (typeof details.title === 'string') {
        base.title = details.title;
      }
    }
    
    return base;
  };

  /**
   * Map Ask session to unified format
   */
  private mapAskSessionToUnified = (session: AskSessionHistoryItem): UnifiedChatHistory => {
    // Use the session title if available, otherwise fall back to a meaningful default
    let title = session.title;
    if (!title || title.trim() === '' || title === 'Ask Session') {
      title = 'Ask Session'; // Will be updated with first query when available
    }

    return {
      sessionId: session.session_id,
      userId: session.user_id,
      title: title,
      mode: 'ask',
      lastUpdated: new Date(session.updated_at).getTime(),
      createdAt: new Date(session.created_at).getTime(),
      messageCount: session.total_queries,
      status: session.status,
      conversationId: session.conversation_id,
      metadata: session.session_metadata,
      totalTurns: session.total_queries,
    };
  };

  /**
   * Map Investigate session to unified format
   */
  private mapInvestigateSessionToUnified = (session: InvestigateSessionHistoryItem): UnifiedChatHistory => {
    // Try to extract a meaningful title from the session state or events
    let title = 'Investigate Session'; // Default fallback
    
    // Try to get title from session state
    if (session.state && typeof session.state === 'object') {
      const state = session.state as Record<string, unknown>;
      if (state.title && typeof state.title === 'string') {
        title = state.title;
      } else if (state.firstMessage && typeof state.firstMessage === 'string') {
        // Use first message as title if available
        title = state.firstMessage.length > 50 
          ? state.firstMessage.substring(0, 47) + '...' 
          : state.firstMessage;
      }
    }
    
    // Try to extract from events if no title found
    if (title === 'Investigate Session' && Array.isArray(session.events) && session.events.length > 0) {
      const firstEvent = session.events[0] as Record<string, unknown>;
      if (firstEvent && firstEvent.message && typeof firstEvent.message === 'string') {
        title = firstEvent.message.length > 50 
          ? firstEvent.message.substring(0, 47) + '...' 
          : firstEvent.message;
      }
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      title: title,
      mode: 'investigate',
      lastUpdated: session.lastUpdateTime * 1000, // Convert to milliseconds
      createdAt: session.lastUpdateTime * 1000, // Use lastUpdateTime as createdAt since we don't have separate createdAt
      status: 'active', // Default to active since we don't have status in the API response
      apiSessionId: session.id,
      metadata: session.state,
    };
  };

  /**
   * Merge and sort sessions by lastUpdated (newest first)
   */
  private mergeAndSortSessions(...sessionArrays: UnifiedChatHistory[][]): UnifiedChatHistory[] {
    const allSessions = sessionArrays.flat();
    return allSessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
  }

  /**
   * Get cached history for user
   */
  private getCachedHistory(userId: string): ChatHistoryCache | null {
    return this.cache.get(userId) || null;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(cache: ChatHistoryCache): boolean {
    return Date.now() - cache.timestamp < this.CACHE_TTL;
  }

  /**
   * Update cache for user
   */
  private updateCache(userId: string, cache: ChatHistoryCache): void {
    this.cache.set(userId, cache);
  }

  /**
   * Clear cache for user
   */
  private clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get fallback history from localStorage
   */
  private getFallbackHistory(): UnifiedChatHistory[] {
    try {
      // First check if localStorage service is available
      if (!localStorageService) {
        logger.warn('LocalStorageService is not available for fallback');
        return [];
      }

      // Safely load data with error handling
      const storedData = localStorageService.loadStoredData();
      
      // Check if we have valid conversation data
      if (!storedData || !storedData.conversations) {
        logger.warn('No valid conversations found in localStorage');
        return [];
      }
      
      // Safely extract conversations with null checks
      const conversations = Object.values(storedData.conversations || {});
      
      logger.info('Found fallback conversations in localStorage', { count: conversations.length });
      
      // Map with additional null/undefined checks
      return conversations
        .filter(conv => !!conv) // Filter out null/undefined
        .map(conv => ({
          sessionId: conv.id || `fallback-${Date.now()}`,
          userId: (conv.session && conv.session.userId) || 'unknown',
          title: conv.title || 'Untitled Conversation',
          mode: conv.mode || 'investigate',
          lastUpdated: conv.updatedAt || Date.now(),
          createdAt: conv.createdAt || Date.now(),
          messageCount: conv.messageCount || 0,
          status: 'inactive' as const,
          apiSessionId: (conv.session && conv.session.apiSessionId) || undefined,
          conversationId: conv.id || `fallback-${Date.now()}`,
          lastMessage: conv.lastMessage || '',
        }));
    } catch (error) {
      logger.error('Failed to load fallback history', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }

  /**
   * Load session details on-demand (when user clicks on a session)
   */
  async loadSessionDetails(sessionId: string, userId: string, mode: 'ask' | 'investigate'): Promise<HistoryLoadResult> {
    try {
      // Check cache first
      const cachedDetail = sessionDetailCache.getSessionDetail(sessionId);
      if (cachedDetail) {
        // Convert cached detail to unified format
        let unifiedSession: UnifiedChatHistory;
        
        if (mode === 'ask' && 'session' in cachedDetail) {
          // Ask mode cached detail
          const askDetail = cachedDetail as { session: AskSessionHistoryItem; turns: unknown[] };
          unifiedSession = this.mapAskSessionToUnifiedWithDetails(askDetail.session, askDetail);
        } else if (mode === 'investigate' && 'id' in cachedDetail) {
          // Investigate mode cached detail
          const investigateDetail = cachedDetail as unknown as Record<string, unknown>;
          const basicSession: InvestigateSessionHistoryItem = {
            id: sessionId,
            userId: userId,
            appName: 'moe_support_agent',
            state: typeof investigateDetail.state === 'object' && investigateDetail.state !== null
              ? investigateDetail.state as Record<string, unknown>
              : {},
            events: investigateDetail.events as unknown[] || [],
            lastUpdateTime: investigateDetail.lastUpdateTime as number || Date.now() / 1000,
          };
          unifiedSession = this.mapInvestigateSessionToUnifiedWithDetails(basicSession, investigateDetail);
        } else {
          // Fallback for mismatched cache
          return {
            success: false,
            error: 'Cached session detail format mismatch',
          };
        }
        
        return {
          success: true,
          data: [unifiedSession],
          fromCache: true,
        };
      }

      let sessionDetail: unknown = null;

      if (mode === 'ask') {
        sessionDetail = await this.fetchAskSessionDetail(sessionId, userId);
      } else {
        sessionDetail = await this.fetchInvestigateSessionDetail(sessionId, userId);
      }

      if (!sessionDetail) {
        return {
          success: false,
          error: `Failed to load ${mode} session details`,
        };
      }

      // Cache the result with proper typing
      if (mode === 'ask') {
        // For Ask mode, we need to cast to the expected AskSessionRecord format
        const askDetail = sessionDetail as { session: AskSessionHistoryItem; turns: unknown[] };
        const cacheData = {
          session: {
            ...askDetail.session,
            api_session_id: askDetail.session.api_session_id || '', // Ensure required field is present
          },
          turns: askDetail.turns as unknown[],
        };
        sessionDetailCache.cacheSessionDetail(sessionId, cacheData as { session: import('../types/session-management').AskSessionRecord; turns: import('../types/session-management').AskConversationTurnRecord[] }, mode);
      } else {
        // For Investigate mode, cast to ChatSession
        sessionDetailCache.cacheSessionDetail(sessionId, sessionDetail as import('./chat-api').ChatSession, mode);
      }

      // Convert to unified format based on mode
      let unifiedSession: UnifiedChatHistory;
      
      if (mode === 'ask') {
        // For Ask mode, we need to find the original session info and enhance it
        const askDetail = sessionDetail as { session: AskSessionHistoryItem; turns: unknown[] };
        unifiedSession = this.mapAskSessionToUnifiedWithDetails(askDetail.session, askDetail);
      } else {
        // For Investigate mode, create enhanced session from detail
        const investigateDetail = sessionDetail as unknown as Record<string, unknown>;
        // We need to reconstruct the basic session info from the detail
        const basicSession: InvestigateSessionHistoryItem = {
          id: sessionId,
          userId: userId,
          appName: 'moe_support_agent',
          state: typeof investigateDetail.state === 'object' && investigateDetail.state !== null
            ? investigateDetail.state as Record<string, unknown>
            : {},
          events: investigateDetail.events as unknown[] || [],
          lastUpdateTime: investigateDetail.lastUpdateTime as number || Date.now() / 1000,
        };
        unifiedSession = this.mapInvestigateSessionToUnifiedWithDetails(basicSession, investigateDetail);
      }

      return {
        success: true,
        data: [unifiedSession],
      };

    } catch (error) {
      logger.error('Failed to load session details', { sessionId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load session details',
      };
    }
  }

  /**
   * Add a new session to the cache instead of invalidating everything
   */
  addSessionToCache(userId: string, session: UnifiedChatHistory): void {
    const cached = this.getCachedHistory(userId);
    if (cached) {
      // Check if session already exists
      const existingIndex = cached.data.findIndex(s => s.sessionId === session.sessionId);
      if (existingIndex >= 0) {
        // Update existing session
        cached.data[existingIndex] = session;
      } else {
        // Add new session at the beginning (most recent first)
        cached.data.unshift(session);
      }
      
      // Update cache timestamp
      cached.timestamp = Date.now();
      this.updateCache(userId, cached);
      
      // Notify listeners of the update
      this.notifyListeners(userId, cached.data);
    } else {
      // If no cache exists, create one with this session
      const newCache: ChatHistoryCache = {
        data: [session],
        timestamp: Date.now(),
        askOffset: 1,
        investigateOffset: 0,
        hasMoreAsk: true,
        hasMoreInvestigate: true,
      };
      this.updateCache(userId, newCache);
      this.notifyListeners(userId, [session]);
    }
  }

  /**
   * Subscribe to cache updates
   */
  subscribe(callback: (userId: string, sessions: UnifiedChatHistory[]) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of cache updates
   */
  private notifyListeners(userId: string, sessions: UnifiedChatHistory[]): void {
    this.listeners.forEach(callback => {
      try {
        callback(userId, sessions);
      } catch (error) {
        logger.error('Error in chat history listener', { error });
      }
    });
  }

  /**
   * Invalidate cache when new conversation is created (fallback method)
   * Use addSessionToCache instead for better performance
   */
  invalidateCache(userId: string): void {
    // Only clear cache if it's older than 5 minutes to prevent excessive refetching
    const cached = this.getCachedHistory(userId);
    if (cached && Date.now() - cached.timestamp > 5 * 60 * 1000) {
      this.clearCache(userId);
    }
  }

  /**
   * Get session from cache by sessionId - used by routing to avoid duplicate API calls
   */
  getSessionFromCache(userId: string, sessionId: string): UnifiedChatHistory | null {
    const cached = this.getCachedHistory(userId);
    if (!cached || !this.isCacheValid(cached)) {
      return null;
    }
    
    return cached.data.find(session => 
      session.sessionId === sessionId || 
      session.conversationId === sessionId ||
      session.apiSessionId === sessionId
    ) || null;
  }

  /**
   * Enhanced session loading with retry logic and proper error handling
   */
  async loadSessionWithRetry(
    sessionId: string, 
    userId: string, 
    mode: 'ask' | 'investigate',
    retryCount = 0
  ): Promise<HistoryLoadResult> {
    const maxRetries = DEFAULTS.RETRY_ATTEMPTS;
    
    try {
      // First check if session exists in cache
      const cachedSession = this.getSessionFromCache(userId, sessionId);
      if (cachedSession) {
        logger.info('Session found in cache', { sessionId, mode });
        return {
          success: true,
          data: [cachedSession],
          fromCache: true,
        };
      }

      // If not in cache, try to load session details
      const result = await this.loadSessionDetails(sessionId, userId, mode);
      
      if (result.success) {
        // Dispatch success event
        dispatchErrorEvent(EVENT_NAMES.CHAT_SESSION_STARTED, {
          message: `Session ${sessionId} loaded successfully`,
          context: { sessionId, mode, userId }
        });
        return result;
      } else {
        // If failed and we have retries left, try again
        if (retryCount < maxRetries) {
          logger.warn(`Session load failed, retrying (${retryCount + 1}/${maxRetries})`, { 
            sessionId, 
            error: result.error 
          });
          
          // Exponential backoff
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.loadSessionWithRetry(sessionId, userId, mode, retryCount + 1);
        } else {
          // All retries exhausted, dispatch error event
          dispatchErrorEvent(EVENT_NAMES.ERROR_OCCURRED, {
            message: `Failed to load session after ${maxRetries} attempts`,
            code: 'SESSION_LOAD_FAILED',
            context: { sessionId, mode, userId, error: result.error }
          });
          
          return result;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Session loading error', { sessionId, mode, error: errorMessage });
      
      // Dispatch error event
      dispatchErrorEvent(EVENT_NAMES.ERROR_OCCURRED, {
        message: `Session loading error: ${errorMessage}`,
        code: 'SESSION_LOAD_ERROR',
        context: { sessionId, mode, userId, error: errorMessage }
      });
      
      return {
        success: false,
        error: errorMessage,
        data: [],
      };
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; users: string[] } {
    return {
      size: this.cache.size,
      users: Array.from(this.cache.keys()),
    };
  }

  /**
   * Safely extract data from potentially nested API responses
   * Handles various API response structures we've encountered
   */
  private safelyExtractData<T>(data: unknown, expectedArrayKey: string): T[] | null {
    if (!data) return null;

    // Case 1: Data is directly an array
    if (Array.isArray(data)) {
      return data as T[];
    }

    // Case 2: Data is an object with the expected array key
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      
      // Direct access: data.sessions
      if (obj[expectedArrayKey] && Array.isArray(obj[expectedArrayKey])) {
        return obj[expectedArrayKey] as T[];
      }
      
      // Nested access: data.data.sessions
      if (obj.data && typeof obj.data === 'object' && obj.data !== null) {
        const nestedObj = obj.data as Record<string, unknown>;
        if (nestedObj[expectedArrayKey] && Array.isArray(nestedObj[expectedArrayKey])) {
          return nestedObj[expectedArrayKey] as T[];
        }
      }
    }

    return null;
  }
}

// Export singleton instance
export const chatHistoryService = new ChatHistoryService();
export { ChatHistoryService };
