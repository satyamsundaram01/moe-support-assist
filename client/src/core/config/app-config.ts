/**
 * Enhanced Application Configuration
 * Centralized, type-safe configuration with validation
 */

import { getCurrentEnvironment, Environment } from './environment';
import { ConfigValidator, type ValidationResult } from './validation';
import { getFeatureFlags } from './feature-flags';

/**
 * Comprehensive application configuration interface
 */
export interface AppConfig {
  // Environment
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  
  // API Configuration
  api: {
    baseUrl: string;
    appName: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    maxConcurrentRequests: number;
  };
  
  // Storage Configuration
  storage: {
    maxConversations: number;
    maxMessagesPerConversation: number;
    version: string;
    cacheTimeout: number;
    enablePersistence: boolean;
  };
  
  // Chat Configuration
  chat: {
    maxMessageLength: number;
    typingIndicatorDelay: number;
    autoSaveInterval: number;
    streamingChunkSize: number;
    enableFileUpload: boolean;
    maxFileSize: number;
  };
  
  // UI Configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    animationDuration: number;
    debounceDelay: number;
    toastDuration: number;
    enableAnimations: boolean;
    compactMode: boolean;
  };
  
  // Feature Flags
  features: {
    enableAnalytics: boolean;
    enableDebugMode: boolean;
    enableExperimentalFeatures: boolean;
    enableOfflineMode: boolean;
    enableVoiceInput: boolean;
    enableKeyboardShortcuts: boolean;
  };
  
  // Logging Configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsoleLogging: boolean;
    enableRemoteLogging: boolean;
    maxLogEntries: number;
    enablePerformanceLogging: boolean;
  };

  // Security Configuration
  security: {
    enableCSP: boolean;
    enableSanitization: boolean;
    maxRequestSize: number;
    enableRateLimiting: boolean;
  };

  // Performance Configuration
  performance: {
    enableLazyLoading: boolean;
    enableVirtualization: boolean;
    chunkSize: number;
    preloadThreshold: number;
  };
}

/**
 * Build configuration from environment and defaults
 */
function buildConfig(): AppConfig {
  const environment = getCurrentEnvironment();
  const isDevelopment = environment === Environment.DEVELOPMENT;
  const isProduction = environment === Environment.PRODUCTION;
  const isTest = environment === Environment.TEST;

  return {
    // Environment
    environment,
    isDevelopment,
    isProduction,
    isTest,
    
    // API Configuration
    api: {
      baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
      appName: import.meta.env.VITE_APP_NAME || 'moe_support_agent',
      timeout: isProduction ? 30000 : 60000,
      retryAttempts: 3,
      retryDelay: 1000,
      maxConcurrentRequests: isProduction ? 10 : 5,
    },
    
    // Storage Configuration
    storage: {
      maxConversations: 100,
      maxMessagesPerConversation: 1000,
      version: '1.0.0',
      cacheTimeout: 300000, // 5 minutes
      enablePersistence: true,
    },
    
    // Chat Configuration
    chat: {
      maxMessageLength: 4000,
      typingIndicatorDelay: 500,
      autoSaveInterval: 5000,
      streamingChunkSize: 1024,
      enableFileUpload: false, // Disabled by default
      maxFileSize: 10 * 1024 * 1024, // 10MB
    },
    
    // UI Configuration
    ui: {
      theme: 'auto',
      animationDuration: 300,
      debounceDelay: 300,
      toastDuration: 5000,
      enableAnimations: !isTest,
      compactMode: false,
    },
    
    // Feature Flags
    features: {
      ...getFeatureFlags(),
      enableAnalytics: isProduction,
      enableDebugMode: isDevelopment,
      enableExperimentalFeatures: isDevelopment,
      enableOfflineMode: true,
      enableVoiceInput: false,
      enableKeyboardShortcuts: true,
    },
    
    // Logging Configuration
    logging: {
      level: isDevelopment ? 'debug' : 'info',
      enableConsoleLogging: true,
      enableRemoteLogging: isProduction,
      maxLogEntries: isDevelopment ? 1000 : 100,
      enablePerformanceLogging: isDevelopment,
    },

    // Security Configuration
    security: {
      enableCSP: isProduction,
      enableSanitization: true,
      maxRequestSize: 50 * 1024 * 1024, // 50MB
      enableRateLimiting: isProduction,
    },

    // Performance Configuration
    performance: {
      enableLazyLoading: true,
      enableVirtualization: isProduction,
      chunkSize: 50,
      preloadThreshold: 0.8,
    },
  };
}

/**
 * Validate and create application configuration
 */
function createAppConfig(): AppConfig {
  const config = buildConfig();
  
  // Validate API configuration
  const apiValidation = ConfigValidator.validateAPIConfig(config.api);
  if (!apiValidation.isValid) {
    console.error('API configuration validation failed:', apiValidation.errors);
    // In production, you might want to throw an error or use fallbacks
  }

  // Validate feature flags
  const featureValidation = ConfigValidator.validateFeatureFlags(config.features);
  if (!featureValidation.isValid) {
    console.warn('Feature flag validation failed:', featureValidation.errors);
  }

  return config;
}

/**
 * Application configuration instance
 */
export const appConfig: AppConfig = createAppConfig();

/**
 * Get a specific configuration section
 */
export function getConfigSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
  return appConfig[section];
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  return appConfig.features[feature];
}

/**
 * Get API configuration with validation
 */
export function getAPIConfig() {
  const validation = ConfigValidator.validateAPIConfig(appConfig.api);
  
  if (!validation.isValid) {
    throw new Error(`Invalid API configuration: ${validation.errors.map(e => e.message).join(', ')}`);
  }
  
  return appConfig.api;
}

/**
 * Configuration update utilities (for testing/admin)
 */
export class ConfigManager {
  /**
   * Update configuration section (for testing/admin use)
   */
  static updateSection<K extends keyof AppConfig>(
    section: K, 
    updates: Partial<AppConfig[K]>
  ): void {
    Object.assign(appConfig[section], updates);
  }

  /**
   * Reset configuration to defaults
   */
  static reset(): void {
    const freshConfig = createAppConfig();
    Object.assign(appConfig, freshConfig);
  }

  /**
   * Get configuration validation status
   */
  static validate(): ValidationResult {
    return ConfigValidator.validateConfig(appConfig as unknown as Record<string, unknown>);
  }
}
