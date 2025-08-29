/**
 * Stores Index
 * Central export point for all store modules
 * 
 * This file provides a unified interface to the new modular store architecture,
 * replacing the old monolithic chat-store.ts
 */

// Core stores
export * from './conversation-store';
export * from './message-store';
export * from './session-store';
export * from './streaming-store';

// Import stores for unified interface
import {
  useConversationStore as useConversationStoreInternal,
  useActiveConversation,
  useCurrentMode,
  useModeSwitching,
  useConversationList,
  useConversationById,
} from './conversation-store';

import {
  useMessageStore as useMessageStoreInternal,
  useMessageById,
  useMessagesForConversation,
  useMessageLoadingState,
} from './message-store';

import {
  useSessionStore as useSessionStoreInternal,
  useSessionById,
  useSessionStatus,
  useCurrentUserId,
  useSessionConnection,
  useSessionError,
  useSessionLoading,
} from './session-store';

import {
  useStreamingStore as useStreamingStoreInternal,
  useStreamingState,
  useIsStreaming,
  useStreamingProgress,
  useStreamingError,
} from './streaming-store';

// Re-export all individual store hooks
export {
  useActiveConversation,
  useCurrentMode,
  useModeSwitching,
  useConversationList,
  useConversationById,
  useMessageById,
  useMessagesForConversation,
  useMessageLoadingState,
  useSessionById,
  useSessionStatus,
  useCurrentUserId,
  useSessionConnection,
  useSessionError,
  useSessionLoading,
  useStreamingState,
  useIsStreaming,
  useStreamingProgress,
  useStreamingError,
};

// Unified chat store interface - provides backward compatibility
// This replaces the old monolithic useChatStore
export const useChatStore = () => {
  const conversationStore = useConversationStoreInternal();
  const messageStore = useMessageStoreInternal();
  const sessionStore = useSessionStoreInternal();
  const streamingStore = useStreamingStoreInternal();

  return {
    // Conversation state
    conversations: conversationStore.conversations,
    activeConversationId: conversationStore.activeConversationId,
    currentMode: conversationStore.currentMode,
    isModeSwitching: conversationStore.isModeSwitching,
    modeSwitchError: conversationStore.modeSwitchError,

    // Message state
    messages: messageStore.messages,
    loadingMessages: messageStore.loadingMessages,
    lastMessageLoadTime: messageStore.lastMessageLoadTime,

    // Session state
    sessions: sessionStore.sessions,
    currentUserId: sessionStore.currentUserId,
    selectedDataSources: sessionStore.selectedDataSources,
    connection: sessionStore.connection,

    // Streaming state
    streaming: streamingStore.streaming,
    isLoading: conversationStore.isLoading || messageStore.isLoading || sessionStore.isLoading || streamingStore.isLoading,
    error: conversationStore.error || messageStore.error || sessionStore.error || streamingStore.error,

    // Conversation actions
    switchMode: conversationStore.switchMode,
    setCurrentMode: conversationStore.setCurrentMode,
    clearModeSwitchError: conversationStore.clearModeSwitchError,
    createConversation: conversationStore.createConversation,
    setActiveConversation: conversationStore.setActiveConversation,
    updateConversation: conversationStore.updateConversation,
    archiveConversation: conversationStore.archiveConversation,
    exportConversation: conversationStore.exportConversation,

    // Message actions
    addMessage: messageStore.addMessage,
    updateMessage: messageStore.updateMessage,
    deleteMessage: messageStore.deleteMessage,
    loadSessionMessages: messageStore.loadSessionMessages,
    addThinkingStep: messageStore.addThinkingStep,
    toggleThinkingVisibility: messageStore.toggleThinkingVisibility,
    addToolCall: messageStore.addToolCall,
    updateToolCall: messageStore.updateToolCall,

    // Session actions
    setUserId: sessionStore.setUserId,
    initializeUserFromAuth: sessionStore.initializeUserFromAuth,
    createSessionForConversation: sessionStore.createSessionForConversation,
    endSession: sessionStore.endSession,
    recreateSession: sessionStore.recreateSession,
    setConnectionStatus: sessionStore.setConnectionStatus,
    setConnectionError: sessionStore.setConnectionError,
    setSelectedDataSources: sessionStore.setSelectedDataSources,
    clearSelectedDataSources: sessionStore.clearSelectedDataSources,

    // Streaming actions
    startStreaming: streamingStore.startStreaming,
    stopStreaming: streamingStore.stopStreaming,
    handleSSEEvent: streamingStore.handleSSEEvent,
    finalizeStream: streamingStore.finalizeStream,

    // Legacy compatibility methods
    clearAllData: () => {
      // This would need to be implemented by calling reset methods on each store
      console.log('clearAllData called - needs implementation');
    },

    // Input state (simplified - can be moved to separate store later)
    input: {
      content: "",
      isTyping: false,
      attachments: [],
      replyingTo: null,
    },
    setInputContent: (content: string) => {
      console.log('setInputContent called with:', content);
    },
    clearInput: () => {
      console.log('clearInput called');
    },
    addAttachment: (file: File) => {
      console.log('addAttachment called with:', file.name);
    },
    removeAttachment: (attachmentId: string) => {
      console.log('removeAttachment called with:', attachmentId);
    },

    // Settings (simplified - can be moved to separate store later)
    settings: {
      model: "gemini-pro",
      temperature: 0.7,
      maxTokens: 4096,
      streamResponse: true,
      showThinking: true,
      autoScroll: true,
      soundEnabled: true,
      compactMode: false,
    },
    updateSettings: (settings: any) => {
      console.log('updateSettings called with:', settings);
    },
  };
};

// Backward compatibility selectors
export const useActiveMessages = () => {
  const conversationStore = useConversationStoreInternal();
  const messageStore = useMessageStoreInternal();
  
  if (!conversationStore.activeConversationId) {
    return [];
  }
  
  return messageStore.messages[conversationStore.activeConversationId] || [];
};

export const useStreamingMessage = () => {
  const streamingStore = useStreamingStoreInternal();
  const messageStore = useMessageStoreInternal();
  
  if (!streamingStore.streaming.messageId || !streamingStore.streaming.conversationId) {
    return null;
  }
  
  const messages = messageStore.messages[streamingStore.streaming.conversationId];
  if (!messages) return null;
  
  return messages.find((m) => m.id === streamingStore.streaming.messageId) || null;
};

export const useActiveSession = () => {
  const conversationStore = useConversationStoreInternal();
  const sessionStore = useSessionStoreInternal();
  
  if (!conversationStore.activeConversationId) return null;
  return sessionStore.sessions[conversationStore.activeConversationId] || null;
};

// Initialize user from auth - for backward compatibility
export const initializeUserFromAuth = () => {
  const sessionStore = useSessionStoreInternal.getState();
  sessionStore.initializeUserFromAuth();
};
