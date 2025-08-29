// Zendesk API types for ticket integration
export interface ZendeskConfig {
  domain: string;
  apiToken: string;
  email: string;
  subdomain?: string;
}

export interface ZendeskTicket {
  id: number;
  url: string;
  external_id?: string;
  created_at: string;
  updated_at: string;
  type?: string;
  subject: string;
  raw_subject: string;
  description: string;
  priority: string;
  status: string;
  recipient?: string;
  requester_id: number;
  submitter_id: number;
  assignee_id?: number;
  organization_id?: number;
  group_id?: number;
  collaborator_ids: number[];
  follower_ids: number[];
  email_cc_ids: number[];
  forum_topic_id?: number;
  problem_id?: number;
  has_incidents: boolean;
  due_at?: string;
  tags: string[];
  custom_fields: ZendeskCustomField[];
  satisfaction_rating?: ZendeskSatisfactionRating;
  sharing_agreement_ids: number[];
  followup_ids: number[];
  ticket_form_id?: number;
  brand_id?: number;
  allow_channelback: boolean;
  allow_attachments: boolean;
  is_public: boolean;
  comment?: ZendeskComment;
  via?: ZendeskVia;
  metadata?: ZendeskMetadata;
}

export interface ZendeskCustomField {
  id: number;
  value: any;
}

export interface ZendeskSatisfactionRating {
  id: number;
  score: string;
  comment?: string;
}

export interface ZendeskComment {
  id: number;
  type: string;
  body: string;
  html_body: string;
  plain_body: string;
  public: boolean;
  author_id: number;
  attachments: ZendeskAttachment[];
  audit_id?: number;
  via?: ZendeskVia;
  created_at: string;
  updated_at: string;
}

export interface ZendeskAttachment {
  id: number;
  filename: string;
  content_url: string;
  content_type: string;
  size: number;
}

export interface ZendeskVia {
  channel: string;
  source?: {
    from?: {
      address?: string;
      name?: string;
    };
    to?: {
      name?: string;
      address?: string;
    };
    rel?: string;
  };
}

export interface ZendeskMetadata {
  system?: {
    client?: string;
    ip_address?: string;
    latitude?: number;
    longitude?: number;
    location?: string;
  };
  custom?: Record<string, any>;
}

export interface ZendeskUser {
  id: number;
  url: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  time_zone: string;
  iana_time_zone: string;
  phone?: string;
  shared_phone_number?: boolean;
  photo?: {
    id: number;
    name: string;
    content_url: string;
    content_type: string;
    size: number;
  };
  locale_id: number;
  locale: string;
  organization_id?: number;
  role: string;
  verified: boolean;
  external_id?: string;
  tags: string[];
  alias?: string;
  active: boolean;
  shared: boolean;
  shared_agent: boolean;
  last_login_at?: string;
  two_factor_auth_enabled: boolean;
  signature?: string;
  details?: string;
  notes?: string;
  role_type?: number;
  custom_role_id?: number;
  moderator: boolean;
  ticket_restriction?: string;
  only_private_comments: boolean;
  restricted_agent: boolean;
  suspended: boolean;
  default_group_id?: number;
  report_csv: boolean;
  user_fields?: Record<string, any>;
}

export interface ZendeskTicketListResponse {
  tickets: ZendeskTicket[];
  next_page?: string;
  previous_page?: string;
  count: number;
}

export interface ZendeskSearchParams {
  query?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  status?: string[];
  priority?: string[];
  assignee_id?: number;
  requester_id?: number;
  organization_id?: number;
  tags?: string[];
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
}

// Error types
export interface ZendeskError {
  error: string;
  description?: string;
  details?: Record<string, any>;
}

// API Response wrapper
export interface ZendeskAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: ZendeskError;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
} 