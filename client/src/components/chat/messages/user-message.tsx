import React from 'react';
import { motion } from 'framer-motion';
import type { UserMessage as UserMessageType } from '../../../types/chat';
import { TicketProcessor } from '../content/processors/ticket-processor';

interface UserMessageProps {
  message: UserMessageType;
}

export const UserMessage: React.FC<UserMessageProps> = ({ message }) => (
  <motion.div 
    className="flex justify-end bg-transparent mt-5 backdrop-blur-lg"
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    whileHover={{ scale: 1.01 }}
  >
    <motion.div 
      className="max-w-[80%] text-wrap  bg-secondary backdrop-blur-xl text-primary-foreground p-3 px-4 rounded-xl border border-primary/10 relative group cursor-pointer" 
      transition={{ duration: 0.2 }}
    >
      {/* Subtle glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100"
        transition={{ duration: 0.3 }}
      />
      
      <div className="flex items-start gap-2 relative z-10">
        <div className="flex-1">
          <motion.div 
            className="text-foreground font-medium text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <TicketProcessor content={message.content} />
          </motion.div>
        </div>
        
        {/* Timestamp indicator */}
        <motion.div
          className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </motion.div>
      </div>
      
      {/* Subtle pulse animation for new messages */}
      <motion.div
        className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.7 }}
        transition={{ duration: 1, repeat: 2, repeatDelay: 2 }}
      />
    </motion.div>
  </motion.div>
);
