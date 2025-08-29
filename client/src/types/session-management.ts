// Session Management Types
export interface SessionResult {
  success: boolean;
  sessionId: string;
  apiSessionId?: string; // For Ask mode, this is the API session ID
  error?: string;
}

export interface ConversationTurn {
  id: string;
  sessionId: string;
  userQuery: string;
  aiResponse: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  citations?: Array<{
    cited_text: string;
    start_index: number;
    end_index: number;
    sources: Array<{
      reference_id: string;
      document_id: string;
      uri: string;
      title: string;
      struct_data?: unknown;
    }>;
  }>;
}

export interface SessionHistory {
  sessionId: string;
  userId: string;
  conversationId?: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'inactive' | 'expired';
  mode: 'ask' | 'investigate';
  totalTurns: number;
  lastTurnAt?: number;
  metadata?: Record<string, unknown>;
  turns?: ConversationTurn[];
}

export interface SessionManagerConfig {
  userId: string;
  mode: 'ask' | 'investigate';
  apiBaseUrl?: string;
  appName?: string;
}

// Abstract Session Manager Interface
export interface SessionManager {
  /**
   * Create a new session for the given conversation
   */
  createSession(
    conversationId: string, 
    metadata?: Record<string, unknown>
  ): Promise<SessionResult>;

  /**
   * Store a conversation turn (user query + AI response)
   */
  storeConversationTurn(
    sessionId: string,
    userQuery: string,
    aiResponse: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Get session history for the user
   */
  getSessionHistory(sessionId?: string): Promise<SessionHistory[]>;

  /**
   * Get a specific session with its turns
   */
  getSessionWithTurns(sessionId: string): Promise<SessionHistory | null>;

  /**
   * End/deactivate a session
   */
  endSession(sessionId: string): Promise<void>;

  /**
   * Update session metadata
   */
  updateSessionMetadata(
    sessionId: string, 
    metadata: Record<string, unknown>
  ): Promise<void>;

  /**
   * Get session count for the user
   */
  getSessionCount(): Promise<number>;
}

// Database Models for Ask Mode
export interface AskSessionRecord {
  session_id: string;
  user_id: string;
  conversation_id?: string;
  api_session_id: string; // The session ID from /ask/session API
  title?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'expired';
  session_metadata: Record<string, unknown>;
  total_queries: number;
  last_query_at?: string;
}

export interface AskConversationTurnRecord {
  id: string;
  session_id: string;
  user_query: string;
  ai_response: string;
  created_at: string;
  metadata: Record<string, unknown>;
  citations?: Array<{
    cited_text: string;
    start_index: number;
    end_index: number;
    sources: Array<{
      reference_id: string;
      document_id: string;
      uri: string;
      title: string;
      struct_data?: unknown;
    }>;
  }>;
}

// API Response Types for Ask Mode Storage
export interface CreateAskSessionResponse {
  session_id: string;
  user_id: string;
  created_at: string;
  status: string;
}

export interface StoreConversationTurnResponse {
  turn_id: string;
  session_id: string;
  created_at: string;
}

export interface GetSessionHistoryResponse {
  sessions: AskSessionRecord[];
  total_count: number;
}

export interface GetSessionWithTurnsResponse {
  session: AskSessionRecord;
  turns: AskConversationTurnRecord[];
}
