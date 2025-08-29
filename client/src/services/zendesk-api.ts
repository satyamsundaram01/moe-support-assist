// Zendesk API service for ticket integration
import type { 
  ZendeskConfig, 
  ZendeskTicket, 
  ZendeskTicketListResponse, 
  ZendeskSearchParams,
  ZendeskAPIResponse,
  ZendeskUser 
} from '../types/zendesk';
import type { Ticket, TicketFilters } from '../types/ticket';
import { logger } from '../lib/logger';
import { API } from '../constants/api';

export class ZendeskAPI {
  private config: ZendeskConfig;
  private baseURL: string;

  constructor(config: ZendeskConfig) {
    this.config = config;
    
    // Use Vite proxy in development to avoid CORS issues
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      // Use Vite proxy in development
      this.baseURL = '/api/zendesk';
      logger.debug('Zendesk API baseURL (dev proxy)', { baseURL: this.baseURL });
    } else {
      // Handle different domain formats for production
      let domain = config.domain;
      if (domain && !domain.includes('.')) {
        // If domain is just a subdomain (e.g., "moengage"), append .zendesk.com
        domain = `${domain}.zendesk.com`;
      } else if (domain && domain.includes('zendesk.com')) {
        // If domain is already full (e.g., "moengage.zendesk.com"), use as is
        // domain = domain; // This line is redundant
      } else if (config.subdomain && config.subdomain.includes('zendesk.com')) {
        // Fallback to subdomain if it's a full domain
        domain = config.subdomain;
      } else {
        // Default fallback
        domain = 'moengage.zendesk.com';
      }
      
      this.baseURL = `https://${domain}/api/v2`;
      logger.debug('Zendesk API baseURL (production)', { baseURL: this.baseURL, domain });
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ZendeskAPIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const auth = btoa(`${this.config.email}/token:${this.config.apiToken}`);
    
    const defaultHeaders = {
      [API.headers.CONTENT_TYPE]: API.contentTypes.JSON,
      [API.headers.AUTHORIZATION]: `Basic ${auth}`,
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
      
      // Handle rate limiting
      const rateLimit = {
        limit: parseInt(response.headers.get('X-Rate-Limit') ?? '0'),
        remaining: parseInt(response.headers.get('X-Rate-Limit-Remaining') ?? '0'),
        reset: parseInt(response.headers.get('X-Rate-Limit-Reset') ?? '0'),
      };

      if (response.status !== API.statusCodes.OK) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Zendesk API request failed', { 
          url, 
          status: response.status, 
          statusText: response.statusText,
          errorData 
        });
        return {
          success: false,
          error: {
            error: `HTTP ${response.status}`,
            description: errorData.error || response.statusText,
            details: errorData
          },
          rateLimit
        };
      }

      const data = await response.json();
      logger.debug('Zendesk API Response', { endpoint: url, dataKeys: Object.keys(data) });
      return {
        success: true,
        data,
        rateLimit
      };
    } catch (error) {
      logger.error('Zendesk API network error', { url, error });
      return {
        success: false,
        error: {
          error: 'Network Error',
          description: error instanceof Error ? error.message : 'Unknown error',
        }
      };
    }
  }

  // Get tickets assigned to the current user or specific email
  async getMyTickets(params: ZendeskSearchParams = {}, searchEmail?: string): Promise<ZendeskAPIResponse<ZendeskTicketListResponse>> {
    const searchParams = new URLSearchParams();
    
    // Add search parameters
    if (params.query) {
      searchParams.append('query', params.query);
    }
    if (params.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params.per_page) {
      searchParams.append('per_page', params.per_page.toString());
    }
    if (params.sort_by) {
      searchParams.append('sort_by', params.sort_by);
    }
    if (params.sort_order) {
      searchParams.append('sort_order', params.sort_order);
    }

    // Use provided email or default to current user's email
    const targetEmail = searchEmail || this.config.email;
    
    // Default to unsolved tickets assigned to target user
    if (!params.query) {
      searchParams.append('query', `assignee:${targetEmail} status:open status:pending status:hold`);
    }

    const endpoint = `/search.json?${searchParams.toString()}`;
    const response = await this.request<{ results: ZendeskTicket[]; count: number; next_page?: string; previous_page?: string }>(endpoint, {
      method: API.methods.GET,
    });
    
    // Transform search API response to match expected format
    if (response.success && response.data) {
      const transformedData: ZendeskTicketListResponse = {
        tickets: response.data.results || [],
        count: response.data.count || 0,
        next_page: response.data.next_page,
        previous_page: response.data.previous_page
      };
      
      return {
        ...response,
        data: transformedData
      };
    }
    
    return {
      success: false,
      error: response.error || { error: 'Unknown error', description: 'Failed to fetch tickets' }
    } as ZendeskAPIResponse<ZendeskTicketListResponse>;
  }

  // Search tickets with filters - hybrid approach for better performance
  async searchTickets(filters: TicketFilters, searchEmail?: string): Promise<ZendeskAPIResponse<ZendeskTicketListResponse>> {
    // Check if this is a ticket ID search
    if (filters.search) {
      const searchTerm = filters.search.trim();
      if (searchTerm.startsWith('#') || /^\d+$/.test(searchTerm)) {
        // Use direct ticket API for ticket ID searches
        const ticketId = searchTerm.replace('#', '');
        return this.getTicketById(ticketId);
      }
    }

    // Use search API for text searches or when loading all tickets
    const searchParams = new URLSearchParams();
    const queryParts: string[] = [];
    
    if (filters.search) {
      // Regular text search
      queryParts.push(filters.search);
    }
    
    // Use provided email or default to current user's email
    const targetEmail = searchEmail || this.config.email;
    queryParts.push(`assignee:${targetEmail} status:open status:pending status:hold`);
    
    if (filters.status && filters.status.length > 0) {
      queryParts.push(`status:${filters.status.join(' OR status:')}`);
    }
    
    if (filters.priority && filters.priority.length > 0) {
      queryParts.push(`priority:${filters.priority.join(' OR priority:')}`);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      queryParts.push(`tags:${filters.tags.join(' OR tags:')}`);
    }
    
    if (filters.dateRange) {
      if (filters.dateRange.from) {
        queryParts.push(`created>${filters.dateRange.from}`);
      }
      if (filters.dateRange.to) {
        queryParts.push(`created<${filters.dateRange.to}`);
      }
    }

    const query = queryParts.join(' AND ');
    searchParams.append('query', query);
    searchParams.append('per_page', '25');

    const endpoint = `/search.json?${searchParams.toString()}`;
    const response = await this.request<{ results: ZendeskTicket[]; count: number; next_page?: string; previous_page?: string }>(endpoint, {
      method: API.methods.GET,
    });
    
    // Transform search API response to match expected format
    if (response.success && response.data) {
      const transformedData: ZendeskTicketListResponse = {
        tickets: response.data.results || [],
        count: response.data.count || 0,
        next_page: response.data.next_page,
        previous_page: response.data.previous_page
      };
      
      return {
        ...response,
        data: transformedData
      };
    }
    
    return {
      success: false,
      error: response.error || { error: 'Unknown error', description: 'Failed to fetch tickets' }
    } as ZendeskAPIResponse<ZendeskTicketListResponse>;
  }

  // Get a single ticket by ID and format as ticket list response
  async getTicketById(ticketId: string): Promise<ZendeskAPIResponse<ZendeskTicketListResponse>> {
    const endpoint = `/tickets/${ticketId}.json`;
    const response = await this.request<{ ticket: ZendeskTicket }>(endpoint);
    
    if (response.success && response.data?.ticket) {
      // Transform single ticket response to match ticket list format
      const transformedData: ZendeskTicketListResponse = {
        tickets: [response.data.ticket],
        count: 1,
        next_page: undefined,
        previous_page: undefined
      };
      
      return {
        ...response,
        data: transformedData
      };
    }
    
    // If ticket not found, return empty list
    if (response.error?.error === 'HTTP 404') {
      return {
        success: true,
        data: {
          tickets: [],
          count: 0,
          next_page: undefined,
          previous_page: undefined
        }
      };
    }
    
    return {
      success: false,
      error: response.error || { error: 'Unknown error', description: 'Failed to fetch tickets' }
    } as ZendeskAPIResponse<ZendeskTicketListResponse>;
  }

  // Get a specific ticket by ID
  async getTicket(ticketId: string): Promise<ZendeskAPIResponse<{ ticket: ZendeskTicket }>> {
    const endpoint = `/tickets/${ticketId}.json`;
    return this.request<{ ticket: ZendeskTicket }>(endpoint);
  }

  // Get current user information
  async getCurrentUser(): Promise<ZendeskAPIResponse<{ user: ZendeskUser }>> {
    const endpoint = '/users/me.json';
    return this.request<{ user: ZendeskUser }>(endpoint);
  }

  // Static utility methods for data conversion
  static convertZendeskTicket(zendeskTicket: ZendeskTicket): Ticket {
    // Map Zendesk status to our TicketStatus type
    const mapStatus = (status: string) => {
      switch (status) {
        case 'new': return 'open';
        case 'open': return 'open';
        case 'pending': return 'pending';
        case 'hold': return 'pending';
        case 'solved': return 'closed';
        case 'closed': return 'closed';
        default: return 'open';
      }
    };

    return {
      id: zendeskTicket.id.toString(),
      subject: zendeskTicket.subject,
      description: zendeskTicket.description,
      status: mapStatus(zendeskTicket.status),
      priority: zendeskTicket.priority as 'low' | 'normal' | 'high' | 'urgent',
      assignee: zendeskTicket.assignee_id ? {
        id: zendeskTicket.assignee_id.toString(),
        name: 'Unknown',
        email: 'unknown@example.com'
      } : undefined,
      requester: {
        id: zendeskTicket.requester_id.toString(),
        name: 'Unknown',
        email: 'unknown@example.com'
      },
      tags: zendeskTicket.tags,
      createdAt: zendeskTicket.created_at,
      updatedAt: zendeskTicket.updated_at,
      lastActivityAt: zendeskTicket.updated_at,
      ticketType: (zendeskTicket.type as 'problem' | 'incident' | 'question' | 'task') || 'incident',
      customFields: zendeskTicket.custom_fields?.reduce((acc: Record<string, unknown>, field) => {
        acc[field.id.toString()] = field.value;
        return acc;
      }, {}) || {},
      metadata: {
        campaignId: zendeskTicket.tags.find((tag: string) => tag.startsWith('campaign_'))?.replace('campaign_', ''),
        deliveryId: zendeskTicket.tags.find((tag: string) => tag.startsWith('delivery_'))?.replace('delivery_', ''),
        errorCode: zendeskTicket.tags.find((tag: string) => tag.startsWith('error_'))?.replace('error_', ''),
        environment: zendeskTicket.tags.find((tag: string) => tag.startsWith('env_'))?.replace('env_', ''),
        region: zendeskTicket.tags.find((tag: string) => tag.startsWith('region_'))?.replace('region_', ''),
        severity: zendeskTicket.tags.find((tag: string) => tag.startsWith('severity_'))?.replace('severity_', ''),
      }
    };
  }

  // Generate a summary for ticket selection
  static generateTicketSummary(ticket: Ticket): string {
    const parts: string[] = [];

    parts.push(`**Ticket #${ticket.id}**: ${ticket.subject}`);
    
    if (ticket.description) {
      parts.push(`**Description**: ${ticket.description.substring(0, 200)}${ticket.description.length > 200 ? '...' : ''}`);
    }
    
    parts.push(`**Status**: ${ticket.status} | **Priority**: ${ticket.priority}`);
    
    if (ticket.tags.length > 0) {
      parts.push(`**Tags**: ${ticket.tags.join(', ')}`);
    }
    
    if (ticket.metadata) {
      const metadata = Object.entries(ticket.metadata)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      if (metadata) {
        parts.push(`**Metadata**: ${metadata}`);
      }
    }

    return parts.join('\n\n');
  }
}

// Create singleton instance
let zendeskAPIInstance: ZendeskAPI | null = null;

export const createZendeskAPI = (config: ZendeskConfig): ZendeskAPI => {
  if (!zendeskAPIInstance) {
    zendeskAPIInstance = new ZendeskAPI(config);
  }
  return zendeskAPIInstance;
};

export const getZendeskAPI = (): ZendeskAPI | null => {
  return zendeskAPIInstance;
};
