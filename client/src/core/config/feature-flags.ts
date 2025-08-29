/**
 * Feature Flag Management System
 * Centralized feature flag configuration with runtime updates
 */

import { getEnvironmentConfig } from './environment';

export interface FeatureFlags {
  // Core Features
  enableAnalytics: boolean;
  enableDebugMode: boolean;
  enableExperimentalFeatures: boolean;
  enableOfflineMode: boolean;
  
  // Chat Features
  enableAskMode: boolean;
  enableInvestigateMode: boolean;
  enableStreamingResponses: boolean;
  enableThinkingSteps: boolean;
  enableCitations: boolean;
  
  // UI Features
  enableDarkMode: boolean;
  enableAnimations: boolean;
  enableSoundEffects: boolean;
  enableKeyboardShortcuts: boolean;
  enableAutoSave: boolean;
  
  // Performance Features
  enableVirtualization: boolean;
  enableLazyLoading: boolean;
  enableCodeSplitting: boolean;
  enableServiceWorker: boolean;
  
  // Development Features
  enableHotReload: boolean;
  enableDevTools: boolean;
  enablePerformanceMetrics: boolean;
  enableErrorReporting: boolean;
}

/**
 * Default feature flags based on environment
 */
const getDefaultFeatureFlags = (): FeatureFlags => {
  const envConfig = getEnvironmentConfig();
  
  return {
    // Core Features
    enableAnalytics: envConfig.features.enableAnalytics,
    enableDebugMode: envConfig.features.enableDebugMode,
    enableExperimentalFeatures: envConfig.features.enableExperimentalFeatures,
    enableOfflineMode: envConfig.features.enableOfflineMode,
    
    // Chat Features
    enableAskMode: true,
    enableInvestigateMode: true,
    enableStreamingResponses: true,
    enableThinkingSteps: true,
    enableCitations: true,
    
    // UI Features
    enableDarkMode: true,
    enableAnimations: true,
    enableSoundEffects: false,
    enableKeyboardShortcuts: true,
    enableAutoSave: true,
    
    // Performance Features
    enableVirtualization: true,
    enableLazyLoading: true,
    enableCodeSplitting: true,
    enableServiceWorker: !envConfig.features.enableDebugMode,
    
    // Development Features
    enableHotReload: envConfig.features.enableDebugMode,
    enableDevTools: envConfig.features.enableDebugMode,
    enablePerformanceMetrics: envConfig.performance.enableMetrics,
    enableErrorReporting: !envConfig.features.enableDebugMode,
  };
};

/**
 * Feature flag manager class
 */
class FeatureFlagManager {
  private flags: FeatureFlags;
  private listeners: Set<(flags: FeatureFlags) => void> = new Set();
  private storageKey = 'moe-feature-flags';

  constructor() {
    this.flags = this.loadFlags();
  }

  /**
   * Load feature flags from storage or defaults
   */
  private loadFlags(): FeatureFlags {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsedFlags = JSON.parse(stored);
        // Merge with defaults to ensure all flags are present
        return { ...getDefaultFeatureFlags(), ...parsedFlags };
      }
    } catch (error) {
      console.warn('Failed to load feature flags from storage:', error);
    }
    
    return getDefaultFeatureFlags();
  }

  /**
   * Save feature flags to storage
   */
  private saveFlags(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.flags));
    } catch (error) {
      console.warn('Failed to save feature flags to storage:', error);
    }
  }

  /**
   * Get current feature flags
   */
  getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Check if a specific feature is enabled
   */
  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  /**
   * Update a single feature flag
   */
  setFlag(flag: keyof FeatureFlags, value: boolean): void {
    if (this.flags[flag] !== value) {
      this.flags[flag] = value;
      this.saveFlags();
      this.notifyListeners();
    }
  }

  /**
   * Update multiple feature flags
   */
  setFlags(updates: Partial<FeatureFlags>): void {
    let hasChanges = false;
    
    for (const [key, value] of Object.entries(updates)) {
      const flagKey = key as keyof FeatureFlags;
      if (this.flags[flagKey] !== value) {
        this.flags[flagKey] = value as boolean;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      this.saveFlags();
      this.notifyListeners();
    }
  }

  /**
   * Reset all flags to defaults
   */
  resetToDefaults(): void {
    this.flags = getDefaultFeatureFlags();
    this.saveFlags();
    this.notifyListeners();
  }

  /**
   * Subscribe to feature flag changes
   */
  subscribe(listener: (flags: FeatureFlags) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const flags = this.getFlags();
    this.listeners.forEach(listener => {
      try {
        listener(flags);
      } catch (error) {
        console.error('Error in feature flag listener:', error);
      }
    });
  }

  /**
   * Get feature flags for a specific category
   */
  getCategoryFlags(category: 'core' | 'chat' | 'ui' | 'performance' | 'development'): Partial<FeatureFlags> {
    switch (category) {
      case 'core':
        return {
          enableAnalytics: this.flags.enableAnalytics,
          enableDebugMode: this.flags.enableDebugMode,
          enableExperimentalFeatures: this.flags.enableExperimentalFeatures,
          enableOfflineMode: this.flags.enableOfflineMode,
        };
      case 'chat':
        return {
          enableAskMode: this.flags.enableAskMode,
          enableInvestigateMode: this.flags.enableInvestigateMode,
          enableStreamingResponses: this.flags.enableStreamingResponses,
          enableThinkingSteps: this.flags.enableThinkingSteps,
          enableCitations: this.flags.enableCitations,
        };
      case 'ui':
        return {
          enableDarkMode: this.flags.enableDarkMode,
          enableAnimations: this.flags.enableAnimations,
          enableSoundEffects: this.flags.enableSoundEffects,
          enableKeyboardShortcuts: this.flags.enableKeyboardShortcuts,
          enableAutoSave: this.flags.enableAutoSave,
        };
      case 'performance':
        return {
          enableVirtualization: this.flags.enableVirtualization,
          enableLazyLoading: this.flags.enableLazyLoading,
          enableCodeSplitting: this.flags.enableCodeSplitting,
          enableServiceWorker: this.flags.enableServiceWorker,
        };
      case 'development':
        return {
          enableHotReload: this.flags.enableHotReload,
          enableDevTools: this.flags.enableDevTools,
          enablePerformanceMetrics: this.flags.enablePerformanceMetrics,
          enableErrorReporting: this.flags.enableErrorReporting,
        };
      default:
        return {};
    }
  }

  /**
   * Export feature flags for debugging
   */
  exportFlags(): string {
    return JSON.stringify(this.flags, null, 2);
  }

  /**
   * Import feature flags from JSON
   */
  importFlags(flagsJson: string): boolean {
    try {
      const importedFlags = JSON.parse(flagsJson);
      const validFlags: Partial<FeatureFlags> = {};
      
      // Validate imported flags
      for (const [key, value] of Object.entries(importedFlags)) {
        if (key in this.flags && typeof value === 'boolean') {
          validFlags[key as keyof FeatureFlags] = value as boolean;
        }
      }
      
      this.setFlags(validFlags);
      return true;
    } catch (error) {
      console.error('Failed to import feature flags:', error);
      return false;
    }
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlagManager();

// Export convenience functions
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  return featureFlags.isEnabled(flag);
};

export const getFeatureFlags = (): FeatureFlags => {
  return featureFlags.getFlags();
};

export const setFeatureFlag = (flag: keyof FeatureFlags, value: boolean): void => {
  featureFlags.setFlag(flag, value);
};

export const subscribeToFeatureFlags = (listener: (flags: FeatureFlags) => void): (() => void) => {
  return featureFlags.subscribe(listener);
};
