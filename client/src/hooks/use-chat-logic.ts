import { useEffect, useState, useRef } from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useEventsStore } from '../store/events-store';
import { useStorePersistence } from './use-store-persistence';
import { adminService } from '../services/admin-service';
import { useStreamingStore } from '../stores/streaming-store';
import { useConversationStore, useActiveConversation } from '../stores/conversation-store';
import { useMessageStore, useActiveMessages, useMessageLoadingState } from '../stores/message-store';
// import { buildChatRoute } from '../constants/routes';

export const useChatLogic = () => {
  // const navigate = useNavigate();
  // const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Event-driven store
  const {
    isToolModalOpen,
    currentToolResult,
    closeToolModal,
    dispatchEvent,
    showToast
  } = useEventsStore();
  
  // Local state
  const [maxTurns, setMaxTurns] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Initialize store persistence
  useStorePersistence();
  
  // Get state from new stores
  const streamingStore = useStreamingStore();
  const conversationStore = useConversationStore();
  const messageStore = useMessageStore();
  
  const streaming = streamingStore.streaming;
  const currentMode = conversationStore.currentMode;
  const activeConversation = useActiveConversation(); // Use the selector
  const startStreaming = streamingStore.startStreaming;
  // const createConversation = conversationStore.createConversation;
  
  // Get messages for active conversation
  const activeConversationId = useConversationStore((state) => state.activeConversationId);
  const messages = useActiveMessages(activeConversationId);
  const isLoadingMessages = useMessageLoadingState(activeConversationId || '');
  
  // Mock settings and user ID for now (these would come from appropriate stores)
  const settings = { autoScroll: true };
  const currentUserId = 'user-' + Date.now();
  const setUserId = () => {}; // Mock function
  
  // Load admin settings once (mock/local)
  useEffect(() => {
    let mounted = true;
    adminService.getSettings().then((s) => {
      if (mounted) setMaxTurns(s.maxConversationTurns);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  
  // Handle streaming errors
  useEffect(() => {
    if (streaming.error) {
      showToast('Something went wrong. Please try again.', 'error');
    }
  }, [streaming.error, showToast]);
  
  useEffect(() => {
    const initializeChat = async () => {
      if (!currentUserId) {
        setUserId();
      }
    };
    
    initializeChat();
  }, [currentUserId, setUserId]);
  
  // Smooth scrolling with event-driven approach and debouncing
  useEffect(() => {
    if (settings.autoScroll && messages.length > 0) {
      // Debounce scroll events to prevent conflicts during streaming
      const timeoutId = setTimeout(() => {
        dispatchEvent('scroll_to_bottom', undefined, { conversationId: activeConversation?.id });
      }, streaming.isStreaming ? 200 : 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, settings.autoScroll, dispatchEvent, streaming.isStreaming]);
  
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Get user from auth store
      const { user } = useAuthStore.getState();
      if (!user?.email) {
        showToast('You must be logged in to send messages.', 'error');
        return;
      }
      
      // const userId = user.email;
      let conversationId = activeConversation?.id;
      
      // STEP 1: CREATE CONVERSATION IF NEEDED
      if (!conversationId) {
        console.log('🆕 [useChatLogic] Creating new conversation...');
        conversationId = await conversationStore.createConversation(undefined, currentMode);
        conversationStore.setActiveConversation(conversationId);
        console.log('✅ [useChatLogic] Conversation created and set active:', conversationId);
      }
      
      // STEP 2: ADD USER MESSAGE IMMEDIATELY

      const userMessageId = messageStore.addMessage(conversationId, {
        type: 'user',
        role: 'user',
        content: content,
        status: 'sent',
        conversationId,
      });
      console.log('✅ [useChatLogic] User message added with ID:', userMessageId);
      
      // STEP 3: START STREAMING (SIMPLE FLOW)
      console.log('💬 [useChatLogic] Starting streaming...');
      
      // Enforce max conversation turns if configured
      const totalTurns = messages.length;
      if (typeof maxTurns === 'number' && totalTurns >= maxTurns * 2) {
        showToast(`Max turns (${maxTurns}) reached for this conversation.`, 'warning');
        return;
      }
      
      // Start streaming - this handles session creation and API calls
      await startStreaming(conversationId, content);
      
      console.log('✅ [useChatLogic] Message sent successfully');
      
    } catch (error) {
      console.error('❌ [useChatLogic] Failed to send message:', error);
      showToast('Failed to send message. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    // State
    messages,
    streaming,
    currentMode,
    settings,
    activeConversation,
    isLoadingMessages,
    isProcessing,
    
    // Modal states
    isToolModalOpen,
    currentToolResult,
    
    // Actions
    handleSendMessage,
    closeToolModal,
    
    // Refs
    messagesEndRef
  };
};
