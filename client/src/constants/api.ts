/**
 * API Constants
 * All API endpoints, timeouts, retry logic, and configuration
 * Centralized for easy maintenance and configuration
 */

export const API = {
  // Base URLs
  baseUrls: {
    development: 'http://localhost:3000',
    staging: 'https://staging-api.example.com',
    production: 'https://api.example.com',
    local: 'http://localhost:8080',
  } as const,

  // API Endpoints
  endpoints: {
    // Authentication
    auth: {
      login: '/auth/login',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
      register: '/auth/register',
      forgotPassword: '/auth/forgot-password',
      resetPassword: '/auth/reset-password',
      verifyEmail: '/auth/verify-email',
      profile: '/auth/profile',
      updateProfile: '/auth/profile/update',
      changePassword: '/auth/change-password',
    } as const,

    // Chat and Messaging
    chat: {
      sessions: '/chat/sessions',
      createSession: '/chat/sessions/create',
      getSession: '/chat/sessions/{sessionId}',
      updateSession: '/chat/sessions/{sessionId}',
      deleteSession: '/chat/sessions/{sessionId}',
      messages: '/chat/sessions/{sessionId}/messages',
      sendMessage: '/chat/sessions/{sessionId}/messages',
      getMessage: '/chat/sessions/{sessionId}/messages/{messageId}',
      updateMessage: '/chat/sessions/{sessionId}/messages/{messageId}',
      deleteMessage: '/chat/sessions/{sessionId}/messages/{messageId}',
      conversations: '/chat/conversations',
      getConversation: '/chat/conversations/{conversationId}',
      updateConversation: '/chat/conversations/{conversationId}',
      deleteConversation: '/chat/conversations/{conversationId}',
    } as const,

    // Streaming
    streaming: {
      ask: '/ask/query',
      investigate: '/run_sse',
      thinking: '/streaming/thinking',
      toolCalls: '/streaming/tool-calls',
      citations: '/streaming/citations',
      events: '/streaming/events',
    } as const,

    // Admin
    admin: {
      dashboard: '/admin/dashboard',
      analytics: '/admin/analytics',
      users: '/admin/users',
      sessions: '/admin/sessions',
      announcements: '/admin/announcements',
      settings: '/admin/settings',
      logs: '/admin/logs',
      metrics: '/admin/metrics',
      health: '/admin/health',
      status: '/admin/status',
    } as const,

    // Analytics
    analytics: {
      events: '/analytics/events',
      metrics: '/analytics/metrics',
      reports: '/analytics/reports',
      dashboards: '/analytics/dashboards',
      exports: '/analytics/exports',
    } as const,

    // Files
    files: {
      upload: '/files/upload',
      download: '/files/download/{fileId}',
      delete: '/files/{fileId}',
      list: '/files',
      info: '/files/{fileId}/info',
    } as const,

    // Integrations
    integrations: {
      zendesk: '/integrations/zendesk',
      slack: '/integrations/slack',
      teams: '/integrations/teams',
      webhooks: '/integrations/webhooks',
    } as const,

    // System
    system: {
      health: '/health',
      status: '/status',
      version: '/version',
      config: '/config',
      info: '/info',
    } as const,
  } as const,

  // HTTP Methods
  methods: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS',
  } as const,

  // HTTP Status Codes
  statusCodes: {
    // Success
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    
    // Redirection
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    NOT_MODIFIED: 304,
    TEMPORARY_REDIRECT: 307,
    PERMANENT_REDIRECT: 308,
    
    // Client Errors
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    
    // Server Errors
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
  } as const,

  // Headers
  headers: {
    // Content Types
    CONTENT_TYPE: 'Content-Type',
    ACCEPT: 'Accept',
    AUTHORIZATION: 'Authorization',
    CACHE_CONTROL: 'Cache-Control',
    ETAG: 'ETag',
    LAST_MODIFIED: 'Last-Modified',
    IF_NONE_MATCH: 'If-None-Match',
    IF_MODIFIED_SINCE: 'If-Modified-Since',
    
    // CORS
    ACCESS_CONTROL_ALLOW_ORIGIN: 'Access-Control-Allow-Origin',
    ACCESS_CONTROL_ALLOW_METHODS: 'Access-Control-Allow-Methods',
    ACCESS_CONTROL_ALLOW_HEADERS: 'Access-Control-Allow-Headers',
    ACCESS_CONTROL_ALLOW_CREDENTIALS: 'Access-Control-Allow-Credentials',
    ACCESS_CONTROL_EXPOSE_HEADERS: 'Access-Control-Expose-Headers',
    
    // Security
    X_FRAME_OPTIONS: 'X-Frame-Options',
    X_CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
    X_XSS_PROTECTION: 'X-XSS-Protection',
    STRICT_TRANSPORT_SECURITY: 'Strict-Transport-Security',
    CONTENT_SECURITY_POLICY: 'Content-Security-Policy',
    
    // Custom
    X_REQUEST_ID: 'X-Request-ID',
    X_SESSION_ID: 'X-Session-ID',
    X_USER_ID: 'X-User-ID',
    X_API_VERSION: 'X-API-Version',
    X_CLIENT_VERSION: 'X-Client-Version',
  } as const,

  // Content Types
  contentTypes: {
    JSON: 'application/json',
    XML: 'application/xml',
    FORM_DATA: 'multipart/form-data',
    FORM_URLENCODED: 'application/x-www-form-urlencoded',
    TEXT_PLAIN: 'text/plain',
    TEXT_HTML: 'text/html',
    TEXT_CSS: 'text/css',
    TEXT_JAVASCRIPT: 'text/javascript',
    APPLICATION_JAVASCRIPT: 'application/javascript',
    APPLICATION_PDF: 'application/pdf',
    IMAGE_JPEG: 'image/jpeg',
    IMAGE_PNG: 'image/png',
    IMAGE_GIF: 'image/gif',
    IMAGE_SVG: 'image/svg+xml',
    AUDIO_MP3: 'audio/mpeg',
    AUDIO_WAV: 'audio/wav',
    VIDEO_MP4: 'video/mp4',
    VIDEO_WEBM: 'video/webm',
  } as const,

  // Timeouts (in milliseconds)
  timeouts: {
    request: 30000, // 30 seconds
    upload: 60000, // 60 seconds
    download: 120000, // 2 minutes
    streaming: 90000, // 90 seconds
    connection: 10000, // 10 seconds
    idle: 30000, // 30 seconds
    retry: 1000, // 1 second
    backoff: 2000, // 2 seconds
  } as const,

  // Retry Configuration
  retry: {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
    jitter: 0.1, // 10% jitter
    retryableStatusCodes: [408, 429, 500, 502, 503, 504] as const,
    retryableMethods: ['GET', 'POST', 'PUT', 'PATCH'] as const,
  } as const,

  // Rate Limiting
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    burstSize: 20,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: 'ip', // 'ip', 'user', 'session'
    handler: 'default', // 'default', 'custom'
  } as const,

  // Caching
  cache: {
    defaultTTL: 300000, // 5 minutes
    maxSize: 100,
    maxAge: 86400000, // 24 hours
    staleWhileRevalidate: 60000, // 1 minute
    staleIfError: 300000, // 5 minutes
  } as const,

  // Error Codes
  errorCodes: {
    // Authentication
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    ACCESS_DENIED: 'ACCESS_DENIED',
    
    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',
    VALUE_TOO_LONG: 'VALUE_TOO_LONG',
    VALUE_TOO_SHORT: 'VALUE_TOO_SHORT',
    
    // Resources
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
    RESOURCE_DELETED: 'RESOURCE_DELETED',
    
    // Rate Limiting
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    
    // Server
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    
    // Network
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    CONNECTION_ERROR: 'CONNECTION_ERROR',
    DNS_ERROR: 'DNS_ERROR',
  } as const,

  // WebSocket Events
  websocket: {
    events: {
      connect: 'connect',
      disconnect: 'disconnect',
      message: 'message',
      error: 'error',
      reconnect: 'reconnect',
      heartbeat: 'heartbeat',
      status: 'status',
    } as const,
    
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000,
    heartbeatTimeout: 5000,
  } as const,

  // SSE (Server-Sent Events)
  sse: {
    events: {
      message: 'message',
      thinking: 'thinking',
      toolCall: 'tool_call',
      citation: 'citation',
      error: 'error',
      done: 'done',
    } as const,
    
    reconnectTime: 2000,
    maxReconnectAttempts: 5,
    keepAliveInterval: 30000,
  } as const,

  // File Upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    allowedTypes: ['txt', 'pdf', 'doc', 'docx', 'csv', 'json', 'xml'],
    chunkSize: 1024 * 1024, // 1MB
    retryAttempts: 3,
    progressInterval: 100, // 100ms
  } as const,

  // API Versioning
  versioning: {
    current: 'v1',
    supported: ['v1'],
    deprecated: [],
    sunset: [],
    default: 'v1',
  } as const,

  // Feature Flags
  features: {
    streaming: true,
    thinking: true,
    toolCalls: true,
    citations: true,
    fileUpload: true,
    analytics: true,
    admin: true,
    integrations: true,
  } as const,
} as const;

/**
 * API helper functions
 */

/**
 * Build API URL with base URL and endpoint
 */
export const buildApiUrl = (
  endpoint: string,
  baseUrl?: string,
  params?: Record<string, string>
): string => {
  const base = baseUrl || API.baseUrls.development;
  let url = `${base}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, value);
    });
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};

/**
 * Replace path parameters in endpoint
 */
export const replacePathParams = (
  endpoint: string,
  params: Record<string, string>
): string => {
  let result = endpoint;
  
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`{${key}}`, value);
  });
  
  return result;
};

/**
 * Check if status code indicates success
 */
export const isSuccessStatus = (status: number): boolean => {
  return status >= 200 && status < 300;
};

/**
 * Check if status code indicates client error
 */
export const isClientError = (status: number): boolean => {
  return status >= 400 && status < 500;
};

/**
 * Check if status code indicates server error
 */
export const isServerError = (status: number): boolean => {
  return status >= 500 && status < 600;
};

/**
 * Check if status code is retryable
 */
export const isRetryableStatus = (status: number): boolean => {
  return (API.retry.retryableStatusCodes as readonly number[]).includes(status);
};

/**
 * Check if HTTP method is retryable
 */
export const isRetryableMethod = (method: string): boolean => {
  return (API.retry.retryableMethods as readonly string[]).includes(method.toUpperCase());
};

/**
 * Calculate retry delay with exponential backoff
 */
export const calculateRetryDelay = (
  attempt: number,
  baseDelay: number = API.retry.baseDelay,
  maxDelay: number = API.retry.maxDelay,
  multiplier: number = API.retry.backoffMultiplier,
  jitter: number = API.retry.jitter
): number => {
  const delay = Math.min(
    baseDelay * Math.pow(multiplier, attempt - 1),
    maxDelay
  );
  
  if (jitter > 0) {
    const jitterAmount = delay * jitter;
    return delay + (Math.random() - 0.5) * jitterAmount;
  }
  
  return delay;
};

/**
 * Create request headers
 */
export const createHeaders = (
  additionalHeaders?: Record<string, string>
): Record<string, string> => {
  const defaultHeaders = {
    [API.headers.CONTENT_TYPE]: API.contentTypes.JSON,
    [API.headers.ACCEPT]: API.contentTypes.JSON,
  };
  
  return {
    ...defaultHeaders,
    ...additionalHeaders,
  };
};

/**
 * Create authorization header
 */
export const createAuthHeader = (token: string): Record<string, string> => {
  return {
    [API.headers.AUTHORIZATION]: `Bearer ${token}`,
  };
};

/**
 * Parse API error response
 */
export const parseApiError = (response: Response, data?: any): Error => {
  const error = new Error(data?.message || `HTTP ${response.status}: ${response.statusText}`);
  (error as any).status = response.status;
  (error as any).statusText = response.statusText;
  (error as any).data = data;
  (error as any).code = data?.code;
  return error;
};
