// Admin dashboard types
export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  permissions: AdminPermission[];
}

export type AdminPermission = 
  | 'view_analytics'
  | 'view_sessions'
  | 'view_feedback'
  | 'manage_settings'
  | 'export_data';

export interface AnalyticsQuery {
  startDate: string;
  endDate: string;
  mode?: 'ask' | 'investigate' | 'all';
  userId?: string;
  sessionId?: string;
  filters: AnalyticsFilter[];
}

export interface AnalyticsFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: string | number | [string | number, string | number];
}

export interface AnalyticsData {
  totalSessions: number;
  totalUsers: number;
  averageSessionLength: number;
  topQueries: Array<{ query: string; count: number }>;
  modeDistribution: { ask: number; investigate: number };
  userEngagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  responseMetrics: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    messageSent: number;
  };
}

export interface SessionListItem {
  id: string;
  userId: string;
  mode: 'ask' | 'investigate';
  startTime: string;
  endTime?: string;
  messageCount: number;
  status: 'active' | 'completed' | 'error';
  lastActivity: string;
  userQuery?: string;
  hasError: boolean;
  hasFeedback: boolean;
}

export interface SessionDetail {
  id: string;
  userId: string;
  mode: 'ask' | 'investigate';
  startTime: string;
  endTime?: string;
  messages: SessionMessage[];
  metadata: Record<string, unknown>;
  analytics: SessionAnalytics;
  feedback?: SessionFeedback[];
}

export interface SessionMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SessionAnalytics {
  responseTime: number;
  tokensUsed: number;
  apiCalls: number;
  errors: SessionError[];
  performance: {
    loadTime: number;
    renderTime: number;
  };
}

export interface SessionError {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export interface SessionFeedback {
  id: string;
  sessionId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  timestamp: string;
  category: 'helpful' | 'accurate' | 'fast' | 'easy_to_use' | 'other';
}

export interface FeedbackSummary {
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  categoryBreakdown: Record<string, number>;
  recentFeedback: SessionFeedback[];
  trends: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
}

export interface AdminSettings {
  maxConversationTurns: number;
  enableAnalytics: boolean;
  enableFeedback: boolean;
  sessionTimeout: number; // in minutes
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  features: {
    askMode: boolean;
    investigateMode: boolean;
    slashCommands: boolean;
    fileUpload: boolean;
  };
}

export interface AdminDashboardTab {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType;
  permissions: AdminPermission[];
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  dateRange: {
    start: string;
    end: string;
  };
  includeAnalytics: boolean;
  includeSessions: boolean;
  includeFeedback: boolean;
  filters?: AnalyticsFilter[];
}
