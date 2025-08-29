import type {
  SessionManager,
  SessionResult,
  SessionHistory,
  SessionManagerConfig,
} from '../types/session-management';
import { SessionService } from './session-service';
import type { Session } from '../types/api';

/**
 * Session Manager for Investigate Mode
 * Uses the existing session service and API structure
 */
export class InvestigateSessionManager implements SessionManager {
  private userId: string;
  private sessionService: SessionService;

  constructor(config: SessionManagerConfig) {
    this.userId = config.userId;
    this.sessionService = new SessionService(this.userId);
  }

  /**
   * Create a new Investigate mode session
   */
  async createSession(
    conversationId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<SessionResult> {
    try {
      const result = await this.sessionService.createSession(metadata);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          sessionId: conversationId,
          error: result.error || 'Failed to create session',
        };
      }

      return {
        success: true,
        sessionId: conversationId,
        apiSessionId: result.data.id,
      };
    } catch (error) {
      console.error('Error creating Investigate session:', error);
      return {
        success: false,
        sessionId: conversationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Store a conversation turn
   * For Investigate mode, this is handled automatically by the backend
   * So this is a no-op, but we keep it for interface consistency
   */
  async storeConversationTurn(
    _sessionId: string,
    _userQuery: string,
    _aiResponse: string,
    _metadata: Record<string, unknown> = {}
  ): Promise<void> {
    // Investigate mode stores conversation turns automatically
    // This method is kept for interface consistency but doesn't need to do anything
    console.log('Investigate mode: Conversation turn stored automatically by backend');
  }

  /**
   * Get session history for the user
   */
  async getSessionHistory(sessionId?: string): Promise<SessionHistory[]> {
    try {
      if (sessionId) {
        // Get specific session
        const result = await this.sessionService.getSession(sessionId);
        if (!result.success || !result.data) {
          return [];
        }

        return [this.convertSessionToHistory(result.data)];
      } else {
        // Get all sessions
        const result = await this.sessionService.listSessions();
        if (!result.success || !result.data) {
          return [];
        }

        return result.data.map(session => this.convertSessionToHistory(session));
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
      const result = await this.sessionService.getSession(sessionId);
      if (!result.success || !result.data) {
        return null;
      }

      const sessionHistory = this.convertSessionToHistory(result.data);
      
      // Convert events to turns for consistency
      if (result.data.events) {
        sessionHistory.turns = result.data.events.map(event => ({
          id: event.id,
          sessionId: sessionId,
          userQuery: event.content?.parts?.[0]?.text || '',
          aiResponse: event.content?.parts?.[0]?.text || '',
          timestamp: event.timestamp,
          metadata: {
            author: event.author,
            invocationId: event.invocationId,
            actions: event.actions,
            usageMetadata: event.usageMetadata,
          },
        }));
      }

      return sessionHistory;
    } catch (error) {
      console.error('Error getting session with turns:', error);
      return null;
    }
  }

  /**
   * End/deactivate a session
   */
  async endSession(_sessionId: string): Promise<void> {
    try {
      // For investigate mode, we don't have a direct way to end sessions
      // The sessions are managed by the backend automatically
      console.log('Investigate mode: Session lifecycle managed by backend');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    _sessionId: string,
    _metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      // For investigate mode, metadata updates are not directly supported
      // This would need to be implemented in the backend API
      console.log('Investigate mode: Session metadata updates not supported');
    } catch (error) {
      console.error('Error updating session metadata:', error);
    }
  }

  /**
   * Get session count for the user
   */
  async getSessionCount(): Promise<number> {
    try {
      const result = await this.sessionService.getSessionCount();
      if (!result.success || result.data === undefined) {
        return 0;
      }
      return result.data;
    } catch (error) {
      console.error('Error getting session count:', error);
      return 0;
    }
  }

  /**
   * Convert API Session to SessionHistory format
   */
  private convertSessionToHistory(session: Session): SessionHistory {
    return {
      sessionId: session.id,
      userId: session.userId,
      conversationId: session.id, // Use session ID as conversation ID for investigate mode
      title: `Session ${session.id.substring(0, 8)}`, // Generate a title from session ID
      createdAt: session.lastUpdateTime, // Use lastUpdateTime as created time
      updatedAt: session.lastUpdateTime,
      status: 'active', // Investigate sessions are typically active
      mode: 'investigate',
      totalTurns: session.events?.length || 0,
      lastTurnAt: session.lastUpdateTime,
      metadata: {
        appName: session.appName,
        state: session.state,
      },
    };
  }
}

/**
 * Factory function to create an Investigate Session Manager
 */
export const createInvestigateSessionManager = (config: SessionManagerConfig): InvestigateSessionManager => {
  return new InvestigateSessionManager(config);
};
