import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils/cn';

interface TicketChipProps {
  ticketId: string;
  onRemove?: () => void;
  readonly?: boolean;
  className?: string;
}

export const TicketChip: React.FC<TicketChipProps> = ({
  ticketId,
  onRemove,
  readonly = false,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'bg-primary/10 border border-primary/20 text-primary',
        !readonly && 'hover:bg-primary/15 hover:border-primary/30',
        'transition-all duration-150 cursor-default select-none',
        readonly && 'opacity-80',
        className
      )}
      onMouseEnter={() => !readonly && setIsHovered(true)}
      onMouseLeave={() => !readonly && setIsHovered(false)}
    >
      <span className="flex items-center gap-1">
        <span className="text-primary/70">#</span>
        <span>{ticketId}</span>
      </span>
      
      {!readonly && onRemove && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: isHovered ? 1 : 0.6, 
            scale: isHovered ? 1 : 0.8 
          }}
          transition={{ duration: 0.15 }}
          onClick={onRemove}
          className={cn(
            'flex items-center justify-center w-4 h-4 rounded-full',
            'hover:bg-primary/20 transition-colors duration-150',
            'text-primary/70 hover:text-primary'
          )}
          aria-label={`Remove ticket ${ticketId}`}
        >
          <X className="w-3 h-3" />
        </motion.button>
      )}
    </motion.div>
  );
};
