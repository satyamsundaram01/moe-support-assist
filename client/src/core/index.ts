/**
 * Core Infrastructure Index
 * Central export point for all core infrastructure modules
 */

// Configuration
export * from './config/environment';
export * from './config/feature-flags';
// Export config but without conflicting names
export {
  appConfig,
  getConfigSection,
  getAPIConfig,
  ConfigManager,
} from './config';

// Bootstrap
export * from './bootstrap';

// Health Checks
export * from './health-check';

// Error Handling
export * from './error-handling';

// Logging
export * from './logging/logger';

// Error Handling
export * from './error/error-handler';

// Re-export commonly used items with aliases for convenience
export {
  logger as coreLogger,
} from './logging/logger';