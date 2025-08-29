import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { cn } from '../../../lib/utils/cn';
import { Button } from '../../ui/button';
import { CHAT_MODE_CONFIGS } from '../../../constants/chat-modes';
import { useCurrentMode } from '../../../stores/conversation-store';
import { useSessionStore } from '../../../stores/session-store';
import { useIsStreaming } from '../../../stores/streaming-store';
import { 
  ArrowUpIcon, 
  CheckIcon,
  GlobeAltIcon, 
  DocumentTextIcon, 
  BookOpenIcon, 
  TicketIcon 
} from '@heroicons/react/24/outline';
import { ChatMode } from '../../../types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalytics } from '../../../hooks/use-analytics';
import { TicketSelectorModal } from '../modals/ticket-selector-modal';
import { TicketChip } from './ticket-chip';
import type { Ticket } from '../../../types/ticket';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "../../../components/ui/prompt-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import { initializeZendesk } from '../../../config/zendesk';
import { useAuthUser } from '../../../store/auth-store';
import { validateChatMessage } from '../../../utils/validation';
import { useSonnerToast } from '../../ui/sonner-toast-provider';

// Extend Window interface for analytics tracking
declare global {
  interface Window {
    lastModeChange?: number;
    focusStartTime?: number;
  }
}

interface EnhancedChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

const MAX_HEIGHT = 120;

// Data sources for Ask mode
const DATA_SOURCES = [
  {
    id: 'all',
    name: 'All Sources',
    description: 'Search across all available data sources',
    icon: GlobeAltIcon
  },
  {
    id: 'moe-gs-public-docs-live-public_1752599761524_gcs_store',
    name: 'Public Docs',
    description: 'Public help documentation',
    icon: DocumentTextIcon
  },
  {
    id: 'moe-confluence-support-runbooks-live-p_1752497946721_page',
    name: 'Confluence',
    description: 'Internal runbooks',
    icon: BookOpenIcon
  },
  {
    id: 'moe-gs-zendesk-live-private_1752599941188_gcs_store',
    name: 'Zendesk',
    description: 'Support tickets',
    icon: TicketIcon
  }
];

// Smart suggestions based on conversation context
const getSmartSuggestions = (input: string, mode: ChatMode): string[] => {
  if (!input.trim()) return [];
  
  const suggestions = [];
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('how') || lowerInput.includes('what')) {
    suggestions.push('Can you provide more context?', 'What specific aspect are you interested in?');
  }
  
  if (lowerInput.includes('react') || lowerInput.includes('javascript')) {
    suggestions.push('Are you looking for code examples?', 'Do you need best practices?');
  }
  
  if (mode === ChatMode.INVESTIGATE) {
    suggestions.push('Would you like me to research this further?', 'Should I analyze different perspectives?');
  }
  
  return suggestions.slice(0, 2);
};

export const EnhancedChatInput: React.FC<EnhancedChatInputProps> = memo(({ 
  onSendMessage, 
  disabled = false, 
  className 
}) => {
  const { trackClick, trackMessage, track } = useAnalytics();
  const containerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Toast for user feedback
  const { error } = useSonnerToast();

  // Store state - use the new useCurrentMode selector
  const currentMode = useCurrentMode();
  const { selectedDataSources, setSelectedDataSources, clearSelectedDataSources } = useSessionStore();
  const isStreaming = useIsStreaming();
  const authUser = useAuthUser();

  const currentConfig = CHAT_MODE_CONFIGS[currentMode];
  const suggestions = getSmartSuggestions(input, currentMode);

  // Initialize Zendesk when component mounts and user is authenticated
  useEffect(() => {
    if (authUser?.email) {
      initializeZendesk();
    }
  }, [authUser?.email]);

  // Handle ticket selection - add to chips instead of replacing text
  const handleTicketSelect = useCallback((ticket: Ticket) => {
    const ticketId = ticket.id;
    
    // Add ticket to selected tickets if not already selected
    if (!selectedTickets.includes(ticketId)) {
      setSelectedTickets(prev => [...prev, ticketId]);
      
      // Track the ticket selection
      track('ticket_selected', {
        ticketId,
        mode: currentMode,
      });
    }
  }, [selectedTickets, track, currentMode]);

  // Handle ticket removal
  const handleTicketRemove = useCallback((ticketId: string) => {
    setSelectedTickets(prev => prev.filter(id => id !== ticketId));
    
    track('ticket_removed', {
      ticketId,
      mode: currentMode,
    });
  }, [track, currentMode]);

  // Handle data source selection
  const handleDataSourceSelect = useCallback((dataSourceId: string) => {
    if (dataSourceId === 'all') {
      // If "All" is selected, clear other selections and select all
      clearSelectedDataSources();
      track('data_source_selected', {
        dataSourceId: 'all',
        mode: currentMode,
      });
    } else {
      // If a specific source is selected, remove "all" and add the specific source
      const currentSources = selectedDataSources.filter(id => id !== 'all');
      if (!currentSources.includes(dataSourceId)) {
        setSelectedDataSources([...currentSources, dataSourceId]);
      }
      
      track('data_source_selected', {
        dataSourceId,
        mode: currentMode,
      });
    }
  }, [clearSelectedDataSources, setSelectedDataSources, selectedDataSources, track, currentMode]);

  // Handle data source removal
  const handleDataSourceRemove = useCallback((dataSourceId: string) => {
    const newSelection = selectedDataSources.filter(id => id !== dataSourceId);
    // If no sources are selected, default to "all"
    setSelectedDataSources(newSelection.length > 0 ? newSelection : ['all']);
    
    track('data_source_removed', {
      dataSourceId,
      mode: currentMode,
    });
  }, [setSelectedDataSources, selectedDataSources, track, currentMode]);

  // Handle input change
  const handleInputChangeInternal = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleSubmit = async () => {
    if (!disabled && !isStreaming && input.trim()) {
      // Validate the input before processing
      const validation = validateChatMessage(input.trim());
      
      if (!validation.isValid) {
        error("Invalid Message", {
          description: validation.error || "Please check your message and try again.",
        });
        
        // Track validation failure
        track('message_validation_failed', {
          error_code: validation.errorCode,
          message_length: input.length,
          mode: currentMode,
          timestamp: Date.now(),
        });
        
        return; 
      }

      // Prepare the message - use the validated and trimmed input
      const messageToSend = input.trim();
      
      // Track the message send
      trackMessage('user', input.length, {
        mode: currentMode,
        has_attachments: false,
        input_method: 'keyboard',
        ticket_count: selectedTickets.length,
        data_source_count: selectedDataSources.length,
      });

      // Track the send button click
      trackClick('send_message', {
        message_length: input.length,
        mode: currentMode,
        ticket_count: selectedTickets.length,
        data_source_count: selectedDataSources.length,
      });

      // Send the message - let useChatLogic handle conversation and session creation
      onSendMessage(messageToSend);
      setInput('');
      setSelectedTickets([]); // Clear selected tickets after sending
      clearSelectedDataSources(); // Reset to "all" after sending
      
      // Track successful message send
      track('message_sent', {
        message_length: input.length,
        mode: currentMode,
        ticket_count: selectedTickets.length,
        data_source_count: selectedDataSources.length,
        timestamp: Date.now(),
      });
    }
  };

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    track('input_focused', {
      mode: currentMode,
      input_length: input.length,
    });
  }, [currentMode, input.length, track]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    track('input_blurred', {
      mode: currentMode,
      input_length: input.length,
      session_duration: Date.now() - (window.focusStartTime || 0),
    });
  }, [currentMode, input.length, track]);

  // Track focus duration
  useEffect(() => {
    if (isFocused) {
      window.focusStartTime = Date.now();
    }
  }, [isFocused]);

  const canSend = input.trim().length > 0 && !isStreaming && !isComposing;

  return (
    <div className={cn('w-full', className)}>
      <div className="w-full max-w-4xl mx-auto px-4">
        {/* Smart Suggestions */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              ref={containerRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-3 p-3 bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg"
            >
              <div className="text-xs text-muted-foreground mb-2 font-medium">�� Suggestions:</div>
              <div className="space-y-1">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      setInput(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="block w-full text-left p-2 text-sm text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Tickets Chips (Investigate Mode) */}
        <AnimatePresence>
          {currentMode === ChatMode.INVESTIGATE && selectedTickets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-3 p-3 bg-card/60 backdrop-blur-sm border border-border/30 rounded-xl"
            >
              <div className="text-xs text-muted-foreground mb-2 font-medium">
                🎫 Selected Tickets:
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedTickets.map((ticketId) => (
                  <TicketChip
                    key={ticketId}
                    ticketId={ticketId}
                    onRemove={() => handleTicketRemove(ticketId)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Data Sources Chips (Ask Mode) */}
        <AnimatePresence>
          {currentMode === ChatMode.ASK && selectedDataSources.length > 0 && !selectedDataSources.includes('all') && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-3 p-3 bg-card/60 backdrop-blur-sm border border-border/30 rounded-xl"
            >
              <div className="text-xs text-muted-foreground mb-2 font-medium">
                📚 Selected Data Sources:
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedDataSources.map((sourceId) => {
                  const source = DATA_SOURCES.find(s => s.id === sourceId);
                  const IconComponent = source?.icon;
                  return (
                    <div
                      key={sourceId}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm"
                    >
                      {IconComponent && React.createElement(IconComponent, { className: "w-4 h-4" })}
                      <span className="font-medium">{source?.name || sourceId}</span>
                      <button
                        onClick={() => handleDataSourceRemove(sourceId)}
                        className="ml-1 hover:bg-primary/20 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prompt Input Container */}
        <div className="relative">
          <PromptInput
            isLoading={isStreaming}
            value={input}
            onValueChange={handleInputChangeInternal}
            onSubmit={handleSubmit}
            maxHeight={MAX_HEIGHT}
            className={cn(
              'border-border bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs',
              'bg-card/70 backdrop-blur-xl border ',
              'transition-all duration-300 ease-out',
              isFocused && 'ring-1 ring-primary/10 border-primary/30 backdrop-blur-xl',
              isStreaming && 'ring-2 ring-primary/40 backdrop-blur-xl',
              input.trim().length > 0 && 'bg-card/80 backdrop-blur-xl',
              isComposing && 'ring-1 ring-primary/10 border-primary/30 backdrop-blur-xl'
            )}
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder={currentConfig.placeholder}
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={disabled || isStreaming || isComposing}
              />

              <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-2">
                  {/* Mode-specific actions */}
                  {currentMode === ChatMode.INVESTIGATE ? (
                    /* Ticket selector action for Investigate mode */
                    <PromptInputAction tooltip="Select tickets">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full"
                        onClick={() => setIsTicketModalOpen(true)}
                      >
                        <TicketIcon className="w-4 h-4" />
                      </Button>
                    </PromptInputAction>
                  ) : (
                    /* Data source selector popover for Ask mode */
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9 rounded-full"
                        >
                          <GlobeAltIcon className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2 rounded-xl" align="start">
                        <div className="space-y-1">
                          {DATA_SOURCES.map((source) => {
                            const IconComponent = source.icon;
                            const isSelected = selectedDataSources.includes(source.id);
                            return (
                              <motion.button
                                key={source.id}
                                onClick={() => handleDataSourceSelect(source.id)}
                                className={cn(
                                  'w-full text-left cursor-pointer px-3 py-2 rounded-lg transition-all duration-200',
                                  'hover:bg-muted/50 focus:outline-none focus:bg-muted/50',
                                  isSelected
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-foreground'
                                )}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center gap-3">
                                  {IconComponent && React.createElement(IconComponent, {
                                    className: cn(
                                      "w-4 h-4",
                                      isSelected ? "text-primary" : "text-muted-foreground"
                                    )
                                  })}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{source.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{source.description}</div>
                                  </div>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <CheckIcon className="w-4 h-4 text-primary" />
                                    </motion.div>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Character count indicator */}
                  {input.length > 1500 && (
                    <div className="text-xs text-muted-foreground font-mono">
                      {input.length}/2000
                    </div>
                  )}

                  {/* Send button */}
                  <Button
                    size="icon"
                    disabled={!canSend || isComposing}
                    onClick={handleSubmit}
                    className="size-9 rounded-full"
                  >
                    {isStreaming ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isComposing ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
                    ) : (
                      <ArrowUpIcon className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </PromptInputActions>
            </div>
          </PromptInput>
        </div>
      </div>

      {/* Ticket Selector Modal */}
      <TicketSelectorModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onSelectTicket={handleTicketSelect}
        searchQuery=""
      />
    </div>
  );
});
