import React from 'react';
import { motion} from 'framer-motion';
import { ShimmeringText } from '../../ui/shimmering';

interface ChatEmptyStateProps {
  messages: any[];
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ messages }) => {
  if (messages.length > 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6"
    >
      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <motion.h2
          className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <ShimmeringText
        text="MoEngage Support Assistant"
        className="text-3xl font-bold w-full h-full bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
        color="var(--color-primary)"
        shimmerColor="var(--color-white)"
        duration={1.5}
        repeatDelay={1}
      />
        </motion.h2>
      </motion.div>
    </motion.div>
  );
}; 