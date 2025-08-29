/**
 * Store Index
 * Central export point for all application stores
 */

import { useChatStore } from './chat-store';

export { useChatStore } from './chat-store';
export { useEventsStore } from './events-store';
// Note: api-chat-store has been removed due to build issues

// Custom selector for current mode
export const useCurrentMode = () => useChatStore((state: any) => state.currentMode);

// ============================================================================
// STORE SELECTORS
// ============================================================================

// Chat Store Selectors
export const chatSelectors = {
  currentMode: () => useChatStore.getState().currentMode,
  messages: (conversationId: string) => useChatStore.getState().messages[conversationId] || [],
  activeConversation: () => useChatStore.getState().activeConversationId,
  conversations: () => useChatStore.getState().conversations,
};

// Events Store Selectors
export const eventSelectors = {
  events: (state: any) => state.events,
  lastEvent: (state: any) => state.lastEvent,
  isToolModalOpen: (state: any) => state.isToolModalOpen,
  isSidebarOpen: (state: any) => state.isSidebarOpen,
  toasts: (state: any) => state.toasts,
  activeModals: (state: any) => state.activeModals,
} as const;

// ============================================================================
// STORE ACTIONS
// ============================================================================

// Chat Store Actions
export const chatActions = {
  createConversation: (title: string) => useChatStore.getState().createConversation(title),
  setActiveConversation: (conversationId: string) => useChatStore.getState().setActiveConversation(conversationId),
};

// Events Store Actions
export const eventActions = {
  dispatchEvent: (store: any) => store.dispatchEvent,
  openToolModal: (store: any) => store.openToolModal,
  closeToolModal: (store: any) => store.closeToolModal,
  toggleSidebar: (store: any) => store.toggleSidebar,
  showToast: (store: any) => store.showToast,
  hideToast: (store: any) => store.hideToast,
} as const;
