import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { MessageStore } from "../types/stores";
import type { Message, AIMessage, ThinkingStep, ToolCall } from "../types";
import { StoreErrorHandler } from "../utils/store-error-handler";
import { chatAPI } from "../services/chat-api";

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Create a stable empty array to avoid infinite loops
const EMPTY_MESSAGES: Message[] = [];

const initialState = {
  messages: {},
  loadingMessages: {},
  lastMessageLoadTime: undefined,
  isLoading: false,
  error: null,
  lastUpdated: Date.now(),
};

export const useMessageStore = create<MessageStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Message management
      setMessages: (conversationId: string, messages: Message[]) => {
        set((draft) => {
          draft.messages[conversationId] = messages;
          draft.lastUpdated = Date.now();
        });
      },

      addMessage: (conversationId: string, messageData: Omit<Message, "id" | "timestamp"> | Message) => {
        // If the message already has an ID, use it; otherwise generate one
        const messageId = 'id' in messageData ? messageData.id : generateId();
        const timestamp = 'timestamp' in messageData ? messageData.timestamp : Date.now();
        
        const message: Message = {
          ...messageData,
          id: messageId,
          timestamp,
          conversationId,
        } as Message;

        console.log(`📝 [MessageStore] Adding message to conversation ${conversationId}:`, {
          messageId,
          type: message.type,
          role: message.role,
          content: message.content?.substring(0, 100) + '...'
        });

        set((draft) => {
          if (!draft.messages[conversationId]) {
            draft.messages[conversationId] = [];
            console.log(`📝 [MessageStore] Created new message array for conversation ${conversationId}`);
          }

          draft.messages[conversationId].push(message);
          draft.lastUpdated = Date.now();
          
          console.log(`📝 [MessageStore] Message added. Total messages for ${conversationId}: ${draft.messages[conversationId].length}`);
        });

        return messageId;
      },

      updateMessage: (messageId: string, updates: Partial<Message>) => {
        set((draft) => {
          for (const conversationId in draft.messages) {
            const message = draft.messages[conversationId].find(
              (m) => m.id === messageId
            );

            if (message) {
              Object.assign(message, updates);
              draft.lastUpdated = Date.now();
              break;
            }
          }
        });
      },

      deleteMessage: (messageId: string) => {
        set((draft) => {
          for (const conversationId in draft.messages) {
            const index = draft.messages[conversationId].findIndex(
              (m) => m.id === messageId
            );
            if (index !== -1) {
              draft.messages[conversationId].splice(index, 1);
              draft.lastUpdated = Date.now();
              break;
            }
          }
        });
      },

      loadSessionMessages: async (conversationId: string, userId: string) => {
        const state = get();
        
        // Check if already loading
        if (state.loadingMessages[conversationId]) {
          console.log(`Already loading messages for session ${conversationId}, skipping`);
          return false;
        }

        // Check if messages already exist
        const existingMessages = state.messages[conversationId];
        if (existingMessages && existingMessages.length > 0) {
          console.log(`Messages already exist for session ${conversationId} (${existingMessages.length} messages), skipping load`);
          return true;
        }

        // Set loading state
        set((draft) => {
          draft.loadingMessages[conversationId] = true;
          draft.isLoading = true;
        });

        console.log(`🔄 [MessageStore] Starting to load messages for session ${conversationId}`);

        try {
          const messages: Message[] = [];

          // Get mode from conversation store or determine from URL
          let mode: 'ask' | 'investigate' = 'investigate'; // default
          
          // Try to get mode from conversation store first
          try {
            const { useConversationStore } = await import('./conversation-store');
            const conversationState = useConversationStore.getState();
            const conversation = conversationState.conversations[conversationId];
            if (conversation?.mode) {
              mode = conversation.mode;
              console.log(`📡 [MessageStore] Got mode from conversation store: ${mode}`);
            } else {
              // Fallback: determine from URL
              const currentPath = window.location.pathname;
              if (currentPath.includes('/chat/ask/')) {
                mode = 'ask';
              } else if (currentPath.includes('/chat/investigate/')) {
                mode = 'investigate';
              }
              console.log(`📡 [MessageStore] Determined mode from URL: ${mode}`);
            }
          } catch (error) {
            console.warn(`⚠️ [MessageStore] Could not determine mode, using default: ${mode}`);
          }

          // Call the appropriate API based on mode
          if (mode === 'ask') {
            console.log(`📡 [MessageStore] Loading Ask mode messages for session ${conversationId}`);
            
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${baseUrl}/ask/ask-sessions/${conversationId}?user_id=${userId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const data = await response.json();
              console.log(`📡 [MessageStore] Ask API response:`, data);
              
              if (data.success && data.data && data.data.turns) {
                const turns = data.data.turns;
                
                // Convert Ask mode turns to messages
                if (Array.isArray(turns) && turns.length > 0) {
                  console.log(`📡 [MessageStore] Processing ${turns.length} turns for Ask session ${conversationId}`);
                  
                  for (const turn of turns) {
                    // Add user message
                    if (turn.user_query && typeof turn.user_query === 'string') {
                      const userMessage: Message = {
                        id: generateId(),
                        type: 'user',
                        role: 'user',
                        content: turn.user_query,
                        status: 'sent',
                        timestamp: new Date(turn.created_at).getTime(),
                        conversationId,
                      };
                      messages.push(userMessage);
                    }
                    
                    // Add AI response
                    if (turn.ai_response && typeof turn.ai_response === 'string') {
                      const aiMessage: AIMessage = {
                        id: generateId(),
                        type: 'ai',
                        role: 'model',
                        content: turn.ai_response,
                        status: 'delivered',
                        timestamp: new Date(turn.created_at).getTime(),
                        conversationId,
                        thinkingSteps: [],
                        toolCalls: [],
                        isStreaming: false,
                        isComplete: true,
                        showThinking: false,
                        showRawEvents: false,
                        rawEvents: [],
                        citations: turn.citations || [],
                      };
                      messages.push(aiMessage);
                    }
                  }
                  console.log(`✅ [MessageStore] Ask API returned ${turns.length} turns, converted to ${messages.length} messages`);
                }
              } else {
                console.log(`❌ [MessageStore] Ask API failed for session ${conversationId}:`, data.error || 'Unknown error');
              }
            } else {
              console.log(`❌ [MessageStore] Ask API HTTP error for session ${conversationId}:`, response.status);
            }
          } else {
            // Investigate mode
            console.log(`📡 [MessageStore] Loading Investigate mode messages for session ${conversationId}`);
            
            const result = await chatAPI.getSessionMessages(userId, conversationId);
            
            if (result.success && result.data) {
              console.log(`📡 [MessageStore] Processing Investigate session ${conversationId}`, result.data);
              
              // The result.data is already the events array from getSessionMessages
              const events = result.data as any[];
              
              if (Array.isArray(events) && events.length > 0) {
                console.log(`📡 [MessageStore] Processing ${events.length} events for Investigate session ${conversationId}`);
                
                for (const event of events) {
                  if (event && event.content && Array.isArray(event.content.parts)) {
                    const eventContent = event.content;
                    const eventParts = eventContent.parts;
                    
                    // Handle user messages
                    if (eventContent.role === 'user') {
                      const textParts = eventParts.filter((p: any) => p.text && !p.thought);
                      if (textParts.length > 0) {
                        const userMessage: Message = {
                          id: event.id || generateId(),
                          type: 'user',
                          role: 'user',
                          content: textParts.map((p: any) => p.text).join(''),
                          status: 'sent',
                          timestamp: event.timestamp ? event.timestamp * 1000 : Date.now(),
                          conversationId,
                        };
                        messages.push(userMessage);
                        console.log(`📝 [MessageStore] Added user message:`, userMessage.content.substring(0, 100));
                      }
                    }
                    
                    // Handle AI messages
                    if (eventContent.role === 'model') {
                      // Extract thinking steps and tool calls
                      const thinkingSteps: ThinkingStep[] = [];
                      const toolCalls: ToolCall[] = [];
                      const textParts = eventParts.filter((p: any) => p.text && !p.thought && !p.functionCall && !p.functionResponse);
                      
                      // Process thinking steps
                      eventParts.forEach((part: any) => {
                        if (part.thought && part.text) {
                          const thinkingStep: ThinkingStep = {
                            id: generateId(),
                            type: part.text.includes('/*PLANNING*/') ? 'planning' : 
                                  part.text.includes('/*REASONING*/') ? 'reasoning' :
                                  part.text.includes('/*ACTION*/') ? 'action' :
                                  part.text.includes('/*FINAL_ANSWER*/') ? 'final_answer' : 'reasoning',
                            content: part.text,
                            timestamp: event.timestamp ? event.timestamp * 1000 : Date.now(),
                            isVisible: true,
                            rawEvent: event,
                          };
                          thinkingSteps.push(thinkingStep);
                        }
                      });
                      
                      // Process tool calls
                      eventParts.forEach((part: any) => {
                        if (part.functionCall) {
                          const toolCall: ToolCall = {
                            id: part.functionCall.id || generateId(),
                            name: part.functionCall.name,
                            args: part.functionCall.args || {},
                            status: 'completed',
                            timestamp: event.timestamp ? event.timestamp * 1000 : Date.now(),
                            result: undefined,
                          };
                          toolCalls.push(toolCall);
                        }
                        
                        if (part.functionResponse) {
                          // Find matching tool call and update with response
                          const matchingToolCall = toolCalls.find(tc => tc.id === part.functionResponse.id);
                          if (matchingToolCall) {
                            matchingToolCall.result = part.functionResponse.response;
                            matchingToolCall.status = 'completed';
                          }
                        }
                      });
                      
                      // Create AI message if there's text content or if it's a thinking/tool message
                      if (textParts.length > 0 || thinkingSteps.length > 0 || toolCalls.length > 0) {
                        const aiMessage: AIMessage = {
                          id: event.id || generateId(),
                          type: 'ai',
                          role: 'model',
                          content: textParts.map((p: any) => p.text).join(''),
                          status: 'delivered',
                          timestamp: event.timestamp ? event.timestamp * 1000 : Date.now(),
                          conversationId,
                          thinkingSteps,
                          toolCalls,
                          isStreaming: false,
                          isComplete: true,
                          showThinking: false,
                          showRawEvents: false,
                          rawEvents: [],
                        };
                        messages.push(aiMessage);
                        console.log(`📝 [MessageStore] Added AI message with ${thinkingSteps.length} thinking steps and ${toolCalls.length} tool calls`);
                      }
                    }
                  }
                }
                console.log(`✅ [MessageStore] Investigate API returned ${events.length} events, converted to ${messages.length} messages`);
              } else {
                console.log(`❌ [MessageStore] Investigate API failed for session ${conversationId}:`, result.error);
              }
            } else {
              console.log(`❌ [MessageStore] Investigate API failed for session ${conversationId}:`, result.error);
            }
          }
          
          // Update store with loaded messages
          set((draft) => {
            // Always set messages, even if empty, to prevent future API calls
            draft.messages[conversationId] = messages;
            draft.loadingMessages[conversationId] = false;
            draft.isLoading = false;
            
            // Force a timestamp update to trigger re-renders
            draft.lastMessageLoadTime = Date.now();
            draft.lastUpdated = Date.now();
          });
          
          console.log(`✅ [MessageStore] Successfully loaded ${messages.length} messages for session ${conversationId}`);
          return true;
        } catch (error) {
          const errorMessage = StoreErrorHandler.extractErrorMessage(error);
          console.error(`❌ [MessageStore] Error loading session messages for ${conversationId}:`, error);
          
          set((draft) => {
            // Initialize with empty array so UI doesn't break and to prevent future API calls
            draft.messages[conversationId] = [];
            draft.loadingMessages[conversationId] = false;
            draft.isLoading = false;
            draft.error = `Failed to load messages: ${errorMessage}`;
          });
          
          StoreErrorHandler.logError('loadSessionMessages', error, { conversationId, userId });
          return false;
        }
      },

      // Thinking & Tool actions
      addThinkingStep: (messageId: string, stepData: Omit<ThinkingStep, "id">) => {
        const stepId = generateId();
        const step: ThinkingStep = {
          ...stepData,
          id: stepId,
        };

        set((draft) => {
          // Find message across all conversations
          for (const conversationId in draft.messages) {
            const message = draft.messages[conversationId].find(
              (m) => m.id === messageId
            ) as AIMessage;

            if (message) {
              // Check for duplicates before adding
              const isDuplicate = message.thinkingSteps.some(existingStep => {
                const contentSimilarity = existingStep.content.includes(step.content) || 
                                        step.content.includes(existingStep.content) ||
                                        existingStep.content === step.content;
                
                const timeSimilarity = Math.abs(existingStep.timestamp - step.timestamp) < 5000;
                
                return contentSimilarity && timeSimilarity;
              });

              if (!isDuplicate) {
                message.thinkingSteps.push(step);
                draft.lastUpdated = Date.now();
              }
              break;
            }
          }
        });
      },

      toggleThinkingVisibility: (messageId: string, stepId?: string) => {
        set((draft) => {
          for (const conversationId in draft.messages) {
            const message = draft.messages[conversationId].find(
              (m) => m.id === messageId
            ) as AIMessage;

            if (message) {
              if (stepId) {
                // Toggle specific step
                const step = message.thinkingSteps.find(
                  (s) => s.id === stepId
                );
                if (step) {
                  step.isVisible = !step.isVisible;
                }
              } else {
                // Toggle all thinking visibility
                message.showThinking = !message.showThinking;
              }
              draft.lastUpdated = Date.now();
              break;
            }
          }
        });
      },

      addToolCall: (messageId: string, toolCallData: Omit<ToolCall, "timestamp">) => {
        const toolCall: ToolCall = {
          ...toolCallData,
          timestamp: Date.now(),
        };

        set((draft) => {
          for (const conversationId in draft.messages) {
            const message = draft.messages[conversationId].find(
              (m) => m.id === messageId
            ) as AIMessage;

            if (message) {
              message.toolCalls.push(toolCall);
              draft.lastUpdated = Date.now();
              break;
            }
          }
        });
      },

      updateToolCall: (messageId: string, toolCallId: string, updates: Partial<ToolCall>) => {
        set((draft) => {
          for (const conversationId in draft.messages) {
            const message = draft.messages[conversationId].find(
              (m) => m.id === messageId
            ) as AIMessage;

            if (message) {
              const toolCall = message.toolCalls.find(
                (t) => t.id === toolCallId
              );
              if (toolCall) {
                Object.assign(toolCall, updates);
                draft.lastUpdated = Date.now();
              }
              break;
            }
          }
        });
      },
    })),
    {
      name: "message-store",
    }
  )
);

// Optimized selectors for better performance and preventing unnecessary re-renders
export const useActiveMessages = (conversationId: string | null) =>
  useMessageStore((state) => {
    if (!conversationId) {
      return EMPTY_MESSAGES;
    }
    const messages = state.messages[conversationId] || EMPTY_MESSAGES;
    return messages;
  });

export const useMessageById = (messageId: string) =>
  useMessageStore((state) => {
    for (const conversationId in state.messages) {
      const message = state.messages[conversationId].find(
        (m) => m.id === messageId
      );
      if (message) return message;
    }
    return null;
  });

export const useMessagesForConversation = (conversationId: string) =>
  useMessageStore((state) => state.messages[conversationId] || EMPTY_MESSAGES);

export const useMessageLoadingState = (conversationId: string) =>
  useMessageStore((state) => state.loadingMessages[conversationId] || false);

// Additional granular selectors for performance optimization
export const useMessageCount = (conversationId: string) =>
  useMessageStore((state) => state.messages[conversationId]?.length || 0);

export const useLastMessage = (conversationId: string) =>
  useMessageStore((state) => {
    const messages = state.messages[conversationId];
    return messages && messages.length > 0 ? messages[messages.length - 1] : null;
  });

export const useUserMessages = (conversationId: string) =>
  useMessageStore((state) => {
    const messages = state.messages[conversationId] || EMPTY_MESSAGES;
    return messages.filter(m => m.type === 'user');
  });

export const useAIMessages = (conversationId: string) =>
  useMessageStore((state) => {
    const messages = state.messages[conversationId] || EMPTY_MESSAGES;
    return messages.filter(m => m.type === 'ai');
  });

export const useStreamingMessage = (conversationId: string) =>
  useMessageStore((state) => {
    const messages = state.messages[conversationId] || EMPTY_MESSAGES;
    return messages.find(m => m.type === 'ai' && (m as any).isStreaming) as AIMessage | undefined;
  });

export const useMessageContent = (messageId: string) =>
  useMessageStore((state) => {
    for (const conversationId in state.messages) {
      const message = state.messages[conversationId].find(m => m.id === messageId);
      if (message) return message.content;
    }
    return null;
  });

export const useMessageStatus = (messageId: string) =>
  useMessageStore((state) => {
    for (const conversationId in state.messages) {
      const message = state.messages[conversationId].find(m => m.id === messageId);
      if (message) return message.status;
    }
    return null;
  });

export const useThinkingSteps = (messageId: string) =>
  useMessageStore((state) => {
    for (const conversationId in state.messages) {
      const message = state.messages[conversationId].find(m => m.id === messageId) as AIMessage;
      if (message && message.type === 'ai') return message.thinkingSteps || [];
    }
    return [];
  });

export const useToolCalls = (messageId: string) =>
  useMessageStore((state) => {
    for (const conversationId in state.messages) {
      const message = state.messages[conversationId].find(m => m.id === messageId) as AIMessage;
      if (message && message.type === 'ai') return message.toolCalls || [];
    }
    return [];
  });

export const useMessageCitations = (messageId: string) =>
  useMessageStore((state) => {
    for (const conversationId in state.messages) {
      const message = state.messages[conversationId].find(m => m.id === messageId) as AIMessage;
      if (message && message.type === 'ai') return message.citations || [];
    }
    return [];
  });

export const useIsMessageLoading = () =>
  useMessageStore((state) => state.isLoading);

export const useMessageError = () =>
  useMessageStore((state) => state.error);

export const useLastMessageLoadTime = () =>
  useMessageStore((state) => state.lastMessageLoadTime);
