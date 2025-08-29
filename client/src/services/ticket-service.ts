// Ticket service for managing ticket operations
import { createZendeskAPI, ZendeskAPI } from './zendesk-api';
import type { 
  Ticket, 
  TicketFilters, 
  TicketListResponse, 
  TicketSelection 
} from '../types/ticket';
import type { ZendeskConfig } from '../types/zendesk';
import type { APIResponse } from '../types';

export class TicketService {
  private zendeskAPI: ZendeskAPI;

  constructor(config: ZendeskConfig) {
    this.zendeskAPI = createZendeskAPI(config);
  }

  // Get tickets for the current user or specific email
  async getMyTickets(filters: TicketFilters = {}, searchEmail?: string): Promise<APIResponse<TicketListResponse>> {
    try {
      // For now, use the hardcoded email as requested
      const targetEmail = searchEmail || 'jai.jain@moengage.com';
      
      const response = await this.zendeskAPI.getMyTickets({
        query: filters.search,
        page: 1,
        per_page: 25,
        sort_by: 'updated_at',
        sort_order: 'desc'
      }, targetEmail);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error?.description || 'Failed to fetch tickets',
          timestamp: Date.now()
        };
      }

      // Convert Zendesk tickets to our format
      const tickets = (response.data.tickets || []).map(ZendeskAPI.convertZendeskTicket);
      
      console.log('🎫 Ticket Service - getMyTickets:', {
        rawResponse: response.data,
        ticketsCount: response.data.tickets?.length || 0,
        convertedTicketsCount: tickets.length,
        totalCount: response.data.count,
        targetEmail
      });

      return {
        success: true,
        data: {
          tickets,
          pagination: {
            page: 1, // Zendesk doesn't provide pagination info in search
            limit: 25,
            total: response.data.count || tickets.length,
            hasNext: !!response.data.next_page,
            hasPrev: !!response.data.previous_page
          },
          filters
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tickets',
        timestamp: Date.now()
      };
    }
  }

  // Search tickets with advanced filters
  async searchTickets(filters: TicketFilters, searchEmail?: string): Promise<APIResponse<TicketListResponse>> {
    try {
      // For now, use the hardcoded email as requested
      const targetEmail = searchEmail || 'jai.jain@moengage.com';
      
      const response = await this.zendeskAPI.searchTickets(filters, targetEmail);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error?.description || 'Failed to search tickets',
          timestamp: Date.now()
        };
      }

      const tickets = (response.data.tickets || []).map(ZendeskAPI.convertZendeskTicket);
      
      console.log('🔍 Ticket Service - searchTickets:', {
        rawResponse: response.data,
        ticketsCount: response.data.tickets?.length || 0,
        convertedTicketsCount: tickets.length,
        totalCount: response.data.count,
        targetEmail,
        filters
      });

      return {
        success: true,
        data: {
          tickets,
          pagination: {
            page: 1,
            limit: 25,
            total: response.data.count || tickets.length,
            hasNext: !!response.data.next_page,
            hasPrev: !!response.data.previous_page
          },
          filters
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search tickets',
        timestamp: Date.now()
      };
    }
  }

  // Get a specific ticket by ID
  async getTicket(ticketId: string): Promise<APIResponse<Ticket>> {
    try {
      const response = await this.zendeskAPI.getTicket(ticketId);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error?.description || 'Failed to fetch ticket',
          timestamp: Date.now()
        };
      }

      const ticket = ZendeskAPI.convertZendeskTicket(response.data.ticket);

      return {
        success: true,
        data: ticket,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ticket',
        timestamp: Date.now()
      };
    }
  }

  // Generate ticket selection for chat input
  async selectTicket(ticketId: string): Promise<APIResponse<TicketSelection>> {
    try {
      const ticketResponse = await this.getTicket(ticketId);

      if (!ticketResponse.success || !ticketResponse.data) {
        return {
          success: false,
          error: ticketResponse.error || 'Failed to select ticket',
          timestamp: Date.now()
        };
      }

      const ticket = ticketResponse.data;
      const summary = ZendeskAPI.generateTicketSummary(ticket);

      // Build context object for the AI
      const context = {
        ticketId: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        tags: ticket.tags,
        metadata: ticket.metadata,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      };

      return {
        success: true,
        data: {
          ticket,
          summary,
          context
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to select ticket',
        timestamp: Date.now()
      };
    }
  }

  // Get ticket suggestions based on search query
  async getTicketSuggestions(query: string): Promise<APIResponse<Ticket[]>> {
    try {
      const response = await this.searchTickets({
        search: query
      });

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to get suggestions',
          timestamp: Date.now()
        };
      }

      return {
        success: true,
        data: response.data.tickets,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get suggestions',
        timestamp: Date.now()
      };
    }
  }

  // Get ticket statistics for the current user or specific email
  async getTicketStats(searchEmail?: string): Promise<APIResponse<{
    total: number;
    open: number;
    pending: number;
    solved: number;
    urgent: number;
    high: number;
  }>> {
    try {
      // For now, use the hardcoded email as requested
      const targetEmail = searchEmail || 'jai.jain@moengage.com';
      
      const response = await this.zendeskAPI.getMyTickets({}, targetEmail);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error?.description || 'Failed to fetch ticket stats',
          timestamp: Date.now()
        };
      }

      const tickets = (response.data.tickets || []).map(ZendeskAPI.convertZendeskTicket);

      const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        pending: tickets.filter(t => t.status === 'pending').length,
        solved: tickets.filter(t => t.status === 'solved').length,
        urgent: tickets.filter(t => t.priority === 'urgent').length,
        high: tickets.filter(t => t.priority === 'high').length,
      };

      return {
        success: true,
        data: stats,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ticket stats',
        timestamp: Date.now()
      };
    }
  }
}

// Create singleton instance
let ticketServiceInstance: TicketService | null = null;

export const createTicketService = (config: ZendeskConfig): TicketService => {
  if (!ticketServiceInstance) {
    ticketServiceInstance = new TicketService(config);
  }
  return ticketServiceInstance;
};

export const getTicketService = (): TicketService | null => {
  return ticketServiceInstance;
};
