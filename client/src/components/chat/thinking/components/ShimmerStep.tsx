import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils/cn';

interface ShimmerStepProps {
  className?: string;
  isActive?: boolean;
  children: React.ReactNode;
}

export const ShimmerStep: React.FC<ShimmerStepProps> = ({ 
  className, 
  isActive = false, 
  children 
}) => {
  return (
    <motion.div
      className={cn(
        'relative overflow-hidden',
        isActive && [
          'before:absolute before:inset-0 before:translate-x-[-100%] before:animate-[shimmer_2s_infinite]',
          'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
          'dark:before:via-white/10'
        ],
        className
      )}
      animate={isActive ? {
        boxShadow: [
          '0 0 0 0 rgba(59, 130, 246, 0)',
          '0 0 0 4px rgba(59, 130, 246, 0.1)',
          '0 0 0 0 rgba(59, 130, 246, 0)'
        ]
      } : {}}
      transition={{
        boxShadow: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
    >
      {children}
    </motion.div>
  );
};
