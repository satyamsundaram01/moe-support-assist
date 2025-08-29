import type {
  Message,
  // AIMessage,
  Conversation,
  StreamingState,
  ThinkingStep,
  ToolCall,
  SSEEventData,
  ChatSettings,
  ChatInputState,
  ChatSession,
  ChatMode,
} from './index';

// Base store interface
export interface BaseStoreState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

// Conversation Store Types
export interface ConversationState extends BaseStoreState {
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  currentMode: ChatMode;
  isModeSwitching: boolean;
  modeSwitchError: string | null;
}

export interface ConversationActions {
  // Mode management
  switchMode: (newMode: ChatMode) => void;
  setCurrentMode: (mode: ChatMode) => void;
  clearModeSwitchError: () => void;

  // Conversation management
  createConversation: (title?: string, mode?: ChatMode) => Promise<string>;
  setActiveConversation: (id: string) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  archiveConversation: (id: string) => void;
  exportConversation: (conversationId: string) => string;
}

// Message Store Types
export interface MessageState extends BaseStoreState {
  messages: Record<string, Message[]>; // keyed by conversationId
  loadingMessages: Record<string, boolean>;
  lastMessageLoadTime?: number;
}

export interface MessageActions {
  // Message management
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (
    conversationId: string,
    message: Omit<Message, "id" | "timestamp">
  ) => string;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  loadSessionMessages: (conversationId: string, userId: string) => Promise<boolean>;

  // Thinking & Tool actions
  addThinkingStep: (messageId: string, step: Omit<ThinkingStep, "id">) => void;
  toggleThinkingVisibility: (messageId: string, stepId?: string) => void;
  addToolCall: (messageId: string, toolCall: Omit<ToolCall, "timestamp">) => void;
  updateToolCall: (
    messageId: string,
    toolCallId: string,
    updates: Partial<ToolCall>
  ) => void;
}

// Streaming Store Types
export interface StreamingStoreState extends BaseStoreState {
  streaming: StreamingState;
}

export interface StreamingActions {
  // Streaming actions
  startStreaming: (conversationId: string, userMessage: string) => Promise<string>;
  handleAskMode: (conversationId: string, userMessageContent: string, userId: string) => Promise<string>;
  handleInvestigateMode: (conversationId: string, userMessageContent: string) => Promise<string>;
  stopStreaming: () => void;
  handleSSEEvent: (event: SSEEventData) => void;
  finalizeStream: () => void;
}

// Session Store Types
export interface SessionState extends BaseStoreState {
  currentUserId: string | null;
  sessions: Record<string, ChatSession>; // keyed by conversation ID
  selectedDataSources: string[];
  connection: {
    isConnected: boolean;
    isReconnecting: boolean;
    lastError: string | null;
  };
}

export interface SessionActions {
  // User actions
  setUserId: (userId: string) => void;
  initializeUserFromAuth: () => void;

  // Session management
  createSessionForConversation: (conversationId: string, userId?: string) => Promise<boolean>;
  endSession: (conversationId: string) => Promise<void>;
  recreateSession: (conversationId: string) => Promise<boolean>;

  // Data source actions
  setSelectedDataSources: (dataSources: string[]) => void;
  clearSelectedDataSources: () => void;

  // Connection actions
  setConnectionStatus: (isConnected: boolean) => void;
  setConnectionError: (error: string | null) => void;
}

// UI Store Types (for input and settings)
export interface UIState extends BaseStoreState {
  input: ChatInputState;
  settings: ChatSettings;
  selectedDataSources: string[];
}

export interface UIActions {
  // Input actions
  setInputContent: (content: string) => void;
  clearInput: () => void;
  addAttachment: (file: File) => void;
  removeAttachment: (attachmentId: string) => void;

  // Settings actions
  updateSettings: (settings: Partial<ChatSettings>) => void;

  // Data source actions
  setSelectedDataSources: (dataSources: string[]) => void;
  clearSelectedDataSources: () => void;

  // Utility actions
  clearAllData: () => void;
}

// Combined store types for the main chat store (temporary during migration)
export type ChatStoreState = ConversationState & MessageState & StreamingStoreState & SessionState & UIState;
export type ChatStoreActions = ConversationActions & MessageActions & StreamingActions & SessionActions & UIActions;
export type ChatStore = ChatStoreState & ChatStoreActions;

// Individual store types
export type ConversationStore = ConversationState & ConversationActions;
export type MessageStore = MessageState & MessageActions;
export type StreamingStore = StreamingStoreState & StreamingActions;
export type SessionStore = SessionState & SessionActions;
export type UIStore = UIState & UIActions;

// Store creation options
export interface StoreOptions {
  name: string;
  devtools?: boolean;
  persist?: boolean;
  persistKey?: string;
}

// Error handling types
export interface StoreErrorContext {
  operation: string;
  storeType: string;
  conversationId?: string;
  messageId?: string;
  userId?: string;
}

// Store event types for inter-store communication
export interface StoreEvent {
  type: string;
  payload: unknown;
  timestamp: number;
  source: string;
}

export interface StoreEventHandlers {
  [eventType: string]: (payload: unknown) => void;
}
