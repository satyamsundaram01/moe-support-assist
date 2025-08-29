import type { APIResponse } from '../types';
import type {
  AskConversationTurnRecord,
  CreateAskSessionResponse,
  StoreConversationTurnResponse,
  GetSessionHistoryResponse,
  GetSessionWithTurnsResponse,
} from '../types/session-management';

// Configuration - Use your existing backend URL
const STORAGE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Service for managing Ask mode session storage in PostgreSQL
 * This handles the custom database operations for Ask mode sessions
 */
export class AskSessionStorageService {
  private baseURL: string;

  constructor(baseURL: string = STORAGE_API_BASE_URL) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || data.message || `HTTP ${response.status}: ${response.statusText}`,
          timestamp: Date.now(),
        };
      }

      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Create a new Ask session record in the database
   */
  async createAskSession(
    sessionId: string,
    userId: string,
    apiSessionId: string,
    conversationId?: string,
    title?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<APIResponse<CreateAskSessionResponse>> {
    const payload = {
      session_id: sessionId,
      user_id: userId,
      api_session_id: apiSessionId,
      conversation_id: conversationId,
      title,
      session_metadata: metadata,
    };

    return this.request<CreateAskSessionResponse>('/ask/ask-sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Store a conversation turn (user query + AI response)
   */
  async storeConversationTurn(
    sessionId: string,
    userQuery: string,
    aiResponse: string,
    metadata: Record<string, unknown> = {},
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
    }>
  ): Promise<APIResponse<StoreConversationTurnResponse>> {
    const payload = {
      session_id: sessionId,
      user_query: userQuery,
      ai_response: aiResponse,
      metadata,
      citations,
    };

    return this.request<StoreConversationTurnResponse>('/ask/ask-sessions/turns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get session history for a user
   */
  async getSessionHistory(
    userId: string,
    limit = 50,
    offset = 0,
    status?: 'active' | 'inactive' | 'expired'
  ): Promise<APIResponse<GetSessionHistoryResponse>> {
    const params = new URLSearchParams({
      user_id: userId,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (status) {
      params.append('status', status);
    }

    return this.request<GetSessionHistoryResponse>(`/ask/ask-sessions?${params.toString()}`);
  }

  /**
   * Get a specific session with its conversation turns
   */
  async getSessionWithTurns(
    sessionId: string,
    userId: string
  ): Promise<APIResponse<GetSessionWithTurnsResponse>> {
    return this.request<GetSessionWithTurnsResponse>(
      `/ask/ask-sessions/${sessionId}?user_id=${userId}`
    );
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    userId: string,
    status: 'active' | 'inactive' | 'expired'
  ): Promise<APIResponse<{ success: boolean }>> {
    const payload = {
      status,
    };

    return this.request<{ success: boolean }>(`/ask-sessions/${sessionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: {
        'X-User-ID': userId, // Pass user ID in header for security
      },
    });
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    userId: string,
    metadata: Record<string, unknown>
  ): Promise<APIResponse<{ success: boolean }>> {
    const payload = {
      session_metadata: metadata,
    };

    return this.request<{ success: boolean }>(`/ask-sessions/${sessionId}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: {
        'X-User-ID': userId,
      },
    });
  }

  /**
   * Update session title
   */
  async updateSessionTitle(
    sessionId: string,
    userId: string,
    title: string
  ): Promise<APIResponse<{ success: boolean }>> {
    const payload = {
      title,
    };

    return this.request<{ success: boolean }>(`/ask-sessions/${sessionId}/title`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: {
        'X-User-ID': userId,
      },
    });
  }

  /**
   * Get session count for a user
   */
  async getSessionCount(
    userId: string,
    status?: 'active' | 'inactive' | 'expired'
  ): Promise<APIResponse<{ count: number }>> {
    const params = new URLSearchParams({
      user_id: userId,
    });

    if (status) {
      params.append('status', status);
    }

    return this.request<{ count: number }>(`/ask/ask-sessions/count?${params.toString()}`);
  }

  /**
   * Delete a session and all its turns
   */
  async deleteSession(
    sessionId: string,
    userId: string
  ): Promise<APIResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/ask-sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'X-User-ID': userId,
      },
    });
  }

  /**
   * Get conversation turns for a session
   */
  async getConversationTurns(
    sessionId: string,
    userId: string,
    limit = 100,
    offset = 0
  ): Promise<APIResponse<{ turns: AskConversationTurnRecord[] }>> {
    const params = new URLSearchParams({
      user_id: userId,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return this.request<{ turns: AskConversationTurnRecord[] }>(
      `/ask-sessions/${sessionId}/turns?${params.toString()}`
    );
  }

  /**
   * Health check for the storage service
   */
  async healthCheck(): Promise<APIResponse<{ status: string }>> {
    return this.request<{ status: string }>('/health');
  }
}

// Export singleton instance
export const askSessionStorage = new AskSessionStorageService();
