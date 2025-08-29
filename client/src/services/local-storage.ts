import type { Conversation, Message, ChatSession } from '../types/chat';
import { logger } from '../lib/logger';
import { safeLocalStorage } from './safe-local-storage';
import { STORAGE } from '../constants/storage';

// Storage keys
const STORAGE_KEYS = STORAGE.KEYS;

// Storage quota management - configurable constants
const MAX_CONVERSATIONS = STORAGE.QUOTA.MAX_CONVERSATIONS;
const MAX_MESSAGES_PER_CONVERSATION = STORAGE.QUOTA.MAX_MESSAGES_PER_CONVERSATION;
const STORAGE_VERSION = STORAGE.QUOTA.STORAGE_VERSION;

export interface StoredData {
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>;
  sessions: Record<string, ChatSession>;
  activeConversationId: string | null;
  userId: string | null;
  selectedDataSources?: string[];
}

class LocalStorageService {
  private safeGet<T>(key: string, defaultValue: T): T {
    return safeLocalStorage.getItem(key, defaultValue);
  }

  private safeSet(key: string, value: unknown): boolean {
    const result = safeLocalStorage.setItem(key, value);
    
    if (!result) {
      // Try to free up space by cleaning old data and try again
      this.cleanup();
      return safeLocalStorage.setItem(key, value);
    }
    
    return result;
  }

  // Validate conversation has at least one message
  private hasMessages(conversationId: string, messages: Record<string, Message[]>): boolean {
    const conversationMessages = messages[conversationId] || [];
    return conversationMessages.length > 0;
  }

  // Filter conversations to only include those with messages
  private filterConversationsWithMessages(
    conversations: Record<string, Conversation>,
    messages: Record<string, Message[]>
  ): Record<string, Conversation> {
    const filtered: Record<string, Conversation> = {};
    
    Object.entries(conversations).forEach(([id, conversation]) => {
      if (this.hasMessages(id, messages)) {
        filtered[id] = conversation;
      }
    });
    
    return filtered;
  }

  // Load all stored data with validation
  loadStoredData(): StoredData {
    try {
      // If localStorage is not available, return default empty data
      if (!safeLocalStorage.isAvailable()) {
        logger.warn('localStorage is not available, returning default empty data');
        return this.getDefaultEmptyData();
      }
      
      const version = this.safeGet(STORAGE_KEYS.VERSION, STORAGE_VERSION);
      
      // If version mismatch, clear old data
      if (version !== STORAGE_VERSION) {
        logger.info('Storage version mismatch, clearing old data', { oldVersion: version, newVersion: STORAGE_VERSION });
        this.clearAll();
        this.safeSet(STORAGE_KEYS.VERSION, STORAGE_VERSION);
      }

      // Get all data with safe fallbacks
      const conversations = this.safeGet<Record<string, Conversation>>(STORAGE_KEYS.CONVERSATIONS, {});
      const messages = this.safeGet<Record<string, Message[]>>(STORAGE_KEYS.MESSAGES, {});
      const sessions = this.safeGet<Record<string, ChatSession>>(STORAGE_KEYS.SESSIONS, {});
      const activeConversationId = this.safeGet<string | null>(STORAGE_KEYS.ACTIVE_CONVERSATION, null);
      const userId = this.safeGet<string | null>(STORAGE_KEYS.USER_ID, null);

      // Additional validation
      if (typeof conversations !== 'object' || conversations === null) {
        logger.warn('Invalid conversations data in localStorage, using empty object');
        return this.getDefaultEmptyData();
      }

      // Filter conversations to only include those with messages
      const filteredConversations = this.filterConversationsWithMessages(conversations, messages);
      
      // Update active conversation if it doesn't have messages
      let validActiveConversationId: string | null;
      if (activeConversationId && !this.hasMessages(activeConversationId, messages)) {
        const validConversationIds = Object.keys(filteredConversations);
        validActiveConversationId = validConversationIds.length > 0 ? validConversationIds[0] : null;
      } else {
        validActiveConversationId = activeConversationId;
      }

      logger.info('Successfully loaded data from localStorage', { 
        conversationCount: Object.keys(filteredConversations).length,
        messageCount: Object.keys(messages).length,
        sessionCount: Object.keys(sessions).length
      });

      return {
        conversations: filteredConversations,
        messages,
        sessions,
        activeConversationId: validActiveConversationId,
        userId,
      };
    } catch (error) {
      logger.error('Error loading data from localStorage', { 
        error: error instanceof Error ? error.message : String(error)
      });
      return this.getDefaultEmptyData();
    }
  }

  // Return default empty data structure
  private getDefaultEmptyData(): StoredData {
    return {
      conversations: {},
      messages: {},
      sessions: {},
      activeConversationId: null,
      userId: null,
    };
  }

  // Save conversations (only those with messages)
  saveConversations(conversations: Record<string, Conversation>, messages: Record<string, Message[]>): boolean {
    const filteredConversations = this.filterConversationsWithMessages(conversations, messages);
    return this.safeSet(STORAGE_KEYS.CONVERSATIONS, filteredConversations);
  }

  // Save messages with validation
  saveMessages(messages: Record<string, Message[]>): boolean {
    // Validate and clean messages
    const cleanedMessages: Record<string, Message[]> = {};
    
    Object.entries(messages).forEach(([conversationId, messageList]) => {
      // Only save conversations that have messages
      if (messageList && messageList.length > 0) {
        // Limit messages per conversation to prevent storage overflow
        cleanedMessages[conversationId] = messageList.slice(-MAX_MESSAGES_PER_CONVERSATION);
      }
    });
    
    return this.safeSet(STORAGE_KEYS.MESSAGES, cleanedMessages);
  }

  // Save sessions (only for conversations with messages)
  saveSessions(sessions: Record<string, ChatSession>, messages: Record<string, Message[]>): boolean {
    const filteredSessions: Record<string, ChatSession> = {};
    
    Object.entries(sessions).forEach(([conversationId, session]) => {
      if (this.hasMessages(conversationId, messages)) {
        filteredSessions[conversationId] = session;
      }
    });
    
    return this.safeSet(STORAGE_KEYS.SESSIONS, filteredSessions);
  }

  // Save active conversation (only if it has messages)
  saveActiveConversation(conversationId: string | null, messages: Record<string, Message[]>): boolean {
    if (conversationId && !this.hasMessages(conversationId, messages)) {
      logger.warn('Attempting to save active conversation without messages', { conversationId });
      return false;
    }
    return this.safeSet(STORAGE_KEYS.ACTIVE_CONVERSATION, conversationId);
  }

  // Save user ID
  saveUserId(userId: string | null): boolean {
    return this.safeSet(STORAGE_KEYS.USER_ID, userId);
  }

  // Save all data at once with validation
  saveAllData(data: Partial<StoredData>): boolean {
    let success = true;
    
    if (data.conversations !== undefined && data.messages !== undefined) {
      success = this.saveConversations(data.conversations, data.messages) && success;
    }
    
    if (data.messages !== undefined) {
      success = this.saveMessages(data.messages) && success;
    }
    
    if (data.sessions !== undefined && data.messages !== undefined) {
      success = this.saveSessions(data.sessions, data.messages) && success;
    }
    
    if (data.activeConversationId !== undefined && data.messages !== undefined) {
      success = this.saveActiveConversation(data.activeConversationId, data.messages) && success;
    }
    
    if (data.userId !== undefined) {
      success = this.saveUserId(data.userId) && success;
    }
    
    return success;
  }


  // Cleanup old data to free storage space
  cleanup(): void {
    try {
      const data = this.loadStoredData();
      const conversations = Object.values(data.conversations);
      
      // Sort by last updated time and keep only the most recent ones
      const sortedConversations = conversations
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_CONVERSATIONS);
      
      // Create new conversations object with only recent ones
      const cleanedConversations: Record<string, Conversation> = {};
      const cleanedMessages: Record<string, Message[]> = {};
      const cleanedSessions: Record<string, ChatSession> = {};
      
      sortedConversations.forEach(conversation => {
        if (this.hasMessages(conversation.id, data.messages)) {
          cleanedConversations[conversation.id] = conversation;
          
          if (data.messages[conversation.id]) {
            cleanedMessages[conversation.id] = data.messages[conversation.id]
              .slice(-MAX_MESSAGES_PER_CONVERSATION);
          }
          
          if (data.sessions[conversation.id]) {
            cleanedSessions[conversation.id] = data.sessions[conversation.id];
          }
        }
      });
      
      // Check if active conversation still exists and has messages
      let activeConversationId = data.activeConversationId;
      if (activeConversationId && !this.hasMessages(activeConversationId, cleanedMessages)) {
        const remainingIds = Object.keys(cleanedConversations);
        activeConversationId = remainingIds.length > 0 ? remainingIds[0] : null;
      }
      
      // Save cleaned data
      this.saveAllData({
        conversations: cleanedConversations,
        messages: cleanedMessages,
        sessions: cleanedSessions,
        activeConversationId,
      });
    } catch (error) {
      logger.error('Failed to cleanup storage', { error });
    }
  }

  // Clear all stored data
  clearAll(): boolean {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        if (key !== STORAGE_KEYS.VERSION) {
          safeLocalStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      logger.error('Failed to clear storage', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  // Get storage usage information
  getStorageInfo(): { used: number; available: number; conversations: number; messages: number } {
    try {
      const data = this.loadStoredData();
      const conversations = Object.keys(data.conversations).length;
      const messages = Object.values(data.messages).reduce((total, msgs) => total + msgs.length, 0);
      
      // Estimate storage usage
      const used = JSON.stringify(data).length;
      const available = 5 * 1024 * 1024; // 5MB estimate
      
      return { used, available, conversations, messages };
    } catch {
      return { used: 0, available: 0, conversations: 0, messages: 0 };
    }
  }

  // Validate storage integrity
  validateStorage(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const data = this.loadStoredData();
    
    // Check for orphaned conversations (conversations without messages)
    Object.keys(data.conversations).forEach(conversationId => {
      if (!this.hasMessages(conversationId, data.messages)) {
        errors.push(`Orphaned conversation: ${conversationId}`);
      }
    });
    
    // Check for orphaned messages (messages without conversations)
    Object.keys(data.messages).forEach(conversationId => {
      if (!data.conversations[conversationId]) {
        errors.push(`Orphaned messages: ${conversationId}`);
      }
    });
    
    // Check for orphaned sessions (sessions without conversations)
    Object.keys(data.sessions).forEach(conversationId => {
      if (!data.conversations[conversationId]) {
        errors.push(`Orphaned session: ${conversationId}`);
      }
    });
    
    // Check active conversation validity
    if (data.activeConversationId && !data.conversations[data.activeConversationId]) {
      errors.push('Invalid active conversation');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Repair storage by removing orphaned data
  repairStorage(): boolean {
    try {
      const validation = this.validateStorage();
      if (validation.isValid) {
        return true; // No repair needed
      }
      
      logger.info('Repairing storage, found errors', { errors: validation.errors });
      
      const data = this.loadStoredData();
      
      // Remove orphaned conversations
      Object.keys(data.conversations).forEach(conversationId => {
        if (!this.hasMessages(conversationId, data.messages)) {
          delete data.conversations[conversationId];
        }
      });
      
      // Remove orphaned messages
      Object.keys(data.messages).forEach(conversationId => {
        if (!data.conversations[conversationId]) {
          delete data.messages[conversationId];
        }
      });
      
      // Remove orphaned sessions
      Object.keys(data.sessions).forEach(conversationId => {
        if (!data.conversations[conversationId]) {
          delete data.sessions[conversationId];
        }
      });
      
      // Fix active conversation
      if (data.activeConversationId && !data.conversations[data.activeConversationId]) {
        const remainingIds = Object.keys(data.conversations);
        data.activeConversationId = remainingIds.length > 0 ? remainingIds[0] : null;
      }
      
      return this.saveAllData(data);
    } catch (error) {
      logger.error('Failed to repair storage', { error });
      return false;
    }
  }
}

export const localStorageService = new LocalStorageService();
