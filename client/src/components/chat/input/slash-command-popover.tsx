// Slash command popover component
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils/cn';
import { useSlashCommandStore } from '../../../store/slash-command-store';
import { COMMAND_CATEGORIES } from '../../../constants/slash-commands';

interface SlashCommandPopoverProps {
  isVisible: boolean;
  inputValue: string;
  cursorPosition: { x: number; y: number };
  onSelectCommand: (command: string) => void;
  onClose: () => void;
}

export const SlashCommandPopover: React.FC<SlashCommandPopoverProps> = ({
  isVisible,
  inputValue,
  cursorPosition,
  onSelectCommand,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  const {
    suggestions,
    updateSuggestions,
    selectSuggestion,
    clearSuggestions,
  } = useSlashCommandStore();

  // Create portal container on mount
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'slash-command-popover-portal';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    
    document.body.appendChild(container);
    setPortalContainer(container);
    
    return () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, []);

  // Update suggestions when input changes
  useEffect(() => {
    const hasSlashWithSpace = /\s\/$/.test(inputValue) || inputValue === '/';
    
    if (isVisible && hasSlashWithSpace) {
      updateSuggestions(inputValue);
    } else {
      clearSuggestions();
    }
  }, [inputValue, isVisible, updateSuggestions, clearSuggestions]);


  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            onSelectCommand(suggestions[selectedIndex].command);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, suggestions, selectedIndex, onSelectCommand, onClose]);

  // Update selected suggestion in store
  useEffect(() => {
    if (suggestions.length > 0) {
      selectSuggestion(selectedIndex);
    }
  }, [selectedIndex, suggestions.length, selectSuggestion]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  if (!isVisible || suggestions.length === 0 || !portalContainer) {
    return null;
  }


  // Calculate position to ensure popover stays within viewport
  const calculatePosition = () => {
    const popoverWidth = 320; // w-80 = 320px
    const popoverHeight = Math.min(256, suggestions.length * 60 + 80); // max-h-64 with header/footer
    
    let x = cursorPosition.x;
    let y = cursorPosition.y - popoverHeight - 10; // Position above cursor
    
    // Ensure popover doesn't go off screen horizontally
    if (x + popoverWidth > window.innerWidth) {
      x = window.innerWidth - popoverWidth - 10;
    }
    if (x < 10) {
      x = 10;
    }
    
    // If popover would go above viewport, position below cursor instead
    if (y < 10) {
      y = cursorPosition.y + 30;
    }
    
    // Ensure popover doesn't go below viewport
    if (y + popoverHeight > window.innerHeight) {
      y = window.innerHeight - popoverHeight - 10;
    }
    
    return { x, y };
  };

  const position = calculatePosition();

  const popoverContent = (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed"
        style={{
          left: position.x,
          top: position.y,
          pointerEvents: 'auto',
          zIndex: 9999,
        }}
      >
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl max-w-sm w-80 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/30 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Slash Commands
              </span>
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {suggestions.length}
              </span>
            </div>
          </div>

          {/* Command list */}
          <div className="max-h-64 overflow-y-auto">
            {suggestions.map((suggestion, index) => {
              const category = COMMAND_CATEGORIES[suggestion.category];
              const isSelected = index === selectedIndex;

              return (
                <motion.button
                  key={suggestion.command}
                  onClick={() => onSelectCommand(suggestion.command)}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors duration-150 border-b border-border/20 last:border-b-0',
                    isSelected && 'bg-muted/70'
                  )}
                  whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.6)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    {/* Category icon */}
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-lg bg-muted/30 rounded-lg">
                      {category?.icon || '⚡'}
                    </div>

                    {/* Command info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {suggestion.command}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-2 h-2 bg-primary rounded-full"
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {suggestion.description}
                      </p>
                    </div>

                    {/* Category badge */}
                    <div className="flex-shrink-0">
                      <span
                        className={cn(
                          'px-2 py-1 text-xs rounded-full font-medium',
                          'bg-muted/60 text-muted-foreground border border-border/30'
                        )}
                      >
                        {category?.name}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border/30 bg-muted/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Use ↑↓ to navigate, Enter to select</span>
              <span>Esc to close</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return portalContainer ? createPortal(popoverContent, portalContainer) : null;
};
