import React from 'react';
import { useConversationStore } from '../../../stores/conversation-store';
import { useResponsive } from '../../../hooks';
import { useChatNavigation } from '../../../hooks/use-chat-navigation';
import { cn } from '../../../lib/utils';
import { ErrorBoundary, SidebarErrorFallback } from '../../ui';
import { SidebarHeader } from './sidebar-header';
import { SidebarNavigation } from './sidebar-navigation';
import { UnifiedChatList } from './unified-chat-list';

interface MainSidebarProps {
  onClose?: () => void;
  onToggle?: () => void;
  sidebarOpen?: boolean;
  className?: string;
  shouldAnimate?: boolean;
}

export const MainSidebar: React.FC<MainSidebarProps> = ({
  onClose,
  onToggle,
  className,
  shouldAnimate = true,
}) => {
  const { isMobile } = useResponsive();
  const { currentMode, setActiveConversation } = useConversationStore();
  const { navigateToNewChat } = useChatNavigation();

  const handleNewChat = () => {
    try {
      // Navigate to new chat with current mode (lazy loading - no session created)
      navigateToNewChat(currentMode);
      if (isMobile && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to navigate to new chat:', error);
    }
  };

  const handleChatSelect = (conversationId: string, mode: 'ask' | 'investigate') => {
    console.log(`Selected ${mode} session: ${conversationId}`);
    
    // Update the active conversation in the store to highlight the selected chat
    setActiveConversation(conversationId);
    
    // Close mobile sidebar if needed
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <aside
      className={cn(
        'h-full flex flex-col backdrop-blur-3xl ',
        'rounded-3xl border border-sidebar-border', 
        'backdrop-saturate-150',
        'w-full',
        className
      )}
      data-animate={shouldAnimate}
    >
      {/* Header Section */}
      <SidebarHeader onToggle={onToggle} shouldAnimate={shouldAnimate} />
      
      {/* Navigation Section */}
      <SidebarNavigation onNewChat={handleNewChat} shouldAnimate={shouldAnimate} />
      
      {/* Chat History Section */}
      <ErrorBoundary fallback={(error) => <SidebarErrorFallback error={error} />} isolate>
        <UnifiedChatList onChatSelect={handleChatSelect} />
      </ErrorBoundary>
    </aside>
  );
};
