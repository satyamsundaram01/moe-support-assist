import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { SessionStore } from "../types/stores";
import type { ChatSession } from "../types";
import {  CHAT_ERRORS } from "../constants/chat";
import { StoreErrorHandler } from "../utils/store-error-handler";
import { chatAPI } from "../services/chat-api";
import { useAuthStore } from "../store/auth-store";
import { createSessionManagerForMode } from "../services/session-manager-factory";
import { chatHistoryService } from "../services/chat-history-service";

const initialState = {
  sessions: {} as Record<string, ChatSession>,
  currentUserId: null as string | null,
  isLoading: false,
  error: null as string | null,
  lastUpdated: Date.now(),
  selectedDataSources: ['all'],
};

export const useSessionStore = create<SessionStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // User management
      setUserId: (userId: string) => {
        set((draft) => {
          draft.currentUserId = userId;
          draft.lastUpdated = Date.now();
        });
      },

      initializeUserFromAuth: () => {
        try {
          const authUser = useAuthStore.getState().user;
          if (authUser && authUser.email) {
            set((draft) => {
              draft.currentUserId = authUser.email;
              draft.lastUpdated = Date.now();
            });
          }
        } catch (error) {
          StoreErrorHandler.logError('initializeUserFromAuth', error);
        }
      },

      // Session management
      createSessionForConversation: async (conversationId: string, userId?: string) => {
        const state = get();
        const actualUserId = userId || state.currentUserId;
        
        if (!actualUserId) {
          const error = new Error(CHAT_ERRORS.NO_AUTH_USER);
          StoreErrorHandler.logError('createSessionForConversation', error, { conversationId });
          throw error;
        }

        try {
          set((draft) => {
            draft.isLoading = true;
            draft.error = null;
          });

          const result = await chatAPI.createSession(
            actualUserId,
            conversationId,
            {
              conversationId,
              createdAt: new Date().toISOString(),
            }
          );

          if (result.success) {
            const session: ChatSession = {
              id: conversationId,
              userId: actualUserId,
              appName: result.data?.appName || "moe_support_agent",
              status: "active",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              apiSessionId: result.data?.sessionId,
              mode: 'investigate',
            };

            set((draft) => {
              draft.sessions[conversationId] = session;
              draft.isLoading = false;
              draft.lastUpdated = Date.now();
            });

            return true;
          } else {
            const errorMessage = result.error || CHAT_ERRORS.SESSION_CREATION_FAILED;
            
            set((draft) => {
              draft.sessions[conversationId] = {
                ...draft.sessions[conversationId],
                status: "error",
              };
              draft.error = errorMessage;
              draft.isLoading = false;
            });

            throw new Error(errorMessage);
          }
        } catch (error) {
          const errorMessage = StoreErrorHandler.extractErrorMessage(error);
          
          set((draft) => {
            if (draft.sessions[conversationId]) {
              draft.sessions[conversationId].status = "error";
            }
            draft.error = errorMessage;
            draft.isLoading = false;
          });

          StoreErrorHandler.logError('createSessionForConversation', error, { conversationId, userId: actualUserId });
          throw error;
        }
      },

      createAskSession: async (conversationId: string, sessionTitle: string, userId?: string) => {
        const state = get();
        const actualUserId = userId || state.currentUserId;
        
        if (!actualUserId) {
          const error = new Error(CHAT_ERRORS.NO_AUTH_USER);
          StoreErrorHandler.logError('createAskSession', error, { conversationId });
          throw error;
        }

        try {
          set((draft) => {
            draft.isLoading = true;
            draft.error = null;
          });

          const sessionManager = createSessionManagerForMode('ask', actualUserId);
          
          const sessionResult = await sessionManager.createSession(conversationId, {
            title: sessionTitle,
            createdAt: new Date().toISOString(),
          });

          if (!sessionResult.success) {
            const errorMessage = sessionResult.error || CHAT_ERRORS.SESSION_CREATION_FAILED;
            throw new Error(errorMessage);
          }

          const session: ChatSession = {
            id: conversationId,
            userId: actualUserId,
            appName: 'ask_mode',
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            apiSessionId: sessionResult?.apiSessionId || conversationId,
            mode: 'ask',
          };

          set((draft) => {
            draft.sessions[conversationId] = session;
            draft.isLoading = false;
            draft.lastUpdated = Date.now();
          });

          // Add to chat history cache
          try {
            const newSession = {
              sessionId: conversationId,
              userId: actualUserId,
              title: sessionTitle,
              mode: 'ask' as const,
              lastUpdated: Date.now(),
              createdAt: Date.now(),
              messageCount: 1,
              status: 'active' as const,
              conversationId: conversationId,
              metadata: { title: sessionTitle, createdAt: new Date().toISOString() },
              totalTurns: 1,
            };
            chatHistoryService.addSessionToCache(actualUserId, newSession);
          } catch (error) {
            console.warn('Failed to add session to chat history cache:', error);
          }

          return { success: true, session, apiSessionId: sessionResult?.apiSessionId };
        } catch (error) {
          const errorMessage = StoreErrorHandler.extractErrorMessage(error);
          
          set((draft) => {
            if (draft.sessions[conversationId]) {
              draft.sessions[conversationId].status = "error";
            }
            draft.error = errorMessage;
            draft.isLoading = false;
          });

          StoreErrorHandler.logError('createAskSession', error, { conversationId, userId: actualUserId });
          return { success: false, error: errorMessage };
        }
      },

      endSession: async (conversationId: string) => {
        const state = get();
        const session = state.sessions[conversationId];
        
        if (!session || !session.userId) {
          console.warn(`No session found for conversation ${conversationId}`);
          return;
        }

        try {
          await chatAPI.deleteSession(session.userId, conversationId);
          console.log(`Session ${conversationId} ended successfully`);
        } catch (error) {
          const errorMessage = StoreErrorHandler.extractErrorMessage(error);
          console.error("Failed to end session:", error);
          
          set((draft) => {
            draft.error = `Failed to end session: ${errorMessage}`;
          });
          
          // Don't throw error - we still want to mark session as inactive locally
        }

        set((draft) => {
          if (draft.sessions[conversationId]) {
            draft.sessions[conversationId].status = "inactive";
            draft.sessions[conversationId].updatedAt = Date.now();
          }
          draft.lastUpdated = Date.now();
        });
      },

      recreateSession: async (conversationId: string) => {
        const state = get();
        const userId = state.currentUserId;
        
        if (!userId) {
          const error = new Error(CHAT_ERRORS.NO_AUTH_USER);
          StoreErrorHandler.logError('recreateSession', error, { conversationId });
          throw error;
        }

        try {
          await get().endSession(conversationId);
          return await get().createSessionForConversation(conversationId, userId);
        } catch (error) {
          StoreErrorHandler.logError('recreateSession', error, { conversationId, userId });
          throw error;
        }
      },

      getSession: (conversationId: string) => {
        const state = get();
        return state.sessions[conversationId] || null;
      },

      getSessionStatus: (conversationId: string) => {
        const state = get();
        const session = state.sessions[conversationId];
        return session?.status || "inactive";
      },

      updateSession: (conversationId: string, updates: Partial<ChatSession>) => {
        set((draft) => {
          if (draft.sessions[conversationId]) {
            Object.assign(draft.sessions[conversationId], {
              ...updates,
              updatedAt: Date.now(),
            });
            draft.lastUpdated = Date.now();
          }
        });
      },

      clearError: () => {
        set((draft) => {
          draft.error = null;
        });
      },

      // Data source management
      setSelectedDataSources: (dataSources: string[]) => {
        set((draft) => {
          draft.selectedDataSources = dataSources;
          draft.lastUpdated = Date.now();
        });
      },

      clearSelectedDataSources: () => {
        set((draft) => {
          draft.selectedDataSources = ['all'];
          draft.lastUpdated = Date.now();
        });
      },

      // Connection state management
      connection: {
        isConnected: false,
        isReconnecting: false,
        lastError: null,
      },

      setConnectionStatus: (isConnected: boolean) => {
        set((draft) => {
          draft.connection.isConnected = isConnected;
          if (isConnected) {
            draft.connection.lastError = null;
          }
          draft.lastUpdated = Date.now();
        });
      },

      setConnectionError: (error: string | null) => {
        set((draft) => {
          draft.connection.lastError = error;
          if (error) {
            draft.connection.isConnected = false;
          }
          draft.lastUpdated = Date.now();
        });
      },

      setReconnecting: (isReconnecting: boolean) => {
        set((draft) => {
          draft.connection.isReconnecting = isReconnecting;
          draft.lastUpdated = Date.now();
        });
      },
    })),
    {
      name: "session-store",
    }
  )
);

// Selectors for better performance
export const useSessionById = (conversationId: string) =>
  useSessionStore((state) => state.sessions[conversationId] || null);

export const useSessionStatus = (conversationId: string) =>
  useSessionStore((state) => {
    const session = state.sessions[conversationId];
    return session?.status || "inactive";
  });

export const useCurrentUserId = () =>
  useSessionStore((state) => state.currentUserId);

export const useSessionConnection = () =>
  useSessionStore((state) => state.connection);

export const useSessionError = () =>
  useSessionStore((state) => state.error);

export const useSessionLoading = () =>
  useSessionStore((state) => state.isLoading);
