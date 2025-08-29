/**
 * @deprecated Use enhanced configuration from core/config
 * This file is kept for backward compatibility during migration
 */

// Re-export from enhanced configuration system
export type { AppConfig } from '../core/config/app-config';
export { 
  appConfig,
  getConfigSection,
  isFeatureEnabled,
  getAPIConfig,
  ConfigManager
} from '../core/config/app-config';
