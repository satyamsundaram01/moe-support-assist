/**
 * Validation Constants
 * All validation patterns, rules, and limits
 * Centralized for consistent validation across the application
 */

export const VALIDATION = {
  // Regular Expression Patterns
  patterns: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/.+/,
    phone: /^\+?[\d\s\-()]+$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    username: /^[a-zA-Z0-9_-]{3,50}$/,
    sessionId: /^[a-zA-Z0-9_-]{10,100}$/,
    conversationId: /^[a-zA-Z0-9_-]{10,100}$/,
    messageId: /^[a-zA-Z0-9_-]{10,100}$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    date: /^\d{4}-\d{2}-\d{2}$/,
    time: /^\d{2}:\d{2}:\d{2}$/,
    datetime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    domain: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    fileExtension: /^\.([a-zA-Z0-9]+)$/,
    hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    base64: /^[A-Za-z0-9+/]*={0,2}$/,
    json: /^\{.*\}$|^\[.*\]$/,
    markdown: /^[#*`\[\]()!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?\s\w]+$/,
    codeBlock: /^```[\s\S]*```$/,
    citation: /^\[(\d+)\]$/,
    thinking: /^\/\*THINKING\*\/[\s\S]*\/\*\/THINKING\*\/$/,
    toolCall: /^\/\*TOOL_CALL\*\/[\s\S]*\/\*\/TOOL_CALL\*\/$/,
  } as const,

  // Length Limits
  lengths: {
    // User-related
    minPasswordLength: 8,
    maxPasswordLength: 128,
    minUsernameLength: 3,
    maxUsernameLength: 50,
    minEmailLength: 5,
    maxEmailLength: 254,
    minNameLength: 1,
    maxNameLength: 100,
    
    // Session-related
    minSessionIdLength: 10,
    maxSessionIdLength: 100,
    minConversationIdLength: 10,
    maxConversationIdLength: 100,
    minMessageIdLength: 10,
    maxMessageIdLength: 100,
    
    // Content-related
    minTitleLength: 1,
    maxTitleLength: 200,
    minDescriptionLength: 0,
    maxDescriptionLength: 1000,
    minMessageLength: 1,
    maxMessageLength: 4096,
    minCommentLength: 0,
    maxCommentLength: 500,
    
    // URL and path
    minUrlLength: 10,
    maxUrlLength: 2048,
    minPathLength: 1,
    maxPathLength: 500,
    
    // Phone and contact
    minPhoneLength: 10,
    maxPhoneLength: 20,
    minAddressLength: 10,
    maxAddressLength: 500,
    
    // File-related
    minFileNameLength: 1,
    maxFileNameLength: 255,
    minFileDescriptionLength: 0,
    maxFileDescriptionLength: 500,
    
    // Search and query
    minSearchLength: 1,
    maxSearchLength: 100,
    minQueryLength: 1,
    maxQueryLength: 1000,
    
    // API-related
    minApiKeyLength: 10,
    maxApiKeyLength: 100,
    minTokenLength: 10,
    maxTokenLength: 1000,
  } as const,

  // Numeric Limits
  numbers: {
    // Pagination
    minPageSize: 1,
    maxPageSize: 100,
    defaultPageSize: 20,
    
    // Timeouts (in milliseconds)
    minTimeout: 100,
    maxTimeout: 300000, // 5 minutes
    defaultTimeout: 30000, // 30 seconds
    
    // Retries
    minRetries: 0,
    maxRetries: 10,
    defaultRetries: 3,
    
    // File sizes (in bytes)
    minFileSize: 1,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    
    // Counts
    minItems: 0,
    maxItems: 1000,
    minListLength: 0,
    maxListLength: 100,
    
    // Percentages
    minPercentage: 0,
    maxPercentage: 100,
    
    // Ratings and scores
    minRating: 1,
    maxRating: 5,
    minScore: 0,
    maxScore: 100,
  } as const,

  // Content Validation Rules
  content: {
    // Message content
    allowedMessageTypes: ['text', 'markdown', 'code', 'json', 'xml', 'html'],
    forbiddenWords: ['spam', 'scam', 'hack', 'crack'],
    maxLinks: 10,
    maxImages: 5,
    maxCodeBlocks: 10,
    maxTables: 5,
    
    // File content
    allowedFileTypes: ['txt', 'pdf', 'doc', 'docx', 'csv', 'json', 'xml', 'md'],
    allowedImageTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    allowedVideoTypes: ['mp4', 'webm', 'ogg'],
    allowedAudioTypes: ['mp3', 'wav', 'ogg'],
    
    // Code content
    maxCodeLength: 10000,
    allowedLanguages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'php', 'ruby', 'go', 'rust'],
    maxLineLength: 120,
    maxFunctionLength: 50,
    
    // Markdown content
    maxHeadingLevel: 6,
    maxListDepth: 5,
    maxTableColumns: 10,
    maxTableRows: 100,
  } as const,

  // Business Logic Validation
  business: {
    // Session limits
    maxSessionsPerUser: 100,
    maxMessagesPerSession: 1000,
    maxConversationsPerUser: 50,
    
    // Rate limiting
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000,
    maxRequestsPerDay: 10000,
    
    // Storage limits
    maxStoragePerUser: 100 * 1024 * 1024, // 100MB
    maxCacheSize: 50,
    maxHistorySize: 100,
    
    // Time limits
    maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
    minSessionDuration: 5 * 1000, // 5 seconds
    maxIdleTime: 30 * 60 * 1000, // 30 minutes
    
    // Quality thresholds
    minResponseQuality: 0.7,
    maxResponseTime: 30000, // 30 seconds
    minCitationCount: 1,
    maxCitationCount: 10,
  } as const,

  // Security Validation
  security: {
    // Password requirements
    minPasswordComplexity: 3, // number of character types required
    passwordHistorySize: 5,
    maxPasswordAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    
    // Session security
    maxConcurrentSessions: 3,
    sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours
    tokenMaxAge: 60 * 60 * 1000, // 1 hour
    
    // Input sanitization
    maxInputLength: 10000,
    maxNestedDepth: 10,
    maxArrayLength: 1000,
    maxObjectKeys: 100,
    
    // Rate limiting
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    maxFailedRequests: 10,
    
    // File upload security
    maxFileCount: 5,
    maxFileNameLength: 255,
    allowedFileExtensions: ['.txt', '.pdf', '.doc', '.docx', '.csv', '.json', '.xml'],
    maxFileContentLength: 10 * 1024 * 1024, // 10MB
  } as const,

  // API Validation
  api: {
    // Request limits
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    maxQueryLength: 2048,
    maxHeaderCount: 50,
    maxHeaderLength: 8192,
    
    // Response limits
    maxResponseSize: 50 * 1024 * 1024, // 50MB
    maxResponseTime: 30000, // 30 seconds
    
    // Authentication
    maxApiKeyLength: 100,
    maxTokenLength: 1000,
    tokenExpiryTime: 60 * 60 * 1000, // 1 hour
    
    // Rate limiting
    maxRequestsPerSecond: 10,
    maxRequestsPerMinute: 100,
    maxRequestsPerHour: 1000,
    
    // Error handling
    maxErrorRetries: 3,
    maxErrorLogSize: 1000,
    errorRetryDelay: 1000, // 1 second
  } as const,
} as const;

/**
 * Validation helper functions
 */

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  return VALIDATION.patterns.email.test(email) && 
         email.length >= VALIDATION.lengths.minEmailLength && 
         email.length <= VALIDATION.lengths.maxEmailLength;
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  return VALIDATION.patterns.url.test(url) && 
         url.length >= VALIDATION.lengths.minUrlLength && 
         url.length <= VALIDATION.lengths.maxUrlLength;
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= VALIDATION.lengths.minPasswordLength && 
         password.length <= VALIDATION.lengths.maxPasswordLength &&
         VALIDATION.patterns.password.test(password);
};

/**
 * Validate username format
 */
export const isValidUsername = (username: string): boolean => {
  return VALIDATION.patterns.username.test(username) && 
         username.length >= VALIDATION.lengths.minUsernameLength && 
         username.length <= VALIDATION.lengths.maxUsernameLength;
};

/**
 * Validate session ID format
 */
export const isValidSessionId = (sessionId: string): boolean => {
  return VALIDATION.patterns.sessionId.test(sessionId) && 
         sessionId.length >= VALIDATION.lengths.minSessionIdLength && 
         sessionId.length <= VALIDATION.lengths.maxSessionIdLength;
};

/**
 * Validate conversation ID format
 */
export const isValidConversationId = (conversationId: string): boolean => {
  return VALIDATION.patterns.conversationId.test(conversationId) && 
         conversationId.length >= VALIDATION.lengths.minConversationIdLength && 
         conversationId.length <= VALIDATION.lengths.maxConversationIdLength;
};

/**
 * Validate message content
 */
export const isValidMessageContent = (content: string): boolean => {
  return content.length >= VALIDATION.lengths.minMessageLength && 
         content.length <= VALIDATION.lengths.maxMessageLength &&
         !VALIDATION.content.forbiddenWords.some(word => 
           content.toLowerCase().includes(word.toLowerCase())
         );
};


/**
 * Validate against length limits
 */
export const validateLength = (
  value: string,
  minLength: number,
  maxLength: number
): boolean => {
  return value.length >= minLength && value.length <= maxLength;
};

/**
 * Validate against numeric limits
 */
export const validateNumber = (
  value: number,
  minValue: number,
  maxValue: number
): boolean => {
  return value >= minValue && value <= maxValue;
};
