import { useChatStore } from '../store/chat-store';
import type { ChatMode, Message } from '../types';

// Track ongoing loading operations to prevent duplicates
const loadingSessions = new Set<string>();

/**
 * Debug utility to show current loading state
 */
export const debugLoadingState = () => {
  const state = useChatStore.getState();
  console.log('🔍 Current Loading State:', {
    loadingSessions: Array.from(loadingSessions),
    storeLoadingMessages: state.loadingMessages,
    activeConversationId: state.activeConversationId,
    messageCounts: Object.keys(state.messages).reduce((acc, key) => {
      acc[key] = state.messages[key]?.length || 0;
      return acc;
    }, {} as Record<string, number>)
  });
};

// Make debug function available globally for browser console
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).debugChatLoading = debugLoadingState;
  
  // Add test function for data loading
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).testDataLoading = async (sessionId: string, mode: 'ask' | 'investigate' = 'ask') => {
    console.log(`🧪 Testing data loading for session: ${sessionId} (mode: ${mode})`);
    try {
      const result = await loadSessionMessagesRobust(sessionId, 'pavan.patchikarla@moengage.com', mode);
      console.log(`🧪 Data loading result:`, result);
      return result;
    } catch (error) {
      console.error(`🧪 Data loading error:`, error);
      return null;
    }
  };
}

/**
 * Robust message loading utility that first checks localStorage, then falls back to API calls
 * Returns the loaded messages and metadata instead of updating store directly
 */
export const loadSessionMessagesRobust = async (
  conversationId: string, 
  userId: string, 
  mode: ChatMode
): Promise<{
  messages: Message[];
  metadata?: {
    title: string;
    createdAt: number;
    updatedAt: number;
    messageCount: number;
    apiSessionId: string;
  };
}> => {
  // Check if already loading this session
  if (loadingSessions.has(conversationId)) {
    console.log(`🚫 Already loading session ${conversationId}, skipping duplicate request`);
    return { messages: [] };
  }

  // Check if messages already exist in store
  const state = useChatStore.getState();
  const existingMessages = state.messages[conversationId];
  const isLoading = state.loadingMessages[conversationId];
  
  if (existingMessages && existingMessages.length > 0) {
    console.log(`✅ Messages already exist in store for session ${conversationId} (${existingMessages.length} messages), skipping load`);
    return { messages: existingMessages };
  }
  
  if (isLoading) {
    console.log(`⏳ Messages already being loaded for session ${conversationId}, skipping duplicate request`);
    return { messages: [] };
  }

  // Mark as loading
  loadingSessions.add(conversationId);
  console.log(`🔄 [MessageLoader] Starting to load messages for session ${conversationId} (mode: ${mode})`);
  
  try {
    // Set loading state in store
    useChatStore.setState((state) => ({
      ...state,
      loadingMessages: {
        ...state.loadingMessages,
        [conversationId]: true,
      },
    }));
    
    // First try to load from localStorage via the store
    const { loadSessionMessages } = useChatStore.getState();
    const success = await loadSessionMessages(conversationId, userId);
    
    if (success) {
      console.log(`✅ [MessageLoader] Successfully loaded messages from localStorage for session ${conversationId}`);
      return { messages: useChatStore.getState().messages[conversationId] || [] };
    }
    
    // If localStorage doesn't have messages, try to fetch from backend
    console.log(`🌐 [MessageLoader] No messages in localStorage, fetching from backend for session ${conversationId} (mode: ${mode})`);
    
    const messages: Message[] = [];
    let metadata: {
      title: string;
      createdAt: number;
      updatedAt: number;
      messageCount: number;
      apiSessionId: string;
    } | undefined;
    
    if (mode === 'ask') {
      // For Ask mode, use the Ask session storage service
      console.log(`📡 [MessageLoader] Calling Ask API for session ${conversationId}`);
      const { askSessionStorage } = await import('../services/ask-session-storage');
      const askResult = await askSessionStorage.getSessionWithTurns(conversationId, userId);
      
      console.log(`📡 [MessageLoader] Ask API result:`, {
        success: askResult.success,
        hasData: !!askResult.data,
        error: askResult.error
      });
      
      if (askResult.success && askResult.data) {
        const { session, turns } = askResult.data;
        
        console.log(`📡 [MessageLoader] Ask API data:`, {
          hasSession: !!session,
          hasTurns: !!turns,
          turnsLength: turns?.length || 0,
          sessionData: session ? {
            title: (session as any)?.title,
            created_at: (session as any)?.created_at,
            updated_at: (session as any)?.updated_at,
            api_session_id: (session as any)?.api_session_id,
            session_id: (session as any)?.session_id
          } : null
        });
        
        // Extract metadata from backend response
        if (session) {
          const sessionData = session as unknown as Record<string, unknown>;
          const createdAtValue = (sessionData.created_at as string) || new Date().toISOString();
          const updatedAtValue = (sessionData.updated_at as string) || new Date().toISOString();
          
          metadata = {
            title: (sessionData.title as string) || `${mode === 'ask' ? 'Ask' : 'Investigate'} Session`,
            createdAt: new Date(createdAtValue).getTime(),
            updatedAt: new Date(updatedAtValue).getTime(),
            messageCount: turns?.length || 0,
            apiSessionId: (sessionData.api_session_id as string) || (sessionData.session_id as string) || conversationId,
          };
          
          console.log(`✅ [MessageLoader] Extracted conversation metadata for session ${conversationId}:`, metadata);
        }
        
        // Convert Ask mode turns to messages
        if (Array.isArray(turns) && turns.length > 0) {
          console.log(`📡 [MessageLoader] Processing ${turns.length} turns for Ask session ${conversationId}`);
          for (const turn of turns) {
            const turnData = turn as unknown as Record<string, unknown>;
            
            // Add user message
            if (turnData.user_query && typeof turnData.user_query === 'string') {
              messages.push({
                id: `${conversationId}-user-${messages.length}`,
                type: 'user',
                role: 'user',
                content: turnData.user_query,
                status: 'sent',
                timestamp: (turnData.created_at as number) || Date.now(),
                conversationId,
              });
            }
            
            // Add AI response
            if (turnData.ai_response && typeof turnData.ai_response === 'string') {
              messages.push({
                id: `${conversationId}-ai-${messages.length}`,
                type: 'ai',
                role: 'model',
                content: turnData.ai_response,
                status: 'delivered',
                timestamp: (turnData.updated_at as number) || Date.now(),
                conversationId,
                thinkingSteps: [],
                toolCalls: [],
                isStreaming: false,
                isComplete: true,
                showThinking: false,
                showRawEvents: false,
                rawEvents: [],
                citations: (turnData.citations as Array<{
                  cited_text: string;
                  start_index: number;
                  end_index: number;
                  sources: Array<{
                    reference_id: string;
                    document_id: string;
                    uri: string;
                    title: string;
                    struct_data?: unknown;
                  }>;
                }>) || [],
              });
            }
          }
          console.log(`✅ [MessageLoader] Ask API returned ${turns.length} turns, converted to ${messages.length} messages`);
        } else {
          console.log(`📡 [MessageLoader] Ask API returned 0 turns for session ${conversationId} - this is a valid empty session`);
        }
      } else {
        console.log(`❌ [MessageLoader] Ask API failed for session ${conversationId}:`, askResult.error);
      }
    } else {
      // For Investigate mode, use the chat API
      console.log(`📡 [MessageLoader] Calling Investigate API for session ${conversationId}`);
      const { chatAPI } = await import('../services/chat-api');
      const result = await chatAPI.getSessionMessages(userId, conversationId);
      
      console.log(`📡 [MessageLoader] Investigate API result:`, {
        success: result.success,
        hasData: !!(result.data && Array.isArray(result.data)),
        dataLength: result.data?.length || 0,
        error: result.error
      });
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Also get session metadata to update conversation object
        const sessionResult = await chatAPI.getSession(userId, conversationId);
        console.log(`📡 [MessageLoader] Session metadata result:`, {
          success: sessionResult.success,
          hasData: !!sessionResult.data,
          error: sessionResult.error
        });
        
        if (sessionResult.success && sessionResult.data) {
          const sessionData = sessionResult.data;
          
          metadata = {
            title: `${mode === 'investigate' ? 'Investigate' : 'Ask'} Session`,
            createdAt: (sessionData.lastUpdateTime as number) * 1000 || Date.now(),
            updatedAt: (sessionData.lastUpdateTime as number) * 1000 || Date.now(),
            messageCount: (result.data as unknown[])?.length || 0,
            apiSessionId: sessionData.id || conversationId,
          };
          
          console.log(`✅ [MessageLoader] Extracted conversation metadata for session ${conversationId}:`, metadata);
        }
        
        // Process events and convert to messages for Investigate mode
        console.log(`📡 [MessageLoader] Processing ${result.data.length} events for Investigate session ${conversationId}`);
        for (const event of result.data) {
          if (event && typeof event === 'object') {
            const eventData = event as Record<string, unknown>;
            
            // Handle user messages
            if (eventData.role === 'user' && Array.isArray(eventData.parts)) {
              messages.push({
                id: `${conversationId}-user-${messages.length}`,
                type: 'user',
                role: 'user',
                content: eventData.parts.map((p: Record<string, unknown>) => p.text || '').join(''),
                status: 'sent',
                timestamp: (eventData.timestamp as number) || Date.now(),
                conversationId,
              });
            }
            
            // Handle AI messages
            if (eventData.role === 'model' && Array.isArray(eventData.parts)) {
              messages.push({
                id: `${conversationId}-ai-${messages.length}`,
                type: 'ai',
                role: 'model',
                content: eventData.parts.map((p: Record<string, unknown>) => p.text || '').join(''),
                status: 'delivered',
                timestamp: (eventData.timestamp as number) || Date.now(),
                conversationId,
                thinkingSteps: [],
                toolCalls: [],
                isStreaming: false,
                isComplete: true,
                showThinking: false,
                showRawEvents: false,
                rawEvents: [],
              });
            }
          }
        }
        console.log(`✅ [MessageLoader] Investigate API returned ${result.data.length} events, converted to ${messages.length} messages`);
      } else {
        console.log(`❌ [MessageLoader] Investigate API failed for session ${conversationId}:`, result.error);
      }
    }
    
    // Clear loading state
    useChatStore.setState((state) => ({
      ...state,
      loadingMessages: {
        ...state.loadingMessages,
        [conversationId]: false,
      },
    }));
    
    if (messages.length > 0) {
      console.log(`✅ Successfully loaded ${messages.length} messages from backend for session ${conversationId} (mode: ${mode})`);
    } else {
      console.log(`⚠️ No messages found in backend for session ${conversationId}`);
    }
    
    return { messages, metadata };
    
  } catch (error) {
    console.error(`❌ Error loading messages for session ${conversationId}:`, error);
    
    // Set loading to false even on error
    useChatStore.setState((state) => ({
      ...state,
      loadingMessages: {
        ...state.loadingMessages,
        [conversationId]: false,
      },
    }));
    
    return { messages: [] };
  } finally {
    // Remove from loading set
    loadingSessions.delete(conversationId);
    console.log(`🏁 Finished loading process for session ${conversationId}`);
  }
};