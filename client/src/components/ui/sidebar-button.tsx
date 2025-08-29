import React from 'react';
import { cn } from '../../lib/utils';

interface SidebarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: string | number;
  shortcut?: string;
  variant?: 'default' | 'primary';
  className?: string;
}

export const SidebarButton = React.forwardRef<HTMLButtonElement, SidebarButtonProps>(({
  icon,
  children,
  badge,
  shortcut,
  variant = 'default',
  className,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        // Base styles with perfect alignment and better spacing
        'w-full h-11 px-3 rounded-lg font-normal text-sm',
        'flex items-center gap-3',
        'text-text-secondary dark:text-text-secondary',
        // Sleek click effect only
        'active:scale-[0.98] active:bg-surface-300/70 dark:active:bg-surface-700/60',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-1 focus:ring-primary/50 dark:focus:ring-primary/50',
        // Cursor pointer
        'cursor-pointer',
        
        // Variant styles - Fixed for dark mode consistency
        variant === 'primary' && [
          'bg-primary-100/50 dark:bg-primary-900/30',
          'text-primary-900 dark:text-primary-100',
          'bg-gray-200/60 dark:bg-white/10',
          'backdrop-blur-md',
          'border border-gray-200/10 dark:border-primary-800/30'
        ],
        
        className
      )}
      {...props}
    >
      {/* Icon - fixed size and alignment with hover animation only on icon */}
      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center hover:scale-110 hover:rotate-3 transition-transform duration-200 cursor-pointer">
        {icon}
      </div>
      
      {/* Text content */}
      <span className="flex-1 text-left leading-none truncate">
        {children}
      </span>
      
      {/* Badge */}
      {badge && (
        <span className="flex-shrink-0 text-xs text-text-tertiary dark:text-text-tertiary bg-surface-200/40 dark:bg-surface-700/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
          {badge}
        </span>
      )}
      
      {/* Keyboard shortcut */}
      {shortcut && (
        <div className="flex-shrink-0 flex items-center gap-0.5 text-xs text-text-tertiary dark:text-text-tertiary">
          <span className="text-xs">⌘</span>
          <span>{shortcut}</span>
        </div>
      )}
    </button>
  );
});

SidebarButton.displayName = 'SidebarButton';
