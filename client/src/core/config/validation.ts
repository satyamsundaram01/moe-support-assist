/**
 * Configuration Validation Utilities
 * Provides validation for configuration objects
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class ConfigValidator {
  /**
   * Validate API configuration
   */
  static validateAPIConfig(config: {
    baseUrl?: string;
    appName?: string;
    timeout?: number;
  }): ValidationResult {
    const errors: ValidationError[] = [];

    if (!config.baseUrl) {
      errors.push({
        field: 'baseUrl',
        message: 'API base URL is required',
        code: 'REQUIRED_FIELD'
      });
    } else if (!this.isValidUrl(config.baseUrl)) {
      errors.push({
        field: 'baseUrl',
        message: 'API base URL must be a valid URL',
        code: 'INVALID_URL'
      });
    }

    if (!config.appName) {
      errors.push({
        field: 'appName',
        message: 'App name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (config.timeout && config.timeout < 1000) {
      errors.push({
        field: 'timeout',
        message: 'Timeout must be at least 1000ms',
        code: 'INVALID_RANGE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate feature flags configuration
   */
  static validateFeatureFlags(flags: Record<string, boolean>): ValidationResult {
    const errors: ValidationError[] = [];

    // Ensure core features are present
    const requiredFeatures = ['enableAnalytics', 'enableDebugMode'];
    for (const feature of requiredFeatures) {
      if (!(feature in flags)) {
        errors.push({
          field: feature,
          message: `Required feature flag '${feature}' is missing`,
          code: 'REQUIRED_FEATURE'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate entire configuration object
   */
  static validateConfig(config: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];

    // Check for required top-level sections
    const requiredSections = ['api', 'ui', 'features'];
    for (const section of requiredSections) {
      if (!(section in config)) {
        errors.push({
          field: section,
          message: `Required configuration section '${section}' is missing`,
          code: 'REQUIRED_SECTION'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a string is a valid URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Configuration loader with validation
 */
export class ConfigLoader {
  /**
   * Load and validate configuration from environment
   */
  static loadConfig(): { config: Record<string, unknown>; isValid: boolean; errors: ValidationError[] } {
    const config = {
      api: {
        baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
        appName: import.meta.env.VITE_APP_NAME || 'moe_support_agent',
        timeout: 30000,
      },
      ui: {
        theme: 'auto',
        animationDuration: 300,
      },
      features: {
        enableAnalytics: import.meta.env.PROD,
        enableDebugMode: import.meta.env.DEV,
      },
    };

    const validation = ConfigValidator.validateConfig(config);
    
    return {
      config,
      isValid: validation.isValid,
      errors: validation.errors
    };
  }

  /**
   * Load configuration with fallbacks
   */
  static loadWithFallbacks(): Record<string, unknown> {
    const { config, isValid, errors } = this.loadConfig();
    
    if (!isValid) {
      console.warn('Configuration validation failed:', errors);
      // Apply fallbacks for critical errors
      // In a real app, you might want to handle this more gracefully
    }
    
    return config;
  }
}
