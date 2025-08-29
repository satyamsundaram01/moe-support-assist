/**
 * Base Service Interface
 * Common interface for all application services
 */

export interface ServiceConfig {
  name: string;
  version: string;
  enabled: boolean;
  dependencies?: string[];
}

export interface ServiceStatus {
  isHealthy: boolean;
  lastCheck: number;
  error?: string;
}

export interface BaseService {
  config: ServiceConfig;
  status: ServiceStatus;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  
  // Health check
  healthCheck(): Promise<ServiceStatus>;
}

/**
 * Service Registry
 * Manages service lifecycle and dependencies
 */
export class ServiceRegistry {
  private services = new Map<string, BaseService>();
  private initialized = false;

  /**
   * Register a service
   */
  register(name: string, service: BaseService): void {
    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`);
    }
    this.services.set(name, service);
  }

  /**
   * Get a service by name
   */
  get<T extends BaseService>(name: string): T | undefined {
    return this.services.get(name) as T;
  }

  /**
   * Initialize all services in dependency order
   */
  async initializeAll(): Promise<void> {
    if (this.initialized) return;

    const sortedServices = this.resolveDependencies();
    
    for (const service of sortedServices) {
      try {
        await service.initialize();
        console.log(`Service ${service.config.name} initialized successfully`);
      } catch (error) {
        console.error(`Failed to initialize service ${service.config.name}:`, error);
        throw error;
      }
    }

    this.initialized = true;
  }

  /**
   * Destroy all services
   */
  async destroyAll(): Promise<void> {
    const services = Array.from(this.services.values()).reverse();
    
    for (const service of services) {
      try {
        await service.destroy();
      } catch (error) {
        console.error(`Failed to destroy service ${service.config.name}:`, error);
      }
    }

    this.initialized = false;
  }

  /**
   * Get health status of all services
   */
  async getHealthStatus(): Promise<Record<string, ServiceStatus>> {
    const status: Record<string, ServiceStatus> = {};
    
    for (const [name, service] of this.services) {
      try {
        status[name] = await service.healthCheck();
      } catch (error) {
        status[name] = {
          isHealthy: false,
          lastCheck: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return status;
  }

  /**
   * Resolve service dependencies and return sorted list
   */
  private resolveDependencies(): BaseService[] {
    const sorted: BaseService[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (serviceName: string) => {
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving ${serviceName}`);
      }
      if (visited.has(serviceName)) return;

      visiting.add(serviceName);
      
      const service = this.services.get(serviceName);
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }

      // Visit dependencies first
      if (service.config.dependencies) {
        for (const dep of service.config.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(serviceName);
      visited.add(serviceName);
      sorted.push(service);
    };

    // Visit all services
    for (const serviceName of this.services.keys()) {
      visit(serviceName);
    }

    return sorted;
  }
}

/**
 * Global service registry instance
 */
export const serviceRegistry = new ServiceRegistry();
