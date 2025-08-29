/**
 * Environment Configuration
 */

export const Environment = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export type Environment = typeof Environment[keyof typeof Environment];

export interface EnvironmentConfig {
  NODE_ENV: Environment;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  isTest: boolean;
  
  // API Configuration
  apiBaseUrl: string;
  appName: string;
  
  // Authentication
  oktaClientId: string;
  oktaIssuer: string;
  oktaRedirectUri: string;
  
  // Zendesk Configuration
  zendeskDomain: string;
  zendeskApiToken: string;
  zendeskEmail: string;
  zendeskSubdomain: string;
  
  // Logging
  enableConsoleLogs: boolean;
  logEndpoint?: string;
  
  // Feature Flags
  enableAnalytics: boolean;
  enableCaching: boolean;
  enableDebugMode: boolean;
  
  // Performance
  apiTimeout: number;
  retryAttempts: number;
  cacheExpiry: number;
}

/**
 * Get current environment
 */
export const getCurrentEnvironment = (): Environment => {
  const nodeEnv = import.meta.env.NODE_ENV;
  const mode = import.meta.env.MODE;
  
  if (mode === 'test' || nodeEnv === 'test') return Environment.TEST;
  if (mode === 'staging') return Environment.STAGING;
  if (mode === 'production' || nodeEnv === 'production') return Environment.PRODUCTION;
  
  return Environment.DEVELOPMENT;
};

/**
 * Validate required environment variables
 */
const validateEnvironmentVariables = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Required variables
  const required = [
    'VITE_OKTA_CLIENT_ID',
    'VITE_OKTA_ISSUER',
    'VITE_API_BASE_URL',
  ];
  
  for (const variable of required) {
    if (!import.meta.env[variable]) {
      errors.push(`Missing required environment variable: ${variable}`);
    }
  }
  
  // Validate URLs
  const urlVariables = ['VITE_OKTA_ISSUER', 'VITE_API_BASE_URL'];
  for (const variable of urlVariables) {
    const value = import.meta.env[variable];
    if (value && !isValidUrl(value)) {
      errors.push(`Invalid URL format for ${variable}: ${value}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check if a string is a valid URL
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Create environment configuration with defaults and validation
 */
const createEnvironmentConfig = (): EnvironmentConfig => {
  const currentEnv = getCurrentEnvironment();
  const validation = validateEnvironmentVariables();
  
  if (!validation.isValid) {
    console.error('Environment validation failed:', validation.errors);
    // In development, we can continue with warnings
    // In production, this should throw an error
    if (currentEnv === Environment.PRODUCTION) {
      throw new Error(`Environment validation failed: ${validation.errors.join(', ')}`);
    }
  }
  
  return {
    NODE_ENV: currentEnv,
    isDevelopment: currentEnv === Environment.DEVELOPMENT,
    isStaging: currentEnv === Environment.STAGING,
    isProduction: currentEnv === Environment.PRODUCTION,
    isTest: currentEnv === Environment.TEST,
    
    // API Configuration
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    appName: import.meta.env.VITE_APP_NAME || 'moe_support_agent',
    
    // Authentication
    oktaClientId: import.meta.env.VITE_OKTA_CLIENT_ID || '',
    oktaIssuer: import.meta.env.VITE_OKTA_ISSUER || '',
    oktaRedirectUri: import.meta.env.VITE_OKTA_REDIRECT_URI || 'http://localhost:5173/login/callback',
    
    // Zendesk Configuration
    zendeskDomain: import.meta.env.VITE_ZENDESK_DOMAIN || 'moengage',
    zendeskApiToken: import.meta.env.VITE_ZENDESK_API_TOKEN || '',
    zendeskEmail: import.meta.env.VITE_ZENDESK_EMAIL || '',
    zendeskSubdomain: import.meta.env.VITE_ZENDESK_SUBDOMAIN || 'moengage.zendesk.com',
    
    // Logging
    enableConsoleLogs: currentEnv === Environment.DEVELOPMENT || import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true',
    logEndpoint: import.meta.env.VITE_LOG_ENDPOINT,
    
    // Feature Flags
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
    enableCaching: import.meta.env.VITE_ENABLE_CACHING !== 'false',
    enableDebugMode: currentEnv === Environment.DEVELOPMENT || import.meta.env.VITE_DEBUG_MODE === 'true',
    
    // Performance
    apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(import.meta.env.VITE_RETRY_ATTEMPTS || '3', 10),
    cacheExpiry: parseInt(import.meta.env.VITE_CACHE_EXPIRY || '300000', 10), // 5 minutes
  };
};

// Export singleton instance
export const env = createEnvironmentConfig();

// Export validation function for testing
export { validateEnvironmentVariables };
