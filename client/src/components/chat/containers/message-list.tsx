import React, { useRef, useEffect, useState } from 'react';
import { UserMessage } from '../messages/user-message';
import { AIMessage } from '../messages/ai-message';
import { ChatEmptyState } from '../empty-state/chat-empty-state';
import { ErrorBoundary, ComponentErrorFallback } from '../../ui';
import type { Message, StreamingState } from '../../../types/chat';
import { ChatMode } from '../../../types/chat';

interface MessageListProps {
  messages: Message[];
  streaming: StreamingState;
  currentMode: ChatMode;
  autoScroll: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  streaming, 
  currentMode, 
  autoScroll 
}) => {

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  // Listen for scroll events from the events store
  useEffect(() => {
    const handleScrollToBottom = () => {
      if (autoScroll && messagesEndRef.current && !isUserScrolling) {
        // Use a more controlled scroll approach
        const container = containerRef.current;
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    };

    // Listen for scroll events
    const handleEvent = (event: CustomEvent) => {
      if (event.detail?.type === 'scroll_to_bottom') {
        handleScrollToBottom();
      }
    };

    document.addEventListener('scroll_to_bottom', handleEvent as EventListener);
    
    return () => {
      document.removeEventListener('scroll_to_bottom', handleEvent as EventListener);
    };
  }, [autoScroll, messages.length, isUserScrolling]);

  // Handle user scroll detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsUserScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // Reset user scrolling flag after a delay
      const timeout = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
      
      setScrollTimeout(timeout);
    };

    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);

  // Auto-scroll during streaming if user is not manually scrolling
  useEffect(() => {
    if (streaming.isStreaming && autoScroll && !isUserScrolling) {
      const container = containerRef.current;
      if (container) {
        // Only scroll if we're close to the bottom (within 100px)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        
        if (isNearBottom) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [streaming.currentResponse, streaming.isStreaming, autoScroll, isUserScrolling]);

  const renderMessage = (message: Message) => {
    if (message.type === 'user') {
      return (
        <ErrorBoundary 
          key={message.id} 
          fallback={(error) => <ComponentErrorFallback error={error} componentName="User Message" />} 
          isolate
        >
          <UserMessage message={message} />
        </ErrorBoundary>
      );
    } else {
      return (
        <ErrorBoundary 
          key={message.id} 
          fallback={(error) => <ComponentErrorFallback error={error} componentName="AI Message" />} 
          isolate
        >
          <AIMessage
            message={message}
            isLoading={streaming.isStreaming && streaming.messageId === message.id}
            streamingState={streaming}
            currentMode={currentMode}
          />
        </ErrorBoundary>
      );
    }
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth relative scrollbar-hide">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        <ChatEmptyState messages={messages} />
        
        <div className="space-y-3">
          {messages.map(renderMessage)}
        </div>
        
        {/* <StreamingIndicator isStreaming={streaming.isStreaming} /> */}
        
        <div ref={messagesEndRef} data-messages-end />
      </div>
      
      {/* Scroll to bottom button when user has scrolled up */}
      {isUserScrolling && autoScroll && (
        <button
          onClick={() => {
            const container = containerRef.current;
            if (container) {
              container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
              });
              setIsUserScrolling(false);
            }
          }}
          className="fixed bottom-20 right-6 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all duration-200 backdrop-blur-sm"
          title="Scroll to bottom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
};
