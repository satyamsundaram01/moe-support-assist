/**
 * Environment Configuration
 * Centralized environment detection and configuration management
 */

export const Environment = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export type Environment = typeof Environment[keyof typeof Environment];

/**
 * Get current environment
 */
export const getCurrentEnvironment = (): Environment => {
  if (import.meta.env.MODE === 'test') return Environment.TEST;
  if (import.meta.env.PROD) return Environment.PRODUCTION;
  return Environment.DEVELOPMENT;
};

/**
 * Environment checks
 */
export const isDevelopment = () => getCurrentEnvironment() === Environment.DEVELOPMENT;
export const isProduction = () => getCurrentEnvironment() === Environment.PRODUCTION;
export const isTest = () => getCurrentEnvironment() === Environment.TEST;

/**
 * Environment variables with type safety and defaults
 */
export const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not defined`);
  }
  return value || defaultValue || '';
};

export const getEnvVarAsNumber = (key: string, defaultValue?: number): number => {
  const value = import.meta.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not defined`);
    }
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
};

export const getEnvVarAsBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = import.meta.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not defined`);
    }
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
};

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableRemote: boolean;
    maxEntries: number;
  };
  features: {
    enableAnalytics: boolean;
    enableDebugMode: boolean;
    enableExperimentalFeatures: boolean;
    enableOfflineMode: boolean;
  };
  performance: {
    enableMetrics: boolean;
    sampleRate: number;
  };
}

const developmentConfig: EnvironmentConfig = {
  api: {
    baseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8000'),
    timeout: 60000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  logging: {
    level: 'debug',
    enableConsole: true,
    enableRemote: false,
    maxEntries: 1000,
  },
  features: {
    enableAnalytics: false,
    enableDebugMode: true,
    enableExperimentalFeatures: true,
    enableOfflineMode: true,
  },
  performance: {
    enableMetrics: true,
    sampleRate: 1.0,
  },
};

const productionConfig: EnvironmentConfig = {
  api: {
    baseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8000'),
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  logging: {
    level: 'warn',
    enableConsole: false,
    enableRemote: true,
    maxEntries: 100,
  },
  features: {
    enableAnalytics: true,
    enableDebugMode: false,
    enableExperimentalFeatures: false,
    enableOfflineMode: true,
  },
  performance: {
    enableMetrics: true,
    sampleRate: 0.1,
  },
};

const testConfig: EnvironmentConfig = {
  api: {
    baseUrl: '/api',
    timeout: 5000,
    retryAttempts: 1,
    retryDelay: 100,
  },
  logging: {
    level: 'error',
    enableConsole: false,
    enableRemote: false,
    maxEntries: 50,
  },
  features: {
    enableAnalytics: false,
    enableDebugMode: false,
    enableExperimentalFeatures: false,
    enableOfflineMode: false,
  },
  performance: {
    enableMetrics: false,
    sampleRate: 0,
  },
};

/**
 * Get environment-specific configuration
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = getCurrentEnvironment();
  
  switch (env) {
    case Environment.DEVELOPMENT:
      return developmentConfig;
    case Environment.PRODUCTION:
      return productionConfig;
    case Environment.TEST:
      return testConfig;
    default:
      return developmentConfig;
  }
};
