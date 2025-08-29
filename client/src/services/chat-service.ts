import { apiClient } from './api-client';
import type { 
  EventOutput, 
  AgentRunRequest, 
  APIResponse,
  ContentInput,
  ChatMode 
} from '../types';

export class ChatService {
  private userId: string;
  private sessionId: string;
  private mode: ChatMode;

  constructor(userId: string, sessionId: string, mode: ChatMode = 'ask') {
    this.userId = userId;
    this.sessionId = sessionId;
    this.mode = mode;
  }

  /**
   * Send a message and get response based on mode
   */
  async sendMessage(
    message: string,
    streaming: boolean = false
  ): Promise<APIResponse<EventOutput[]>> {
    const request = apiClient.createRunRequest(
      this.userId,
      this.sessionId,
      message,
      streaming
    );
    
    return apiClient.runAgent(request);
  }

  /**
   * Send a message with custom content
   */
  async sendMessageWithContent(
    content: ContentInput,
    streaming: boolean = false
  ): Promise<APIResponse<EventOutput[]>> {
    const request: AgentRunRequest = {
      appName: apiClient['appName'],
      userId: this.userId,
      sessionId: this.sessionId,
      newMessage: content,
      streaming,
    };
    
    return apiClient.runAgent(request);
  }

  /**
   * Create SSE stream for real-time responses
   */
  createSSEStream(
    message: string,
    onMessage: (event: EventOutput) => void,
    onError: (error: string) => void,
    onComplete?: () => void
  ): { disconnect: () => void } {
    const request = apiClient.createRunRequest(
      this.userId,
      this.sessionId,
      message,
      true // streaming
    );

    const url = `${apiClient['baseURL']}/run_sse`;
    const eventSource = new EventSource(`${url}?${new URLSearchParams({
      app_name: request.appName,
      user_id: request.userId,
      session_id: request.sessionId,
      new_message: JSON.stringify(request.newMessage),
      streaming: 'true'
    })}`);

    eventSource.onmessage = (event) => {
      try {
        const data: EventOutput = JSON.parse(event.data);
        onMessage(data);
        
        // Check if this is the final message
        if (data.turnComplete) {
          onComplete?.();
        }
      } catch (error) {
        onError('Failed to parse SSE message');
      }
    };

    eventSource.onerror = (_error) => {
      onError('SSE connection error');
      eventSource.close();
    };

    return {
      disconnect: () => {
        eventSource.close();
      }
    };
  }

  /**
   * Process events based on chat mode
   */
  processEvents(events: EventOutput[]): {
    content: string;
    thinkingSteps: Array<{ type: string; content: string; timestamp: number }>;
    toolCalls: Array<{ name: string; args: Record<string, unknown>; status: string }>;
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
  } {
    let content = '';
    const thinkingSteps: Array<{ type: string; content: string; timestamp: number }> = [];
    const toolCalls: Array<{ name: string; args: Record<string, unknown>; status: string }> = [];
    let citations: any[] = [];

    events.forEach(event => {
      // Extract content
      if (event.content?.parts?.[0]?.text) {
        content += event.content.parts[0].text;
      }

      // Extract thinking steps (only for investigate mode)
      if (this.mode === 'investigate' && event.author === 'model') {
        // Look for thinking patterns in the content
        const thinkingContent = this.extractThinkingSteps(event.content?.parts?.[0]?.text || '');
        thinkingSteps.push(...thinkingContent);
      }

      // Extract tool calls
      if (event.actions) {
        const extractedToolCalls = this.extractToolCalls(event.actions);
        toolCalls.push(...extractedToolCalls);
      }

      // Extract citations (primarily for ask mode)
      if (this.mode === 'ask' && event.groundingMetadata) {
        const extractedCitations = this.extractCitations(event.groundingMetadata);
        citations.push(...extractedCitations);
      }
    });

    return {
      content,
      thinkingSteps,
      toolCalls,
      citations: citations.length > 0 ? citations : undefined,
    };
  }

  /**
   * Extract thinking steps from content
   */
  private extractThinkingSteps(content: string): Array<{ type: string; content: string; timestamp: number }> {
    const steps: Array<{ type: string; content: string; timestamp: number }> = [];
    
    // Look for common thinking patterns
    const thinkingPatterns = [
      { type: 'planning', pattern: /(?:Let me|I'll|First,|Planning:)/i },
      { type: 'reasoning', pattern: /(?:Thinking:|Reasoning:|Analysis:)/i },
      { type: 'action', pattern: /(?:Action:|Tool:|Function:)/i },
      { type: 'final_answer', pattern: /(?:Answer:|Conclusion:|Final answer:)/i },
    ];

    thinkingPatterns.forEach(({ type, pattern }) => {
      if (pattern.test(content)) {
        steps.push({
          type,
          content: content,
          timestamp: Date.now(),
        });
      }
    });

    return steps;
  }

  /**
   * Extract tool calls from actions
   */
  private extractToolCalls(actions: Record<string, unknown>): Array<{ name: string; args: Record<string, unknown>; status: string }> {
    const toolCalls: Array<{ name: string; args: Record<string, unknown>; status: string }> = [];
    
    Object.entries(actions).forEach(([_key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const actionObj = value as Record<string, unknown>;
        if (actionObj.name && actionObj.args) {
          toolCalls.push({
            name: actionObj.name as string,
            args: actionObj.args as Record<string, unknown>,
            status: 'completed',
          });
        }
      }
    });
    
    return toolCalls;
  }

  /**
   * Extract citations from grounding metadata
   */
  private extractCitations(groundingMetadata: Record<string, unknown>): Array<{
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
  }> {
    const citations: any[] = [];
    
    // Process grounding metadata to extract citations
    // This handles the actual structure from your backend
    if (groundingMetadata && typeof groundingMetadata === 'object') {
      // Look for citation patterns in the metadata
      Object.entries(groundingMetadata).forEach(([key, value]) => {
        if (key.includes('citation') || key.includes('source') || key.includes('reference')) {
          if (Array.isArray(value)) {
            value.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const citation = this.processCitationItem(item);
                if (citation) {
                  citations.push(citation);
                }
              }
            });
          } else if (value && typeof value === 'object') {
            const citation = this.processCitationItem(value as any);
            if (citation) {
              citations.push(citation);
            }
          }
        }
      });
    }
    
    return citations;
  }

  /**
   * Process individual citation items
   */
  private processCitationItem(item: any): any {
    // Handle different citation formats
    if (item.cited_text && item.sources) {
      return {
        cited_text: item.cited_text,
        start_index: item.start_index || 0,
        end_index: item.end_index || item.cited_text.length,
        sources: Array.isArray(item.sources) ? item.sources : [item.sources],
      };
    }
    
    // Handle alternative formats
    if (item.text && item.references) {
      return {
        cited_text: item.text,
        start_index: item.start || 0,
        end_index: item.end || item.text.length,
        sources: Array.isArray(item.references) ? item.references : [item.references],
      };
    }
    
    return null;
  }

  /**
   * Extract citations from content using regex patterns
   */
  extractCitationsFromContent(content: string): Array<{
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
  }> {
    const citations: any[] = [];
    
    // Look for citation patterns in the content
    const citationPatterns = [
      /\[([^\]]+)\]/g, // [citation]
      /\(([^)]+)\)/g,  // (citation)
      /"([^"]+)"/g,    // "quoted text"
    ];
    
    citationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        citations.push({
          cited_text: match[1],
          start_index: match.index,
          end_index: match.index + match[0].length,
          sources: [{
            reference_id: `ref_${Date.now()}_${Math.random()}`,
            document_id: 'unknown',
            uri: '',
            title: match[1],
          }],
        });
      }
    });
    
    return citations;
  }

  /**
   * Get session events (chat history)
   */
  async getSessionEvents(): Promise<APIResponse<EventOutput[]>> {
    const result = await apiClient.getSession(this.userId, this.sessionId);
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to get session',
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      data: result.data.events,
      timestamp: Date.now(),
    };
  }

  /**
   * Get the latest events from the session
   */
  async getLatestEvents(limit: number = 10): Promise<APIResponse<EventOutput[]>> {
    const result = await this.getSessionEvents();
    if (!result.success || !result.data) {
      return result;
    }

    // Sort by timestamp and get the latest events
    const sortedEvents = result.data.sort((a, b) => b.timestamp - a.timestamp);
    const latestEvents = sortedEvents.slice(0, limit);

    return {
      success: true,
      data: latestEvents,
      timestamp: Date.now(),
    };
  }

  /**
   * Get events by author (user or model)
   */
  async getEventsByAuthor(author: string): Promise<APIResponse<EventOutput[]>> {
    const result = await this.getSessionEvents();
    if (!result.success || !result.data) {
      return result;
    }

    const filteredEvents = result.data.filter(event => event.author === author);
    
    return {
      success: true,
      data: filteredEvents,
      timestamp: Date.now(),
    };
  }

  /**
   * Get user messages from the session
   */
  async getUserMessages(): Promise<APIResponse<EventOutput[]>> {
    return this.getEventsByAuthor('user');
  }

  /**
   * Get model responses from the session
   */
  async getModelResponses(): Promise<APIResponse<EventOutput[]>> {
    return this.getEventsByAuthor('model');
  }

  /**
   * Check if session has any events
   */
  async hasEvents(): Promise<APIResponse<boolean>> {
    const result = await this.getSessionEvents();
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to check events',
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      data: (result.data?.length || 0) > 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Set the chat mode
   */
  setMode(mode: ChatMode): void {
    this.mode = mode;
  }

  /**
   * Get the current chat mode
   */
  getMode(): ChatMode {
    return this.mode;
  }
}

// Factory function to create chat service
export const createChatService = (userId: string, sessionId: string, mode: ChatMode = 'ask'): ChatService => {
  return new ChatService(userId, sessionId, mode);
}; 