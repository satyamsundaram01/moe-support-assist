/**
 * Service Configuration Manager
 * Centralized configuration for all services
 */

import { appConfig } from '../config/app-config';
import type { AppConfig } from '../config/app-config';

export interface ServiceConfigurations {
  api: {
    baseUrl: string;
    appName: string;
    timeout: number;
    retryAttempts: number;
  };
  chat: {
    maxMessageLength: number;
    streamingChunkSize: number;
    autoSaveInterval: number;
  };
  storage: {
    maxConversations: number;
    cacheTimeout: number;
    version: string;
  };
  ui: {
    theme: string;
    animationDuration: number;
    debounceDelay: number;
  };
}

class ConfigurationManager {
  private config: AppConfig;

  constructor() {
    this.config = appConfig;
  }

  /**
   * Get API configuration
   */
  getAPIConfig() {
    return {
      baseUrl: this.config.api.baseUrl,
      appName: this.config.api.appName,
      timeout: this.config.api.timeout,
      retryAttempts: this.config.api.retryAttempts,
    };
  }

  /**
   * Get chat configuration
   */
  getChatConfig() {
    return {
      maxMessageLength: this.config.chat.maxMessageLength,
      streamingChunkSize: this.config.chat.streamingChunkSize,
      autoSaveInterval: this.config.chat.autoSaveInterval,
    };
  }

  /**
   * Get storage configuration
   */
  getStorageConfig() {
    return {
      maxConversations: this.config.storage.maxConversations,
      cacheTimeout: this.config.storage.cacheTimeout,
      version: this.config.storage.version,
    };
  }

  /**
   * Get UI configuration
   */
  getUIConfig() {
    return {
      theme: this.config.ui.theme,
      animationDuration: this.config.ui.animationDuration,
      debounceDelay: this.config.ui.debounceDelay,
    };
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig() {
    return {
      level: this.config.logging.level,
      enableConsoleLogging: this.config.logging.enableConsoleLogging,
      enableRemoteLogging: this.config.logging.enableRemoteLogging,
      maxLogEntries: this.config.logging.maxLogEntries,
    };
  }

  /**
   * Get full configuration for a service
   */
  getServiceConfig(serviceName: string): Record<string, unknown> {
    switch (serviceName) {
      case 'api':
        return this.getAPIConfig();
      case 'chat':
        return this.getChatConfig();
      case 'storage':
        return this.getStorageConfig();
      case 'ui':
        return this.getUIConfig();
      default:
        return {};
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate API config
    if (!this.config.api.baseUrl) {
      errors.push('API base URL is required');
    }

    if (!this.config.api.appName) {
      errors.push('App name is required');
    }

    if (this.config.api.timeout <= 0) {
      errors.push('API timeout must be positive');
    }

    // Validate chat config
    if (this.config.chat.maxMessageLength <= 0) {
      errors.push('Max message length must be positive');
    }

    // Validate storage config
    if (this.config.storage.maxConversations <= 0) {
      errors.push('Max conversations must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const configManager = new ConfigurationManager();
