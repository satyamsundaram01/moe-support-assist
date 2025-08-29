import React from 'react';
import { EnhancedChatInput } from './input/enhanced-chat-input';
import { MessageList } from './containers/message-list';
import { ErrorBoundary } from '../ui/error-boundary';
import { ToastProvider, ToastViewport } from '../ui/toast';
import { ToolResultModal } from './components/tool-result-modal';
import { useChatLogic } from '../../hooks/use-chat-logic';

const ChatInterface: React.FC = () => {
    const {
    messages,
    streaming,
    currentMode,
    settings,
    isLoadingMessages,
    isProcessing,
      isToolModalOpen,
      currentToolResult,
    handleSendMessage,
    closeToolModal
  } = useChatLogic();

  return (
    <ErrorBoundary>
      <div className="flex overflow-hidden w-full h-full transition-colors duration-300 relative">
        {/* Fade overlay for top scroll */}
        <div className="absolute top-2 left-0 right-0 h-16 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-10" />
        <div className="absolute top-1 left-0 right-0 h-16 bg-gradient-to-b blur-2xl from-background via-background/80 to-transparent pointer-events-none z-14" />
        <div className="absolute top-1 left-0 right-0 h-16 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-12" />
 
        <div className="flex flex-col flex-1 h-full pt-2">
          {/* Show loading state when messages are being loaded */}
          {isLoadingMessages && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
              </div>
            </div>
          ) : (
            <MessageList
              messages={messages}
              streaming={streaming}
              currentMode={currentMode}
              autoScroll={settings.autoScroll}
            />
          )}
          
                    <div className="bg-transparent">
                        <div className="max-w-3xl mx-auto px-4 py-4">
                            <EnhancedChatInput
                                onSendMessage={handleSendMessage}
                                disabled={streaming.isStreaming || isProcessing}
                            />
                        </div>
                    </div>
                </div>

                {/* Enhanced Modals */}
                <ToolResultModal
                    isOpen={isToolModalOpen}
                    onClose={closeToolModal}
                    tool={currentToolResult}
                />
            </div>
        </ErrorBoundary>
    );
};

// Wrapper component with ToastProvider
export const WorkingChatInterfaceWithToast: React.FC = () => {
    return (
        <ToastProvider>
      <ChatInterface />
            <ToastViewport />
        </ToastProvider>
    );
};
