import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Enhanced Event types for better event-driven architecture
export type UIEventType = 
  // Chat Events
  | 'message_sent'
  | 'message_received'
  | 'streaming_started'
  | 'streaming_stopped'
  | 'conversation_created'
  | 'conversation_deleted'
  | 'conversation_switched'
  
  // Tool Events
  | 'tool_call_started'
  | 'tool_call_completed'
  | 'tool_result_view'
  | 'tool_error'
  
  // UI Events
  | 'theme_changed'
  | 'scroll_to_bottom'
  | 'show_toast'
  | 'hide_toast'
  | 'modal_opened'
  | 'modal_closed'
  
  // Session Events
  | 'session_loaded'
  | 'session_saved'
  | 'session_error'
  
  // Navigation Events
  | 'route_changed'
  | 'sidebar_toggled'
  | 'search_triggered'
  
  // Performance Events
  | 'performance_metric'
  | 'error_occurred'
  | 'warning_shown';

export interface UIEvent {
  id: string;
  type: UIEventType;
  timestamp: number;
  data?: unknown;
  metadata?: {
    userId?: string;
    conversationId?: string;
    sessionId?: string;
    source?: string;
  };
}

export interface EventsState {
  // Events
  events: UIEvent[];
  lastEvent: UIEvent | null;
  eventHistory: UIEvent[];
  
  // UI State
  isToolModalOpen: boolean;
  currentToolResult: { name: string; result: unknown; type: 'campaign' | 'logs' } | null;
  isSidebarOpen: boolean;
  isSearchOpen: boolean;
  activeModals: string[];
  
  // Toast State
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }>;
  
  // Actions
  dispatchEvent: (type: UIEventType, data?: unknown, metadata?: UIEvent['metadata']) => void;
  
  // Modal Actions
  openToolModal: (tool: { name: string; result: unknown; type: 'campaign' | 'logs' }) => void;
  closeToolModal: () => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  
  // Sidebar Actions
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  
  // Toast Actions
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
  
  // Utility Actions
  clearEvents: () => void;
  getEventsByType: (type: UIEventType) => UIEvent[];
  getRecentEvents: (count?: number) => UIEvent[];
}

export const useEventsStore = create<EventsState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    events: [],
    lastEvent: null,
    eventHistory: [],
    isToolModalOpen: false,
    currentToolResult: null,
    isSidebarOpen: false,
    isSearchOpen: false,
    activeModals: [],
    toasts: [],
    
    // Enhanced Actions
    dispatchEvent: (type, data, metadata) => {
      const event: UIEvent = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        timestamp: Date.now(),
        data,
        metadata
      };
      
      set(state => ({
        events: [...state.events, event].slice(-100), // Keep last 100 events
        lastEvent: event,
        eventHistory: [...state.eventHistory, event].slice(-1000) // Keep last 1000 events
      }));
    },
    
    // Modal Actions
    openToolModal: (tool) => {
      set({
        isToolModalOpen: true,
        currentToolResult: tool,
        activeModals: [...get().activeModals, 'tool-modal']
      });
      get().dispatchEvent('tool_result_view', tool);
      get().dispatchEvent('modal_opened', { modalId: 'tool-modal' });
    },
    
    closeToolModal: () => {
      set(state => ({
        isToolModalOpen: false,
        currentToolResult: null,
        activeModals: state.activeModals.filter(id => id !== 'tool-modal')
      }));
      get().dispatchEvent('modal_closed', { modalId: 'tool-modal' });
    },
    
    openModal: (modalId) => {
      set(state => ({
        activeModals: [...state.activeModals, modalId]
      }));
      get().dispatchEvent('modal_opened', { modalId });
    },
    
    closeModal: (modalId) => {
      set(state => ({
        activeModals: state.activeModals.filter(id => id !== modalId)
      }));
      get().dispatchEvent('modal_closed', { modalId });
    },
    
    // Sidebar Actions
    toggleSidebar: () => {
      set(state => ({ isSidebarOpen: !state.isSidebarOpen }));
      get().dispatchEvent('sidebar_toggled');
    },
    
    openSidebar: () => {
      set({ isSidebarOpen: true });
      get().dispatchEvent('sidebar_toggled');
    },
    
    closeSidebar: () => {
      set({ isSidebarOpen: false });
      get().dispatchEvent('sidebar_toggled');
    },
    
    // Toast Actions
    showToast: (message, type = 'info', duration = 5000) => {
      const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const toast = { id: toastId, type, message, duration };
      
      set(state => ({
        toasts: [...state.toasts, toast]
      }));
      
      get().dispatchEvent('show_toast', { message, type });
      
      // Auto-hide toast after duration
      setTimeout(() => {
        get().hideToast(toastId);
      }, duration);
    },
    
    hideToast: (id) => {
      set(state => ({
        toasts: state.toasts.filter(toast => toast.id !== id)
      }));
      get().dispatchEvent('hide_toast', { id });
    },
    
    clearToasts: () => {
      set({ toasts: [] });
    },
    
    // Utility Actions
    clearEvents: () => {
      set({ events: [], lastEvent: null, eventHistory: [] });
    },
    
    getEventsByType: (type) => {
      return get().eventHistory.filter(event => event.type === type);
    },
    
    getRecentEvents: (count = 10) => {
      return get().eventHistory.slice(-count);
    }
  }))
);

// Enhanced Event listeners for side effects
useEventsStore.subscribe(
  (state) => state.lastEvent,
  (event) => {
    if (!event) return;
    
    // Handle specific events with enhanced logic
    switch (event.type) {
      case 'scroll_to_bottom':
        // Trigger smooth scroll with better timing and no conflicts
        setTimeout(() => {
          // Dispatch a custom event that MessageList can listen to
          const scrollEvent = new CustomEvent('scroll_to_bottom', {
            detail: { type: 'scroll_to_bottom' }
          });
          document.dispatchEvent(scrollEvent);
        }, 100);
        break;
        
      case 'theme_changed': {
        // Handle theme changes with persistence
        const theme = event.data as string;
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
        break;
      }
        
      case 'show_toast':
        // Toast handling is now done in the store
        break;
        
      case 'error_occurred':
        // Log errors for monitoring
        console.error('Application error:', event.data);
        break;
        
      case 'performance_metric':
        // Track performance metrics
        console.log('Performance metric:', event.data);
        break;
        
      case 'conversation_created':
        // Handle new conversation events
        console.log('New conversation created:', event.data);
        break;
        
      case 'tool_call_started':
        // Handle tool call events
        console.log('Tool call started:', event.data);
        break;
    }
  }
);

// Performance monitoring
useEventsStore.subscribe(
  (state) => state.events.length,
  (eventCount) => {
    if (eventCount > 50) {
      // Clean up old events periodically
      useEventsStore.getState().clearEvents();
    }
  }
); 