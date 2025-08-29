import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  className,
}) => {

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'min-h-screen w-full relative overflow-hidden',
        'transition-colors duration-300',
        className
      )}
    >
      {/* Main content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
};
