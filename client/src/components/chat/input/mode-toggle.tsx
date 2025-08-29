import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../../lib/utils/cn';
import { ChatMode } from '../../../types/chat';
import { CHAT_MODE_CONFIGS } from '../../../constants/chat-modes';

interface ModeToggleProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
  className?: string;
}

// Dropdown Select Mode Toggle
export const ModeToggle: React.FC<ModeToggleProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modes = Object.values(ChatMode);
  const currentConfig = CHAT_MODE_CONFIGS[currentMode];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModeSelect = (mode: ChatMode) => {
    if (!disabled && mode !== currentMode) {
      onModeChange(mode);
    }
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Select Button */}
      <button
        onClick={toggleDropdown}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium',
          'bg-background border border-border rounded-lg shadow-sm',
          'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
          'transition-all duration-200 min-w-[140px]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isOpen && 'ring-2 ring-primary/20'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center space-x-2">
          {/* Current mode icon */}
          <div className={cn(
            'w-2 h-2 rounded-full',
            currentMode === ChatMode.ASK ? 'bg-blue-500' : 'bg-purple-500'
          )} />
          <span>{currentConfig.title}</span>
        </div>
        
        {/* Dropdown arrow */}
        <svg
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          'absolute top-full left-0 right-0 mt-1 z-50',
          'bg-background border border-border rounded-lg shadow-lg',
          'animate-in fade-in-0 zoom-in-95 duration-100'
        )}>
          <div className="py-1" role="listbox">
            {modes.map((mode) => {
              const config = CHAT_MODE_CONFIGS[mode];
              const isSelected = currentMode === mode;
              
              return (
                <button
                  key={mode}
                  onClick={() => handleModeSelect(mode)}
                  className={cn(
                    'flex items-center w-full px-4 py-2.5 text-sm text-left',
                    'hover:bg-muted/50 focus:outline-none focus:bg-muted/50',
                    'transition-colors duration-150',
                    isSelected && 'bg-muted/30'
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center space-x-3 w-full">
                    {/* Mode icon */}
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      mode === ChatMode.ASK ? 'bg-blue-500' : 'bg-purple-500'
                    )} />
                    
                    <div className="flex-1">
                      <div className="font-medium">{config.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </div>
                    </div>
                    
                    {/* Selected indicator */}
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-primary flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for smaller spaces
export const CompactModeToggle: React.FC<ModeToggleProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
  className
}) => {
  const modes = Object.values(ChatMode);

  return (
    <div className={cn(
      'inline-flex items-center rounded-lg bg-muted p-1',
      'border border-border/50',
      className
    )}>
      {modes.map((mode) => {
        const config = CHAT_MODE_CONFIGS[mode];
        const isActive = currentMode === mode;
        
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            disabled={disabled || isActive}
            className={cn(
              'relative px-2 py-1 text-xs font-medium rounded-md transition-all duration-150',
              'focus:outline-none focus:ring-1 focus:ring-primary/30',
              'disabled:cursor-not-allowed',
              isActive
                ? [
                    'bg-background text-foreground shadow-sm',
                    'dark:bg-background dark:text-foreground',
                  ]
                : [
                    'text-muted-foreground hover:text-foreground',
                    'hover:bg-background/50',
                    'dark:text-muted-foreground dark:hover:text-foreground',
                    'dark:hover:bg-background/50',
                  ],
              disabled && !isActive && 'opacity-50'
            )}
            title={config.description}
          >
            {config.title}
          </button>
        );
      })}
    </div>
  );
};

// Mode indicator with icon
export const ModeIndicator: React.FC<{
  mode: ChatMode;
  className?: string;
}> = ({ mode, className }) => {
  const config = CHAT_MODE_CONFIGS[mode];
  
  return (
    <div className={cn(
      'inline-flex items-center space-x-2 px-2 py-1 rounded-md',
      'bg-muted/50 text-muted-foreground text-xs',
      className
    )}>
      <div className={cn(
        'w-2 h-2 rounded-full',
        mode === ChatMode.ASK ? 'bg-blue-500' : 'bg-purple-500'
      )} />
      <span>{config.title}</span>
    </div>
  );
};
