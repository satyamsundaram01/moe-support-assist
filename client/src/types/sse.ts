// Discriminated union for different types of SSE event parts
export type SSEEventPart = 
  | SSEThoughtPart
  | SSETextPart
  | SSEFunctionCallPart
  | SSEFunctionResponsePart;

export interface SSEThoughtPart {
  thought: true;
  text: string;
}

export interface SSETextPart {
  thought?: false;
  text: string;
}

export interface SSEFunctionCallPart {
  functionCall: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  };
}

export interface SSEFunctionResponsePart {
  functionResponse: {
    id: string;
    name: string;
    response: { result: string };
  };
}

// Token details with strict typing
export interface TokenDetails {
  modality: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO';
  tokenCount: number;
}

export interface UsageMetadata {
  candidatesTokenCount: number;
  promptTokenCount: number;
  promptTokensDetails?: TokenDetails[];
  thoughtsTokenCount?: number;
  totalTokenCount: number;
  cacheTokensDetails?: TokenDetails[];
  cachedContentTokenCount?: number;
}

// Actions with more specific typing
export interface SSEActions {
  stateDelta?: Record<string, unknown>;
  artifactDelta?: Record<string, unknown>;
  requestedAuthConfigs?: Record<string, unknown>;
}

export interface SSEEventData {
  content: {
    parts: SSEEventPart[];
    role: 'model' | 'user';
  };
  partial?: boolean; // Indicates if this is a partial event or final event
  errorCode?: string; // Error code for error events (e.g., "STOP")
  usageMetadata?: UsageMetadata;
  invocationId: string;
  author: string;
  actions?: SSEActions;
  longRunningToolIds?: string[];
  id: string;
  timestamp: number;
}

export interface ParsedThinkingContent {
  planning?: string;
  reasoning?: string;
  action?: string;
  finalAnswer?: string;
  raw: string;
}

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  error: Error | null;
  retryCount: number;
}
