/**
 * Configuration Module Index
 * Central exports for all configuration-related functionality
 */

export * from './environment';
export { featureFlags, isFeatureEnabled, getFeatureFlags, setFeatureFlag, subscribeToFeatureFlags } from './feature-flags';
export type { FeatureFlags } from './feature-flags';
export * from './app-config';
export * from './validation';

// Re-export main configuration instance
export { appConfig as config } from './app-config';
