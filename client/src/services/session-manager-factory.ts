import type { SessionManager, SessionManagerConfig } from '../types/session-management';
import { AskSessionManager } from './ask-session-manager';
import { InvestigateSessionManager } from './investigate-session-manager';

/**
 * Factory for creating session managers based on chat mode
 */
export class SessionManagerFactory {
  /**
   * Create a session manager for the specified mode
   */
  static createSessionManager(config: SessionManagerConfig): SessionManager {
    switch (config.mode) {
      case 'ask':
        return new AskSessionManager(config);
      case 'investigate':
        return new InvestigateSessionManager(config);
      default:
        throw new Error(`Unsupported session mode: ${config.mode}`);
    }
  }

  /**
   * Create an Ask mode session manager
   */
  static createAskSessionManager(userId: string, apiBaseUrl?: string): SessionManager {
    return new AskSessionManager({
      userId,
      mode: 'ask',
      apiBaseUrl,
    });
  }

  /**
   * Create an Investigate mode session manager
   */
  static createInvestigateSessionManager(
    userId: string, 
    apiBaseUrl?: string, 
    appName?: string
  ): SessionManager {
    return new InvestigateSessionManager({
      userId,
      mode: 'investigate',
      apiBaseUrl,
      appName,
    });
  }
}

/**
 * Convenience function to create a session manager
 */
export const createSessionManager = (config: SessionManagerConfig): SessionManager => {
  return SessionManagerFactory.createSessionManager(config);
};

/**
 * Create session manager based on mode string
 */
export const createSessionManagerForMode = (
  mode: 'ask' | 'investigate',
  userId: string,
  apiBaseUrl?: string,
  appName?: string
): SessionManager => {
  return SessionManagerFactory.createSessionManager({
    userId,
    mode,
    apiBaseUrl,
    appName,
  });
};
