/**
 * Application Bootstrap
 * Simple initialization system
 */

import { appConfig, type AppConfig } from './config';
import { logger } from '../lib/logger';

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

  logger.info('Starting application initialization...');

  try {
    // Step 1: Validate configuration
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
    logger.info('Application initialization completed successfully');

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
  logger.debug('Validating application configuration...');

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
  logger.debug('Setting up error handling...');

  // Global error handler
  window.addEventListener('error', (event) => {
    logger.error('Global error caught:', {
      message: event.error?.message || event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection:', {
      reason: event.reason?.message || 'Unknown reason',
    });
  });

  logger.debug('Error handling setup completed');
}

/**
 * Initialize basic services
 */
async function initializeBasicServices(): Promise<void> {
  logger.debug('Initializing basic services...');

  // No actual service initialization yet - just validate the logger is working
  if (!logger || typeof logger.info !== 'function') {
    throw new Error('Logger service is not properly initialized');
  }

  logger.debug('Basic services initialized successfully');
}

/**
 * Perform final validation checks
 */
async function performFinalChecks(): Promise<void> {
  logger.debug('Performing final validation...');

  // Simple health checks
  const checks = [
    {
      name: 'Configuration',
      check: () => typeof appConfig === 'object' && appConfig !== null,
    },
    {
      name: 'Logger',
      check: () => typeof logger === 'object' && typeof logger.info === 'function',
    },
    {
      name: 'Environment',
      check: () => typeof import.meta !== 'undefined' && typeof import.meta.env === 'object',
    },
  ];

  const failedChecks = checks.filter(({ check }) => {
    try {
      return !check();
    } catch {
      return true;
    }
  });

  if (failedChecks.length > 0) {
    const failedNames = failedChecks.map(({ name }) => name).join(', ');
    throw new Error(`Critical services are not healthy: ${failedNames}`);
  }

  logger.debug('Final validation completed successfully');
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
  logger.info('Application shutdown completed');
}
