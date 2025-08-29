import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { ConversationStore } from "../types/stores";
import type { Conversation, ChatMode } from "../types";
import { DEFAULT_MODE } from "../constants/chat-modes";
import { UI_TEXT } from "../constants/ui-text";
import { StoreErrorHandler } from "../utils/store-error-handler";
import { useAuthStore } from "../store/auth-store";

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

const initialState = {
  conversations: {},
  activeConversationId: null,
  currentMode: DEFAULT_MODE,
  isModeSwitching: false,
  modeSwitchError: null,
  isLoading: false,
  error: null,
  lastUpdated: Date.now(),
};

export const useConversationStore = create<ConversationStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Mode management actions
      switchMode: (newMode: ChatMode) => {
        console.log(`🔄 [ConversationStore] switchMode called:`, {
          currentMode: get().currentMode,
          newMode,
          activeConversationId: get().activeConversationId
        });
        
        set((draft) => {
          draft.currentMode = newMode;
          draft.activeConversationId = null; // Reset active conversation
          draft.isModeSwitching = false;
          draft.isLoading = false;
          draft.lastUpdated = Date.now();
        });
        
        console.log(`✅ [ConversationStore] Mode switched to ${newMode}. New state:`, {
          currentMode: get().currentMode,
          activeConversationId: get().activeConversationId
        });
      },

      setCurrentMode: (mode: ChatMode) => {
        set((draft) => {
          draft.currentMode = mode;
          draft.lastUpdated = Date.now();
        });
      },

      clearModeSwitchError: () => {
        set((draft) => {
          draft.modeSwitchError = null;
          draft.error = null;
        });
      },

      // Conversation management actions
      createConversation: async (title?: string, mode?: ChatMode) => {
        try {
          const conversationId = generateId();
          
          // Get user from auth store to ensure we have the Okta email
          const authUser = useAuthStore.getState().user;
          
          if (!authUser?.email) {
            throw new Error(UI_TEXT.errors.auth.loginRequired);
          }
          
          const conversationMode = mode ?? get().currentMode;
          
          // Create conversation without session (lazy session creation)
          const conversation: Conversation = {
            id: conversationId,
            title: title ?? 'New Conversation',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageCount: 0,
            mode: conversationMode,
            session: null, // No session created yet
          };
          
          set((draft) => {
            draft.conversations[conversationId] = conversation;
            draft.activeConversationId = conversationId;
            draft.lastUpdated = Date.now();
          });
          
          return Promise.resolve(conversationId);
        } catch (error) {
          const errorMessage = StoreErrorHandler.extractErrorMessage(error);
          
          set((draft) => {
            draft.error = errorMessage;
            draft.lastUpdated = Date.now();
          });
          
          StoreErrorHandler.logError('createConversation', error, { title, mode });
          throw error;
        }
      },

      setActiveConversation: (id: string | null) => {
        set((draft) => {
          // Handle null case for clearing active conversation
          if (id === null) {
            draft.activeConversationId = null;
            draft.lastUpdated = Date.now();
            return;
          }
          
          // Always set the active conversation ID, even if conversation doesn't exist locally yet
          draft.activeConversationId = id;
          
          // If conversation exists locally, update the mode
          if (draft.conversations[id]) {
            draft.currentMode = draft.conversations[id].mode;
          }
          
          draft.lastUpdated = Date.now();
        });
      },

      updateConversation: (id: string, updates: Partial<Conversation>) => {
        set((draft) => {
          if (draft.conversations[id]) {
            Object.assign(draft.conversations[id], {
              ...updates,
              updatedAt: Date.now(),
            });
            draft.lastUpdated = Date.now();
          }
        });
      },

      archiveConversation: (id: string) => {
        set((draft) => {
          if (draft.conversations[id]) {
            draft.conversations[id].archived = true;
            draft.conversations[id].updatedAt = Date.now();
            draft.lastUpdated = Date.now();
          }
        });
      },

      exportConversation: (conversationId: string) => {
        const state = get();
        const conversation = state.conversations[conversationId];
        
        if (!conversation) {
          throw new Error(`Conversation ${conversationId} not found`);
        }

        return JSON.stringify(
          {
            conversation,
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        );
      },
    })),
    {
      name: "conversation-store",
    }
  )
);

// Optimized selectors for better performance and preventing unnecessary re-renders
export const useActiveConversation = () =>
  useConversationStore((state) => {
    if (!state.activeConversationId) return null;
    return state.conversations[state.activeConversationId] || null;
  });

export const useActiveConversationId = () =>
  useConversationStore((state) => state.activeConversationId);

export const useCurrentMode = () =>
  useConversationStore((state) => {
    if (!state.activeConversationId) return state.currentMode;
    const conversation = state.conversations[state.activeConversationId];
    return conversation?.mode || state.currentMode;
  });

export const useModeSwitching = () =>
  useConversationStore((state) => ({
    isModeSwitching: state.isModeSwitching,
    modeSwitchError: state.modeSwitchError,
  }));

// Memoized selector for conversation list to prevent re-renders when individual conversations change
export const useConversationList = () =>
  useConversationStore((state) => {
    const conversations = Object.values(state.conversations);
    // Sort by updatedAt for consistent ordering
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  });

// Granular selector for individual conversation
export const useConversationById = (id: string) =>
  useConversationStore((state) => state.conversations[id] ?? null);

// Selector for conversation title only (prevents re-renders when other conversation properties change)
export const useConversationTitle = (id: string) =>
  useConversationStore((state) => state.conversations[id]?.title || null);

// Selector for conversation mode only
export const useConversationMode = (id: string) =>
  useConversationStore((state) => state.conversations[id]?.mode || null);

// Selector for conversation session status
export const useConversationSession = (id: string) =>
  useConversationStore((state) => state.conversations[id]?.session || null);

// Selector for conversation metadata (for sidebar display)
export const useConversationMetadata = (id: string) =>
  useConversationStore((state) => {
    const conversation = state.conversations[id];
    if (!conversation) return null;
    
    return {
      id: conversation.id,
      title: conversation.title,
      mode: conversation.mode,
      messageCount: conversation.messageCount,
      lastMessage: conversation.lastMessage,
      updatedAt: conversation.updatedAt,
      archived: conversation.archived,
    };
  });

// Selector for checking if a conversation exists
export const useConversationExists = (id: string) =>
  useConversationStore((state) => id in state.conversations);

// Selector for conversation count
export const useConversationCount = () =>
  useConversationStore((state) => Object.keys(state.conversations).length);

// Selector for active conversations (non-archived)
export const useActiveConversations = () =>
  useConversationStore((state) => 
    Object.values(state.conversations)
      .filter(conv => !conv.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  );

// Selector for archived conversations
export const useArchivedConversations = () =>
  useConversationStore((state) => 
    Object.values(state.conversations)
      .filter(conv => conv.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  );

// Selector for conversations by mode
export const useConversationsByMode = (mode: ChatMode) =>
  useConversationStore((state) => 
    Object.values(state.conversations)
      .filter(conv => conv.mode === mode && !conv.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  );
