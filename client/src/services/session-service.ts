import { apiClient } from './api-client';
import type { Session, APIResponse, CreateSessionRequest } from '../types';

export class SessionService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * List all sessions for the current user
   */
  async listSessions(): Promise<APIResponse<Session[]>> {
    return apiClient.listSessions(this.userId);
  }

  /**
   * Create a new session
   */
  async createSession(sessionData: CreateSessionRequest = {}): Promise<APIResponse<Session>> {
    return apiClient.createSession(this.userId, sessionData);
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<APIResponse<Session>> {
    return apiClient.getSession(this.userId, sessionId);
  }

  /**
   * Create a new session or get existing one
   */
  async getOrCreateSession(sessionId?: string): Promise<APIResponse<Session>> {
    if (sessionId) {
      const result = await this.getSession(sessionId);
      if (result.success) {
        return result;
      }
    }
    
    // Create new session if no sessionId provided or session not found
    return this.createSession();
  }

  /**
   * Get the most recent session
   */
  async getLatestSession(): Promise<APIResponse<Session | null>> {
    const result = await this.listSessions();
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to list sessions',
        timestamp: Date.now(),
      };
    }

    if (result.data.length === 0) {
      return {
        success: true,
        data: null,
        timestamp: Date.now(),
      };
    }

    // Sort by lastUpdateTime and get the most recent
    const sortedSessions = result.data.sort((a, b) => b.lastUpdateTime - a.lastUpdateTime);
    return {
      success: true,
      data: sortedSessions[0],
      timestamp: Date.now(),
    };
  }

  /**
   * Check if a session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const result = await this.getSession(sessionId);
    return result.success;
  }

  /**
   * Get session count for the user
   */
  async getSessionCount(): Promise<APIResponse<number>> {
    const result = await this.listSessions();
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to get session count',
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      data: result.data?.length || 0,
      timestamp: Date.now(),
    };
  }
}

// Factory function to create session service
export const createSessionService = (userId: string): SessionService => {
  return new SessionService(userId);
}; 