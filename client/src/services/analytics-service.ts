import { useChatStore } from '../store/chat-store';

// Generic analytics event interface
export interface AnalyticsEvent {
  event_name: string;
  user_id?: string;
  session_id: string;
  timestamp: string;
  url?: string;
  referrer?: string;
  version: string;
  session_duration_ms: number;
  attributes: Record<string, any>; // All custom event data goes here
}

// Event deduplication and throttling
interface EventCache {
  [key: string]: {
    lastSent: number;
    count: number;
  };
}

interface PageViewCache {
  [url: string]: {
    lastTracked: number;
    sessionId: string;
  };
}

// Session management
class SessionManager {
  private sessionId: string;
  private sessionStartTime: number;
  private lastActivityTime: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  updateLastActivity(): void {
    this.lastActivityTime = Date.now();
  }

  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  isSessionActive(): boolean {
    const thirtyMinutes = 30 * 60 * 1000;
    return (Date.now() - this.lastActivityTime) < thirtyMinutes;
  }

  refreshSessionIfNeeded(): void {
    if (!this.isSessionActive()) {
      this.sessionId = this.generateSessionId();
      this.sessionStartTime = Date.now();
    }
    this.updateLastActivity();
  }
}

// Analytics service class
class AnalyticsService {
  private sessionManager: SessionManager;
  private isEnabled: boolean = true;
  private queue: AnalyticsEvent[] = [];
  private batchSize: number = 10;
  private flushInterval: number = 30000;
  private flushTimer?: NodeJS.Timeout;
  private readonly SCHEMA_VERSION = '1.0.0';
  
  // Deduplication and throttling
  private eventCache: EventCache = {};
  private pageViewCache: PageViewCache = {};
  private readonly THROTTLE_WINDOW = 5000; // 5 seconds
  private readonly PAGE_VIEW_COOLDOWN = 30000; // 30 seconds
  private visibilityTimer?: NodeJS.Timeout;
  private lastVisibilityChange = 0;

  constructor() {
    this.sessionManager = new SessionManager();
    this.startPeriodicFlush();
    this.initializeVisibilityTracking();
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  // Initialize visibility tracking with smart throttling
  private initializeVisibilityTracking(): void {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      const now = Date.now();
      // const isVisible = !document.hidden;
      
      // Only track significant visibility changes (avoid rapid tab switching)
      if (now - this.lastVisibilityChange < 2000) return;
      
      this.lastVisibilityChange = now;
      
      // Clear existing timer
      if (this.visibilityTimer) {
        clearTimeout(this.visibilityTimer);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Helper method to extract chat context from URL and store
  private getChatContext(): { mode?: string; chatSessionId?: string } {
    if (typeof window === 'undefined') return {};

    const path = window.location.pathname;
    let mode: string | undefined;
    let chatSessionId: string | undefined;

    // Extract mode from URL
    if (path.includes('/chat/ask')) {
      mode = 'ask';
    } else if (path.includes('/chat/investigate')) {
      mode = 'investigate';
    }

    // Extract session ID from URL (last part of the path)
    const pathParts = path.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    
    // Check if the last part looks like a session ID (not 'chat', 'ask', 'investigate', etc.)
    if (lastPart && !['chat', 'ask', 'investigate', 'new'].includes(lastPart) && lastPart.length > 5) {
      chatSessionId = lastPart;
    }

    // Try to get additional context from chat store
    try {
      const chatStore = useChatStore.getState();
      if (!mode && chatStore.currentMode) {
        mode = chatStore.currentMode;
      }
      if (!chatSessionId && chatStore.activeConversationId) {
        chatSessionId = chatStore.activeConversationId;
      }
    } catch {
      // Ignore store errors
    }

    return { mode, chatSessionId };
  }

  // Internal track method with deduplication
  private trackInternal(
    eventName: string,
    attributes: Record<string, any> = {},
    customSessionId?: string,
    customUserId?: string
  ): void {
    // Check for event throttling
    const eventKey = this.generateEventKey(eventName, attributes);
    const now = Date.now();
    
    if (this.eventCache[eventKey]) {
      const timeSinceLastEvent = now - this.eventCache[eventKey].lastSent;
      if (timeSinceLastEvent < this.THROTTLE_WINDOW) {
        // Increment count but don't send duplicate
        this.eventCache[eventKey].count++;
        console.log(`🚫 Event throttled: ${eventName} (${this.eventCache[eventKey].count} times)`);
        return;
      }
    }

    // Update cache
    this.eventCache[eventKey] = {
      lastSent: now,
      count: 1
    };

    this.sessionManager.refreshSessionIfNeeded();

    // Get user ID from store or use custom
    const userStore = useChatStore.getState();
    const userId = customUserId || userStore.currentUserId;
    const sessionId = customSessionId || this.sessionManager.getSessionId();

    // Get chat context (mode and chat session ID)
    const { mode, chatSessionId } = this.getChatContext();

    // Enhance attributes with global context
    const enhancedAttributes = {
      ...attributes,
      // Add mode if available and not already in attributes
      ...(mode && !attributes.mode && { mode }),
      // Add chat session ID if available and not already in attributes
      ...(chatSessionId && !attributes.session_id && { session_id: chatSessionId }),
    };

    // Create the complete event object
    const event: AnalyticsEvent = {
      event_name: eventName,
      user_id: userId || undefined,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      version: this.SCHEMA_VERSION,
      session_duration_ms: this.sessionManager.getSessionDuration(),
      attributes: enhancedAttributes,
    };

    this.queue.push(event);

    console.log('📊 Analytics Event Tracked:', {
      event_name: eventName,
      user_id: userId,
      session_id: sessionId,
      attributes: enhancedAttributes,
    });

    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  // Generate unique key for event deduplication
  private generateEventKey(eventName: string, attributes: Record<string, any>): string {
    const keyAttributes = { ...attributes };
    // Remove timestamp-like attributes that would make every event unique
    delete keyAttributes.timestamp;
    delete keyAttributes.response_time_ms;
    delete keyAttributes.duration_ms;
    
    return `${eventName}_${JSON.stringify(keyAttributes)}`;
  }

  // Smart page view tracking with deduplication
  trackPageView(pageName: string, additionalData: Record<string, any> = {}): void {
    if (!this.isEnabled) return;

    const url = typeof window !== 'undefined' ? window.location.href : pageName;
    const sessionId = this.sessionManager.getSessionId();
    const now = Date.now();

    // Check if we've already tracked this page view recently
    if (this.pageViewCache[url]) {
      const { lastTracked, sessionId: cachedSessionId } = this.pageViewCache[url];
      const timeSinceLastView = now - lastTracked;
      
      // Same session and within cooldown period - skip
      if (cachedSessionId === sessionId && timeSinceLastView < this.PAGE_VIEW_COOLDOWN) {
        console.log(`🚫 Page view skipped: ${pageName} (tracked ${timeSinceLastView}ms ago)`);
        return;
      }
    }

    // Update cache
    this.pageViewCache[url] = {
      lastTracked: now,
      sessionId: sessionId
    };

    // Track the page view
    this.trackInternal('page_view', {
      page_name: pageName,
      ...additionalData,
    });
  }

  // Public track method - uses internal tracking with deduplication
  track(
    eventName: string,
    attributes: Record<string, any> = {},
    customSessionId?: string,
    customUserId?: string
  ): void {
    if (!this.isEnabled) {
      console.log('Analytics disabled, skipping event:', eventName);
      return;
    }

    // Special handling for page views
    if (eventName === 'page_view') {
      this.trackPageView(attributes.page_name || 'unknown', attributes);
      return;
    }

    this.trackInternal(eventName, attributes, customSessionId, customUserId);
  }

  // Direct push method - for maximum flexibility
  push(eventData: {
    event_name: string;
    session_id?: string;
    user_id?: string;
    attributes?: Record<string, any>;
  }): void {
    this.track(
      eventData.event_name,
      eventData.attributes || {},
      eventData.session_id,
      eventData.user_id
    );
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      // Call FastAPI backend directly instead of using proxy
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
      const apiUrl = `${API_BASE_URL}/api/analytics/events`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToSend,
          batch_timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('📊 Analytics Batch Sent to FastAPI:', eventsToSend.length, 'events', result);
      
    } catch (error) {
      console.error('Failed to flush analytics events to FastAPI:', error);
      // Re-add events to queue for retry
      this.queue.unshift(...eventsToSend);
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval) as any;
  }

  stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  async manualFlush(): Promise<void> {
    await this.flush();
  }

  destroy(): void {
    this.stopPeriodicFlush();
    this.flush();
  }

  // Get current session info
  getSessionInfo() {
    return {
      sessionId: this.sessionManager.getSessionId(),
      sessionDuration: this.sessionManager.getSessionDuration(),
      isActive: this.sessionManager.isSessionActive(),
    };
  }

  // Get queue status
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      batchSize: this.batchSize,
      flushInterval: this.flushInterval,
    };
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

// Export the service
export { analyticsService };

// Generic track function - most flexible
export const trackEvent = (
  eventName: string,
  attributes: Record<string, any> = {},
  sessionId?: string,
  userId?: string
) => {
  analyticsService.track(eventName, attributes, sessionId, userId);
};

// Direct push function - for structured data
export const pushEvent = (eventData: {
  event_name: string;
  session_id?: string;
  user_id?: string;
  attributes?: Record<string, any>;
}) => {
  analyticsService.push(eventData);
};

// Convenience functions (optional - keeping for backward compatibility)
export const trackPageView = (pageName: string, additionalData?: Record<string, any>) => {
  analyticsService.track('page_view', {
    page_name: pageName,
    ...additionalData,
  });
};

export const trackButtonClick = (buttonName: string, additionalData?: Record<string, any>) => {
  analyticsService.track('button_click', {
    button_name: buttonName,
    ...additionalData,
  });
};

export const trackFormSubmit = (formName: string, additionalData?: Record<string, any>) => {
  analyticsService.track('form_submit', {
    form_name: formName,
    ...additionalData,
  });
};

export const trackError = (errorType: string, errorMessage: string, additionalData?: Record<string, any>) => {
  analyticsService.track('error', {
    error_type: errorType,
    error_message: errorMessage,
    stack_trace: new Error().stack,
    ...additionalData,
  });
};

export const trackChatMessage = (
  messageType: 'user' | 'ai', 
  messageLength: number, 
  additionalData?: Record<string, any>
) => {
  analyticsService.track('chat_message', {
    message_type: messageType,
    message_length: messageLength,
    ...additionalData,
  });
};

export const trackToolUsage = (
  toolName: string, 
  toolStatus: 'success' | 'error', 
  additionalData?: Record<string, any>
) => {
  analyticsService.track('tool_usage', {
    tool_name: toolName,
    tool_status: toolStatus,
    ...additionalData,
  });
};

export const trackCustomEvent = (
  eventName: string,
  customAttributes: Record<string, any>,
  options?: {
    sessionId?: string;
    userId?: string;
  }
) => {
  analyticsService.track(
    eventName, 
    customAttributes, 
    options?.sessionId, 
    options?.userId
  );
};

// Mode switch tracking
export const trackModeSwitch = (fromMode: string, toMode: string, additionalData?: Record<string, any>) => {
  analyticsService.track('mode_switch', {
    from_mode: fromMode,
    to_mode: toMode,
    ...additionalData,
  });
};

// Queue status function
export const getQueueStatus = () => analyticsService.getQueueStatus();

// Analytics attributes type
export type AnalyticsAttributes = Record<string, any>;

// Export session info
export const getSessionInfo = () => analyticsService.getSessionInfo();
