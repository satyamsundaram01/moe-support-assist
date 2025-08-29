import { useCallback, useEffect } from 'react';
import { useChatStore } from '../store/chat-store';

interface UseChatReturn {
  conversations: any;
  activeConversation: any;
  messages: any[];
  currentMode: any;
  streaming: any;
  settings: any;
  currentUserId: any;
  sessions: any;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  createConversation: (title: string) => Promise<string>;
  setActiveConversation: (conversationId: string) => void;
  switchMode: (mode: 'ask' | 'investigate') => void;
  updateSettings: (settings: unknown) => void;
  setUserId: (userId: string) => void;
  toggleRawEvents: (messageId: string) => void;
  clearEvents: () => void;
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const useChat = ({ 
  userId = 'anonymous'
}: { userId?: string } = {}): UseChatReturn => {
  // Get store state and actions
  const {
    conversations,
    messages: messagesMap,
    activeConversationId,
    streaming,
    currentUserId,
    // Actions
    setUserId,
    createConversation: createConv,
    setActiveConversation: setActiveCon,
    startStreaming,
    stopStreaming: stopStream,
    setConnectionError,
  } = useChatStore();

  // Set user ID on mount
  useEffect(() => {
    if (userId !== currentUserId) {
      setUserId(userId);
    }
  }, [userId, currentUserId, setUserId]);

  // Get active conversation and messages
  const activeConversation = activeConversationId ? conversations[activeConversationId] : null;
  const messages = activeConversationId ? (messagesMap[activeConversationId] || []) : [];

  return {
    conversations,
    activeConversation,
    messages,
    currentMode: useChatStore((state: any) => state.currentMode),
    streaming: useChatStore((state: any) => state.streaming),
    settings: useChatStore((state: any) => state.settings),
    currentUserId,
    sessions: useChatStore((state: any) => state.sessions),
    sendMessage: useCallback(async (conversationId: string, content: string) => {
      if (!content.trim()) return;
      
      try {
        // Start streaming (this creates the AI message placeholder)
        const aiMessageId = await startStreaming(conversationId, content.trim());
        
        if (!aiMessageId) {
          throw new Error('Failed to start streaming');
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        setConnectionError(error instanceof Error ? error.message : 'Failed to send message');
        
        // Stop streaming on error
        stopStream();
        
        throw error;
      }
    }, [startStreaming, stopStream, setConnectionError]),
    createConversation: useCallback(async (title?: string) => {
      try {
        const conversationId = await createConv(title);
        return conversationId;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        throw error;
      }
    }, [createConv]),
    setActiveConversation: useCallback((id: string) => {
      // Stop any active streaming when switching conversations
      if (streaming.isStreaming) {
        stopStream();
      }
      setActiveCon(id);
    }, [setActiveCon, streaming.isStreaming, stopStream]),
    switchMode: useCallback((mode: 'ask' | 'investigate') => {
      console.log('Switch mode to:', mode);
    }, []),
    updateSettings: useCallback((settings: unknown) => {
      console.log('Update settings:', settings);
    }, []),
    setUserId: useCallback((userId: string) => {
      setUserId(userId);
    }, [setUserId]),
    toggleRawEvents: useCallback((messageId: string) => {
      console.log('Toggle raw events for message:', messageId);
    }, []),
    clearEvents: useCallback(() => {
      console.log('Clear events');
    }, []),
    isConnecting: false,
    isConnected: true,
    connect: useCallback(() => {
      console.log('Connect');
    }, []),
    disconnect: useCallback(() => {
      console.log('Disconnect');
    }, []),
  };
};
