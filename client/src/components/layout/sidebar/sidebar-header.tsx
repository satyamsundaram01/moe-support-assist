import React from 'react';
import { PanelLeftClose } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../ui/button';

interface SidebarHeaderProps {
  onToggle?: () => void;
  shouldAnimate?: boolean;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ onToggle, shouldAnimate = true }) => {
  return (
    <motion.div 
      className="flex-shrink-0 p-4 py-4"
      initial={shouldAnimate ? { opacity: 0, y: -20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        type: "spring", 
        stiffness: 200, 
        damping: 20 
      }}
    >
      <div className="flex items-center justify-between">
        {/* Brand Logo with enhanced animation */}
        <motion.div 
          className="flex items-center gap-3"
          initial={shouldAnimate ? { opacity: 0, x: -30, scale: 0.8 } : false}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ 
            duration: 0.6, 
            type: "spring", 
            stiffness: 300, 
            damping: 25,
            delay: shouldAnimate ? 0.1 : 0
          }}
        >
          <motion.div 
            className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm shadow-blue-600/25 cursor-pointer"
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)"
            }}
            whileTap={{ scale: 0.95 }}
            initial={shouldAnimate ? { rotate: -180, scale: 0 } : false}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ 
              duration: 0.8, 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: shouldAnimate ? 0.2 : 0
            }}
          >
            <motion.div 
              className="w-4 h-4 rounded-full bg-white"
              animate={{ 
                scale: 1.1,
                rotate: 5
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
            />
          </motion.div>
        </motion.div>
        
        {/* Enhanced Collapse Button with staggered animation */}
        <motion.div
          initial={shouldAnimate ? { opacity: 0, x: 30, scale: 0.8 } : false}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ 
            duration: 0.6, 
            type: "spring", 
            stiffness: 300, 
            damping: 25,
            delay: shouldAnimate ? 0.3 : 0
          }}
        >
          <Button
            onClick={onToggle}
            variant="ghost"
            size="sm"
            className="p-1.5 h-7 w-7 text-text-tertiary dark:text-text-tertiary hover:bg-surface-200/80 dark:hover:bg-surface-800/60 active:scale-95 transition-all duration-150 ease-out rounded-lg relative overflow-hidden group"
            aria-label="Collapse sidebar"
          >
            {/* Hover background effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100"
              transition={{ duration: 0.2 }}
            />
            
            <motion.div
              className="relative z-10"
              whileHover={{ rotate: 90 }}
              whileTap={{ scale: 0.8 }}
              initial={shouldAnimate ? { rotate: 180 } : false}
              animate={{ rotate: 0 }}
              transition={{ 
                duration: 0.6, 
                type: "spring", 
                stiffness: 300, 
                damping: 20,
                delay: shouldAnimate ? 0.4 : 0
              }}
            >
              <PanelLeftClose className="h-4 w-4" />
            </motion.div>
            
            {/* Ripple effect on click */}
            <motion.div
              className="absolute inset-0 bg-primary/20 rounded-lg"
              initial={{ scale: 0, opacity: 0 }}
              whileTap={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
