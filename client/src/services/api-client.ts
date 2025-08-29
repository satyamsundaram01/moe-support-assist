import type { 
  APIResponse, 
  Session, 
  EventOutput, 
  AgentRunRequest, 
  CreateSessionRequest,
  APIError,
  HTTPValidationError 
} from '../types';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const APP_NAME = import.meta.env.VITE_APP_NAME || 'moe_support_agent';

export class ApiClient {
  private baseURL: string;
  private appName: string;

  constructor(baseURL: string = API_BASE_URL, appName: string = APP_NAME) {
    this.baseURL = baseURL;
    this.appName = appName;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const error: APIError | HTTPValidationError = data;
        return {
          success: false,
          error: this.formatError(error),
          timestamp: Date.now(),
        };
      }

      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        timestamp: Date.now(),
      };
    }
  }

  private formatError(error: APIError | HTTPValidationError): string {
    if ('detail' in error) {
      if (Array.isArray(error.detail)) {
        // Validation error
        return error.detail.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ');
      } else {
        // API error
        return error.detail;
      }
    }
    return 'Unknown error occurred';
  }

  // Session Management
  async listSessions(userId: string): Promise<APIResponse<Session[]>> {
    return this.request<Session[]>(`/apps/${this.appName}/users/${userId}/sessions`);
  }

  async createSession(
    userId: string, 
    sessionData: CreateSessionRequest = {}
  ): Promise<APIResponse<Session>> {
    return this.request<Session>(`/apps/${this.appName}/users/${userId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  async getSession(userId: string, sessionId: string): Promise<APIResponse<Session>> {
    return this.request<Session>(`/apps/${this.appName}/users/${userId}/sessions/${sessionId}`);
  }

  // Chat Execution
  async runAgent(request: AgentRunRequest): Promise<APIResponse<EventOutput[]>> {
    return this.request<EventOutput[]>('/run', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Helper method to create a run request
  createRunRequest(
    userId: string,
    sessionId: string,
    message: string,
    streaming: boolean = false
  ): AgentRunRequest {
    return {
      appName: this.appName,
      userId,
      sessionId,
      newMessage: {
        parts: [{ text: message }],
        role: 'user',
      },
      streaming,
    };
  }

  // Health check
  async healthCheck(): Promise<APIResponse<{ status: string }>> {
    return this.request<{ status: string }>('/');
  }
}

// Export singleton instance
export const apiClient = new ApiClient(); 