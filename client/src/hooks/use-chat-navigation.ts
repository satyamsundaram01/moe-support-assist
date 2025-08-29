import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationStore } from '../stores/conversation-store';
import { buildChatRoute } from '../constants/routes';
import type { ChatMode } from '../types';

/**
 * Simple navigation hook to replace the complex useChatRouting
 * Only handles navigation, no complex state management
 */
export const useChatNavigation = () => {
  const navigate = useNavigate();
  const conversationStore = useConversationStore();
  const { switchMode, currentMode } = conversationStore;

  // Navigate to a specific session
  const navigateToSession = useCallback((sessionId: string, mode?: ChatMode) => {
    const targetMode = mode || currentMode;
    const url = buildChatRoute(sessionId, targetMode);
    void navigate(url);
  }, [navigate, currentMode]);

  // Navigate to new chat (lazy loading - no session created until first message)
  const navigateToNewChat = useCallback((mode?: ChatMode) => {
    try {
      const targetMode = mode || currentMode;
      // Use the same lazy loading approach as navigateToMode
      switchMode(targetMode);
      const url = buildChatRoute(undefined, targetMode); // Navigate to base mode route
      navigate(url);
    } catch (error) {
      console.error('Failed to navigate to new chat:', error);
      navigate('/chat');
    }
  }, [navigate, currentMode, switchMode]);

  // Navigate to specific mode (creates new conversation)
  const navigateToMode = useCallback((mode: ChatMode) => {
    console.log('🔄 [useChatNavigation] navigateToMode called with:', mode);
    try {
      console.log('🔄 [useChatNavigation] Switching mode in store from', currentMode, 'to', mode);
      switchMode(mode);
      console.log('✅ [useChatNavigation] Mode switched in store');
      
      const url = buildChatRoute(undefined, mode); // Navigate to base mode route
      console.log('🔄 [useChatNavigation] Navigating to URL:', url);
      navigate(url);
      console.log('✅ [useChatNavigation] Navigation completed');
    } catch (error) {
      console.error('❌ [useChatNavigation] Failed to switch mode:', error);
    }
  }, [switchMode, navigate, currentMode]);

  return {
    navigateToSession,
    navigateToNewChat,
    navigateToMode,
  };
};
