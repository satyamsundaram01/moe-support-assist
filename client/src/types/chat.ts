import type { SSEEventData } from './sse';

export type MessageRole = 'user' | 'model';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'error';
export type ThinkingType = 'planning' | 'reasoning' | 'action' | 'final_answer';
export type ToolStatus = 'pending' | 'calling' | 'completed' | 'error';
export type StreamingPhase = 'idle' | 'thinking' | 'tool_calling' | 'responding' | 'complete';

// Chat Mode System
export const ChatMode = {
  ASK: 'ask',
  INVESTIGATE: 'investigate'
} as const;

export type ChatMode = typeof ChatMode[keyof typeof ChatMode];

export interface ChatModeConfig {
  mode: ChatMode;
  showThinking: boolean;
  placeholder: string;
  sessionPrefix: string;
  title: string;
  description: string;
}

// Base message interface
export interface BaseMessage {
  id: string;
  timestamp: number;
  conversationId: string;
}

// User message
export interface UserMessage extends BaseMessage {
  type: 'user';
  role: 'user';
  content: string;
  status: MessageStatus;
}

// Thinking step for AI reasoning
export interface ThinkingStep {
  id: string;
  type: ThinkingType;
  content: string;
  timestamp: number;
  isVisible: boolean;
  rawEvent?: SSEEventData; // Store original SSE event for debugging
}

// Tool/Function call
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: ToolStatus;
  timestamp: number;
  result?: string;
  error?: string;
  duration?: number; // execution time in ms
}

// AI message with enhanced properties
export interface AIMessage extends BaseMessage {
  type: 'ai';
  role: 'model';
  content: string;
  status: MessageStatus;
  
  // AI-specific properties
  thinkingSteps: ThinkingStep[];
  toolCalls: ToolCall[];
  isStreaming: boolean;
  isComplete: boolean;
  
  // UI state
  showThinking: boolean;
  showRawEvents: boolean;
  
  // Citations for Ask mode
  citations?: Array<{
    cited_text: string;
    start_index: number;
    end_index: number;
    sources: Array<{
      reference_id: string;
      document_id: string;
      uri: string;
      title: string;
      struct_data?: unknown;
    }>;
  }>;
  
  // Metadata
  usageMetadata?: {
    promptTokens: number;
    completionTokens: number;
    thoughtTokens?: number;
    totalTokens: number;
  };
  
  // Raw events for debugging
  rawEvents: SSEEventData[];
}

export type Message = UserMessage | AIMessage;

export interface ChatSession {
  id: string; // This is the sessionId
  userId: string;
  appName: string;
  status: 'active' | 'inactive' | 'error';
  createdAt: number;
  updatedAt: number;
  apiSessionId?: string; // Backend session ID if different
  mode: ChatMode; // Add mode to session
}

// Conversation
export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessage?: string;
  tags?: string[];
  archived?: boolean;
  mode: ChatMode; // Add mode to conversation
  
  // Add session info (nullable for lazy session creation)
  session: ChatSession | null;
}

// Streaming state
export interface StreamingState {
  isStreaming: boolean;
  messageId: string | null;
  conversationId: string | null;
  phase: StreamingPhase;
  
  // Current content being streamed
  currentThinking: string;
  currentResponse: string;
  
  // Active tool call
  activeTool: ToolCall | null;
  
  // Progress tracking
  progress: {
    phase: string;
    step: number;
    totalSteps: number;
  };
  
  // Error state
  error: string | null;
  
  // SSE disconnect function
  disconnect?: () => void;
}

// Chat input state
export interface ChatInputState {
  content: string;
  isTyping: boolean;
  attachments: ChatAttachment[];
  replyingTo: Message | null;
}

// File attachment
export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  uploadProgress?: number;
  error?: string;
}

// Chat settings
export interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  streamResponse: boolean;
  showThinking: boolean;
  autoScroll: boolean;
  soundEnabled: boolean;
  compactMode: boolean;
}

export interface ProcessedCitation {
    id: string;
    sourceCount: number;
    platform: {
        name: string;
        color: string;
        icon: string;
        domain: string;
    };
    inlinePosition: number;
    cited_text: string;
    start_index: number;
    end_index: number;
    sources: Array<{
        reference_id: string;
        document_id: string;
        uri: string;
        title: string;
        struct_data?: unknown;
    }>;
}
