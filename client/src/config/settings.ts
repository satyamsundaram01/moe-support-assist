// User settings removed as per requirements
// Admin settings are managed separately through admin dashboard

export interface ChatModeConfig {
  name: string;
  description: string;
  placeholder: string;
  showThinking: boolean;
  showCitations: boolean;
  showToolCalls: boolean;
  icon: string;
  color: string;
}

export const CHAT_MODES: Record<string, ChatModeConfig> = {
  ask: {
    name: 'Ask Mode',
    description: 'Get direct answers to your questions',
    placeholder: 'Ask me anything...',
    showThinking: false,
    showCitations: true,
    showToolCalls: false,
    icon: '❓',
    color: 'blue',
  },
  investigate: {
    name: 'Investigate Mode',
    description: 'Deep dive with detailed reasoning and analysis',
    placeholder: 'What would you like me to investigate?',
    showThinking: true,
    showCitations: true,
    showToolCalls: true,
    icon: '🔍',
    color: 'purple',
  },
};

export interface ErrorConfig {
  maxRetries: number;
  retryDelay: number;
  showErrorDetails: boolean;
  fallbackMessages: Record<string, string>;
}

export const ERROR_CONFIG: ErrorConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  showErrorDetails: false,
  fallbackMessages: {
    network: 'Connection failed. Please check your internet connection.',
    timeout: 'Request timed out. Please try again.',
    server: 'Server error. Please try again later.',
    unknown: 'An unexpected error occurred. Please try again.',
    api: 'API error. Please check your configuration.',
  },
};

export interface PerformanceConfig {
  debounceDelay: number;
  throttleDelay: number;
  maxConcurrentRequests: number;
  enableLazyLoading: boolean;
  enableVirtualization: boolean;
}

export const PERFORMANCE_CONFIG: PerformanceConfig = {
  debounceDelay: 300,
  throttleDelay: 100,
  maxConcurrentRequests: 5,
  enableLazyLoading: true,
  enableVirtualization: true,
}; 