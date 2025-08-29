import React from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useTheme } from '../../../hooks/use-theme';
import { Button } from '../../ui/button';

export const ThemeToggle: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (resolvedTheme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <ComputerDesktopIcon className="h-4 w-4" />;
    }
    return resolvedTheme === 'light' ? (
      <SunIcon className="h-4 w-4" />
    ) : (
      <MoonIcon className="h-4 w-4" />
    );
  };

  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="sm"
      className="p-1.5 hover:bg-surface-200/80 dark:hover:bg-surface-800/60 rounded-md transition-all duration-150 relative overflow-hidden group cursor-pointer"
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Hover background effect */}
      <motion.div
      whileHover={{
        scale: 1.2,
        rotate: 5
      }}
      whileTap={{
        scale: 0.9
      }}
        className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100"
        transition={{ duration: 0.2 }}
      />
      
      {/* Icon with micro-interactions */}
      <motion.div
        className="relative z-10"
        whileHover={{ 
          scale: 1.1,
          rotate: 5
        }}
        whileTap={{ scale: 0.9 }}
        key={resolvedTheme} // Force re-render on theme change
        initial={{ scale: 0.8, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          duration: 0.4,
          type: "spring",
          stiffness: 200,
          damping: 20
        }}
      >
        {getIcon()}
      </motion.div>
      
      {/* Ripple effect on click */}
      <motion.div
        className="absolute inset-0 bg-primary/20 rounded-md"
        initial={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
    </Button>
  );
};
