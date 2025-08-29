/**
 * Chat Orchestrator Service
 * 
 * This service coordinates complex workflows between multiple stores:
 * - ConversationStore: Manages conversations and modes
 * - MessageStore: Handles message CRUD operations
 * - StreamingStore: Manages real-time streaming
 * - SessionStore: Handles session lifecycle
 * 
 * It provides a clean, simple API for components while handling
 * all the complex inter-store coordination internally.
 */

import { useConversationStore } from '../stores/conversation-store';
import { useMessageStore } from '../stores/message-store';
import { useStreamingStore } from '../stores/streaming-store';
import { useSessionStore } from '../stores/session-store';
import { useAuthStore } from '../store/auth-store';
import { StoreErrorHandler } from '../utils/store-error-handler';
import { UI_TEXT } from '../constants/ui-text';
import { BUSINESS_RULES } from '../constants/business-rules';
import type { ChatMode } from '../types';

/**
 * Configuration for starting a chat stream
 */
interface StartStreamingConfig {
  conversationId: string;
  userMessage: string;
  mode?: ChatMode;
  dataSources?: string[];
}

/**
 * Result of starting a streaming operation
 */
interface StartStreamingResult {
  success: boolean;
  aiMessageId?: string;
  error?: string;
}

/**
 * Chat Orchestrator Class
 * 
 * Coordinates complex workflows between stores while maintaining
 * clean separation of concerns.
 */
class ChatOrchestrator {
  /**
   * Start a streaming conversation
   * 
   * This is the main entry point for starting any chat interaction.
   * It handles:
   * 1. Mode detection and validation
   * 2. Session creation/validation
   * 3. Message creation
   * 4. Stream initialization
   * 5. Error handling and recovery
   */
  async startStreaming(config: StartStreamingConfig): Promise<StartStreamingResult> {
    const { conversationId, userMessage, mode, dataSources } = config;

    try {
      // Step 1: Get authenticated user
      const authUser = useAuthStore.getState().user;
      if (!authUser?.email) {
        throw new Error(UI_TEXT.errors.auth.loginRequired);
      }
      const userId = authUser.email;

      // Step 2: Determine conversation mode
      const conversationStore = useConversationStore.getState();
      const conversation = conversationStore.conversations[conversationId];
      const currentMode = mode || conversation?.mode || conversationStore.currentMode;

      console.log(`🎯 [ChatOrchestrator] Starting streaming for ${currentMode} mode:`, {
        conversationId,
        userId,
        messageLength: userMessage.length
      });

      // Step 3: Ensure conversation exists
      if (!conversation) {
        console.log(`📝 [ChatOrchestrator] Creating new conversation for ${conversationId}`);
        await conversationStore.createConversation(
          userMessage.length > BUSINESS_RULES.chat.titleTruncateLength 
            ? userMessage.substring(0, BUSINESS_RULES.chat.titleDisplayTruncate) + '...' 
            : userMessage,
          currentMode
        );
      }

      // Step 4: Set data sources for Ask mode
      if (currentMode === 'ask' && dataSources) {
        const sessionStore = useSessionStore.getState();
        sessionStore.setSelectedDataSources(dataSources);
      }

      // Step 5: Start streaming via StreamingStore (it will handle session and message creation)
      const streamingStore = useStreamingStore.getState();
      const resultMessageId = await streamingStore.startStreaming(conversationId, userMessage);

      console.log(`✅ [ChatOrchestrator] Successfully started streaming for ${conversationId}`);

      return {
        success: true,
        aiMessageId: resultMessageId,
      };

    } catch (error) {
      const errorMessage = StoreErrorHandler.extractErrorMessage(error);
      console.error(`❌ [ChatOrchestrator] Failed to start streaming:`, error);

      // Update connection status to reflect error
      const sessionStore = useSessionStore.getState();
      sessionStore.setConnectionError(errorMessage);

      StoreErrorHandler.logError('ChatOrchestrator.startStreaming', error, {
        conversationId,
        userMessage: userMessage.substring(0, 100),
        mode: mode || 'unknown',
        dataSources: dataSources || []
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Stop any active streaming
   */
  stopStreaming(): void {
    console.log(`🛑 [ChatOrchestrator] Stopping streaming`);
    
    const streamingStore = useStreamingStore.getState();
    streamingStore.stopStreaming();
  }

  /**
   * Switch chat mode and create new conversation
   */
  switchMode(newMode: ChatMode): void {
    console.log(`🔄 [ChatOrchestrator] Switching to ${newMode} mode`);
    
    try {
      const conversationStore = useConversationStore.getState();
      conversationStore.switchMode(newMode);
      
      console.log(`✅ [ChatOrchestrator] Successfully switched to ${newMode} mode`);
    } catch (error) {
      console.error(`❌ [ChatOrchestrator] Failed to switch mode:`, error);
      StoreErrorHandler.logError('ChatOrchestrator.switchMode', error, { newMode });
      throw error;
    }
  }

  /**
   * Load messages for a conversation
   */
  async loadConversationMessages(conversationId: string): Promise<boolean> {
    console.log(`📥 [ChatOrchestrator] Loading messages for ${conversationId}`);
    
    try {
      const authUser = useAuthStore.getState().user;
      if (!authUser || !authUser.email) {
        throw new Error(UI_TEXT.errors.auth.loginRequired);
      }

      const messageStore = useMessageStore.getState();
      const success = await messageStore.loadSessionMessages(conversationId, authUser.email);
      
      console.log(`✅ [ChatOrchestrator] Successfully loaded messages for ${conversationId}`);
      return success;
    } catch (error) {
      console.error(`❌ [ChatOrchestrator] Failed to load messages:`, error);
      StoreErrorHandler.logError('ChatOrchestrator.loadConversationMessages', error, { conversationId });
      return false;
    }
  }

  /**
   * Archive a conversation
   */
  archiveConversation(conversationId: string): void {
    console.log(`🗄️ [ChatOrchestrator] Archiving conversation ${conversationId}`);
    
    const conversationStore = useConversationStore.getState();
    conversationStore.archiveConversation(conversationId);
  }

  /**
   * Export a conversation
   */
  exportConversation(conversationId: string): string {
    console.log(`📤 [ChatOrchestrator] Exporting conversation ${conversationId}`);
    
    const conversationStore = useConversationStore.getState();
    return conversationStore.exportConversation(conversationId);
  }

  /**
   * Initialize user from authentication
   */
  initializeUser(): void {
    console.log(`👤 [ChatOrchestrator] Initializing user from auth`);
    
    const sessionStore = useSessionStore.getState();
    sessionStore.initializeUserFromAuth();
  }

  /**
   * Clear all errors across stores
   */
  clearErrors(): void {
    console.log(`🧹 [ChatOrchestrator] Clearing all errors`);
    
    const conversationStore = useConversationStore.getState();
    conversationStore.clearModeSwitchError();
    
    // Note: SessionStore doesn't have a clearError method
    // Errors are cleared automatically when new operations succeed
  }
}

// Export singleton instance
export const chatOrchestrator = new ChatOrchestrator();

// Export types for external use
export type { StartStreamingConfig, StartStreamingResult };
