import { useChatStore } from '../store/chat-store';
import { localStorageService } from './local-storage';

/**
 * Initialize the chat store with data from localStorage
 * This should be called once when the app starts
 */
export const initializeChatStore = () => {
  const storedData = localStorageService.loadStoredData();
  
  // Get the store instance
  const store = useChatStore.getState();
  
  // If we have stored data, restore it
  if (Object.keys(storedData.conversations).length > 0) {
    console.log('Restoring chat data from localStorage:', {
      conversations: Object.keys(storedData.conversations).length,
      totalMessages: Object.values(storedData.messages).reduce((sum, msgs) => sum + msgs.length, 0),
      activeConversation: storedData.activeConversationId
    });
    
    // Restore user ID if available
    if (storedData.userId) {
      store.setUserId(storedData.userId);
    }
    
    // If there's an active conversation but no current active conversation, restore it
    if (storedData.activeConversationId && !store.activeConversationId) {
      store.setActiveConversation(storedData.activeConversationId);
    }
  } else {
    console.log('No stored chat data found, starting fresh');
    
    // Generate a user ID if none exists
    if (!storedData.userId) {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      store.setUserId(userId);
      console.log('Generated new user ID:', userId);
    }
  }
};

/**
 * Complete initialization process
 * Call this once when the app starts
 */
export const initializeApp = async () => {
  console.log('Initializing chat application...');
  
  // Initialize store with localStorage data
  initializeChatStore();
  
  console.log('Chat application initialized successfully');
};
