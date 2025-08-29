/**
 * Application Constants
 * General application constants including storage keys, event names, and app-specific values
 */

// Application Information
export const APP_INFO = {
  NAME: 'MoeGenie',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI-powered support agent for MoEngage',
  AUTHOR: 'MoEngage',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  // Local Storage
  VERSION: 'moe_storage_version',
  CONVERSATIONS: 'moe_conversations',
  MESSAGES: 'moe_messages',
  SESSIONS: 'moe_sessions',
  ACTIVE_CONVERSATION: 'moe_active_conversation',
  USER_ID: 'moe_user_id',
  USER_PREFERENCES: 'moe_user_preferences',
  CHAT_HISTORY: 'moe_chat_history',
  SESSION_DATA: 'moe_session_data',
  THEME_PREFERENCE: 'moe_theme',
  LANGUAGE_PREFERENCE: 'moe_language',
  SETTINGS: 'moe_settings',
  
  // Session Storage
  OIDC_STATE: 'oidc_state',
  OIDC_NONCE: 'oidc_nonce',
  OIDC_CODE_VERIFIER: 'oidc_code_verifier',
  TEMP_SESSION: 'temp_session',
  
  // Cache Keys
  API_CACHE: 'moe_api_cache',
  SESSION_CACHE: 'moe_session_cache',
  USER_CACHE: 'moe_user_cache',
} as const;

// Event Names
export const EVENT_NAMES = {
  // User Events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_ACTION: 'user_action',
  
  // Chat Events
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_MESSAGE_RECEIVED: 'chat_message_received',
  CHAT_SESSION_STARTED: 'chat_session_started',
  CHAT_SESSION_ENDED: 'chat_session_ended',
  CHAT_MODE_SWITCHED: 'chat_mode_switched',
  
  // System Events
  APP_INITIALIZED: 'app_initialized',
  ERROR_OCCURRED: 'error_occurred',
  PERFORMANCE_METRIC: 'performance_metric',
  
  // API Events
  API_REQUEST_STARTED: 'api_request_started',
  API_REQUEST_COMPLETED: 'api_request_completed',
  API_REQUEST_FAILED: 'api_request_failed',
  
  // SSE Events
  SSE_CONNECTED: 'sse_connected',
  SSE_DISCONNECTED: 'sse_disconnected',
  SSE_MESSAGE_RECEIVED: 'sse_message_received',
  SSE_ERROR: 'sse_error',
} as const;

// Chat Modes
export const CHAT_MODES = {
  ASK: 'ask',
  INVESTIGATE: 'investigate',
} as const;

// Session Status
export const SESSION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ENDED: 'ended',
  ERROR: 'error',
} as const;

// Message Types
export const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  ERROR: 'error',
} as const;

// Message Status
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  STREAMING: 'streaming',
} as const;

// Themes
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
} as const;

// Languages
export const LANGUAGES = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  JA: 'ja',
  ZH: 'zh',
} as const;

// File Types
export const FILE_TYPES = {
  IMAGE: 'image',
  DOCUMENT: 'document',
  AUDIO: 'audio',
  VIDEO: 'video',
  TEXT: 'text',
  JSON: 'json',
  CSV: 'csv',
  PDF: 'pdf',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'MMM dd',
  MEDIUM: 'MMM dd, yyyy',
  LONG: 'MMMM dd, yyyy',
  FULL: 'EEEE, MMMM dd, yyyy',
  TIME: 'HH:mm',
  DATETIME: 'MMM dd, yyyy HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL_REGEX: /^https?:\/\/.+/,
  PHONE_REGEX: /^\+?[\d\s\-()]+$/,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  MESSAGE_MAX_LENGTH: 4000,
  TITLE_MAX_LENGTH: 100,
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_VOICE_INPUT: 'enable_voice_input',
  ENABLE_FILE_UPLOAD: 'enable_file_upload',
  ENABLE_DARK_MODE: 'enable_dark_mode',
  ENABLE_ANALYTICS: 'enable_analytics',
  ENABLE_NOTIFICATIONS: 'enable_notifications',
  ENABLE_OFFLINE_MODE: 'enable_offline_mode',
  ENABLE_EXPERIMENTAL_FEATURES: 'enable_experimental_features',
} as const;

// Animation Durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 1000,
} as const;

// Z-Index Layers
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  TOAST: 1080,
} as const;

// Breakpoints (in pixels)
export const BREAKPOINTS = {
  XS: 0,
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536,
} as const;

// Default Values
export const DEFAULTS = {
  PAGE_SIZE: 20,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  TOAST_DURATION: 5000,
  TOOLTIP_DELAY: 500,
  RETRY_ATTEMPTS: 3,
  CACHE_TTL: 300000, // 5 minutes
} as const;

// Export types for better type safety
export type ChatMode = typeof CHAT_MODES[keyof typeof CHAT_MODES];
export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];
export type MessageStatus = typeof MESSAGE_STATUS[keyof typeof MESSAGE_STATUS];
export type Theme = typeof THEMES[keyof typeof THEMES];
export type Language = typeof LANGUAGES[keyof typeof LANGUAGES];
export type FileType = typeof FILE_TYPES[keyof typeof FILE_TYPES];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS];
