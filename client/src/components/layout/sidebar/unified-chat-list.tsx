import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '../../../stores/conversation-store';
import { useAuthStore } from '../../../store/auth-store';
import { chatHistoryService } from '../../../services/chat-history-service';
import { ChatHistorySkeleton, ChatHistoryError } from '../../ui/chat-history-skeleton';
import { LoadMoreButton, LoadMoreStats } from '../../ui/load-more-button';
import type { UnifiedChatHistory } from '../../../types/chat-history';

interface UnifiedChatListProps {
  onChatSelect?: (conversationId: string, mode: 'ask' | 'investigate') => void;
}

export const UnifiedChatList: React.FC<UnifiedChatListProps> = ({ onChatSelect }) => {
  const { activeConversationId, conversations } = useConversationStore();
  const { user } = useAuthStore();
  
  const [sessions, setSessions] = useState<UnifiedChatHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Subscribe to chat history updates
  useEffect(() => {
    if (!user?.email) return;

    const unsubscribe = chatHistoryService.subscribe((userId, updatedSessions) => {
      if (userId === user.email) {
        console.log('Chat history updated via subscription:', updatedSessions.length);
        setSessions(updatedSessions);
      }
    });

    return unsubscribe;
  }, [user?.email]);

  // Load initial history
  const loadInitialHistory = useCallback(async (refresh = false) => {
    if (!user?.email) return;
    
    setLoading(true);
    setError(null);
    setFallbackMode(false);
    
    try {
      const result = await chatHistoryService.loadInitialHistory({
        userId: user.email,
        limit: 15,
        refresh,
      });
      
      if (result.success) {
        setSessions(result.data ?? []);
        setHasMore(result.hasMore || false);
        setFallbackMode(result.fallbackUsed || false);
      } else {
        setError(result.error || 'Failed to load chat history');
        setSessions(result.data ?? []);
        setFallbackMode(result.fallbackUsed || false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat history');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Load more history
  const loadMoreHistory = useCallback(async () => {
    if (!user?.email || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    try {
      const result = await chatHistoryService.loadMoreHistory({
        userId: user.email,
        limit: 10,
      });
      
      if (result.success) {
        setSessions(result.data ?? []);
        setHasMore(result.hasMore || false);
      } else {
        setError(result.error || 'Failed to load more history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more history');
    } finally {
      setLoadingMore(false);
    }
  }, [user?.email, loadingMore, hasMore]);

  // Initial load
  useEffect(() => {
    loadInitialHistory();
  }, [loadInitialHistory]);

  // Watch for new conversations and refresh sidebar (less aggressive)
  useEffect(() => {
    const conversationCount = Object.keys(conversations).length;
    // Only refresh if we have conversations and haven't loaded any sessions yet
    // This prevents constant refetching
    if (conversationCount > 0 && sessions.length === 0 && !loading) {
      // Longer debounce to prevent excessive API calls
      const timeoutId = setTimeout(() => {
        loadInitialHistory(true);
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [Object.keys(conversations).length, sessions.length, loading]);

  // Handle chat selection for backward compatibility
  const handleChatClick = (session: UnifiedChatHistory) => {
    const conversationId = session.conversationId || session.sessionId;
    
    console.log(`🖱️ [UnifiedChatList] Chat clicked:`, {
      sessionId: session.sessionId,
      conversationId,
      mode: session.mode,
      title: session.title
    });
    
    // Call the optional callback for backward compatibility
    onChatSelect?.(conversationId, session.mode);
  };

  // Build the URL for a session
  const buildSessionUrl = (session: UnifiedChatHistory) => {
    const conversationId = session.conversationId || session.sessionId;
    return `/chat/${session.mode}/${conversationId}`;
  };

  // Get session counts
  const askCount = sessions.filter(s => s.mode === 'ask').length;
  const investigateCount = sessions.filter(s => s.mode === 'investigate').length;

  if (loading) {
    return (
      <div className="flex-1 overflow-hidden rounded-2xl">
        <motion.div 
          className="px-4 pb-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-overline text-muted-foreground px-2">
            Chat History
          </h3>
        </motion.div>
        <div className="px-4">
          <ChatHistorySkeleton count={8} />
        </div>
      </div>
    );
  }

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
          Chat History ({sessions.length})
        </h3>
      </motion.div>
      
      {/* Chat List */}
      <div className="relative px-4 py-3 space-y-1.5 overflow-y-auto scrollbar-hide max-h-full backdrop-blur-sm rounded-xl">
        
        {/* Error State */}
        {error && !fallbackMode && (
          <ChatHistoryError 
            error={error}
            onRetry={() => loadInitialHistory(true)}
          />
        )}

        {/* Fallback Mode Warning */}
        {fallbackMode && (
          <ChatHistoryError 
            error="Using cached data"
            fallbackMode={true}
            onRetry={() => loadInitialHistory(true)}
          />
        )}
        
        {/* Chat items */}
        <div className="relative z-10">
          <AnimatePresence mode="popLayout">
            {sessions.length === 0 && !loading ? (
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
              sessions.map((session, index) => {
                const conversationId = session.conversationId || session.sessionId;
                const sessionUrl = buildSessionUrl(session);
                
                return (
                  <motion.div
                    key={session.sessionId}
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
                  >
                    <Link
                      to={sessionUrl}
                      onClick={() => handleChatClick(session)}
                      className={`w-full px-3 py-2.5 rounded-lg text-sm font-sans font-normal text-left mb-1
                               hover:bg-sidebar-accent/60 dark:hover:bg-sidebar-accent/40
                               hover:backdrop-blur-sm
                               active:bg-sidebar-accent/30 dark:active:bg-sidebar-accent/60
                               transition-all duration-200 ease-out
                               cursor-pointer
                               flex items-start space-x-3 group relative
                               border-none bg-transparent
                               block no-underline
                               ${activeConversationId === conversationId
                                 ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 shadow-sm' 
                                 : 'text-sidebar-foreground hover:text-sidebar-foreground'
                               }`}
                    >
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <div className="flex items-center">
                          <span className="block truncate font-medium text-sm leading-tight">
                            {session.title}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Load More Section */}
        {sessions.length > 0 && (
          <>
            <LoadMoreStats
              totalLoaded={sessions.length}
              askCount={askCount}
              investigateCount={investigateCount}
              hasMore={hasMore}
            />
            
            {hasMore && (
              <LoadMoreButton
                onClick={loadMoreHistory}
                loading={loadingMore}
                hasMore={hasMore}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
