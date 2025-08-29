import React from 'react';
import { motion } from 'framer-motion';

interface LoadMoreButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  hasMore?: boolean;
  className?: string;
}

export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  hasMore = true,
  className = '',
}) => {
  if (!hasMore) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-4"
      >
        <p className="text-xs text-muted-foreground">
          No more conversations to load
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center py-4 ${className}`}
    >
      <motion.button
        onClick={onClick}
        disabled={disabled || loading}
        className={`
          px-4 py-2 text-sm font-medium rounded-lg
          transition-all duration-200 ease-out
          ${loading || disabled
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-sidebar-accent/60 hover:bg-sidebar-accent/80 text-sidebar-foreground hover:scale-105 active:scale-95'
          }
        `}
        whileHover={!loading && !disabled ? { scale: 1.05 } : {}}
        whileTap={!loading && !disabled ? { scale: 0.95 } : {}}
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            {/* Loading spinner */}
            <motion.div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span>Loading more...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span>Load more conversations</span>
            <motion.div
              className="text-xs"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ↓
            </motion.div>
          </div>
        )}
      </motion.button>
    </motion.div>
  );
};

interface LoadMoreStatsProps {
  totalLoaded: number;
  askCount: number;
  investigateCount: number;
  hasMore: boolean;
}

export const LoadMoreStats: React.FC<LoadMoreStatsProps> = ({
  totalLoaded,
  askCount,
  investigateCount,
  hasMore,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-2 space-y-1"
    >
      <p className="text-xs text-muted-foreground">
        Showing {totalLoaded} conversations
      </p>
      <div className="flex justify-center space-x-4 text-xs text-muted-foreground">
        <span className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span>{askCount} Ask</span>
        </span>
        <span className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>{investigateCount} Investigate</span>
        </span>
      </div>
      {hasMore && (
        <p className="text-xs text-muted-foreground/70">
          More conversations available
        </p>
      )}
    </motion.div>
  );
};

export default LoadMoreButton;
