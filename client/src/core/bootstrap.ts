/**
 * Application Bootstrap
 * initialization system
 */

import { appConfig, type AppConfig } from './config';
import { logger } from '../lib/logger';
import { APP_INFO, EVENT_NAMES } from '../constants';
import { runHealthChecks, type HealthCheckItem } from './health-check';
import { setupGlobalErrorHandlers, dispatchCustomEvent } from './error-handling';

export interface BootstrapOptions {
  onProgress?: (step: string, progress: number) => void;
}

export interface BootstrapResult {
  success: boolean;
  config: AppConfig;
  errors: string[];
  timestamp: number;
}

/**
 * Initialize the application
 */
export async function initializeApp(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const { onProgress } = options;
  const errors: string[] = [];

  logger.info('Starting application initialization...', { 
    appName: APP_INFO.NAME,
    version: APP_INFO.VERSION
  });

  try {
    // Step 1: Validate configuration : this onProgress is loader::
    onProgress?.('Validating configuration...', 20);
    await validateConfiguration();

    // Step 2: Setup error handling
    onProgress?.('Setting up error handling...', 40);
    setupErrorHandling();

    // Step 3: Initialize core services
    onProgress?.('Initializing core services...', 60);
    await initializeBasicServices();

    // Step 4: Final validation
    onProgress?.('Performing final checks...', 80);
    await performFinalChecks();

    // Complete
    onProgress?.('Initialization complete', 100);
    logger.info('Application initialization completed successfully', { 
      appName: APP_INFO.NAME,
      timestamp: Date.now() 
    });

    // Dispatch app initialized event
    dispatchCustomEvent(EVENT_NAMES.APP_INITIALIZED, { success: true });

    return {
      success: true,
      config: appConfig,
      errors: [],
      timestamp: Date.now()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
    errors.push(errorMessage);
    logger.error('Application initialization failed:', { error });
    
    dispatchCustomEvent(EVENT_NAMES.ERROR_OCCURRED, { 
      type: 'initialization_error',
      message: errorMessage
    });

    return {
      success: false,
      config: appConfig,
      errors: [errorMessage],
      timestamp: Date.now()
    };
  }
}

/**
 * Validate application configuration
 */
async function validateConfiguration(): Promise<void> {
  logger.debug('Validating application configuration...', { 
    app: APP_INFO.NAME 
  });

  // Basic configuration checks
  if (!appConfig) {
    throw new Error('Configuration object is missing');
  }

  // Check required API configuration
  if (!appConfig.api) {
    throw new Error('API configuration is missing');
  }

  // Validate API URL - critical for app to function
  if (!appConfig.api.baseUrl) {
    throw new Error('API base URL is required');
  }

  logger.debug('Configuration validation completed');
}

/**
 * Setup global error handling
 */
function setupErrorHandling(): void {
  setupGlobalErrorHandlers();
}

/**
 * Initialize basic services
 */
async function initializeBasicServices(): Promise<void> {
  logger.debug('Initializing basic services...', { 
    app: APP_INFO.NAME 
  });

  // No actual service initialization yet - just validate the logger is working
  if (!logger || typeof logger.info !== 'function') {
    throw new Error('Logger service is not properly initialized');
  }

  // Track performance metric
  dispatchCustomEvent(EVENT_NAMES.PERFORMANCE_METRIC, {
    name: 'core_services_init',
    value: performance.now(),
  });

  logger.debug('Basic services initialized successfully');
}

/**
 * Perform final validation checks
 */
async function performFinalChecks(): Promise<void> {
  logger.debug('Performing final validation...', { 
    app: APP_INFO.NAME 
  });

  // Define core service health checks
  const coreHealthChecks: Record<string, HealthCheckItem> = {
    'Configuration': {
      check: () => typeof appConfig === 'object' && appConfig !== null,
      critical: true
    },
    'Logger': {
      check: () => typeof logger === 'object' && typeof logger.info === 'function',
      critical: true
    },
    'Environment': {
      check: () => typeof import.meta !== 'undefined' && typeof import.meta.env === 'object',
      critical: true
    }
  };

  try {
    // Run health checks with auto-throw on critical failures
    await runHealthChecks(coreHealthChecks, { 
      throwOnFailure: true,
      logResults: true
    });
    
    logger.debug('Final validation completed successfully');
  } catch (error) {
    // Error already logged by health check utility
    dispatchCustomEvent(EVENT_NAMES.ERROR_OCCURRED, {
      type: 'health_check_failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Get application configuration
 */
export function getAppConfig(): AppConfig {
  return appConfig;
}

/**
 * Shutdown the application
 */
export async function shutdownApp(): Promise<void> {
  logger.info('Application shutdown initiated', {
    app: APP_INFO.NAME,
    timestamp: Date.now()
  });
  
  // Dispatch shutdown event
  dispatchCustomEvent(EVENT_NAMES.APP_INITIALIZED, { success: false, status: 'shutdown' });
  
  // Clear event listeners
  window.removeEventListener('error', () => {});
  window.removeEventListener('unhandledrejection', () => {});
  
  logger.info('Application shutdown completed');
}
