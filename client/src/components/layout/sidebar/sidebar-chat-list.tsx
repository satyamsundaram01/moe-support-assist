import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../../store/chat-store';

interface SidebarChatListProps {
  onChatSelect?: (conversationId: string) => void;
}

export const SidebarChatList: React.FC<SidebarChatListProps> = ({ onChatSelect }) => {
  const { conversations, activeConversationId, setActiveConversation } = useChatStore();
  
  // Convert conversations object to array and sort by updatedAt
  const conversationList = Object.values(conversations)
    .filter(conv => !conv.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const handleChatClick = (conversationId: string) => {
    setActiveConversation(conversationId);
    onChatSelect?.(conversationId);
  };


  // Get the first user message as the conversation title
  const getConversationTitle = (conversationId: string) => {
    const messages = useChatStore.getState().messages[conversationId] || [];
    const firstUserMessage = messages.find(msg => msg.type === 'user');
    
    if (firstUserMessage && firstUserMessage.content.trim()) {
      // Truncate long messages to 22 characters
      const content = firstUserMessage.content.trim();
      return content.length > 22 ? content.substring(0, 22) + '...' : content;
    }
    
    // Fallback to the conversation title
    const fallbackTitle = useChatStore.getState().conversations[conversationId]?.title || 'New Conversation';
    return fallbackTitle.length > 22 ? fallbackTitle.substring(0, 22) + '...' : fallbackTitle;
  };

  return (
    <div className="flex-1 overflow-hidden rounded-2xl">
      {/* Section Header */}
      <motion.div 
        className="px-4 pb-1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-overline text-muted-foreground px-2">
          Chats ({conversationList.length})
        </h3>
      </motion.div>
      
      {/* Chat List with transparent glass blur background */}
      <div className="relative px-4 py-3 space-y-1.5 overflow-y-auto scrollbar-hide max-h-full backdrop-blur-sm  rounded-xl">
        
        {/* Chat items */}
        <div className="relative z-10">
          <AnimatePresence mode="popLayout">
            {conversationList.length === 0 ? (
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-8 text-muted-foreground"
              >
                <motion.div 
                  className="text-2xl mb-2"
                  animate={{ rotate: 5 }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  💬
                </motion.div>
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start a new chat to begin</p>
              </motion.div>
            ) : (
              conversationList.map((conversation, index) => (
                <motion.div
                  key={conversation.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm font-sans font-normal text-left mb-1
                           hover:bg-sidebar-accent/60 dark:hover:bg-sidebar-accent/40
                           hover:backdrop-blur-sm
                           active:bg-sidebar-accent/30 dark:active:bg-sidebar-accent/60
                           transition-all duration-200 ease-out
                           cursor-pointer
                           flex flex-col items-start group relative
                           ${activeConversationId === conversation.id 
                             ? 'bg-muted dark:bg-sidebar-primary/40 text-sidebar-secondary' 
                             : 'text-sidebar-foreground'
                           }`}
                  onClick={() => handleChatClick(conversation.id)}
                >

                  {/* Main content - simplified */}
                  <div className="w-full overflow-hidden">
                    <span className="block truncate font-medium text-sm leading-tight">
                      {getConversationTitle(conversation.id)}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
