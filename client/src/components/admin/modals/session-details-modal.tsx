import React, { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '../../ui/sheet';
import { ScrollArea } from '../../ui/scroll-area';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { UserMessage } from '../../chat/messages/user-message';
import { EnhancedContentProcessor, useProcessedCitations } from '../../chat/content/processors';
import { SourcesButton } from '../../chat/citations/sources-button';
import { CitationModal } from '../../chat/citations/citation-modal';
import { adminService } from '../../../services/admin-service';
import { cn } from '../../../lib/utils';
import { useAnalytics } from '../../../hooks/use-analytics';
import type { SessionListItem } from '../../../types/admin';
import type { Message, AIMessage as AIMessageType } from '../../../types/chat';
import type { Citation } from '../../chat/citations/types';

// Admin-specific AI Response Container (no feedback buttons, keeps copy and citations)
const AdminAIResponseContainer: React.FC<{
  content: string;
  citations?: Citation[];
}> = memo(({ content, citations }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const { trackClick } = useAnalytics();
  
  const processedCitations = useProcessedCitations(citations || []);

  const handleToggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleCopy = async () => {
    if (copyState !== 'idle') return;
    
    setCopyState('copying');
    trackClick('copy_response', {
      location: 'admin_session_detail',
      timestamp: Date.now(),
    });
    
    try {
      await navigator.clipboard.writeText(content);
      setCopyState('copied');
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopyState('idle');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy response:', err);
      setCopyState('idle');
    }
  };

  return (
    <div className="space-y-4">
      <EnhancedContentProcessor 
        content={content} 
        citations={citations}
      />
      
      {/* Action buttons row - Only copy button and sources, no feedback buttons */}
      <div className="flex items-center justify-between">
        {processedCitations.length > 0 && (
          <SourcesButton 
            citations={processedCitations}
            onClick={handleToggleModal}
          />
        )}
        
        {/* Copy button only - no thumbs up/down */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCopy}
          disabled={copyState !== 'idle'}
          className={cn(
            "p-1.5 rounded-md transition-all duration-150 relative overflow-hidden cursor-pointer",
            "text-muted-foreground hover:text-foreground hover:bg-muted/30",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            copyState === 'copied' && "text-green-600 dark:text-green-400 bg-green-500/10",
            processedCitations.length === 0 ? 'ml-auto' : ''
          )}
          title={copyState === 'copied' ? 'Copied!' : 'Copy response'}
        >
          <AnimatePresence mode="wait">
            {copyState === 'copied' ? (
              <motion.div
                key="check"
                initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5" />
              </motion.div>
            ) : copyState === 'copying' ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Copy className="w-3.5 h-3.5" />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Success ripple effect */}
          {copyState === 'copied' && (
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-0 bg-green-500/20 rounded-md"
            />
          )}
        </motion.button>
      </div>

      {isModalOpen && createPortal(
        <CitationModal
          citations={processedCitations}
          onClose={handleToggleModal}
        />,
        document.body
      )}
    </div>
  );
});

// Admin AI Message Component - Uses real chat styling but no feedback buttons
const AdminAIMessage: React.FC<{
  message: AIMessageType;
}> = ({ message }) => {
  const responseData = {
    answer: message.content,
    citations: message.citations || [],
  };

  return (
    <motion.div 
      className="flex mr-10 ml-4 p-3 justify-start mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-full pt-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AdminAIResponseContainer 
            content={responseData.answer} 
            citations={responseData.citations} 
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

// Message List for Admin View using real components
const AdminMessageList: React.FC<{
  messages: Message[];
}> = ({ messages }) => {
  const renderMessage = (message: Message) => {
    if (message.type === 'user') {
      return <UserMessage key={message.id} message={message} />;
    } else {
      return <AdminAIMessage key={message.id} message={message as AIMessageType} />;
    }
  };

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-muted-foreground">
            <p>No messages in this session.</p>
          </div>
        </div>
      ) : (
        messages.map(renderMessage)
      )}
    </div>
  );
};

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionListItem | null;
}

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  isOpen,
  onClose,
  session
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessionDetails = useCallback(async () => {
    if (!session) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get session details based on mode
      const detail = await adminService.getSessionDetail(
        session.id,
        session.userId,
        session.mode
      );

      // Convert session messages to proper format for admin view
      const adminMessages: Message[] = detail.messages.map((msg, index) => {
        const baseMessage = {
          id: `${session.id}-${index}`,
          content: msg.content,
          status: 'delivered' as const,
          timestamp: new Date(msg.timestamp).getTime(),
          conversationId: session.id,
        };

        if (msg.type === 'user') {
          return {
            ...baseMessage,
            type: 'user' as const,
            role: 'user' as const,
          } as Message;
        } else {
          // AI/System messages
          return {
            ...baseMessage,
            type: 'ai' as const,
            role: 'model' as const,
            thinkingSteps: [],
            toolCalls: [],
            isStreaming: false,
            isComplete: true,
            showThinking: false,
            showRawEvents: false,
            rawEvents: [],
            citations: [], // Can be enhanced later to include actual citations from the response
          } as Message;
        }
      });

      setMessages(adminMessages);
    } catch (err) {
      console.error('Error loading session details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session details');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (isOpen && session) {
      loadSessionDetails();
    }
  }, [isOpen, session, loadSessionDetails]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  if (!session) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-4xl lg:max-w-6xl h-full p-0"
        overlay={true}
        close={false}
      >
        {/* Header */}
        <SheetHeader className="py-6 px-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SheetTitle className="text-xl font-semibold">
                Session Details
              </SheetTitle>
              <Badge variant="outline" className="capitalize">
                {session.mode}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {session.status}
              </Badge>
            </div>
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div>
              <span className="font-medium">User:</span>{' '}
              <span className="text-muted-foreground">{session.userId}</span>
            </div>
            <div>
              <span className="font-medium">Messages:</span>{' '}
              <span className="text-muted-foreground">{session.messageCount}</span>
            </div>
            <div>
              <span className="font-medium">Created:</span>{' '}
              <span className="text-muted-foreground">{formatDate(session.startTime)}</span>
            </div>
            <div>
              <span className="font-medium">Last Activity:</span>{' '}
              <span className="text-muted-foreground">{formatTimeAgo(session.lastActivity)}</span>
            </div>
          </div>

          {/* Session Query */}
          {session.userQuery && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">Session Query:</div>
              <div className="text-sm">{session.userQuery}</div>
            </div>
          )}
        </SheetHeader>

        {/* Messages Content */}
        <SheetBody className="py-0 px-0 grow">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading session messages...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-500 text-xl mb-4">⚠️</div>
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadSessionDetails} variant="outline">
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
                <AdminMessageList messages={messages} />
              </div>
            </ScrollArea>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};