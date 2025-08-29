/**
 * Application Initialization Hook
 * React hook for managing application bootstrap and initialization
 */

import { useState, useEffect, useCallback } from 'react';
import { initializeApp, getAppConfig, shutdownApp, type BootstrapOptions, type BootstrapResult } from '../core/bootstrap';
import { type AppConfig } from '../core/config/app-config';
import { logger } from '../lib/logger';

export interface UseAppInitializationState {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  progress: number;
  currentStep: string;
  result: BootstrapResult | null;
}

export interface UseAppInitializationActions {
  initialize: (options?: BootstrapOptions) => Promise<void>;
  reinitialize: () => Promise<void>;
  getConfig: () => AppConfig;
}

export type UseAppInitializationReturn = UseAppInitializationState & UseAppInitializationActions;

/**
 * Hook for managing application initialization
 */
export function useAppInitialization(autoInitialize = true): UseAppInitializationReturn {
  const [state, setState] = useState<UseAppInitializationState>({
    isInitialized: false,
    isInitializing: false,
    error: null,
    progress: 0,
    currentStep: '',
    result: null,
  });

  const initialize = useCallback(async (options?: BootstrapOptions) => {
    setState(prev => ({
      ...prev,
      isInitializing: true,
      error: null,
      progress: 0,
      currentStep: 'Starting initialization...',
    }));

    try {
      const result = await initializeApp({
        ...options,
        onProgress: (step: string, progress: number) => {
          setState(prev => ({
            ...prev,
            currentStep: step,
            progress,
          }));
        },
      });

      setState(prev => ({
        ...prev,
        isInitialized: result.success,
        isInitializing: false,
        error: result.success ? null : result.errors.join(', '),
        result,
        progress: 100,
        currentStep: result.success ? 'Initialization complete' : 'Initialization failed',
      }));

      if (!result.success) {
        logger.error('Application initialization failed:', { errors: result.errors });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      setState(prev => ({
        ...prev,
        isInitialized: false,
        isInitializing: false,
        error: errorMessage,
        progress: 0,
        currentStep: 'Initialization failed',
      }));
      logger.error('Application initialization error:', { error });
    }
  }, []);

  const reinitialize = useCallback(async () => {
    // Reset app state and reinitialize
    try {
      await shutdownApp();
    } catch (error) {
      logger.warn('Error during shutdown before reinitialize:', { error });
    }
    
    setState({
      isInitialized: false,
      isInitializing: false,
      error: null,
      progress: 0,
      currentStep: '',
      result: null,
    });

    await initialize();
  }, [initialize]);

  const getConfig = useCallback(() => {
    return getAppConfig();
  }, []);

  // Auto-initialize on mount if requested
  useEffect(() => {
    if (autoInitialize && !state.isInitialized && !state.isInitializing) {
      initialize();
    }
  }, [autoInitialize, initialize, state.isInitialized, state.isInitializing]);

  return {
    ...state,
    initialize,
    reinitialize,
    getConfig,
  };
}

/**
 * Hook for accessing application configuration
 */
export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(() => {
    try {
      return getAppConfig();
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Update config when app is initialized
    const checkConfig = () => {
      try {
        const currentConfig = getAppConfig();
        setConfig(currentConfig);
      } catch {
        // App not initialized yet
      }
    };

    // Initial check
    checkConfig();

    // Check periodically
    const interval = setInterval(checkConfig, 1000);
    return () => clearInterval(interval);
  }, []);

  return config;
}

/**
 * Hook for service health monitoring
 * 
 * Note: This hook is simplified for now and will be enhanced
 * when we implement a full service health monitoring system
 */
export function useServiceHealth() {
  const [health, setHealth] = useState<{ status: string, services: Record<string, string> } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        // Basic health check for now
        const healthStatus = {
          status: 'healthy',
          services: {
            api: 'up',
            storage: 'up',
            configuration: 'up'
          }
        };
        
        if (mounted) {
          setHealth(healthStatus);
          setLastUpdate(Date.now());
        }
      } catch (error) {
        logger.warn('Failed to check service health:', { error });
      }
    };

    // Initial check
    checkHealth();

    // Setup periodic health checks
    const interval = setInterval(checkHealth, 30000); // Every 30 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { health, lastUpdate };
}
