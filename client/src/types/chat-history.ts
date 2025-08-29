/**
 * Unified Chat History Types
 * Supports both Ask mode and Investigate mode sessions
 */

export interface UnifiedChatHistory {
  sessionId: string;
  userId: string;
  title: string;
  mode: 'ask' | 'investigate';
  lastUpdated: number; // timestamp
  createdAt: number; // timestamp
  messageCount?: number;
  status: 'active' | 'inactive' | 'expired';
  
  // Mode-specific data
  apiSessionId?: string; // For investigate mode
  conversationId?: string; // For ask mode
  
  // Additional metadata
  metadata?: Record<string, unknown>;
  
  // For UI display
  lastMessage?: string;
  totalTurns?: number;
}

export interface ChatHistoryBatch {
  askSessions: UnifiedChatHistory[];
  investigateSessions: UnifiedChatHistory[];
  hasMoreAsk: boolean;
  hasMoreInvestigate: boolean;
  totalAsk: number;
  totalInvestigate: number;
}

export interface ChatHistoryCache {
  data: UnifiedChatHistory[];
  timestamp: number;
  askOffset: number;
  investigateOffset: number;
  hasMoreAsk: boolean;
  hasMoreInvestigate: boolean;
}

export interface ChatHistoryState {
  // Main history data
  unifiedHistory: UnifiedChatHistory[];
  
  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  
  // Pagination state
  askOffset: number;
  investigateOffset: number;
  hasMoreAsk: boolean;
  hasMoreInvestigate: boolean;
  
  // Error handling
  error: string | null;
  fallbackMode: boolean; // Using localStorage as fallback
  
  // Cache metadata
  lastFetched: number | null;
  cacheValid: boolean;
}

export interface LoadHistoryOptions {
  userId: string;
  limit?: number; // per mode (default: 10)
  refresh?: boolean; // force refresh cache
  append?: boolean; // for load more functionality
}

export interface HistoryLoadResult {
  success: boolean;
  data?: UnifiedChatHistory[];
  hasMore?: boolean;
  error?: string;
  fromCache?: boolean;
  fallbackUsed?: boolean;
}

// API Response types for mapping
export interface AskSessionHistoryItem {
  session_id: string;
  user_id: string;
  api_session_id: string; // This is required in the API response
  conversation_id?: string;
  title?: string;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
  last_query_at?: string;
  total_queries: number;
  session_metadata?: Record<string, unknown>;
}

export interface InvestigateSessionHistoryItem {
  id: string; // This is the actual field name from the API
  userId: string;
  appName: string;
  state: Record<string, unknown>;
  events: unknown[];
  lastUpdateTime: number; // This is a timestamp, not a string
}

// Utility types
export type HistoryMode = 'ask' | 'investigate' | 'all';
export type SortOrder = 'newest' | 'oldest';
export type HistoryFilter = {
  mode?: HistoryMode;
  status?: 'active' | 'inactive' | 'expired';
  dateRange?: {
    start: number;
    end: number;
  };
};
