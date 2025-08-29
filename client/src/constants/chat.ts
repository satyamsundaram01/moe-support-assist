// Chat-related constants to eliminate magic strings and numbers
export const CHAT_CONSTANTS = {
  // Timeouts and delays
  DEBOUNCE_DELAY: 1000,
  ERROR_AUTO_CLEAR_DELAY: 5000,
  SSE_RECONNECT_DELAY: 2000,
  
  // Limits
  MAX_MESSAGE_LENGTH: 4096,
  MAX_THINKING_STEPS: 100,
  MAX_RAW_EVENTS: 100,
  MAX_TITLE_LENGTH: 50,
  TITLE_TRUNCATE_LENGTH: 47,
  TITLE_DISPLAY_LENGTH: 27,
  TITLE_DISPLAY_TRUNCATE: 22,
  
  // Default values
  DEFAULT_DATA_SOURCES: ['all'],
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4096,
  DEFAULT_MODEL: 'gemini-pro',
  
  // Event types
  SSE_EVENTS: {
    THINKING: 'thinking',
    RESPONDING: 'responding',
    TOOL_CALLING: 'tool_calling',
    ERROR: 'error',
    COMPLETE: 'complete'
  },
  
  // Streaming phases
  STREAMING_PHASES: {
    IDLE: 'idle',
    THINKING: 'thinking',
    RESPONDING: 'responding',
    TOOL_CALLING: 'tool_calling',
    FINALIZING: 'finalizing'
  },
  
  // Message statuses
  MESSAGE_STATUS: {
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    ERROR: 'error'
  },
  
  // Session statuses
  SESSION_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ERROR: 'error'
  },
  
  // Thinking step types
  THINKING_TYPES: {
    PLANNING: 'planning',
    REASONING: 'reasoning',
    ACTION: 'action',
    FINAL_ANSWER: 'final_answer'
  },
  
  // Markers for content processing
  CONTENT_MARKERS: {
    FINAL_ANSWER: '/*FINAL_ANSWER*/',
    REASONING: '/*REASONING*/',
    PLANNING: '/_PLANNING_/',
    ACTION: '/_ACTION_/'
  }
} as const;

// Error messages
export const CHAT_ERRORS = {
  NO_AUTH_USER: 'User must be authenticated to perform this action',
  SESSION_CREATION_FAILED: 'Failed to create session',
  STREAMING_FAILED: 'Streaming failed',
  SSE_CONNECTION_FAILED: 'SSE connection failed',
  MESSAGE_LOAD_FAILED: 'Failed to load messages',
  INVALID_CONVERSATION: 'Invalid conversation ID',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN_ERROR: 'An unknown error occurred'
} as const;

// API endpoints (relative to base URL)
export const CHAT_ENDPOINTS = {
  ASK_SESSIONS: '/ask/ask-sessions',
  INVESTIGATE_SESSIONS: '/chat/sessions',
  SSE_STREAM: '/chat/stream'
} as const;
