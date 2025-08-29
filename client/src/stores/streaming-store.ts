import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { StreamingStore } from "../types/stores";
import type { StreamingState, SSEEventData, ThinkingStep, ToolCall, AIMessage } from "../types";
import { UI_TEXT } from "../constants/ui-text";
import { StoreErrorHandler } from "../utils/store-error-handler";
import { chatAPI } from "../services/chat-api";
import { useAuthStore } from "../store/auth-store";
import { useMessageStore } from "./message-store";
import { useConversationStore } from "./conversation-store";

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

const initialStreamingState: StreamingState = {
  isStreaming: false,
  messageId: null,
  conversationId: null,
  phase: "idle",
  currentThinking: "",
  currentResponse: "",
  activeTool: null,
  progress: {
    phase: "",
    step: 0,
    totalSteps: 0,
  },
  error: null,
};

const initialState = {
  streaming: { ...initialStreamingState },
  isLoading: false,
  error: null,
  lastUpdated: Date.now(),
};

export const useStreamingStore = create<StreamingStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Main streaming action
      startStreaming: async (conversationId: string, userMessage: string) => {
        try {
          const conversationStore = useConversationStore.getState();
          const conversation = conversationStore.conversations[conversationId];
          const currentMode = conversation?.mode || conversationStore.currentMode;
          
          // Get user from auth store
          const authUser = useAuthStore.getState().user;
          if (!authUser?.email) {
            throw new Error(UI_TEXT.errors.auth.loginRequired);
          }
          
          const userId = authUser.email;
  

          // Handle different modes
          if (currentMode === 'ask') {
            return await get().handleAskMode(conversationId, userMessage, userId);
          } else {
            return await get().handleInvestigateMode(conversationId, userMessage);
          }
        } catch (error) {
          StoreErrorHandler.logError('startStreaming', error, { conversationId });
          throw error;
        }
      },

      // Ask mode streaming handler
      handleAskMode: async (conversationId: string, userMessageContent: string, userId: string) => {
        try {
          set((draft) => {
            draft.isLoading = true;
            draft.error = null;
          });

          const messageStore = useMessageStore.getState();
          const conversationStore = useConversationStore.getState();
          
          // Get session (should already be loaded by chat-page)
          let session = conversationStore.conversations[conversationId]?.session;

          // For existing sessions (when navigating to /chat/ask/sessionId), we should NEVER create new sessions
          // Only wait for the session to be loaded by chat-page
          const isExistingSession = window.location.pathname.includes(`/chat/ask/${conversationId}`);
          
          if (!session || !session.apiSessionId || session.apiSessionId === conversationId) {
            if (isExistingSession) {
              console.log('⚠️ [StreamingStore] Waiting for existing session to be loaded by chat-page...');
              
              // Wait longer for existing sessions to be loaded - increased timeout
              let attempts = 0;
              const maxAttempts = 50; // Wait up to 5 seconds
              
              while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Re-fetch the latest conversation state
                const latestConversationStore = useConversationStore.getState();
                session = latestConversationStore.conversations[conversationId]?.session;
                
                if (session && session.apiSessionId && session.apiSessionId !== conversationId) {
                  console.log('✅ [StreamingStore] Existing session loaded successfully:', session);
                  break;
                }
                
                attempts++;
                console.log(`⏳ [StreamingStore] Waiting for session load... attempt ${attempts}/${maxAttempts}`, {
                  hasSession: !!session,
                  hasApiSessionId: !!session?.apiSessionId,
                  apiSessionIdMatchesConversationId: session?.apiSessionId === conversationId
                });
              }
              
              if (!session || !session.apiSessionId || session.apiSessionId === conversationId) {
                console.error('❌ [StreamingStore] Failed to load existing session after waiting', {
                  session,
                  conversationId,
                  attempts,
                  maxAttempts
                });
                throw new Error('Failed to load existing session. The session may not exist or there was a loading error. Please refresh the page and try again.');
              }
            } else {
              // Only create new sessions for new conversations (not existing session URLs)
              console.log('⚠️ [StreamingStore] Creating new session for new conversation...');
              
              try {
                const { createSessionManagerForMode } = await import('../services/session-manager-factory');
                const sessionManager = createSessionManagerForMode('ask', userId);
                const sessionTitle = userMessageContent.length > 50 ? userMessageContent.substring(0, 47) + '...' : userMessageContent;

                const sessionResult = await sessionManager.createSession(conversationId, {
                  title: sessionTitle,
                  createdAt: new Date().toISOString(),
                });

                if (sessionResult.success && sessionResult.apiSessionId && sessionResult.apiSessionId !== conversationId) {
                  const newSession = {
                    id: conversationId,
                    userId,
                    appName: 'ask_mode',
                    status: 'active' as const,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    apiSessionId: sessionResult.apiSessionId,
                    mode: 'ask' as const,
                  };
                  
                  // Update conversation with new session
                  conversationStore.updateConversation(conversationId, { session: newSession });
                  console.log('✅ [StreamingStore] New Ask session created:', newSession);
                  
                  // Navigate to session URL after creation
                  const { buildChatRoute } = await import('../constants/routes');
                  const newRoute = buildChatRoute(conversationId, 'ask');
                  console.log('🔄 [StreamingStore] Navigating to Ask session route:', newRoute);
                  window.history.replaceState(null, '', newRoute);
                  
                  session = newSession;
                } else {
                  console.error('❌ [StreamingStore] Failed to create new Ask session:', sessionResult);
                  throw new Error('Failed to create Ask session: ' + (sessionResult.error || 'Invalid API session ID returned'));
                }
              } catch (sessionError) {
                console.error('❌ [StreamingStore] Ask session creation failed:', sessionError);
                throw new Error('Failed to create Ask session: ' + (sessionError instanceof Error ? sessionError.message : 'Unknown error'));
              }
            }
          }

          console.log('handleAskMode - using session:', session);

          // User message is already added by useChatLogic, so we don't need to add it again
          // Just create the AI message placeholder
          const aiMessageId = generateId();
          const aiMessage: AIMessage = {
            id: aiMessageId,
            type: 'ai',
            role: 'model',
            content: '',
            status: 'sending',
            timestamp: Date.now(),
            conversationId,
            thinkingSteps: [],
            toolCalls: [],
            isStreaming: true,
            isComplete: false,
            showThinking: false,
            showRawEvents: false,
            rawEvents: [],
          };

          messageStore.addMessage(conversationId, aiMessage);

          // Set streaming state
          set((draft) => {
            draft.streaming = {
              isStreaming: true,
              messageId: aiMessageId,
              conversationId,
              phase: 'responding',
              currentThinking: '',
              currentResponse: '',
              activeTool: null,
              progress: {
                phase: 'Processing query...',
                step: 1,
                totalSteps: 2,
              },
              error: null,
            };
            draft.isLoading = false;
          });

          // Start streaming with streaming service
          const { streamingService } = await import('../services/streaming-service');
          
          // Ensure we have a valid API session ID
          const apiSessionId = session.apiSessionId;
          if (!apiSessionId) {
            throw new Error('No API session ID available for Ask mode streaming. Session data may not be loaded yet.');
          }
          
          // Validate that API session ID is different from conversation ID
          if (apiSessionId === conversationId) {
            console.warn('⚠️ [StreamingStore] API session ID matches conversation ID, this may indicate a session creation issue');
          }
          
          console.log('🚀 [StreamingStore] Starting streaming with API session ID:', apiSessionId);
          
          await streamingService.startStreaming({
            conversationId,
            messageId: aiMessageId,
            content: userMessageContent,
            mode: 'ask',
            userId,
            sessionId: apiSessionId, // Always use the API session ID, never fallback to conversation ID
            dataSources: ['all']
          });

          // Reset streaming state
          set((draft) => {
            draft.streaming = { ...initialStreamingState };
          });

          return aiMessageId;
        } catch (error) {
          const errorMessage = StoreErrorHandler.extractErrorMessage(error);
          
          set((draft) => {
            draft.streaming = {
              ...initialStreamingState,
              error: `Streaming failed: ${errorMessage}`,
            };
            draft.error = errorMessage;
            draft.isLoading = false;
          });
          
          StoreErrorHandler.logError('handleAskMode', error, { conversationId, userId });
          throw error;
        }
      },

      // Investigate mode streaming handler
      handleInvestigateMode: async (conversationId: string, userMessageContent: string) => {
        try {
          set((draft) => {
            draft.isLoading = true;
            draft.error = null;
          });

          const messageStore = useMessageStore.getState();
          const conversationStore = useConversationStore.getState();
          
          // Get user from auth store
          const authUser = useAuthStore.getState().user;
          if (!authUser?.email) {
            throw new Error(UI_TEXT.errors.auth.loginRequired);
          }
          const userId = authUser.email;
          
          // Get session (should already be created by use-chat-logic)
          let session = conversationStore.conversations[conversationId]?.session;
          
          // If no session exists, try to create one on-the-fly for Investigate mode only
          if (!session || session.status !== 'active') {
            console.log('⚠️ [StreamingStore] No active session found for Investigate mode, attempting to create one...');
            
            try {
              // Create session on-the-fly for Investigate mode only
              const sessionTitle = userMessageContent.length > 50 ? userMessageContent.substring(0, 47) + '...' : userMessageContent;
              const { chatAPI } = await import('../services/chat-api');
              
              const result = await chatAPI.createSession(userId, conversationId, {
                title: sessionTitle,
                createdAt: new Date().toISOString(),
              });
              
              if (result.success) {
                const newSession = {
                  id: conversationId,
                  userId,
                  appName: result.data?.appName ?? "moe_support_agent",
                  status: 'active' as const,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  apiSessionId: result.data?.sessionId ?? conversationId,
                  mode: 'investigate' as const,
                };
                
                // Update conversation with new session
                conversationStore.updateConversation(conversationId, { session: newSession });
                console.log('✅ [StreamingStore] Investigate session created on-the-fly:', newSession);
                
                // Navigate to session URL after creation
                const { buildChatRoute } = await import('../constants/routes');
                const newRoute = buildChatRoute(conversationId, 'investigate');
                console.log('🔄 [StreamingStore] Navigating to Investigate session route:', newRoute);
                window.history.replaceState(null, '', newRoute);
                
                // Use the new session
                session = newSession;
              } else {
                console.warn('⚠️ [StreamingStore] Failed to create Investigate session on-the-fly, using fallback');
                // Continue with fallback session
                session = {
                  id: conversationId,
                  userId,
                  appName: "moe_support_agent",
                  status: 'active' as const,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  apiSessionId: conversationId,
                  mode: 'investigate' as const,
                };
              }
            } catch (sessionError) {
              console.warn('⚠️ [StreamingStore] Investigate session creation failed, using fallback:', sessionError);
              // Use fallback session
              session = {
                id: conversationId,
                userId,
                appName: "moe_support_agent",
                status: 'active' as const,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                apiSessionId: conversationId,
                mode: 'investigate' as const,
              };
            }
          }

          console.log('handleInvestigateMode - using session:', session);
          
          // User message is already added by useChatLogic, so we don't need to add it again
          // Just create the AI message placeholder
          const aiMessageId = generateId();
          const aiMessage: AIMessage = {
            id: aiMessageId,
            type: 'ai',
            role: 'model',
            content: '',
            status: 'sending',
            timestamp: Date.now(),
            conversationId,
            thinkingSteps: [],
            toolCalls: [],
            isStreaming: true,
            isComplete: false,
            showThinking: true,
            showRawEvents: false,
            rawEvents: [],
          };
          
          messageStore.addMessage(conversationId, aiMessage);
          
          // Set streaming state
          set((draft) => {
            draft.streaming = {
              isStreaming: true,
              messageId: aiMessageId,
              conversationId,
              phase: 'thinking',
              currentThinking: '',
              currentResponse: '',
              activeTool: null,
              progress: {
                phase: 'Initializing...',
                step: 1,
                totalSteps: 3,
              },
              error: null,
            };
            draft.isLoading = false;
          });
          
          // Start SSE stream
          if (session && userId) {
            const sessionId = session.apiSessionId ?? conversationId;
            console.log('Starting SSE stream for investigate mode:', {
              userId: userId,
              sessionId: sessionId,
              message: userMessageContent
            });
            
            const { disconnect } = await chatAPI.createSSEStream(
              userId,
              sessionId,
              userMessageContent,
              (event: MessageEvent) => {
                try {
                  const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                  if (data?.content?.parts && Array.isArray(data.content.parts)) {
                    get().handleSSEEvent(data as unknown as SSEEventData);
                  }
                } catch (error) {
                  console.error('Failed to parse SSE event:', error);
                }
              },
              (error: Event) => {
                console.error('SSE stream error:', error);
                get().stopStreaming();
              },
              () => {
                console.log('SSE stream opened');
              },
              () => {
                console.log('SSE stream closed');
                get().finalizeStream();
              },
              'investigate' // Pass the correct mode
            );
            
            // Store disconnect function
            set((draft) => {
              draft.streaming.disconnect = disconnect;
            });
          } else {
            throw new Error('Missing session or user ID for SSE stream');
          }
          
          return aiMessageId;
        } catch (error) {
          const errorMessage = StoreErrorHandler.extractErrorMessage(error);
          
          set((draft) => {
            draft.streaming = {
              ...initialStreamingState,
              error: `Streaming failed: ${errorMessage}`,
            };
            draft.error = errorMessage;
            draft.isLoading = false;
          });
          
          StoreErrorHandler.logError('handleInvestigateMode', error, { conversationId });
          throw error;
        }
      },

      // Stop streaming
      stopStreaming: () => {
        const state = get();
        
        // Disconnect SSE stream if active
        if (state.streaming.disconnect) {
          state.streaming.disconnect();
        }
        
        set((draft) => {
          // Finalize current message if it exists
          if (draft.streaming.messageId && draft.streaming.conversationId) {
            const messageStore = useMessageStore.getState();
            messageStore.updateMessage(draft.streaming.messageId, {
              isStreaming: false,
              isComplete: true,
              status: "delivered",
            });
          }

          draft.streaming = { ...initialStreamingState };
          draft.lastUpdated = Date.now();
        });
      },

      // Handle SSE events
      handleSSEEvent: (event: SSEEventData) => {
        const { streaming } = get();
        
        console.log('🔄 [StreamingStore] Handling SSE event:', {
          isStreaming: streaming.isStreaming,
          messageId: streaming.messageId,
          eventData: event
        });
        
        if (!streaming.isStreaming || !streaming.messageId) {
          console.log('⚠️ [StreamingStore] Skipping SSE event - not streaming or no messageId');
          return;
        }

        // Local content markers (fallback to literal markers)
        const MARKERS = {
          FINAL_ANSWER: '/*FINAL_ANSWER*/',
          REASONING: '/*REASONING*/',
          PLANNING: '/*PLANNING*/',
          ACTION: '/*ACTION*/',
        } as const;

        const messageStore = useMessageStore.getState();

        set((draft) => {
          draft.streaming.phase = "responding";
          draft.lastUpdated = Date.now();
        });

        console.log('📝 [StreamingStore] Processing event parts:', event.content.parts);

        // Process event parts with proper type guards
        event.content.parts.forEach((part, index) => {
          console.log(`🔍 [StreamingStore] Processing part ${index}:`, part);
          
          // Thinking parts
          if ('thought' in part && part.thought && 'text' in part) {
            const thinkingStep: ThinkingStep = {
              id: generateId(),
              type: part.text.includes(MARKERS.PLANNING)
                ? 'planning'
                : part.text.includes(MARKERS.REASONING)
                  ? 'reasoning'
                  : part.text.includes(MARKERS.ACTION)
                    ? 'action'
                    : 'final_answer',
              content: part.text,
              timestamp: event.timestamp,
              isVisible: true,
              rawEvent: event,
            };

            messageStore.addThinkingStep(streaming.messageId!, thinkingStep);
            
            set((draft) => {
              draft.streaming.phase = 'thinking';
              draft.streaming.currentThinking = part.text;
            });
          }
          // Tool call
          else if ('functionCall' in part) {
            const toolCall: ToolCall = {
              ...part.functionCall,
              status: 'calling',
              timestamp: event.timestamp,
            };
            messageStore.addToolCall(streaming.messageId!, toolCall);
            set((draft) => {
              draft.streaming.phase = 'tool_calling';
              draft.streaming.activeTool = toolCall;
            });
          }
          // Tool response
          else if ('functionResponse' in part) {
            messageStore.updateToolCall(
              streaming.messageId!,
              part.functionResponse.id,
              {
                status: 'completed',
                result: part.functionResponse.response.result,
              }
            );
            set((draft) => {
              draft.streaming.activeTool = null;
            });
          }
          // Text parts (non-thinking)
          else if ('text' in part && (!('thought' in part) || !part.thought)) {
            let content = part.text ?? '';
            
            // Strip internal markers if present
            if (content.includes(MARKERS.REASONING)) {
              content = content.split(MARKERS.REASONING)[0];
            }
            if (content.includes(MARKERS.FINAL_ANSWER)) {
              content = content.split(MARKERS.FINAL_ANSWER).slice(-1)[0];
            }
            
            if (!content) {
              return;
            }

            // Append or set content
            const currentMessage = messageStore.messages[streaming.conversationId!]?.find(
              (m) => m.id === streaming.messageId
            ) as AIMessage | undefined;
            
            if (event.partial && currentMessage) {
              messageStore.updateMessage(streaming.messageId!, {
                content: (currentMessage.content || '') + content,
              });
            } else {
              messageStore.updateMessage(streaming.messageId!, {
                content: content,
              });
            }
            
            set((draft) => {
              draft.streaming.phase = 'responding';
              draft.streaming.currentResponse = content;
            });
          }
        });

        // Update usage metadata (only for final events)
        if (event.usageMetadata && !event.partial) {
          messageStore.updateMessage(streaming.messageId!, {
            usageMetadata: {
              promptTokens: event.usageMetadata.promptTokenCount,
              completionTokens: event.usageMetadata.candidatesTokenCount,
              thoughtTokens: event.usageMetadata.thoughtsTokenCount,
              totalTokens: event.usageMetadata.totalTokenCount,
            },
          });
        }
      },

      // Finalize stream
      finalizeStream: () => {
        const { streaming } = get();
        if (!streaming.messageId) return;

        console.log('🏁 [StreamingStore] Finalizing stream for message:', streaming.messageId);

        // Disconnect SSE stream if active
        if (streaming.disconnect) {
          streaming.disconnect();
        }

        set((draft) => {
          // Finalize current message
          if (draft.streaming.messageId && draft.streaming.conversationId) {
            const messageStore = useMessageStore.getState();
            messageStore.updateMessage(draft.streaming.messageId, {
              isStreaming: false,
              isComplete: true,
              status: "delivered",
            });
          }

          draft.streaming = { ...initialStreamingState };
          draft.lastUpdated = Date.now();
        });
      },
    })),
    {
      name: "streaming-store",
    }
  )
);

// Selectors for better performance
export const useStreamingState = () =>
  useStreamingStore((state) => state.streaming);

export const useIsStreaming = () =>
  useStreamingStore((state) => state.streaming.isStreaming);

export const useStreamingProgress = () =>
  useStreamingStore((state) => ({
    phase: state.streaming.phase,
    progress: state.streaming.progress,
    currentThinking: state.streaming.currentThinking,
    currentResponse: state.streaming.currentResponse,
    activeTool: state.streaming.activeTool,
  }));

export const useStreamingError = () =>
  useStreamingStore((state) => state.streaming.error || state.error);
