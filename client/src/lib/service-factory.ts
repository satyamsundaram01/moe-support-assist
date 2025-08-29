/**
 * Service Factory
 * Centralized service creation and management
 */

import { configManager } from '../core/config-manager';
import { ResponseUtils, RetryUtils, SessionUtils } from '../lib/service-utils';
import type { ChatMode } from '../types';

export interface ServiceDependencies {
  userId: string;
  sessionId?: string;
  mode?: ChatMode;
}

/**
 * Chat Service Factory
 */
export class ChatServiceFactory {
  /**
   * Create chat service instance
   */
  static create(dependencies: ServiceDependencies) {
    const { userId, sessionId, mode = 'ask' } = dependencies;
    const config = configManager.getChatConfig();

    return {
      userId,
      sessionId: sessionId || SessionUtils.generateSessionId(),
      mode,
      config,
      
      // Add utility methods
      utils: {
        generateMessageId: SessionUtils.generateMessageId,
        createSuccessResponse: ResponseUtils.createSuccess,
        createErrorResponse: ResponseUtils.createError,
        withRetry: RetryUtils.withRetry,
      },
    };
  }
}

/**
 * API Service Factory
 */
export class APIServiceFactory {
  /**
   * Create API service instance
   */
  static create() {
    const config = configManager.getAPIConfig();

    return {
      config,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      
      // Add utility methods
      utils: {
        createSuccessResponse: ResponseUtils.createSuccess,
        createErrorResponse: ResponseUtils.createError,
        withRetry: RetryUtils.withRetry,
      },
    };
  }
}

/**
 * Session Service Factory
 */
export class SessionServiceFactory {
  /**
   * Create session service for specific mode
   */
  static create(mode: ChatMode, userId: string) {
    const config = configManager.getStorageConfig();

    return {
      mode,
      userId,
      config,
      sessionId: SessionUtils.generateSessionId(),
      
      // Add utility methods
      utils: {
        generateSessionId: SessionUtils.generateSessionId,
        generateConversationId: SessionUtils.generateConversationId,
        isSessionExpired: SessionUtils.isSessionExpired,
      },
    };
  }
}

/**
 * Storage Service Factory
 */
export class StorageServiceFactory {
  /**
   * Create storage service instance
   */
  static create() {
    const config = configManager.getStorageConfig();

    return {
      config,
      maxConversations: config.maxConversations,
      cacheTimeout: config.cacheTimeout,
      version: config.version,
      
      // Add utility methods for local storage operations
      utils: {
        setItem: (key: string, value: unknown) => {
          try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
          } catch {
            return false;
          }
        },
        
        getItem: <T>(key: string): T | null => {
          try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
          } catch {
            return null;
          }
        },
        
        removeItem: (key: string) => {
          try {
            localStorage.removeItem(key);
            return true;
          } catch {
            return false;
          }
        },
      },
    };
  }
}

/**
 * Service Manager
 * Manages service lifecycle and provides central access
 */
export class ServiceManager {
  private static services = new Map<string, unknown>();

  /**
   * Register a service
   */
  static register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Get a service
   */
  static get<T>(name: string): T | undefined {
    return this.services.get(name) as T;
  }

  /**
   * Create and register chat service
   */
  static createChatService(dependencies: ServiceDependencies): ReturnType<typeof ChatServiceFactory.create> {
    const service = ChatServiceFactory.create(dependencies);
    this.register(`chat-${dependencies.userId}-${service.sessionId}`, service);
    return service;
  }

  /**
   * Create and register API service
   */
  static createAPIService(): ReturnType<typeof APIServiceFactory.create> {
    const service = APIServiceFactory.create();
    this.register('api', service);
    return service;
  }

  /**
   * Create and register session service
   */
  static createSessionService(mode: ChatMode, userId: string): ReturnType<typeof SessionServiceFactory.create> {
    const service = SessionServiceFactory.create(mode, userId);
    this.register(`session-${mode}-${userId}`, service);
    return service;
  }

  /**
   * Create and register storage service
   */
  static createStorageService(): ReturnType<typeof StorageServiceFactory.create> {
    const service = StorageServiceFactory.create();
    this.register('storage', service);
    return service;
  }

  /**
   * Clear all services
   */
  static clear(): void {
    this.services.clear();
  }

  /**
   * Get service status
   */
  static getStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const [name] of this.services) {
      status[name] = true; // Simple availability check
    }

    return status;
  }
}
