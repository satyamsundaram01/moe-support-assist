import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ChatLayout } from '../components/layout';
import { WorkingChatInterfaceWithToast } from '../components/chat/working-chat-interface';
import { useConversationStore } from '../stores/conversation-store';
import { useMessageStore } from '../stores/message-store';
import { useAuthStore } from '../store/auth-store';
import { ErrorBoundary, ChatErrorFallback } from '../components/ui';
import type { ChatMode, Message } from '../types';

export const ChatPage: React.FC = () => {
  const params = useParams<{ sessionId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const sessionLoadingRef = useRef<Set<string>>(new Set());
  const {
    activeConversationId,
    currentMode,
    setActiveConversation,
    setCurrentMode,
    updateConversation,
  } = useConversationStore();
  const { messages, loadingMessages, loadSessionMessages } = useMessageStore();

  // Parse URL to determine mode and session
  const parseUrl = (): { mode: ChatMode; sessionId?: string } => {
    const path = location.pathname;
    let mode: ChatMode = 'investigate'; // default

    if (path.includes('/chat/ask')) {
      mode = 'ask';
    } else if (path.includes('/chat/investigate')) {
      mode = 'investigate';
    }

    return { mode, sessionId: params.sessionId };
  };

  // Handle URL changes - simplified routing logic
  useEffect(() => {
    if (!user?.email) {
      return;
    }

    const { mode, sessionId } = parseUrl();

    // Always update the current mode based on URL
    if (currentMode !== mode) {
      setCurrentMode(mode);
    }

    // Handle base chat route - redirect to mode-specific route
    if (location.pathname === '/chat') {
      const targetMode = currentMode || mode;
      const url = `/chat/${targetMode}`;
      void navigate(url, { replace: true });
      return;
    }

    // Handle mode-specific routes without session ID (e.g., /chat/ask, /chat/investigate)
    if (!sessionId && location.pathname === `/chat/${mode}`) {
      // Do not clear active conversation here; allow input flow to create and show immediately
      return;
    }

    // Handle session-specific routes
    if (sessionId) {
      // Set as active conversation
      if (activeConversationId !== sessionId) {
        setActiveConversation(sessionId);
      }

      // Ensure conversation exists with correct mode
      const conversation = useConversationStore.getState().conversations[sessionId];
      if (!conversation) {
        // Create a basic conversation object with the correct mode
        useConversationStore.setState((state) => ({
          ...state,
          conversations: {
            ...state.conversations,
            [sessionId]: {
              id: sessionId,
              title: `${mode === 'ask' ? 'Ask' : 'Investigate'} Session`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messageCount: 0,
              mode,
              session: null,
            },
          },
        }));
      } else if (conversation.mode !== mode) {
        updateConversation(sessionId, { mode });
      }

      // Load messages if not already loaded
      const existingMessages = messages[sessionId];
      const isLoading = loadingMessages[sessionId];

      if (!existingMessages && !isLoading) {
        void loadSessionMessages(sessionId, user.email);
      }

      // Load session data for Ask mode to ensure API session ID is available
      if (mode === 'ask') {
        const loadSessionData = async () => {
          if (isLoadingSession || sessionLoadingRef.current.has(sessionId)) {
            console.log('🔄 [ChatPage] Session loading already in progress, skipping...');
            return;
          }
          
          setIsLoadingSession(true);
          sessionLoadingRef.current.add(sessionId);
          
          try {
            console.log('🔄 [ChatPage] Loading session data for ask mode session:', sessionId);
            const { askSessionStorage } = await import('../services/ask-session-storage');
            const sessionResult = await askSessionStorage.getSessionWithTurns(sessionId, user.email);
            
            console.log('🔍 [ChatPage] Session data result:', {
              success: sessionResult.success,
              hasData: !!sessionResult.data,
              hasSession: !!sessionResult.data?.session,
              error: sessionResult.error
            });
            
            if (sessionResult.success && sessionResult.data?.session) {
              console.log('✅ [ChatPage] Found session data:', sessionResult.data.session);
              
              const sessionData = sessionResult.data.session;
              
              // Validate that we have a proper API session ID
              const apiSessionId = sessionData.api_session_id;
              if (!apiSessionId) {
                console.error('❌ [ChatPage] Session data missing API session ID:', sessionData);
                return;
              }
              
              // Validate that API session ID is different from conversation ID
              if (apiSessionId === sessionId) {
                console.warn('⚠️ [ChatPage] API session ID matches conversation ID, this may cause issues:', {
                  sessionId,
                  apiSessionId
                });
              }
              
              const sessionObj = {
                id: sessionId,
                userId: user.email,
                appName: 'ask_mode',
                status: 'active' as const,
                createdAt: new Date(sessionData.created_at).getTime(),
                updatedAt: Date.now(),
                apiSessionId: apiSessionId, // Ensure we use the proper API session ID
                mode: 'ask' as const,
              };
              
              // Update conversation with session data
              updateConversation(sessionId, { session: sessionObj });
              console.log('✅ [ChatPage] Updated conversation with session data:', sessionObj);
              
              // Load conversation turns if they exist and messages aren't already loaded
              if (sessionResult.data.turns && Array.isArray(sessionResult.data.turns) && sessionResult.data.turns.length > 0) {
                const existingMessages = messages[sessionId];
                if (!existingMessages || existingMessages.length === 0) {
                  console.log('🔄 [ChatPage] Loading conversation turns from session data:', sessionResult.data.turns.length);
                  
                  // Convert turns to messages and load them directly
                  const messageStore = useMessageStore.getState();
                  const convertedMessages: Message[] = [];
                  
                  for (const turn of sessionResult.data.turns) {
                    // Add user message
                    if (turn.user_query && typeof turn.user_query === 'string') {
                      const userMessage: Message = {
                        id: `user-${turn.id}`,
                        type: 'user',
                        role: 'user',
                        content: turn.user_query,
                        status: 'sent',
                        timestamp: new Date(turn.created_at).getTime(),
                        conversationId: sessionId,
                      };
                      convertedMessages.push(userMessage);
                    }
                    
                    // Add AI response
                    if (turn.ai_response && typeof turn.ai_response === 'string') {
                      const aiMessage: Message = {
                        id: `ai-${turn.id}`,
                        type: 'ai',
                        role: 'model',
                        content: turn.ai_response,
                        status: 'delivered',
                        timestamp: new Date(turn.created_at).getTime(),
                        conversationId: sessionId,
                        thinkingSteps: [],
                        toolCalls: [],
                        isStreaming: false,
                        isComplete: true,
                        showThinking: false,
                        showRawEvents: false,
                        rawEvents: [],
                        citations: turn.citations ?? [],
                      } as Message;
                      convertedMessages.push(aiMessage);
                    }
                  }
                  
                  // Set messages directly to avoid duplicate API call
                  messageStore.setMessages(sessionId, convertedMessages);
                  console.log('✅ [ChatPage] Loaded', convertedMessages.length, 'messages from session turns');
                }
              }
            } else {
              console.log('⚠️ [ChatPage] No session data found for:', sessionId, {
                success: sessionResult.success,
                error: sessionResult.error,
                data: sessionResult.data
              });
              
              // Mark conversation as needing session creation
              // This will signal to streaming-store that it should create a new session
              updateConversation(sessionId, { 
                session: null
              });
            }
          } catch (error) {
            console.error('❌ [ChatPage] Error loading session data:', error);
          } finally {
            setIsLoadingSession(false);
            sessionLoadingRef.current.delete(sessionId);
          }
        };
        
        // Load session data if conversation doesn't have session or has invalid session
        const currentConversation = useConversationStore.getState().conversations[sessionId];
        const needsSessionLoad = !currentConversation?.session || 
                                !currentConversation?.session?.apiSessionId ||
                                currentConversation?.session?.apiSessionId === sessionId;
        
        if (needsSessionLoad) {
          console.log('🔄 [ChatPage] Starting session data loading for:', sessionId);
          void loadSessionData();
        } else {
          console.log('✅ [ChatPage] Session already exists with valid API session ID');
        }
      }
    }
  }, [
    location.pathname,
    params.sessionId,
    user?.email,
    currentMode,
    activeConversationId,
    setCurrentMode,
    setActiveConversation,
    updateConversation,
    messages,
    loadingMessages,
    loadSessionMessages,
    navigate,
  ]);

  // Render the chat interface
  return (
    <ChatLayout>
      <ErrorBoundary fallback={(error) => <ChatErrorFallback error={error} />} isolate>
        <WorkingChatInterfaceWithToast />
      </ErrorBoundary>
    </ChatLayout>
  );
};
