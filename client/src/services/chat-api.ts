import type { APIResponse } from '../types/index';
import { logger } from '../lib/logger';
import { appConfig } from '../config/app-config';
import { API } from '../constants/api';

// Configuration from centralized config
const API_BASE_URL = appConfig.api.baseUrl;
const APP_NAME = appConfig.api.appName;

// API Types matching your backend
export interface NewMessage {
  role: 'user' | 'model';
  parts: Array<{
    text: string;
  }>;
}

export interface RunSSERequest {
  app_name: string;
  user_id: string;
  session_id: string;
  new_message: NewMessage;
  streaming: boolean;
}

export interface CreateSessionRequest {
  additionalProp1?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CreateSessionResponse {
  sessionId: string;
  userId: string;
  appName: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

export interface ChatSession {
  id: string; // This is the actual field name from the API
  userId: string;
  appName: string;
  state: Record<string, unknown>;
  events: unknown[];
  lastUpdateTime: number; // This is a timestamp, not a string
}

// Ask Mode Types
export interface AskSessionRequest {
  user_id: string;
  session_metadata?: Record<string, unknown>;
}

export interface AskSessionResponse {
  session_id: string;
  user_id: string;
  created_at: string;
  status: string;
}

export interface AskQueryRequest {
  session_id: string;
  query: string;
  context?: Record<string, unknown>;
  data_sources?: string[];
  max_results?: number;
  include_citations?: boolean;
  preamble?: string;
}

export interface AskQueryResponse {
  answer: string;
  response?: string; // Keep for backward compatibility
  session_id: string;
  query_id?: string;
  citations?: Array<{
    cited_text: string;
    start_index: number;
    end_index: number;
    sources: Array<{
      reference_id: string;
      document_id: string;
      uri: string;
      title: string;
      struct_data?: Record<string, unknown>;
    }>;
  }>;
  grounding_supports?: Array<{
    segment: Record<string, unknown>;
    grounding_check_required: boolean;
  }>;
  query_classification?: Record<string, unknown>;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface RecommendationsRequest {
  query: string;
  context?: Record<string, unknown>;
  limit?: number;
}

export interface RecommendationsResponse {
  recommendations: Array<{
    title: string;
    description: string;
    relevance_score: number;
    metadata?: Record<string, unknown>;
  }>;
}

class ChatAPIService {
  private baseURL: string;
  private appName: string;

  constructor(baseURL: string = API_BASE_URL, appName: string = APP_NAME) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.appName = appName;
  }

  /**
   * Create a new chat session
   */
  async createSession(
    userId: string, 
    sessionId: string, 
    additionalData: CreateSessionRequest = {}
  ): Promise<APIResponse<CreateSessionResponse>> {
    try {
      const url = `${this.baseURL}/apps/${this.appName}/users/${userId}/sessions/${sessionId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(additionalData),
      });

      if (response.status !== API.statusCodes.OK && response.status !== API.statusCodes.CREATED) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: {
          sessionId,
          userId,
          appName: this.appName,
          createdAt: new Date().toISOString(),
          status: 'active',
          ...data,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to create session', { error, userId, sessionId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Send non-streaming message (for testing)
   */
  async sendMessage(
    userId: string,
    sessionId: string,
    messageText: string
  ): Promise<APIResponse<Record<string, unknown>>> {
    try {
      const url = `${this.baseURL}/run_sse`;
      
      const payload: RunSSERequest = {
        app_name: this.appName,
        user_id: userId,
        session_id: sessionId,
        new_message: {
          role: 'user',
          parts: [
            {
              text: messageText
            }
          ]
        },
        streaming: false // Non-streaming for testing
      };

      logger.debug('Sending non-streaming message', { payload });

      const response = await fetch(url, {
        method: API.methods.POST,
        headers: {
          [API.headers.CONTENT_TYPE]: API.contentTypes.JSON,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to send message', { error, userId, sessionId, messageText });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get the payload for SSE streaming
   * This is what we'll use to create the EventSource with POST body
   */
  getSSEPayload(userId: string, sessionId: string, messageText: string): RunSSERequest {
    return {
      app_name: this.appName,
      user_id: userId,
      session_id: sessionId,
      new_message: {
        role: 'user',
        parts: [
          {
            text: messageText
          }
        ]
      },
      streaming: false
    };
  }

  /**
   * Get SSE stream URL
   */
  getSSEStreamUrl(mode: 'ask' | 'investigate' = 'ask'): string {
    const endpoint = mode === 'investigate' ? API.endpoints.streaming.investigate : API.endpoints.streaming.ask;
    return `${this.baseURL}${endpoint}`;
  }

  /**
   * Create SSE connection using fetch with POST data and manual stream processing
   * This eliminates the duplicate GET request issue and memory leaks
   */
  async createSSEStream(
    userId: string, 
    sessionId: string, 
    messageText: string,
    onMessage: (event: MessageEvent) => void,
    onError: (error: Event) => void,
    onOpen?: () => void,
    onClose?: () => void,
    mode: 'ask' | 'investigate' = 'ask'
  ): Promise<{ disconnect: () => void }> {
    const payload = this.getSSEPayload(userId, sessionId, messageText);
    const url = this.getSSEStreamUrl(mode);
    
    logger.debug('Creating POST-based SSE stream', { url, payload, mode });

    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let isCleanedUp = false;

    // Cleanup function to ensure all resources are released
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      
      try {
        if (reader) {
          reader.releaseLock();
          reader = null;
        }
      } catch (error) {
        logger.debug('Error releasing reader lock', { error });
      }
      
      try {
        controller.abort();
      } catch (error) {
        logger.debug('Error aborting controller', { error });
      }
    };

    try {
      // Make POST request with streaming response
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Signal connection opened
      logger.debug('SSE connection opened');
      onOpen?.();

      // Process the stream
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processStream = async () => {
        try {
          while (!isCleanedUp && reader) {
            const { done, value } = await reader.read();
            
            if (done) {
              logger.debug('SSE stream ended');
              onClose?.();
              break;
            }

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim() === '') continue;
              
              // Handle SSE event format
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                
                // Skip heartbeat or empty data
                if (data.trim() === '' || data.trim() === '{}') continue;
                
                // Handle connection close
                if (data.trim() === 'Connection closed') {
                  logger.debug('Server closed SSE connection');
                  onClose?.();
                  return;
                }
                
                // Create MessageEvent-like object for compatibility
                const messageEvent = new MessageEvent('message', {
                  data: data,
                  origin: url,
                  lastEventId: '',
                });
                
                logger.debug('SSE message received', { data });
                onMessage(messageEvent);
              }
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            logger.debug('SSE stream aborted');
            return;
          }
          logger.error('SSE stream processing error', { error });
          onError(new Event('error'));
        } finally {
          cleanup();
        }
      };

      // Start processing the stream
      processStream();

      // Return disconnect function
      return {
        disconnect: () => {
          logger.debug('Manually disconnecting SSE stream');
          cleanup();
        }
      };

    } catch (error) {
      logger.error('Failed to create SSE stream', { error });
      cleanup();
      setTimeout(() => onError(new Event('error')), 0);
      throw error;
    }
  }

  /**
   * Get session details
   */
  async getSession(userId: string, sessionId: string): Promise<APIResponse<ChatSession>> {
    try {
      const url = `${this.baseURL}/apps/${this.appName}/users/${userId}/sessions/${sessionId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get session messages/events (for loading existing conversation history)
   */
  async getSessionMessages(userId: string, sessionId: string): Promise<APIResponse<unknown[]>> {
    try {
      const sessionResult = await this.getSession(userId, sessionId);
      
      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          error: 'Failed to get session data',
          timestamp: Date.now(),
        };
      }

      // Extract events from session data
      const events = sessionResult.data.events || [];
      
      return {
        success: true,
        data: events,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to get session messages', { error, userId, sessionId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session messages',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Delete/end session
   */
  async deleteSession(userId: string, sessionId: string): Promise<APIResponse<void>> {
    try {
      const url = `${this.baseURL}/apps/${this.appName}/users/${userId}/sessions/${sessionId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete session',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * List all sessions for a user
   */
  async listSessions(userId: string): Promise<APIResponse<ChatSession[]>> {
    try {
      const url = `${this.baseURL}/apps/${this.appName}/users/${userId}/sessions`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: Array.isArray(data) ? data : [],
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list sessions',
        timestamp: Date.now(),
      };
    }
  }

  // ===== ASK MODE METHODS =====

  /**
   * Create a new Ask mode session
   */
  async createAskSession(
    userId: string,
    sessionMetadata: Record<string, unknown> = {}
  ): Promise<APIResponse<AskSessionResponse>> {
    try {
      const url = `${this.baseURL}/ask/session`;
      
      const payload: AskSessionRequest = {
        user_id: userId,
        session_metadata: sessionMetadata,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to create Ask session', { error, userId, sessionMetadata });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Ask session',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Execute a query in Ask mode
   */
  async executeAskQuery(
    sessionId: string,
    query: string,
    context: Record<string, unknown> = {},
    dataSources?: string[],
    maxResults?: number,
    includeCitations?: boolean,
    preamble?: string
  ): Promise<APIResponse<AskQueryResponse>> {
    try {
      const url = `${this.baseURL}/ask/query`;
      
      const payload: AskQueryRequest = {
        session_id: sessionId,
        query,
        context,
        data_sources: dataSources,
        max_results: maxResults,
        include_citations: includeCitations,
        preamble,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to execute Ask query', { error, sessionId, query, context });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute Ask query',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get recommendations
   */
  async getRecommendations(
    query: string,
    context: Record<string, unknown> = {},
    limit = 5
  ): Promise<APIResponse<RecommendationsResponse>> {
    try {
      const url = `${this.baseURL}/ask/recommendations`;
      
      const payload: RecommendationsRequest = {
        query,
        context,
        limit,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to get recommendations', { error, query, context, limit });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recommendations',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check Ask mode health
   */
  async checkAskHealth(): Promise<APIResponse<{ status: string }>> {
    try {
      const url = `${this.baseURL}/ask/health`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to check Ask health', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check Ask health',
        timestamp: Date.now(),
      };
    }
  }
}

// Export singleton instance
export const chatAPI = new ChatAPIService();
export { ChatAPIService };
