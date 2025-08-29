/**
 * Business Rules Constants
 * Domain logic limits, thresholds, and business rules
 * Centralized for easy maintenance and configuration
 */

export const BUSINESS_RULES = {
  // Chat and Messaging Limits
  chat: {
    maxMessageLength: 4096,
    maxTitleLength: 50,
    titleTruncateLength: 47,
    titleDisplayLength: 27,
    titleDisplayTruncate: 22,
    maxConversationTurns: 50,
    maxThinkingSteps: 100,
    maxRawEvents: 100,
    maxToolCalls: 10,
    maxCitations: 20,
    maxDataSources: 10,
    messageDebounceDelay: 1000,
    errorAutoClearDelay: 5000,
    sseReconnectDelay: 2000,
    streamingTimeout: 90000, // 90 seconds
    sessionTimeout: 3600000, // 1 hour
  } as const,

  // API and Network Limits
  api: {
    maxRetries: 3,
    retryDelay: 1000,
    requestTimeout: 30000, // 30 seconds
    uploadTimeout: 60000, // 60 seconds
    maxConcurrentRequests: 5,
    rateLimitWindow: 60000, // 1 minute
    maxRequestsPerWindow: 100,
    cacheExpiry: 300000, // 5 minutes
    sessionCacheSize: 100,
    messageCacheSize: 1000,
  } as const,

  // Storage and Cache Limits
  storage: {
    maxConversations: 100,
    maxMessagesPerConversation: 1000,
    maxLocalStorageSize: 10 * 1024 * 1024, // 10MB
    maxSessionStorageSize: 5 * 1024 * 1024, // 5MB
    maxCacheSize: 50,
    maxHistorySize: 100,
    storageVersion: '1.0.0',
    cleanupInterval: 86400000, // 24 hours
  } as const,

  // User Interface Limits
  ui: {
    maxSearchResults: 50,
    maxDropdownItems: 20,
    maxTooltipLength: 200,
    maxNotificationLength: 100,
    maxBannerLength: 500,
    maxModalWidth: 800,
    maxModalHeight: 600,
    minInputLength: 1,
    maxInputLength: 10000,
    paginationPageSize: 20,
    infiniteScrollThreshold: 100,
    scrollThreshold: 100,
    hoverDelay: 300,
    clickDelay: 150,
    animationDuration: 200,
    transitionDuration: 150,
  } as const,

  // File Upload Limits
  files: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFilesPerUpload: 5,
    allowedFileTypes: ['txt', 'pdf', 'doc', 'docx', 'csv', 'json', 'xml'],
    maxFileNameLength: 255,
    maxFileDescriptionLength: 500,
  } as const,

  // Validation Rules
  validation: {
    minPasswordLength: 8,
    maxPasswordLength: 128,
    minUsernameLength: 3,
    maxUsernameLength: 50,
    minEmailLength: 5,
    maxEmailLength: 254,
    minSessionIdLength: 10,
    maxSessionIdLength: 100,
    minConversationIdLength: 10,
    maxConversationIdLength: 100,
    minMessageIdLength: 10,
    maxMessageIdLength: 100,
    minTitleLength: 1,
    maxTitleLength: 200,
    minDescriptionLength: 0,
    maxDescriptionLength: 1000,
    minUrlLength: 10,
    maxUrlLength: 2048,
    minPhoneLength: 10,
    maxPhoneLength: 20,
  } as const,

  // Performance Thresholds
  performance: {
    maxRenderTime: 16, // 60fps target
    maxLoadTime: 3000, // 3 seconds
    maxApiResponseTime: 5000, // 5 seconds
    maxStreamingDelay: 1000, // 1 second
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    maxCpuUsage: 80, // 80%
    maxNetworkLatency: 1000, // 1 second
    minFrameRate: 30,
    targetFrameRate: 60,
  } as const,

  // Security Rules
  security: {
    maxLoginAttempts: 5,
    lockoutDuration: 900000, // 15 minutes
    sessionMaxAge: 86400000, // 24 hours
    tokenRefreshThreshold: 300000, // 5 minutes
    maxConcurrentSessions: 3,
    passwordHistorySize: 5,
    minPasswordComplexity: 3, // number of character types required
    maxFailedRequests: 10,
    rateLimitBurst: 20,
    csrfTokenExpiry: 3600000, // 1 hour
  } as const,

  // Analytics and Monitoring
  analytics: {
    maxEventBatchSize: 100,
    maxEventQueueSize: 1000,
    eventFlushInterval: 5000, // 5 seconds
    maxMetricsRetention: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxErrorLogSize: 1000,
    maxPerformanceLogSize: 1000,
    maxUserSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
    minSessionDuration: 5000, // 5 seconds
  } as const,

  // Feature Flags and Toggles
  features: {
    enableStreaming: true,
    enableThinking: true,
    enableToolCalls: true,
    enableCitations: true,
    enableFileUpload: true,
    enableAnalytics: true,
    enableFeedback: true,
    enableRateLimiting: true,
    enableCaching: true,
    enableOfflineMode: false,
    enableExperimentalFeatures: false,
    enableDebugMode: false,
  } as const,

  // Default Values
  defaults: {
    temperature: 0.7,
    maxTokens: 4096,
    model: 'gemini-pro',
    dataSources: ['all'],
    maxResults: 5,
    includeCitations: true,
    autoScroll: true,
    showThinking: false,
    showRawEvents: false,
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
  } as const,

  // Thresholds for Actions
  thresholds: {
    // Scroll thresholds
    scrollToBottomThreshold: 100,
    infiniteScrollThreshold: 50,
    lazyLoadThreshold: 200,
    
    // Performance thresholds
    slowRenderThreshold: 100,
    slowApiThreshold: 3000,
    slowStreamingThreshold: 2000,
    
    // Error thresholds
    maxConsecutiveErrors: 3,
    maxErrorRate: 0.1, // 10%
    maxTimeoutRate: 0.05, // 5%
    
    // Quality thresholds
    minResponseQuality: 0.7,
    maxResponseTime: 30000,
    minCitationCount: 1,
    maxCitationCount: 10,
  } as const,
} as const;

/**
 * Helper function to get business rule with fallback
 */
export const getBusinessRule = <T>(
  path: string,
  fallback: T
): T => {
  const keys = path.split('.');
  let value: any = BUSINESS_RULES;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return fallback;
    }
  }
  
  return value as T;
};

/**
 * Helper function to check if a value exceeds a business rule limit
 */
export const exceedsLimit = (path: string, value: number): boolean => {
  const limit = getBusinessRule(path, 0);
  return value > limit;
};

/**
 * Helper function to validate against business rules
 */
export const validateBusinessRule = (
  path: string,
  value: any,
  type: 'min' | 'max' | 'exact' = 'max'
): boolean => {
  const rule = getBusinessRule(path, null);
  
  if (rule === null) return true;
  
  switch (type) {
    case 'min':
      return value >= rule;
    case 'max':
      return value <= rule;
    case 'exact':
      return value === rule;
    default:
      return true;
  }
}; 