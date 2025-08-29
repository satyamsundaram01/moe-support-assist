// API Types matching the backend schema at http://127.0.0.1:8000

// Content Types
export interface PartInput {
  text: string;
  // Add other part types as needed (images, etc.)
}

export interface ContentInput {
  parts?: PartInput[];
  role?: 'user' | 'model';
}

export interface PartOutput {
  text: string;
  // Add other part types as needed
}

export interface ContentOutput {
  parts?: PartOutput[];
  role?: 'user' | 'model';
}

// Event Types
export interface EventActionsOutput {
  // Define based on backend schema
  [key: string]: unknown;
}

export interface GroundingMetadataOutput {
  // Define based on backend schema
  [key: string]: unknown;
}

export interface GenerateContentResponseUsageMetadataOutput {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface EventOutput {
  id: string;
  invocationId: string;
  author: string;
  content?: ContentOutput;
  actions: EventActionsOutput;
  longRunningToolIds?: string[];
  branch?: string;
  timestamp: number;
  partial?: boolean;
  turnComplete?: boolean;
  errorCode?: string;
  errorMessage?: string;
  interrupted?: boolean;
  customMetadata?: Record<string, unknown>;
  usageMetadata?: GenerateContentResponseUsageMetadataOutput;
  groundingMetadata?: GroundingMetadataOutput;
}

// Session Types
export interface Session {
  id: string;
  appName: string;
  userId: string;
  state: Record<string, unknown>;
  events: EventOutput[];
  lastUpdateTime: number;
}

// Request Types
export interface AgentRunRequest {
  appName: string;
  userId: string;
  sessionId: string;
  newMessage: ContentInput;
  streaming?: boolean;
}

export interface CreateSessionRequest {
  // Additional properties can be added as needed
  [key: string]: unknown;
}

// Response Types
export interface SessionListResponse {
  sessions: Session[];
}

export interface SessionResponse {
  session: Session;
}

// API Error Types
export interface APIError {
  detail: string;
  status_code: number;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationError[];
} 