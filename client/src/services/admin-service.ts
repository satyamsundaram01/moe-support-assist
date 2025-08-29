// Admin service for dashboard functionality
import type {
  AdminUser,
  AnalyticsQuery,
  AnalyticsData,
  SessionListItem,
  SessionDetail,
  FeedbackSummary,
  AdminSettings
} from '../types/admin';
import { feedbackService } from './feedback-service';

class AdminService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Utility function to format dates for API calls
  private formatDateForAPI(dateString: string): string {
    // If the date already contains 'T', it's an ISO string, extract just the date part
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    // If it's already in YYYY-MM-DD format, return as is
    return dateString;
  }

  // Authentication & Authorization
  async getCurrentAdminUser(): Promise<AdminUser> {
    // Mock admin user - replace with real API call
    return {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['view_analytics', 'view_sessions', 'view_feedback', 'manage_settings']
    };
  }

  async checkAdminPermissions(permissions: string[]): Promise<boolean> {
    // Mock permission check - replace with real API call
    console.log('Checking permissions:', permissions);
    return true;
  }

  // Apps Management
  async getApps(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/list-apps`);
      if (!response.ok) throw new Error('Failed to fetch apps');
      return await response.json();
    } catch (error) {
      console.error('Error fetching apps:', error);
      return ['default-app']; // Fallback
    }
  }

  // Analytics
  async getAnalyticsData(query: AnalyticsQuery): Promise<AnalyticsData> {
    try {
      console.log('Fetching analytics data with query:', query);
      
      // Fetch session counts from both APIs
      const [askCount, investigateCount] = await Promise.all([
        this.getSessionCount({
          startDate: query.startDate,
          endDate: query.endDate,
          mode: 'ask'
        }),
        this.getSessionCount({
          startDate: query.startDate,
          endDate: query.endDate,
          mode: 'investigate'
        })
      ]);
      
      const totalSessions = askCount + investigateCount;
      
      const response = await fetch(`${this.baseUrl}/api/analytics/events/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      
      const data = await response.json();
      
      // Transform API response to match our interface
      return {
        totalSessions, // Use real session count from both APIs
        totalUsers: data.total_users || 342,
        averageSessionLength: data.avg_session_length || 8.5,
        topQueries: data.top_queries || [
          { query: "How to reset password", count: 45 },
          { query: "Delivery status", count: 38 },
          { query: "Account settings", count: 32 },
          { query: "Billing inquiry", count: 28 },
          { query: "Technical support", count: 25 }
        ],
        modeDistribution: { 
          ask: askCount, 
          investigate: investigateCount 
        },
        userEngagement: data.user_engagement || {
          dailyActiveUsers: 89,
          weeklyActiveUsers: 234,
          monthlyActiveUsers: 342
        },
        responseMetrics: data.response_metrics || {
          averageResponseTime: 2.3,
          successRate: 94.2,
          errorRate: 5.8,
          messageSent: 6
        }
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Return mock data as fallback
      return this.getMockAnalyticsData();
    }
  }

  async getAnalyticsSummary(days: number = 30): Promise<AnalyticsData> {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    return this.getAnalyticsData({
      startDate,
      endDate,
      filters: []
    });
  }

  // Session Management - Updated to use correct APIs based on mode
  async getSessions(params: {
    page?: number;
    limit?: number;
    mode?: 'ask' | 'investigate' | 'all';
    status?: 'active' | 'completed' | 'error' | 'all';
    userId?: string;
    startDate?: string;
    endDate?: string;
    appName?: string;
    lastNDays?: number;
  } = {}): Promise<{
    sessions: SessionListItem[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    offset: number;
    filters: {
      start_date: string | null;
      end_date: string | null;
      last_n_days: number | null;
    };
  }> {
    try {
      // Use ask-sessions endpoint for ask mode
      if (params.mode === 'ask') {
        return this.getAskSessions(params);
      }
      
      // Use sessions endpoint for investigate mode
      if (params.mode === 'investigate') {
        return this.getInvestigateSessions(params);
      }
      
      // For 'all' mode, fetch from both APIs and combine
      if (params.mode === 'all' || !params.mode) {
        return this.getAllSessions(params);
      }

      // Default fallback to investigate sessions
      return this.getInvestigateSessions(params);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      // Return mock data as fallback
      const mockData = await this.getMockSessions(params);
      return {
        ...mockData,
        limit: params.limit || 50,
        offset: ((params.page || 1) - 1) * (params.limit || 50),
        filters: {
          start_date: params.startDate || null,
          end_date: params.endDate || null,
          last_n_days: params.lastNDays || null,
        }
      };
    }
  }

  // New method to get detailed session data from ask-sessions endpoint
  async getAskSessions(params: {
    page?: number;
    limit?: number;
    mode?: 'ask' | 'investigate' | 'all';
    status?: 'active' | 'completed' | 'error' | 'all';
    userId?: string;
    startDate?: string;
    endDate?: string;
    appName?: string;
    lastNDays?: number;
  } = {}): Promise<{
    sessions: SessionListItem[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    offset: number;
    filters: {
      start_date: string | null;
      end_date: string | null;
      last_n_days: number | null;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      // Pagination
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.page) queryParams.append('offset', ((params.page - 1) * (params.limit || 50)).toString());
      
      // User filtering
      if (params.userId) queryParams.append('user_id', params.userId);
      
      // Status filtering
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);
      
      // Date filtering - ensure proper YYYY-MM-DD format
      if (params.startDate) {
        queryParams.append('start_date', this.formatDateForAPI(params.startDate));
      }
      if (params.endDate) {
        queryParams.append('end_date', this.formatDateForAPI(params.endDate));
      }
      if (params.lastNDays) queryParams.append('last_n_days', params.lastNDays.toString());

      const response = await fetch(`${this.baseUrl}/api/asksessions?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch ask sessions');
      
      const data = await response.json();
      
      // Transform API response to match our interface
      const sessions: SessionListItem[] = (data.data.sessions || []).map((session: Record<string, unknown>) => ({
        id: session.session_id as string,
        userId: session.user_id as string,
        mode: 'ask', // Force ask mode for this API
        startTime: session.created_at as string,
        endTime: session.updated_at as string,
        messageCount: (session.total_queries as number) || 0,
        status: (session.status as string) || this.determineSessionStatus(session.updated_at as string),
        lastActivity: session.updated_at as string,
        userQuery: (session.title as string) || 'No query available',
        hasError: false, // Not available in this API
        hasFeedback: false // Not available in this API
      }));

      return {
        sessions,
        total: data.data.total_count || sessions.length,
        page: params.page || 1,
        totalPages: Math.ceil((data.data.total_count || sessions.length) / (params.limit || 50)),
        limit: data.data.limit || 50,
        offset: data.data.offset || 0,
        filters: data.data.filters || {
          start_date: null,
          end_date: null,
          last_n_days: null
        }
      };
    } catch (error) {
      console.error('Error fetching ask sessions:', error);
      // Fallback to regular sessions API
      return this.getInvestigateSessions(params);
    }
  }

  // Method to get investigate mode sessions from /api/sessions
  async getInvestigateSessions(params: {
    page?: number;
    limit?: number;
    mode?: 'ask' | 'investigate' | 'all';
    status?: 'active' | 'completed' | 'error' | 'all';
    userId?: string;
    startDate?: string;
    endDate?: string;
    appName?: string;
    lastNDays?: number;
  } = {}): Promise<{
    sessions: SessionListItem[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    offset: number;
    filters: {
      start_date: string | null;
      end_date: string | null;
      last_n_days: number | null;
    };
  }> {
    try {
      // Use new /api/sessions endpoint for investigate mode
      const queryParams = new URLSearchParams();
      
      // Pagination
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.page) queryParams.append('offset', ((params.page - 1) * (params.limit || 50)).toString());
      
      // Date filtering
      if (params.startDate) {
        queryParams.append('start_date', this.formatDateForAPI(params.startDate));
      }
      if (params.endDate) {
        queryParams.append('end_date', this.formatDateForAPI(params.endDate));
      }
      if (params.lastNDays) queryParams.append('last_n_days', params.lastNDays.toString());

      const response = await fetch(`${this.baseUrl}/api/sessions?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch investigate sessions');
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('API returned error: ' + (data.message || 'Unknown error'));
      }
      
      // Transform API response to match our interface
      const sessions: SessionListItem[] = (data.data.sessions || []).map((session: Record<string, unknown>) => ({
        id: session.session_id as string,
        userId: session.user_id as string,
        mode: 'investigate', // Force investigate mode for this API
        startTime: session.created_at as string,
        endTime: session.updated_at as string,
        messageCount: this.extractMessageCount(session.state as Record<string, unknown>),
        status: this.determineSessionStatus(session.updated_at as string),
        lastActivity: session.updated_at as string,
        userQuery: this.extractUserQuery(session.state as Record<string, unknown>),
        hasError: false, // Not available in investigate API
        hasFeedback: false // Not available in investigate API
      }));

      return {
        sessions,
        total: data.data.total_count || sessions.length,
        page: params.page || 1,
        totalPages: Math.ceil((data.data.total_count || sessions.length) / (params.limit || 50)),
        limit: data.data.limit || 50,
        offset: data.data.offset || 0,
        filters: data.data.filters || {
          start_date: null,
          end_date: null,
          last_n_days: null
        }
      };
    } catch (error) {
      console.error('Error fetching investigate sessions:', error);
      throw error;
    }
  }

  // Method to get all sessions from both APIs
  async getAllSessions(params: {
    page?: number;
    limit?: number;
    mode?: 'ask' | 'investigate' | 'all';
    status?: 'active' | 'completed' | 'error' | 'all';
    userId?: string;
    startDate?: string;
    endDate?: string;
    appName?: string;
    lastNDays?: number;
  } = {}): Promise<{
    sessions: SessionListItem[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    offset: number;
    filters: {
      start_date: string | null;
      end_date: string | null;
      last_n_days: number | null;
    };
  }> {
    try {
      // Fetch from both APIs in parallel
      const [askSessions, investigateSessions] = await Promise.all([
        this.getAskSessions({ ...params, mode: 'ask' }).catch(() => ({ sessions: [], total: 0 })),
        this.getInvestigateSessions({ ...params, mode: 'investigate' }).catch(() => ({ sessions: [], total: 0 }))
      ]);

      // Combine sessions from both APIs
      const allSessions = [...askSessions.sessions, ...investigateSessions.sessions];
      
      // Sort by creation date (newest first)
      allSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      const totalSessions = allSessions.length;
      const limit = params.limit || 50;
      const page = params.page || 1;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedSessions = allSessions.slice(startIndex, endIndex);

      return {
        sessions: paginatedSessions,
        total: totalSessions,
        page,
        totalPages: Math.ceil(totalSessions / limit),
        limit,
        offset: startIndex,
        filters: {
          start_date: params.startDate || null,
          end_date: params.endDate || null,
          last_n_days: params.lastNDays || null
        }
      };
    } catch (error) {
      console.error('Error fetching all sessions:', error);
      throw error;
    }
  }

  // Helper methods for session data transformation

  private determineSessionStatus(updatedAt: string): 'active' | 'completed' | 'error' {
    const lastUpdate = new Date(updatedAt);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    // Consider session active if updated within last 30 minutes
    if (diffInMinutes < 30) return 'active';
    return 'completed';
  }

  private extractMessageCount(state: Record<string, unknown>): number {
    // Extract message count from state if available
    if (state && typeof state === 'object') {
      // You might need to adjust this based on actual state structure
      return 1; // Default to 1 for now
    }
    return 1;
  }

  private extractUserQuery(state: Record<string, unknown>): string {
    // Extract user query from state
    if (state && state.title && typeof state.title === 'string') {
      return state.title;
    }
    return 'No query available';
  }

  // New method to get session count for analytics
  async getSessionCount(params: {
    startDate?: string;
    endDate?: string;
    lastNDays?: number;
    mode?: 'ask' | 'investigate' | 'all';
  } = {}): Promise<number> {
    try {
      // If mode is specified, get count from specific API
      if (params.mode === 'ask') {
        return this.getAskSessionCount(params);
      }
      
      if (params.mode === 'investigate') {
        return this.getInvestigateSessionCount(params);
      }
      
      // For 'all' mode or no mode specified, get total from both APIs
      const [askCount, investigateCount] = await Promise.all([
        this.getAskSessionCount(params).catch(() => 0),
        this.getInvestigateSessionCount(params).catch(() => 0)
      ]);
      
      return askCount + investigateCount;
    } catch (error) {
      console.error('Error fetching session count:', error);
      return 0;
    }
  }

  // New method to get session count from ask-sessions API
  async getAskSessionCount(params: {
    startDate?: string;
    endDate?: string;
    lastNDays?: number;
  } = {}): Promise<number> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', '1'); // We only need count, not data
      
      if (params.startDate) {
        queryParams.append('start_date', this.formatDateForAPI(params.startDate));
      }
      if (params.endDate) {
        queryParams.append('end_date', this.formatDateForAPI(params.endDate));
      }
      if (params.lastNDays) queryParams.append('last_n_days', params.lastNDays.toString());

      const response = await fetch(`${this.baseUrl}/api/asksessions?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch ask session count');
      
      const data = await response.json();
      
      return data.data.total_count || 0;
    } catch (error) {
      console.error('Error fetching ask session count:', error);
      return 0;
    }
  }

  // New method to get investigate session count from /api/sessions
  async getInvestigateSessionCount(params: {
    startDate?: string;
    endDate?: string;
    lastNDays?: number;
  } = {}): Promise<number> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', '1'); // We only need count, not data
      
      if (params.startDate) {
        queryParams.append('start_date', this.formatDateForAPI(params.startDate));
      }
      if (params.endDate) {
        queryParams.append('end_date', this.formatDateForAPI(params.endDate));
      }
      if (params.lastNDays) queryParams.append('last_n_days', params.lastNDays.toString());

      const response = await fetch(`${this.baseUrl}/api/sessions?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch investigate session count');
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('API returned error: ' + (data.message || 'Unknown error'));
      }
      
      return data.data.total_count || 0;
    } catch (error) {
      console.error('Error fetching investigate session count:', error);
      return 0;
    }
  }

  async getSessionDetail(sessionId: string, userId: string, mode: 'ask' | 'investigate' = 'ask'): Promise<SessionDetail> {
    try {
      console.log(`Fetching session detail for ${sessionId} in mode ${mode}`);
      
      let response;
      let data;
      
      if (mode === 'ask') {
        // Use ask-sessions API for ask mode
        response = await fetch(`${this.baseUrl}/ask/ask-sessions/${sessionId}?user_id=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch ask session detail');
        
        data = await response.json();
        
        // Check if the response has the expected structure
        if (!data.success || !data.data || !data.data.session) {
          throw new Error('Invalid response structure from ask-sessions API');
        }
        
        return {
          id: data.data.session.session_id,
          userId: data.data.session.user_id,
          mode: 'ask',
          startTime: data.data.session.created_at,
          endTime: data.data.session.updated_at,
          messages: (data.data.turns || []).map((turn: Record<string, unknown>) => ({
            id: turn.id as string,
            type: 'user' as const,
            content: turn.user_query as string,
            timestamp: turn.created_at as string,
            metadata: {
              ...turn.metadata as Record<string, unknown>,
              citations: turn.citations || []
            }
          })).concat((data.data.turns || []).map((turn: Record<string, unknown>) => ({
            id: `${turn.id}-ai`,
            type: 'ai' as const,
            content: turn.ai_response as string,
            timestamp: turn.created_at as string,
            metadata: {
              ...turn.metadata as Record<string, unknown>,
              citations: turn.citations || []
            }
          }))).sort((a: { timestamp: string }, b: { timestamp: string }) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
          metadata: data.data.session.session_metadata || {},
          analytics: {
            responseTime: 0,
            tokensUsed: 0,
            apiCalls: 0,
            errors: [],
            performance: {
              loadTime: 0,
              renderTime: 0
            }
          },
          feedback: []
        };
      } else {
        // Use sessions API for investigate mode
        response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}?user_id=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // If direct session fetch fails, try to get session details from events
          console.warn(`Failed to fetch investigate session ${sessionId} directly, trying alternative approach`);
          
          // Return a minimal session detail with placeholder data
          return {
            id: sessionId,
            userId: userId,
            mode: 'investigate',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            messages: [
              {
                id: `${sessionId}-placeholder`,
                type: 'system' as const,
                content: 'Session details could not be loaded. This may be due to API limitations or session expiry.',
                timestamp: new Date().toISOString(),
                metadata: {}
              }
            ],
            metadata: { error: 'Could not fetch session details' },
            analytics: {
              responseTime: 0,
              tokensUsed: 0,
              apiCalls: 0,
              errors: [
                {
                  id: 'fetch-error',
                  type: 'API_ERROR',
                  message: 'Failed to fetch investigate session details',
                  timestamp: new Date().toISOString()
                }
              ],
              performance: {
                loadTime: 0,
                renderTime: 0
              }
            },
            feedback: []
          };
        }
        
        data = await response.json();
        
        // For investigate mode, we need to extract messages from the state or events
        let messages: Array<{
          id: string;
          type: 'user' | 'ai' | 'system';
          content: string;
          timestamp: string;
          metadata: Record<string, unknown>;
        }> = [];

        // Try to extract messages from the response
        if (data.data) {
          if (data.data.events && Array.isArray(data.data.events)) {
            // Extract messages from events
            messages = data.data.events
              .filter((event: Record<string, unknown>) => event.content && (event.content as Record<string, unknown>).parts && Array.isArray((event.content as Record<string, unknown>).parts) && ((event.content as Record<string, unknown>).parts as unknown[]).length > 0)
              .map((event: Record<string, unknown>, index: number) => {
                const content = event.content as Record<string, unknown>;
                const parts = content.parts as Array<Record<string, unknown>>;
                return {
                  id: (event.id as string) || `${sessionId}-${index}`,
                  type: (event.author as string) === 'user' ? 'user' as const : 'ai' as const,
                  content: (parts[0]?.text as string) || (parts[0]?.content as string) || 'No content available',
                  timestamp: new Date((event.timestamp as number) * 1000).toISOString(),
                  metadata: {
                    author: event.author,
                    invocationId: event.invocationId,
                    actions: event.actions || []
                  }
                };
              });
          } else {
            // Fallback: try to extract from state
            messages = this.extractMessagesFromState(data.data.state || data.data);
          }
        }

        // If no messages found, add a placeholder
        if (messages.length === 0) {
          messages = [
            {
              id: `${sessionId}-no-messages`,
              type: 'system' as const,
              content: 'No conversation messages found for this session.',
              timestamp: data.data?.created_at || new Date().toISOString(),
              metadata: {}
            }
          ];
        }
        
        return {
          id: data.data?.session_id || sessionId,
          userId: data.data?.user_id || userId,
          mode: 'investigate',
          startTime: data.data?.created_at || new Date().toISOString(),
          endTime: data.data?.updated_at || new Date().toISOString(),
          messages,
          metadata: data.data?.state || {},
          analytics: {
            responseTime: 0,
            tokensUsed: 0,
            apiCalls: 0,
            errors: [],
            performance: {
              loadTime: 0,
              renderTime: 0
            }
          },
          feedback: []
        };
      }
    } catch (error) {
      console.error('Error fetching session detail:', error);
      throw error;
    }
  }

  // Helper method to extract messages from investigate session state
  private extractMessagesFromState(state: Record<string, unknown>): Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: string;
    metadata: Record<string, unknown>;
  }> {
    const messages: Array<{
      id: string;
      type: 'user' | 'ai';
      content: string;
      timestamp: string;
      metadata: Record<string, unknown>;
    }> = [];
    
    if (!state || typeof state !== 'object') {
      return messages;
    }

    // Try to extract messages from various possible state structures
    if (state.messages && Array.isArray(state.messages)) {
      state.messages.forEach((msg: Record<string, unknown>, index: number) => {
        messages.push({
          id: `${state.session_id as string}-${index}`,
          type: (msg.role as string) === 'user' ? 'user' : 'ai',
          content: (msg.content as string) || (msg.message as string) || '',
          timestamp: (msg.timestamp as string) || (state.created_at as string) || new Date().toISOString(),
          metadata: (msg.metadata as Record<string, unknown>) || {}
        });
      });
    } else if (state.events && Array.isArray(state.events)) {
      state.events.forEach((event: Record<string, unknown>, index: number) => {
        if (event.type === 'user_message' || event.type === 'ai_response') {
          messages.push({
            id: `${state.session_id as string}-${index}`,
            type: event.type === 'user_message' ? 'user' : 'ai',
            content: (event.content as string) || (event.message as string) || '',
            timestamp: (event.timestamp as string) || (state.created_at as string) || new Date().toISOString(),
            metadata: (event.metadata as Record<string, unknown>) || {}
          });
        }
      });
    } else {
      // Fallback: create a basic message from the title
      if (state.title && typeof state.title === 'string') {
        messages.push({
          id: `${state.session_id as string}-0`,
          type: 'user',
          content: state.title,
          timestamp: (state.created_at as string) || new Date().toISOString(),
          metadata: {}
        });
      }
    }

    return messages;
  }

  // Feedback Management
  async getFeedbackSummary(): Promise<FeedbackSummary> {
    const analytics = feedbackService.getAnalytics();
    return {
      totalFeedback: analytics.totalFeedback,
      positiveCount: analytics.positiveCount,
      negativeCount: analytics.negativeCount,
      averageRating: 0, // Not available in feedback service
      ratingDistribution: {}, // Not available in feedback service
      categoryBreakdown: {}, // Not available in feedback service
      recentFeedback: [], // Not available in feedback service
      trends: {
        thisWeek: 0,
        lastWeek: 0,
        thisMonth: 0,
        lastMonth: 0,
      },
    };
  }

  // Settings Management
  async getSettings(): Promise<AdminSettings> {
    const mockSettings: AdminSettings = {
      maxConversationTurns: 20,
      enableAnalytics: true,
      enableFeedback: true,
      sessionTimeout: 30,
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 60,
        requestsPerHour: 1000
      },
      features: {
        askMode: true,
        investigateMode: true,
        slashCommands: true,
        fileUpload: false
      }
    };

    await new Promise(resolve => setTimeout(resolve, 200));
    return mockSettings;
  }

  async updateSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    await new Promise(resolve => setTimeout(resolve, 300));
    // In real implementation, this would update the settings via API
    return { ...await this.getSettings(), ...settings };
  }

  async resetSettings(): Promise<AdminSettings> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.getSettings();
  }

  // Mock data methods
  private getMockAnalyticsData(): AnalyticsData {
    return {
      totalSessions: 1247,
      totalUsers: 342,
      averageSessionLength: 8.5,
      topQueries: [
        { query: "How to reset password", count: 45 },
        { query: "Delivery status", count: 38 },
        { query: "Account settings", count: 32 },
        { query: "Billing inquiry", count: 28 },
        { query: "Technical support", count: 25 }
      ],
      modeDistribution: { ask: 756, investigate: 491 },
      userEngagement: {
        dailyActiveUsers: 89,
        weeklyActiveUsers: 234,
        monthlyActiveUsers: 342
      },
      responseMetrics: {
        averageResponseTime: 2.3,
        successRate: 94.2,
        errorRate: 5.8,
        messageSent: 0
      }
    };
  }

  private getMockSessions(params: Record<string, unknown>): Promise<{
    sessions: SessionListItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const mockSessions: SessionListItem[] = [
      {
        id: 'session-1',
        userId: 'user-1',
        mode: 'ask',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        messageCount: 8,
        status: 'completed',
        lastActivity: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        userQuery: 'How to reset my password?',
        hasError: false,
        hasFeedback: true
      },
      {
        id: 'session-2',
        userId: 'user-2',
        mode: 'investigate',
        startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        messageCount: 3,
        status: 'active',
        lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        userQuery: 'Investigate delivery delay',
        hasError: false,
        hasFeedback: false
      },
      {
        id: 'session-3',
        userId: 'user-3',
        mode: 'ask',
        startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        messageCount: 12,
        status: 'error',
        lastActivity: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        userQuery: 'Account billing issue',
        hasError: true,
        hasFeedback: false
      }
    ];

    return Promise.resolve({
      sessions: mockSessions,
      total: mockSessions.length,
      page: params.page as number || 1,
      totalPages: 1
    });
  }
}

export const adminService = new AdminService();
