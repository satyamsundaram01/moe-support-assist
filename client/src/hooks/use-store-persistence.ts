import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chat-store';
import { localStorageService } from '../services/local-storage';

// Memory-safe debounce function with proper cleanup
function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | undefined;
  
  const debounced = ((...args: never[]) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = undefined;
      func(...args);
    }, wait);
  }) as T & { cancel: () => void };
  
  // Add cancel method for cleanup
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  };
  
  return debounced;
}

export const useStorePersistence = () => {
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const validationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Get all the data we need to persist
  const conversations = useChatStore((state) => state.conversations);
  const messages = useChatStore((state) => state.messages);
  const sessions = useChatStore((state) => state.sessions);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const currentUserId = useChatStore((state) => state.currentUserId);

  // Debounced save function with proper cleanup
  const debouncedSave = useRef(
    debounce((data: {
      conversations: typeof conversations;
      messages: typeof messages;
      sessions: typeof sessions;
      activeConversationId: typeof activeConversationId;
      userId: typeof currentUserId;
    }) => {
      try {
        const success = localStorageService.saveAllData(data);
        if (!success) {
          console.warn('Failed to save some data to localStorage');
        }
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }, 1000) // Save after 1 second of no changes
  );

  // Effect to save data when it changes
  useEffect(() => {
    // Skip the first render (initialization)
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }

    // Set a new timeout for saving
    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave.current({
        conversations,
        messages,
        sessions,
        activeConversationId,
        userId: currentUserId,
      });
      saveTimeoutRef.current = undefined;
    }, 1000);

    // Cleanup function - ensures timeout is always cleared
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = undefined;
      }
    };
  }, [conversations, messages, sessions, activeConversationId, currentUserId]);

  // Effect to validate and repair storage on mount
  useEffect(() => {
    const validateAndRepair = () => {
      try {
        const validation = localStorageService.validateStorage();
        if (!validation.isValid) {
          console.log('Storage validation failed, repairing...', validation.errors);
          const repairSuccess = localStorageService.repairStorage();
          if (repairSuccess) {
            console.log('Storage repair completed successfully');
          } else {
            console.error('Storage repair failed');
          }
        }
      } catch (error) {
        console.error('Error during storage validation/repair:', error);
      }
      validationTimeoutRef.current = undefined;
    };

    // Run validation after a short delay to ensure store is initialized
    validationTimeoutRef.current = setTimeout(validateAndRepair, 1000);
    
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = undefined;
      }
    };
  }, []);

  // Effect to save user ID immediately when it changes
  useEffect(() => {
    if (isInitialized.current && currentUserId) {
      localStorageService.saveUserId(currentUserId);
    }
  }, [currentUserId]);

  // Cleanup effect to ensure all timeouts are cleared on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = undefined;
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = undefined;
      }
      // Cancel debounced function
      if (debouncedSave.current?.cancel) {
        debouncedSave.current.cancel();
      }
    };
  }, []);

  // Return storage info for debugging
  const getStorageInfo = () => {
    return localStorageService.getStorageInfo();
  };

  // Return validation info for debugging
  const validateStorage = () => {
    return localStorageService.validateStorage();
  };

  // Return repair function for manual repair
  const repairStorage = () => {
    return localStorageService.repairStorage();
  };

  return {
    getStorageInfo,
    validateStorage,
    repairStorage,
  };
};

// Add default export for better module resolution
export default useStorePersistence;
