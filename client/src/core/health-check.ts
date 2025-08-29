/**
 * Health Check Utilities
 * Reusable health check functions for monitoring service status
 */

import { logger } from '../lib/logger';
import { EVENT_NAMES } from '../constants';

export interface HealthCheckItem {
  check: () => boolean;
  critical: boolean;
  timeout?: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  failedChecks: string[];
  timestamp: number;
}

/**
 * Run health checks against provided services
 */
export async function runHealthChecks(
  checks: Record<string, HealthCheckItem>,
  options: { logResults?: boolean; throwOnFailure?: boolean } = {}
): Promise<HealthCheckResult> {
  const { logResults = true, throwOnFailure = false } = options;
  const timestamp = Date.now();
  
  logger.debug('Running health checks...');
  
  // Run all checks
  const results = await Promise.all(
    Object.entries(checks).map(async ([name, { check, critical, timeout }]) => {
      try {
        // Apply timeout if specified
        if (timeout) {
          const checkPromise = Promise.resolve(check());
          const timeoutPromise = new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error(`Health check timed out after ${timeout}ms`)), timeout)
          );
          
          const result = await Promise.race([checkPromise, timeoutPromise]);
          return { name, success: result, critical };
        } else {
          // Regular check
          const result = await Promise.resolve(check());
          return { name, success: result, critical };
        }
      } catch (error) {
        logger.warn(`Health check for ${name} failed:`, { error });
        return { name, success: false, critical, error };
      }
    })
  );
  
  // Filter failed checks
  const failedChecks = results
    .filter(result => !result.success)
    .map(result => result.name);
    
  // Filter critical failures
  const criticalFailures = results
    .filter(result => !result.success && result.critical)
    .map(result => result.name);

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (criticalFailures.length > 0) {
    status = 'unhealthy';
  } else if (failedChecks.length > 0) {
    status = 'degraded';
  }
  
  // Prepare result
  const result: HealthCheckResult = {
    status,
    failedChecks,
    timestamp
  };
  
  // Log results if requested
  if (logResults) {
    if (status === 'healthy') {
      logger.info('Health checks passed successfully');
    } else if (status === 'degraded') {
      logger.warn('Health checks completed with non-critical failures', { 
        failedChecks 
      });
    } else {
      logger.error('Health checks failed with critical errors', { 
        criticalFailures 
      });
    }
  }
  
  // Throw error if requested and there are critical failures
  if (throwOnFailure && criticalFailures.length > 0) {
    throw new Error(`Critical services are not healthy: ${criticalFailures.join(', ')}`);
  }
  
  return result;
}

/**
 * Dispatch a health status event
 */
export function dispatchHealthStatus(result: HealthCheckResult): void {
  const event = new CustomEvent(EVENT_NAMES.PERFORMANCE_METRIC, { 
    detail: {
      name: 'health_check',
      status: result.status,
      failedChecks: result.failedChecks,
      timestamp: result.timestamp
    }
  });
  
  window.dispatchEvent(event);
}
