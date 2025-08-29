import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
    Message,
    AIMessage,
    Conversation,
    StreamingState,
    ThinkingStep,
    ToolCall,
    SSEEventData,
    ChatSettings,
    ChatInputState,
    ChatSession,
    ChatMode,
} from "../types";
import { chatAPI } from '../services/chat-api';
import { DEFAULT_MODE } from '../constants/chat-modes';
import { localStorageService } from '../services/local-storage';
import { useAuthStore } from './auth-store';
import { createSessionManagerForMode } from '../services/session-manager-factory';
import { chatHistoryService } from '../services/chat-history-service';

interface ChatState {
    // Core data
    conversations: Record<string, Conversation>;
    messages: Record<string, Message[]>; // keyed by conversationId
    activeConversationId: string | null;

    // Mode management
    currentMode: ChatMode;

    // Streaming state
    streaming: StreamingState;

    // Input state
    input: ChatInputState;

    // Settings
    settings: ChatSettings;

    // UI state
    isLoading: boolean;
    isModeSwitching: boolean;
    modeSwitchError: string | null;
    connection: {
        isConnected: boolean;
        isReconnecting: boolean;
        lastError: string | null;
    };

    // Session management
    currentUserId: string | null;
    sessions: Record<string, ChatSession>; // keyed by conversation ID

    // Data sources for Ask mode
    selectedDataSources: string[];

    // Loading states
    loadingMessages: Record<string, boolean>; // keyed by conversation ID
    lastMessageLoadTime?: number; // timestamp to force re-renders
}

interface ChatActions {
    // Mode management
    switchMode: (newMode: ChatMode) => Promise<string>; // returns new conversation id
    setCurrentMode: (mode: ChatMode) => void;
    clearModeSwitchError: () => void;

    // Conversation management
    createConversation: (title?: string, mode?: ChatMode) => Promise<string>;
    setActiveConversation: (id: string) => void;
    updateConversation: (id: string, updates: Partial<Conversation>) => void;
    archiveConversation: (id: string) => void;

    // Message management
    addMessage: (
        conversationId: string,
        message: Omit<Message, "id" | "timestamp">
    ) => string;
    updateMessage: (messageId: string, updates: Partial<Message>) => void;
    deleteMessage: (messageId: string) => void;

    // Streaming actions
    startStreaming: (conversationId: string, userMessage: string) => Promise<string>; // returns AI message id
    handleAskMode: (conversationId: string, userMessageContent: string, userId: string) => Promise<string>;
    handleInvestigateMode: (conversationId: string, userMessageContent: string) => Promise<string>;
    stopStreaming: () => void;
    handleSSEEvent: (event: SSEEventData) => void;
    finalizeStream: () => void;

    // Thinking & Tool actions
    addThinkingStep: (
        messageId: string,
        step: Omit<ThinkingStep, "id">
    ) => void;
    toggleThinkingVisibility: (messageId: string, stepId?: string) => void;
    addToolCall: (
        messageId: string,
        toolCall: Omit<ToolCall, "timestamp">
    ) => void;
    updateToolCall: (
        messageId: string,
        toolCallId: string,
        updates: Partial<ToolCall>
    ) => void;

    // Input actions
    setInputContent: (content: string) => void;
    clearInput: () => void;
    addAttachment: (file: File) => void;
    removeAttachment: (attachmentId: string) => void;

    // Settings actions
    updateSettings: (settings: Partial<ChatSettings>) => void;

    // Connection actions
    setConnectionStatus: (isConnected: boolean) => void;
    setConnectionError: (error: string | null) => void;

    // User actions
    setUserId: (userId: string) => void;
    initializeUserFromAuth: () => void;
    createSessionForConversation: (conversationId: string, userId?: string) => Promise<boolean>;
    endSession: (conversationId: string) => Promise<void>;
    recreateSession: (conversationId: string) => Promise<boolean>;

    // Utility actions
    clearAllData: () => void;
    exportConversation: (conversationId: string) => string; // returns JSON

    // Data source actions
    setSelectedDataSources: (dataSources: string[]) => void;
    clearSelectedDataSources: () => void;

    // Message loading actions
    loadSessionMessages: (conversationId: string, userId: string) => Promise<boolean>;
}

type ChatStore = ChatState & ChatActions;

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

const initialInputState: ChatInputState = {
    content: "",
    isTyping: false,
    attachments: [],
    replyingTo: null,
};

const defaultSettings: ChatSettings = {
    model: "gemini-pro",
    temperature: 0.7,
    maxTokens: 4096,
    streamResponse: true,
    showThinking: true,
    autoScroll: true,
    soundEnabled: true,
    compactMode: false,
};

const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Load initial state from localStorage
const storedData = localStorageService.loadStoredData();
console.log('Loading stored data on store creation:', storedData);

// Validate and repair storage if needed
try {
    const validation = localStorageService.validateStorage();
    if (!validation.isValid) {
        console.log('Storage validation failed on startup, repairing...', validation.errors);
        localStorageService.repairStorage();
    }
} catch (error) {
    console.error('Error during storage validation on startup:', error);
}

export const useChatStore = create<ChatStore>()(
    devtools(
        immer((set, get) => ({
            // Initial state merged with stored data
            conversations: storedData.conversations || {},
            messages: storedData.messages || {},
            activeConversationId: storedData.activeConversationId || null,
            currentMode: DEFAULT_MODE,
            streaming: { ...initialStreamingState },
            input: { ...initialInputState },
            settings: { ...defaultSettings },
            isLoading: false,
            isModeSwitching: false,
            modeSwitchError: null,
            connection: {
                isConnected: false,
                isReconnecting: false,
                lastError: null,
            },
            // Only use stored userId if it looks like an email (contains @)
            currentUserId: storedData.userId && storedData.userId.includes('@') ? storedData.userId : null,
            sessions: storedData.sessions || {},
            selectedDataSources: storedData.selectedDataSources || ['all'],
            loadingMessages: {},

            // Actions
            setUserId: (userId) => {
                set((draft) => {
                    // userId should be the user's email for better session tracking
                    draft.currentUserId = userId;
                });
                
                // Save user email to localStorage for persistence
                try {
                    localStorageService.saveUserId(userId);
                } catch (error) {
                    console.warn('Failed to save user email to localStorage:', error);
                }
            },

            // Auto-set user ID from auth store
            initializeUserFromAuth: () => {
                const authUser = useAuthStore.getState().user;
                if (authUser) {
                    set((draft) => {
                        // Use email for better session tracking and organization
                        draft.currentUserId = authUser.email;
                    });
                    
                    // Save user email to localStorage for persistence
                    try {
                        localStorageService.saveUserId(authUser.email);
                    } catch (error) {
                        console.warn('Failed to save user email to localStorage:', error);
                    }
                }
            },

            // Mode management actions
            switchMode: async (newMode) => {
                try {
                    // Set loading state
                    set((draft) => {
                        draft.isModeSwitching = true;
                        draft.modeSwitchError = null;
                    });

                    // Create a new conversation with the new mode
                    const conversationId = await get().createConversation(undefined, newMode);
                    
                    // Update current mode
                    set((draft) => {
                        draft.currentMode = newMode;
                        draft.isModeSwitching = false;
                    });
                    
                    return conversationId;
                } catch (error) {
                    // Handle error
                    const errorMessage = error instanceof Error ? error.message : 'Failed to switch mode';
                    set((draft) => {
                        draft.isModeSwitching = false;
                        draft.modeSwitchError = errorMessage;
                    });
                    
                    // Auto-clear error after 5 seconds
                    setTimeout(() => {
                        set((draft) => {
                            draft.modeSwitchError = null;
                        });
                    }, 5000);
                    
                    throw error;
                }
            },

            setCurrentMode: (mode) => {
                set((draft) => {
                    draft.currentMode = mode;
                });
            },

            clearModeSwitchError: () => {
                set((draft) => {
                    draft.modeSwitchError = null;
                });
            },

            createConversation: async (title, mode) => {
                const conversationId = generateId();
                
                // Get user from auth store to ensure we have the Okta email
                const authUser = useAuthStore.getState().user;
                console.log('createConversation - authUser:', authUser);
                
                if (!authUser || !authUser.email) {
                    console.error('No authenticated user found. Cannot create conversation.');
                    throw new Error('User must be authenticated to create a conversation');
                }
                
                const userId = authUser.email; // Always use the Okta email
                console.log('createConversation - using Okta email:', userId);
                
                const conversationMode = mode || get().currentMode;
                
                // Create conversation without session (lazy session creation)
                const conversation: Conversation = {
                    id: conversationId,
                    title: title || 'New Conversation',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    messageCount: 0,
                    mode: conversationMode,
                    session: null, // No session created yet
                };
                
                set((draft) => {
                    draft.conversations[conversationId] = conversation;
                    draft.messages[conversationId] = [];
                    // Don't create session yet - will be created on first message
                    draft.activeConversationId = conversationId;
                });
                
                return conversationId;
            },

            setActiveConversation: (id) => {
                set((draft) => {
                    // Always set the active conversation ID, even if conversation doesn't exist locally yet
                    draft.activeConversationId = id;
                    
                    // If conversation exists locally, update the mode
                    if (draft.conversations[id]) {
                        draft.currentMode = draft.conversations[id].mode;
                    }
                });
            },

            updateConversation: (id, updates) => {
                set((draft) => {
                    if (draft.conversations[id]) {
                        Object.assign(draft.conversations[id], {
                            ...updates,
                            updatedAt: Date.now(),
                        });
                    }
                });
            },


            addMessage: (conversationId, messageData) => {
                const messageId = generateId();
                const message: Message = {
                    ...messageData,
                    id: messageId,
                    timestamp: Date.now(),
                    conversationId,
                } as Message;

                set((draft) => {
                    if (!draft.messages[conversationId]) {
                        draft.messages[conversationId] = [];
                    }

                    draft.messages[conversationId].push(message);

                    // Update conversation
                    if (draft.conversations[conversationId]) {
                        draft.conversations[conversationId].messageCount += 1;
                        draft.conversations[conversationId].updatedAt = Date.now();
                        draft.conversations[conversationId].lastMessage =
                            message.type === "user"
                                ? message.content
                                : (message as AIMessage).content ||
                                  "AI is thinking...";
                        
                        // If this is the first user message, update the conversation title
                        if (message.type === "user" && draft.conversations[conversationId].messageCount === 1) {
                            const content = message.content.trim();
                            const title = content.length > 27 ? content.substring(0, 22) + '...' : content;
                            draft.conversations[conversationId].title = title;
                        }
                    }
                });

                return messageId;
            },

            createSessionForConversation: async (conversationId, userId) => {
                const state = get();
                const actualUserId = userId || state.currentUserId || "anonymous";
                try {
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
                            mode: DEFAULT_MODE,
                        };
                        set((draft) => {
                            draft.sessions[conversationId] = session;
                            if (draft.conversations[conversationId]) {
                                draft.conversations[conversationId].session = session;
                            }
                        });
                        return true;
                    } else {
                        const errorMessage = result.error || 'Session creation failed';
                        console.error("Session creation failed:", errorMessage);
                        set((draft) => {
                            if (draft.sessions[conversationId]) {
                                draft.sessions[conversationId].status = "error";
                            }
                            // Set connection error to inform user
                            draft.connection.lastError = errorMessage;
                        });
                        return false;
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown session creation error';
                    console.error("Session creation error:", error);
                    set((draft) => {
                        if (draft.sessions[conversationId]) {
                            draft.sessions[conversationId].status = "error";
                        }
                        // Set connection error to inform user
                        draft.connection.lastError = errorMessage;
                    });
                    return false;
                }
            },

            endSession: async (conversationId) => {
                const state = get();
                const session = state.sessions[conversationId];
                if (session && session.userId) {
                    try {
                        await chatAPI.deleteSession(session.userId, conversationId);
                        console.log(`Session ${conversationId} ended successfully`);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error ending session';
                        console.error("Failed to end session:", error);
                        set((draft) => {
                            draft.connection.lastError = `Failed to end session: ${errorMessage}`;
                        });
                        // Don't throw error - we still want to mark session as inactive locally
                    }
                }
                set((draft) => {
                    if (draft.sessions[conversationId]) {
                        draft.sessions[conversationId].status = "inactive";
                        draft.sessions[conversationId].updatedAt = Date.now();
                    }
                });
            },

            recreateSession: async (conversationId) => {
                const state = get();
                const userId = state.currentUserId || "anonymous";
                await get().endSession(conversationId);
                return await get().createSessionForConversation(conversationId, userId);
            },

            startStreaming: async (conversationId, userMessageContent) => {
                const state = get();
                const conversation = state.conversations[conversationId];
                const currentMode = conversation?.mode || state.currentMode;
                
                // Get user from auth store to ensure we have the Okta email
                const authUser = useAuthStore.getState().user;
                if (!authUser || !authUser.email) {
                    console.error('No authenticated user found. Cannot start streaming.');
                    throw new Error('User must be authenticated to start streaming');
                }
                
                const userId = authUser.email; // Always use the Okta email
                console.log('startStreaming - using Okta email:', userId);

                // Handle Ask mode differently
                if (currentMode === 'ask') {
                    return await get().handleAskMode(conversationId, userMessageContent, userId);
                }

                // Handle Investigate mode (SSE streaming)
                return await get().handleInvestigateMode(conversationId, userMessageContent);
            },

            // New method for Ask mode with lazy session creation
            handleAskMode: async (conversationId, userMessageContent, userId) => {
                const state = get();
                let session = state.sessions[conversationId];

                console.log('handleAskMode - existing session:', session);
                console.log('handleAskMode - session status:', session?.status);

                // Create session manager for Ask mode
                const sessionManager = createSessionManagerForMode('ask', userId);

                // Create Ask session if needed (lazy creation on first message)
                if (!session || session.status !== 'active') {
                    console.log('handleAskMode - creating new session for conversationId:', conversationId);
                    
                    // Use the user's first query as the session title
                    const sessionTitle = userMessageContent.length > 50 
                        ? userMessageContent.substring(0, 47) + '...' 
                        : userMessageContent;

                    let sessionResult;
                    try {
                        sessionResult = await sessionManager.createSession(conversationId, {
                            title: sessionTitle,
                            createdAt: new Date().toISOString(),
                        });

                        console.log('handleAskMode - session creation result:', sessionResult);

                        if (!sessionResult.success) {
                            const errorMessage = sessionResult.error || 'Session creation failed';
                            console.error('Failed to create Ask session:', errorMessage);
                            set((draft) => {
                                draft.streaming.error = `Failed to create session: ${errorMessage}`;
                                draft.connection.lastError = errorMessage;
                            });
                            throw new Error(errorMessage);
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown session creation error';
                        console.error('Ask session creation error:', error);
                        set((draft) => {
                            draft.streaming.error = `Session creation failed: ${errorMessage}`;
                            draft.connection.lastError = errorMessage;
                        });
                        throw error;
                    }

                    session = {
                        id: conversationId,
                        userId,
                        appName: 'ask_mode',
                        status: 'active',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        apiSessionId: sessionResult?.apiSessionId || conversationId,
                        mode: 'ask',
                    };

                    console.log('handleAskMode - created session object:', session);

                    set((draft) => {
                        draft.sessions[conversationId] = session;
                        if (draft.conversations[conversationId]) {
                            draft.conversations[conversationId].session = session;
                            // Update conversation title with user's query
                            draft.conversations[conversationId].title = sessionTitle;
                        }
                    });

                    // Add new session to cache instead of invalidating everything
                    try {
                        const newSession = {
                            sessionId: conversationId,
                            userId: userId,
                            title: sessionTitle,
                            mode: 'ask' as const,
                            lastUpdated: Date.now(),
                            createdAt: Date.now(),
                            messageCount: 1, // Start with 1 since we're adding the first message
                            status: 'active' as const,
                            conversationId: conversationId,
                            metadata: { title: sessionTitle, createdAt: new Date().toISOString() },
                            totalTurns: 1,
                        };
                        console.log('Adding Ask session to cache:', newSession);
                        chatHistoryService.addSessionToCache(userId, newSession);
                    } catch (error) {
                        console.warn('Failed to add session to chat history cache:', error);
                    }
                } else {
                    console.log('handleAskMode - using existing session:', session);
                }

                // Add user message
                get().addMessage(conversationId, {
                    type: 'user',
                    role: 'user',
                    content: userMessageContent,
                    status: 'sent',
                    conversationId,
                });

                // Create AI message placeholder
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
                    showThinking: false, // Ask mode doesn't show thinking
                    showRawEvents: false,
                    rawEvents: [],
                };

                set((draft) => {
                    if (!draft.messages[conversationId]) {
                        draft.messages[conversationId] = [];
                    }
                    draft.messages[conversationId].push(aiMessage);
                    
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
                });

                try {
                    // Get selected data sources from the input component state
                    // We'll need to pass this through the streaming service
                    const { streamingService } = await import('../services/streaming-service');
                    
                    // Start streaming with data sources and existing session ID
                    await streamingService.startStreaming({
                        conversationId,
                        messageId: aiMessageId,
                        content: userMessageContent,
                        mode: 'ask',
                        userId,
                        sessionId: session.apiSessionId, // Pass existing session ID
                        dataSources: state.selectedDataSources || ['all']
                    });

                    console.log('Ask mode - streaming service completed, resetting chat store streaming state');

                    // Reset chat store streaming state after completion
                    set((draft) => {
                        draft.streaming = { ...initialStreamingState };
                    });

                    console.log('Ask mode - chat store streaming state reset complete');

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
                    console.error('Ask mode streaming error:', error);
                    set((draft) => {
                        const message = draft.messages[conversationId]?.find(
                            (m) => m.id === aiMessageId
                        ) as AIMessage;

                        if (message) {
                            message.content = 'Sorry, I encountered an error processing your request.';
                            message.isStreaming = false;
                            message.isComplete = true;
                            message.status = 'error';
                        }

                        draft.streaming = {
                            ...initialStreamingState,
                            error: `Streaming failed: ${errorMessage}`,
                        };
                        draft.connection.lastError = errorMessage;
                    });
                    throw error;
                }

                return aiMessageId;
            },

            // New method for Investigate mode (SSE streaming) with lazy session creation
            handleInvestigateMode: async (conversationId: string, userMessageContent: string) => {
                const state = get();
                let session = state.sessions[conversationId];
                
                // Create session if needed (lazy creation on first message)
                if (!session || session.status !== 'active') {
                    // Get user from auth store
                    const authUser = useAuthStore.getState().user;
                    if (!authUser || !authUser.email) {
                        console.error('No authenticated user found. Cannot create session.');
                        throw new Error('User must be authenticated to create session');
                    }
                    
                    const userId = authUser.email;
                    
                    // Use the user's first query as the session title
                    const sessionTitle = userMessageContent.length > 50 
                        ? userMessageContent.substring(0, 47) + '...' 
                        : userMessageContent;

                    try {
                        const result = await chatAPI.createSession(
                            userId,
                            conversationId,
                            {
                                title: sessionTitle,
                                createdAt: new Date().toISOString(),
                            }
                        );
                        
                        if (result.success) {
                            session = {
                                id: conversationId,
                                userId: userId,
                                appName: result.data?.appName || "moe_support_agent",
                                status: "active",
                                createdAt: Date.now(),
                                updatedAt: Date.now(),
                                apiSessionId: result.data?.sessionId,
                                mode: 'investigate',
                            };
                            
                            set((draft) => {
                                draft.sessions[conversationId] = session;
                                if (draft.conversations[conversationId]) {
                                    draft.conversations[conversationId].session = session;
                                    // Update conversation title with user's query
                                    draft.conversations[conversationId].title = sessionTitle;
                                }
                            });

                            // Invalidate chat history cache so sidebar updates
                            try {
                                chatHistoryService.invalidateCache(userId);
                            } catch (error) {
                                console.warn('Failed to invalidate chat history cache:', error);
                            }
                        } else {
                            const errorMessage = result.error || 'Failed to create session';
                            console.error("Investigate session creation failed:", errorMessage);
                            set((draft) => {
                                draft.streaming.error = `Failed to create session: ${errorMessage}`;
                                draft.connection.lastError = errorMessage;
                            });
                            throw new Error(errorMessage);
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown session creation error';
                        console.error("Investigate session creation error:", error);
                        set((draft) => {
                            draft.streaming.error = `Session creation failed: ${errorMessage}`;
                            draft.connection.lastError = errorMessage;
                        });
                        throw error;
                    }
                }
                
                // Add user message
                get().addMessage(conversationId, {
                    type: 'user',
                    role: 'user',
                    content: userMessageContent,
                    status: 'sent',
                    conversationId,
                });
                
                // Create AI message placeholder
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
                    showThinking: get().settings.showThinking,
                    showRawEvents: false,
                    rawEvents: [],
                };
                
                set((draft) => {
                    // Add AI message
                    if (!draft.messages[conversationId]) {
                        draft.messages[conversationId] = [];
                    }
                    draft.messages[conversationId].push(aiMessage);
                    
                    // Set streaming state
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
                });
                
                // Start SSE stream directly here
                try {
                    // Get user from auth store to ensure we have the Okta email
                    const authUser = useAuthStore.getState().user;
                    if (!authUser || !authUser.email) {
                        console.error('No authenticated user found. Cannot start SSE stream.');
                        throw new Error('User must be authenticated to start streaming');
                    }
                    
                    const userId = authUser.email; // Always use the Okta email
                    
                    if (session?.apiSessionId && userId) {
                        console.log('Starting SSE stream for investigate mode:', {
                            userId: userId,
                            sessionId: session.apiSessionId,
                            message: userMessageContent
                        });
                        
                        // Check if we already have an active stream for this message
                        if (state.streaming.isStreaming && state.streaming.messageId === aiMessageId) {
                            console.log('SSE stream already active for this message, skipping');
                            return aiMessageId;
                        }
                        
                        // Start the SSE stream using the chatAPI
                        const { disconnect } = await chatAPI.createSSEStream(
                            userId,
                            session.apiSessionId,
                            userMessageContent,
                            (event: MessageEvent) => {
                                // Parse the SSE event data
                                try {
                                    const data = JSON.parse(event.data);
                                    if (data && data.content && data.content.parts) {
                                        // Call the handleSSEEvent method to process the event
                                        get().handleSSEEvent(data);
                                    }
                                } catch (error) {
                                    console.error('Failed to parse SSE event:', error);
                                }
                            },
                            (error: Event) => {
                                console.error('SSE stream error:', error);
                                set((draft) => {
                                    // Get current streaming state
                                    const currentStreaming = draft.streaming;
                                    
                                    // Finalize the current message
                                    const message = draft.messages[
                                        currentStreaming.conversationId!
                                    ]?.find((m) => m.id === currentStreaming.messageId) as AIMessage;

                                    if (message) {
                                        message.isStreaming = false;
                                        message.isComplete = true;
                                        message.status = "error";
                                        message.content = "Sorry, something went wrong. Please try again.";
                                    }

                                    draft.streaming = { 
                                        ...initialStreamingState,
                                        error: 'SSE stream error'
                                    };
                                });
                            },
                            () => {
                                console.log('SSE stream opened');
                            },
                            () => {
                                console.log('SSE stream closed');
                                set((draft) => {
                                    // Get current streaming state
                                    const currentStreaming = draft.streaming;
                                    
                                    // Finalize the current message
                                    const message = draft.messages[
                                        currentStreaming.conversationId!
                                    ]?.find((m) => m.id === currentStreaming.messageId) as AIMessage;

                                    if (message) {
                                        message.isStreaming = false;
                                        message.isComplete = true;
                                        message.status = "delivered";
                                    }

                                    // Reset streaming state
                                    draft.streaming = { ...initialStreamingState };
                                });
                            }
                        );
                        
                        // Store the disconnect function for cleanup
                        set((draft) => {
                            draft.streaming.disconnect = disconnect;
                        });
                    } else {
                        throw new Error('Missing session or user ID for SSE stream');
                    }
                } catch (error) {
                    console.error('Failed to start SSE stream:', error);
                    set((draft) => {
                        // Finalize the current message if it exists
                        const message = draft.messages[
                            draft.activeConversationId!
                        ]?.find((m) => m.id === aiMessageId) as AIMessage;

                        if (message) {
                            message.isStreaming = false;
                            message.isComplete = true;
                            message.status = "error";
                            message.content = "Sorry, something went wrong. Please try again.";
                        }

                        draft.streaming = {
                            ...initialStreamingState,
                            error: error instanceof Error ? error.message : 'Failed to start stream'
                        };
                    });
                }
                
                return aiMessageId;
            },

            handleSSEEvent: (event: SSEEventData) => {
                console.log('Chat Store handleSSEEvent called with:', event);
                const { streaming } = get();
                console.log('Current streaming state:', streaming);
                if (!streaming.isStreaming || !streaming.messageId) {
                    console.log('Skipping SSE event - not streaming or no messageId');
                    return;
                }

                // Check for error events (like the one you showed)
                if (event.errorCode === 'STOP' || event.errorCode) {
                    console.error('SSE Error event detected:', event);
                    
                    // Stop streaming and show error
                    set((draft) => {
                        const message = draft.messages[
                            streaming.conversationId!
                        ]?.find((m) => m.id === streaming.messageId) as AIMessage;

                        if (message) {
                            message.isStreaming = false;
                            message.isComplete = true;
                            message.status = "error";
                            message.content = "Sorry, something went wrong. Please try again.";
                        }

                        draft.streaming = { 
                            ...initialStreamingState,
                            error: 'An error occurred while processing your request'
                        };
                    });

                    // Disconnect the stream
                    if (streaming.disconnect) {
                        streaming.disconnect();
                    }

                    // Trigger toast notification (this will be handled by the UI component)
                    return;
                }

                set((draft) => {
                    const message = draft.messages[
                        streaming.conversationId!
                    ]?.find((m) => m.id === streaming.messageId) as AIMessage;

                    if (!message) {
                        console.log('Message not found for SSE event');
                        return;
                    }

                    // Store raw event (but limit to prevent memory issues)
                    if (message.rawEvents.length < 100) {
                        message.rawEvents.push(event);
                    }

                    // Process event parts with proper type guards
                    event.content.parts.forEach((part) => {
                        // Type guard for thinking parts
                        if ('thought' in part && part.thought && 'text' in part) {
                            // Handle thinking step
                            const thinkingStep: ThinkingStep = {
                                id: generateId(),
                                type: part.text.includes("/_PLANNING_/")
                                    ? "planning"
                                    : part.text.includes("/_REASONING_/")
                                      ? "reasoning"
                                      : part.text.includes("/_ACTION_/")
                                        ? "action"
                                        : "final_answer",
                                content: part.text,
                                timestamp: event.timestamp,
                                isVisible: true,
                                rawEvent: event,
                            };

                            // Improved deduplication: check for similar content and recent timestamps
                            const isDuplicate = message.thinkingSteps.some(step => {
                                // Check if content is very similar (allowing for minor differences)
                                const contentSimilarity = step.content.includes(thinkingStep.content) || 
                                                        thinkingStep.content.includes(step.content) ||
                                                        step.content === thinkingStep.content;
                                
                                // Check if timestamp is within 5 seconds (likely same step)
                                const timeSimilarity = Math.abs(step.timestamp - thinkingStep.timestamp) < 5000;
                                
                                return contentSimilarity && timeSimilarity;
                            });

                            if (!isDuplicate) {
                                console.log('Adding new thinking step:', thinkingStep.content.substring(0, 50) + '...');
                                message.thinkingSteps.push(thinkingStep);
                            } else {
                                console.log('Skipping duplicate thinking step:', thinkingStep.content.substring(0, 50) + '...');
                            }
                            draft.streaming.phase = "thinking";
                            draft.streaming.currentThinking = part.text;
                        } 
                        // Type guard for function calls
                        else if ('functionCall' in part) {
                            // Handle tool call
                            const toolCall: ToolCall = {
                                ...part.functionCall,
                                status: "calling",
                                timestamp: event.timestamp,
                            };

                            message.toolCalls.push(toolCall);
                            draft.streaming.phase = "tool_calling";
                            draft.streaming.activeTool = toolCall;
                        } 
                        // Type guard for function responses
                        else if ('functionResponse' in part) {
                            // Handle tool response
                            const toolCall = message.toolCalls.find(
                                (t) => t.id === part.functionResponse.id
                            );

                            if (toolCall) {
                                toolCall.status = "completed";
                                toolCall.result = part.functionResponse.response.result;
                            }

                            draft.streaming.activeTool = null;
                        } 
                        // Type guard for text parts (non-thinking)
                        else if ('text' in part && (!('thought' in part) || !part.thought)) {
                            // Handle actual response content
                            const finalAnswerMarker = "/*FINAL_ANSWER*/";
                            const reasoningMarker = "/*REASONING*/";
                            
                            let content = part.text;
                            
                            // Remove reasoning and other internal markers
                            if (content.includes(reasoningMarker)) {
                                content = content.split(reasoningMarker)[0];
                            }
                            
                            // If the final answer marker is present, only take the content after it
                            if (content.includes(finalAnswerMarker)) {
                                content = content.split(finalAnswerMarker)[1];
                            }
                            
                            if (event.partial) {
                                message.content += content;
                                draft.streaming.currentResponse += content;
                            } else {
                                message.content = content;
                                draft.streaming.currentResponse = content;
                            }
                            
                            draft.streaming.phase = "responding";
                        }
                    });

                    // Update usage metadata (only for final events)
                    if (event.usageMetadata && !event.partial) {
                        message.usageMetadata = {
                            promptTokens: event.usageMetadata.promptTokenCount,
                            completionTokens:
                                event.usageMetadata.candidatesTokenCount,
                            thoughtTokens:
                                event.usageMetadata.thoughtsTokenCount,
                            totalTokens: event.usageMetadata.totalTokenCount,
                        };
                    }

                    // Don't finalize the stream automatically - let it continue until explicitly closed
                    // The stream should only end when we receive a proper completion signal or connection closes
                    // This prevents premature termination during agent transfers or multi-step processes
                });
            },

            finalizeStream: () => {
                const { streaming } = get();
                if (!streaming.messageId) return;

                // Disconnect SSE stream if active
                if (streaming.disconnect) {
                    streaming.disconnect();
                }

                set((draft) => {
                    const message = draft.messages[
                        streaming.conversationId!
                    ]?.find((m) => m.id === streaming.messageId) as AIMessage;

                    if (message) {
                        message.isStreaming = false;
                        message.isComplete = true;
                        message.status = "delivered";
                    }

                    draft.streaming = { ...initialStreamingState };
                });
            },

            stopStreaming: () => {
                const state = get();
                // Disconnect SSE stream if active
                if (state.streaming.disconnect) {
                    state.streaming.disconnect();
                }
                set((draft) => {
                    // Finalize the current message if it exists
                    const message = draft.messages[
                        state.streaming.conversationId!
                    ]?.find((m) => m.id === state.streaming.messageId) as AIMessage;

                    if (message) {
                        message.isStreaming = false;
                        message.isComplete = true;
                        message.status = "delivered";
                    }

                    draft.streaming = { ...initialStreamingState };
                });
            },

            addThinkingStep: (messageId, stepData) => {
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
                            }
                            break;
                        }
                    }
                });
            },

            toggleThinkingVisibility: (messageId, stepId) => {
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
                            break;
                        }
                    }
                });
            },

            addToolCall: (messageId, toolCallData) => {
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
                            break;
                        }
                    }
                });
            },

            updateToolCall: (messageId, toolCallId, updates) => {
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
                            }
                            break;
                        }
                    }
                });
            },

            setInputContent: (content) => {
                set((draft) => {
                    draft.input.content = content;
                });
            },

            clearInput: () => {
                set((draft) => {
                    draft.input = { ...initialInputState };
                });
            },

            updateSettings: (newSettings) => {
                set((draft) => {
                    Object.assign(draft.settings, newSettings);
                });
            },

            setConnectionStatus: (isConnected) => {
                set((draft) => {
                    draft.connection.isConnected = isConnected;
                    if (isConnected) {
                        draft.connection.lastError = null;
                    }
                });
            },

            setConnectionError: (error) => {
                set((draft) => {
                    draft.connection.lastError = error;
                    if (error) {
                        draft.connection.isConnected = false;
                    }
                });
            },

            clearAllData: () => {
                set((draft) => {
                    draft.conversations = {};
                    draft.messages = {};
                    draft.activeConversationId = null;
                    draft.streaming = { ...initialStreamingState };
                    draft.input = { ...initialInputState };
                });
            },

            exportConversation: (conversationId) => {
                const state = get();
                const conversation = state.conversations[conversationId];
                const messages = state.messages[conversationId] || [];

                return JSON.stringify(
                    {
                        conversation,
                        messages,
                        exportedAt: new Date().toISOString(),
                    },
                    null,
                    2
                );
            },

            // Additional utility actions
            updateMessage: (messageId, updates) => {
                set((draft) => {
                    for (const conversationId in draft.messages) {
                        const message = draft.messages[conversationId].find(
                            (m) => m.id === messageId
                        );

                        if (message) {
                            Object.assign(message, updates);
                            break;
                        }
                    }
                });
            },

            deleteMessage: (messageId) => {
                set((draft) => {
                    for (const conversationId in draft.messages) {
                        const index = draft.messages[conversationId].findIndex(
                            (m) => m.id === messageId
                        );
                        if (index !== -1) {
                            draft.messages[conversationId].splice(index, 1);

                            // Update conversation count
                            if (draft.conversations[conversationId]) {
                                draft.conversations[
                                    conversationId
                                ].messageCount -= 1;
                            }
                            break;
                        }
                    }
                });
            },

            archiveConversation: (id) => {
                set((draft) => {
                    if (draft.conversations[id]) {
                        draft.conversations[id].archived = true;
                        draft.conversations[id].updatedAt = Date.now();
                    }
                });
            },

            addAttachment: (file) => {
                const attachmentId = generateId();
                const attachment = {
                    id: attachmentId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    uploadProgress: 0,
                };

                set((draft) => {
                    draft.input.attachments.push(attachment);
                });
            },

            removeAttachment: (attachmentId) => {
                set((draft) => {
                    const index = draft.input.attachments.findIndex(
                        (a) => a.id === attachmentId
                    );
                    if (index !== -1) {
                        draft.input.attachments.splice(index, 1);
                    }
                });
            },

            // Data source actions
            setSelectedDataSources: (dataSources) => {
                set((draft) => {
                    draft.selectedDataSources = dataSources;
                });
            },
            clearSelectedDataSources: () => {
                set((draft) => {
                    draft.selectedDataSources = ['all'];
                });
            },

            // Load existing messages for a session
            loadSessionMessages: async (conversationId, userId) => {
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
                });

                console.log(`🔄 [ChatStore] Starting to load messages for session ${conversationId}`);

                try {
                    // Determine the mode of the conversation to call the correct API
                    const conversation = state.conversations[conversationId];
                    const mode = conversation?.mode || 'investigate'; // default to investigate
                    
                    console.log(`Loading messages for session ${conversationId} with mode: ${mode}`);
                    console.log('Conversation object:', conversation);
                    console.log('User ID:', userId);

                    const messages: Message[] = [];
                    let sessionMetadata: {
                        title?: string;
                        createdAt?: number;
                        updatedAt?: number;
                        apiSessionId?: string;
                    } = {};

                    if (mode === 'ask') {
                        // For Ask mode, use the same approach as admin service
                        console.log(`📡 [ChatStore] Calling Ask API for session ${conversationId}`);
                        
                        try {
                            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                            const response = await fetch(`${baseUrl}/ask/ask-sessions/${conversationId}?user_id=${userId}`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                            });

                            if (!response.ok) {
                                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                            }
                            
                            const data = await response.json();
                            console.log(`📡 [ChatStore] Ask API raw response:`, data);
                            
                            if (!data.success || !data.data) {
                                throw new Error('Invalid response structure from ask-sessions API');
                            }
                            
                            const session = data.data.session;
                            const turns = data.data.turns;
                            
                            console.log(`📡 [ChatStore] Extracted session:`, session);
                            console.log(`📡 [ChatStore] Extracted turns:`, turns);
                            
                            // Extract metadata from backend response
                            if (session) {
                                sessionMetadata = {
                                    title: session.title || `Ask Session`,
                                    createdAt: new Date(session.created_at).getTime(),
                                    updatedAt: new Date(session.updated_at).getTime(),
                                    apiSessionId: session.api_session_id || session.session_id || conversationId,
                                };
                                
                                console.log(`✅ [ChatStore] Extracted conversation metadata for session ${conversationId}:`, sessionMetadata);
                            }
                            
                            // Convert Ask mode turns to messages
                            if (Array.isArray(turns) && turns.length > 0) {
                                console.log(`📡 [ChatStore] Processing ${turns.length} turns for Ask session ${conversationId}`);
                                
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
                                        console.log(`📡 [ChatStore] Added user message:`, userMessage.content);
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
                                        console.log(`📡 [ChatStore] Added AI message:`, aiMessage.content.substring(0, 100) + '...');
                                    }
                                }
                                console.log(`✅ [ChatStore] Ask API returned ${turns.length} turns, converted to ${messages.length} messages`);
                            } else {
                                console.log(`📡 [ChatStore] Ask API returned 0 turns for session ${conversationId} - this is a valid empty session`);
                            }
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error loading Ask session';
                            console.error(`❌ [ChatStore] Ask API error for session ${conversationId}:`, error);
                            set((draft) => {
                                draft.connection.lastError = `Failed to load Ask session: ${errorMessage}`;
                            });
                        }
                    } else {
                        // For Investigate mode, use the chat API
                        console.log(`📡 [ChatStore] Calling Investigate API for session ${conversationId}`);
                        const result = await chatAPI.getSessionMessages(userId, conversationId);
                        
                        console.log(`📡 [ChatStore] Investigate API result:`, {
                            success: result.success,
                            hasData: !!(result.data && Array.isArray(result.data)),
                            dataLength: result.data?.length || 0,
                            error: result.error
                        });
                        
                        if (result.success && result.data && Array.isArray(result.data)) {
                            // Also get session metadata to update conversation object
                            const sessionResult = await chatAPI.getSession(userId, conversationId);
                            console.log(`📡 [ChatStore] Session metadata result:`, {
                                success: sessionResult.success,
                                hasData: !!sessionResult.data,
                                error: sessionResult.error
                            });
                            
                            if (sessionResult.success && sessionResult.data) {
                                const sessionData = sessionResult.data;
                                
                                sessionMetadata = {
                                    title: `Investigate Session`,
                                    createdAt: (sessionData.lastUpdateTime as number) * 1000 || Date.now(),
                                    updatedAt: (sessionData.lastUpdateTime as number) * 1000 || Date.now(),
                                    apiSessionId: sessionData.id || conversationId,
                                };
                                
                                console.log(`✅ [ChatStore] Extracted conversation metadata for session ${conversationId}:`, sessionMetadata);
                            }
                            
                            // Process events and convert to messages for Investigate mode
                            console.log(`📡 [ChatStore] Processing ${result.data.length} events for Investigate session ${conversationId}`);
                            for (const event of result.data) {
                                if (event && typeof event === 'object') {
                                    const eventData = event as Record<string, unknown>;
                                    
                                    // Handle user messages
                                    if (eventData.role === 'user' && Array.isArray(eventData.parts)) {
                                        const userMessage: Message = {
                                            id: generateId(),
                                            type: 'user',
                                            role: 'user',
                                            content: eventData.parts.map((p: Record<string, unknown>) => p.text || '').join(''),
                                            status: 'sent',
                                            timestamp: (eventData.timestamp as number) || Date.now(),
                                            conversationId,
                                        };
                                        messages.push(userMessage);
                                    }
                                    
                                    // Handle AI messages
                                    if (eventData.role === 'model' && Array.isArray(eventData.parts)) {
                                        const aiMessage: AIMessage = {
                                            id: generateId(),
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
                                        };
                                        messages.push(aiMessage);
                                    }
                                }
                            }
                            console.log(`✅ [ChatStore] Investigate API returned ${result.data.length} events, converted to ${messages.length} messages`);
                        } else {
                            console.log(`❌ [ChatStore] Investigate API failed for session ${conversationId}:`, result.error);
                        }
                    }
                    
                    // Update store with loaded messages and metadata
                    set((draft) => {
                        // Always set messages, even if empty, to prevent future API calls
                        draft.messages[conversationId] = messages;
                        draft.loadingMessages[conversationId] = false;
                        
                        // Update conversation with metadata if available
                        if (draft.conversations[conversationId] && sessionMetadata) {
                            if (sessionMetadata.title) {
                                draft.conversations[conversationId].title = sessionMetadata.title;
                            }
                            if (sessionMetadata.createdAt) {
                                draft.conversations[conversationId].createdAt = sessionMetadata.createdAt;
                            }
                            if (sessionMetadata.updatedAt) {
                                draft.conversations[conversationId].updatedAt = sessionMetadata.updatedAt;
                            }
                            if (sessionMetadata.apiSessionId && draft.conversations[conversationId].session) {
                                draft.conversations[conversationId].session!.apiSessionId = sessionMetadata.apiSessionId;
                            }
                            
                            // Update message count
                            draft.conversations[conversationId].messageCount = messages.length;
                        }
                        
                        // Force a timestamp update to trigger re-renders
                        draft.lastMessageLoadTime = Date.now();
                    });
                    
                    console.log(`✅ [ChatStore] Successfully loaded ${messages.length} messages for session ${conversationId} (mode: ${mode})`);
                    return true;
                } catch (error) {
                    console.error(`❌ [ChatStore] Error loading session messages for ${conversationId}:`, error);
                    set((draft) => {
                        // Initialize with empty array so UI doesn't break and to prevent future API calls
                        draft.messages[conversationId] = [];
                        draft.loadingMessages[conversationId] = false;
                    });
                    return false;
                }
            },
        })),
        {
            name: "chat-store",
        }
    )
);

// Selectors for better performance with proper memoization
export const useActiveConversation = () =>
    useChatStore((state) => {
        if (!state.activeConversationId) return null;
        return state.conversations[state.activeConversationId] || null;
    });

// Create a stable empty array to avoid infinite loops
const EMPTY_MESSAGES: Message[] = [];

export const useActiveMessages = () =>
    useChatStore((state) => {
        if (!state.activeConversationId) {
            console.log('useActiveMessages: No active conversation ID, returning empty array.');
            return EMPTY_MESSAGES;
        }
        const messages = state.messages[state.activeConversationId] || EMPTY_MESSAGES;
        console.log(`useActiveMessages: Returning ${messages.length} messages for conversation ID: ${state.activeConversationId}`);
        console.log(`useActiveMessages: Messages array:`, messages);
        console.log(`useActiveMessages: Last message load time: ${state.lastMessageLoadTime}`);
        console.log(`useActiveMessages: All messages in store:`, Object.keys(state.messages));
        return messages;
    });

// Helper to get the current mode from the active conversation
export const useCurrentMode = () =>
    useChatStore((state) => {
        if (!state.activeConversationId) return state.currentMode;
        const conversation = state.conversations[state.activeConversationId];
        return conversation?.mode || state.currentMode;
    });

// Helper to get mode switching state
export const useModeSwitching = () =>
    useChatStore((state) => ({
        isModeSwitching: state.isModeSwitching,
        modeSwitchError: state.modeSwitchError,
    }));

export const useStreamingMessage = () =>
    useChatStore((state) => {
        if (!state.streaming.messageId || !state.streaming.conversationId) {
            return null;
        }
        const messages = state.messages[state.streaming.conversationId];
        if (!messages) return null;
        
        return messages.find((m) => m.id === state.streaming.messageId) as AIMessage | undefined;
    });

// Add session-related selectors
export const useActiveSession = () =>
    useChatStore((state) => {
        if (!state.activeConversationId) return null;
        return state.sessions[state.activeConversationId] || null;
    });

export const useSessionStatus = (conversationId: string) =>
    useChatStore((state) => {
        const session = state.sessions[conversationId];
        return session?.status || "inactive";
    });

// Export the initializeUserFromAuth function for external use
export const initializeUserFromAuth = () => {
    useChatStore.getState().initializeUserFromAuth();
};
