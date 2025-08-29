// Base configuration types and utilities
export interface BaseConfig {
  name: string;
  version: string;
  enabled: boolean;
  debug?: boolean;
}

export interface APIEndpoint {
  url: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number;
  dependencies?: string[];
}

export interface ServiceConfig extends BaseConfig {
  endpoints?: Record<string, APIEndpoint>;
  features?: Record<string, FeatureFlag>;
  settings?: Record<string, unknown>;
}

// Configuration validation utilities
export class ConfigValidator {
  static validateRequired(config: unknown, field: string): void {
    if (!config || typeof config !== 'object' || !(field in config)) {
      throw new Error(`Missing required configuration field: ${field}`);
    }
  }

  static validateType<T>(value: unknown, type: string, field: string): T {
    if (typeof value !== type) {
      throw new Error(`Invalid type for ${field}: expected ${type}, got ${typeof value}`);
    }
    return value as T;
  }

  static validateUrl(url: string, field: string): void {
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL format for ${field}: ${url}`);
    }
  }
}

// Environment-based configuration loading
export class ConfigLoader {
  private static cache = new Map<string, unknown>();

  static load<T>(key: string, defaultValue: T): T {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    const envValue = import.meta.env[`VITE_${key.toUpperCase()}`];
    const value = envValue !== undefined ? this.parseValue(envValue, defaultValue) : defaultValue;
    
    this.cache.set(key, value);
    return value as T;
  }

  private static parseValue<T>(envValue: string, defaultValue: T): T {
    if (typeof defaultValue === 'boolean') {
      return (envValue.toLowerCase() === 'true') as T;
    }
    if (typeof defaultValue === 'number') {
      const parsed = Number(envValue);
      return (isNaN(parsed) ? defaultValue : parsed) as T;
    }
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      try {
        return JSON.parse(envValue) as T;
      } catch {
        return defaultValue;
      }
    }
    return envValue as T;
  }

  static clear(): void {
    this.cache.clear();
  }
}
