// Core ticket types for the slash command system
export interface Ticket {
  id: string;
  subject: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee?: TicketAssignee;
  requester: TicketRequester;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  ticketType: TicketType;
  customFields?: Record<string, any>;
  metadata?: TicketMetadata;
}

export interface TicketAssignee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface TicketRequester {
  id: string;
  name: string;
  email: string;
  organization?: string;
}

export interface TicketMetadata {
  campaignId?: string;
  deliveryId?: string;
  errorCode?: string;
  environment?: string;
  region?: string;
  severity?: string;
}

export type TicketStatus = 
  | 'open'
  | 'pending'
  | 'solved'
  | 'closed'
  | 'waiting_on_customer'
  | 'waiting_on_third_party'
  | 'escalated';

export type TicketPriority = 
  | 'urgent'
  | 'high'
  | 'normal'
  | 'low';

export type TicketType = 
  | 'incident'
  | 'problem'
  | 'question'
  | 'task'
  | 'bug'
  | 'feature_request';

// Ticket filters for the modal
export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  assignee?: string;
  tags?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  search?: string;
}

// Ticket list response
export interface TicketListResponse {
  tickets: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: TicketFilters;
}

// Ticket selection result
export interface TicketSelection {
  ticket: Ticket;
  summary: string;
  context: Record<string, any>;
} 