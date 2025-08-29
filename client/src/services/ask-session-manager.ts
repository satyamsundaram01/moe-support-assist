import type {
  SessionManager,
  SessionResult,
  SessionHistory,
  SessionManagerConfig,
} from '../types/session-management';
import { chatAPI } from './chat-api';
import { askSessionStorage } from './ask-session-storage';

/**
 * Session Manager for Ask Mode
 * Handles dual-session creation (API + Database) and conversation turn storage
 */
export class AskSessionManager implements SessionManager {
  private userId: string;
  // private config: SessionManagerConfig;

  constructor(config: SessionManagerConfig) {
    this.userId = config.userId;
  }

  /**
   * Create a new Ask mode session
   * This creates both the API session and database record
   */
  async createSession(
    conversationId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<SessionResult> {
    try {
      // Step 1: Create API session via /ask/session
      const apiSessionResult = await chatAPI.createAskSession(this.userId, {
        conversationId,
        ...metadata,
      });

      if (!apiSessionResult.success || !apiSessionResult.data) {
        return {
          success: false,
          sessionId: conversationId,
          error: apiSessionResult.error || 'Failed to create API session',
        };
      }

      const apiSessionId = apiSessionResult.data.session_id;

      // Step 2: Create database record
      // Use the title from metadata if provided, otherwise use a default
      const sessionTitle = metadata.title as string || 'Ask Session';
      
      const dbSessionResult = await askSessionStorage.createAskSession(
        conversationId, // Use conversationId as our session ID
        this.userId,
        apiSessionId,
        conversationId,
        sessionTitle,
        metadata
      );

      if (!dbSessionResult.success) {
        console.error('Failed to create database session record:', dbSessionResult.error);
        // Return error - we need the database record for conversation turns
        return {
          success: false,
          sessionId: conversationId,
          error: `Database session creation failed: ${dbSessionResult.error}`,
        };
      }

      console.log('Successfully created Ask session:', {
        conversationId,
        apiSessionId,
        dbResult: dbSessionResult.success
      });

      return {
        success: true,
        sessionId: conversationId,
        apiSessionId: apiSessionId,
      };
    } catch (error) {
      console.error('Error creating Ask session:', error);
      return {
        success: false,
        sessionId: conversationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Store a conversation turn in the database
   */
  async storeConversationTurn(
    sessionId: string,
    userQuery: string,
    aiResponse: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      // Extract citations from metadata if present
      const citations = metadata.citations as Array<{
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
      }> | undefined;

      const result = await askSessionStorage.storeConversationTurn(
        sessionId,
        userQuery,
        aiResponse,
        metadata,
        citations
      );

      if (!result.success) {
        console.error('Failed to store conversation turn:', result.error);
        // Don't throw error - we don't want to break the chat flow
        // Just log the error for monitoring
      }
    } catch (error) {
      console.error('Error storing conversation turn:', error);
      // Don't throw error - we don't want to break the chat flow
    }
  }

  /**
   * Get session history for the user
   */
  async getSessionHistory(sessionId?: string): Promise<SessionHistory[]> {
    try {
      if (sessionId) {
        // Get specific session with turns
        const result = await askSessionStorage.getSessionWithTurns(sessionId, this.userId);
        if (!result.success || !result.data) {
          return [];
        }

        const session = result.data.session;
        const turns = result.data.turns;

        return [
          {
            sessionId: session.session_id,
            userId: session.user_id,
            conversationId: session.conversation_id,
            title: session.title,
            createdAt: new Date(session.created_at).getTime(),
            updatedAt: new Date(session.updated_at).getTime(),
            status: session.status,
            mode: 'ask',
            totalTurns: session.total_queries,
            lastTurnAt: session.last_query_at ? new Date(session.last_query_at).getTime() : undefined,
            metadata: session.session_metadata,
            turns: turns.map(turn => ({
              id: turn.id,
              sessionId: turn.session_id,
              userQuery: turn.user_query,
              aiResponse: turn.ai_response,
              timestamp: new Date(turn.created_at).getTime(),
              metadata: turn.metadata,
              citations: turn.citations,
            })),
          },
        ];
      } else {
        // Get all sessions for user
        const result = await askSessionStorage.getSessionHistory(this.userId);
        if (!result.success || !result.data) {
          return [];
        }

        return result.data.sessions.map(session => ({
          sessionId: session.session_id,
          userId: session.user_id,
          conversationId: session.conversation_id,
          title: session.title,
          createdAt: new Date(session.created_at).getTime(),
          updatedAt: new Date(session.updated_at).getTime(),
          status: session.status,
          mode: 'ask' as const,
          totalTurns: session.total_queries,
          lastTurnAt: session.last_query_at ? new Date(session.last_query_at).getTime() : undefined,
          metadata: session.session_metadata,
        }));
      }
    } catch (error) {
      console.error('Error getting session history:', error);
      return [];
    }
  }

  /**
   * Get a specific session with its turns
   */
  async getSessionWithTurns(sessionId: string): Promise<SessionHistory | null> {
    try {
      const result = await askSessionStorage.getSessionWithTurns(sessionId, this.userId);
      if (!result.success || !result.data) {
        return null;
      }

      const session = result.data.session;
      const turns = result.data.turns;

      return {
        sessionId: session.session_id,
        userId: session.user_id,
        conversationId: session.conversation_id,
        title: session.title,
        createdAt: new Date(session.created_at).getTime(),
        updatedAt: new Date(session.updated_at).getTime(),
        status: session.status,
        mode: 'ask',
        totalTurns: session.total_queries,
        lastTurnAt: session.last_query_at ? new Date(session.last_query_at).getTime() : undefined,
        metadata: session.session_metadata,
        turns: turns.map(turn => ({
          id: turn.id,
          sessionId: turn.session_id,
          userQuery: turn.user_query,
          aiResponse: turn.ai_response,
          timestamp: new Date(turn.created_at).getTime(),
          metadata: turn.metadata,
          citations: turn.citations,
        })),
      };
    } catch (error) {
      console.error('Error getting session with turns:', error);
      return null;
    }
  }

  /**
   * End/deactivate a session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const result = await askSessionStorage.updateSessionStatus(
        sessionId,
        this.userId,
        'inactive'
      );

      if (!result.success) {
        console.error('Failed to end session:', result.error);
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      const result = await askSessionStorage.updateSessionMetadata(
        sessionId,
        this.userId,
        metadata
      );

      if (!result.success) {
        console.error('Failed to update session metadata:', result.error);
      }
    } catch (error) {
      console.error('Error updating session metadata:', error);
    }
  }

  /**
   * Get session count for the user
   */
  async getSessionCount(): Promise<number> {
    try {
      const result = await askSessionStorage.getSessionCount(this.userId);
      if (!result.success || !result.data) {
        return 0;
      }
      return result.data.count;
    } catch (error) {
      console.error('Error getting session count:', error);
      return 0;
    }
  }
}

/**
 * Factory function to create an Ask Session Manager
 */
export const createAskSessionManager = (config: SessionManagerConfig): AskSessionManager => {
  return new AskSessionManager(config);
};
