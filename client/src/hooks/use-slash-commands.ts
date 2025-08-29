// Hook for managing slash command integration
import { useState, useRef, useCallback, useEffect } from 'react';
import { useSlashCommandStore } from '../store/slash-command-store';
import { useTicketStore } from '../store/ticket-store';
import { createSlashCommandService } from '../services/slash-command-service';
import { useAuthUser } from '../store/auth-store';
import { initializeZendesk } from '../config/zendesk';
import type { Ticket } from '../types/ticket';

interface UseSlashCommandsProps {
  onInsertText?: (text: string, context?: Record<string, unknown>) => void;
  onOpenModal?: (modalType: string, data?: Record<string, unknown>) => void;
}

export const useSlashCommands = ({ onInsertText }: UseSlashCommandsProps = {}) => {
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Record<string, unknown> | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const authUser = useAuthUser();
  
  
  const {
    parseInput,
    executeCommand,
    setCommandMode,
    clearSuggestions,
    updateContext,
    updateSuggestions,
  } = useSlashCommandStore();

  const { openTicketSelector } = useTicketStore();

  // Initialize slash command service
  useEffect(() => {
    if (authUser?.email) {
      // Initialize Zendesk services
      initializeZendesk();
      
      createSlashCommandService({
        userId: authUser.email,
        currentMode: 'ask', // This could be dynamic
        userPermissions: [], // This could be fetched from auth
      });
      
      updateContext({
        userId: authUser.email,
        currentMode: 'ask',
      });
    }
  }, [authUser?.email, updateContext]);

  // Handle input changes
  const handleInputChange = useCallback((value: string) => {
    
    // Check if input has a slash with space before it or just a slash
    const hasSlashWithSpace = /\s\/$/.test(value) || value === '/';
    
    if (hasSlashWithSpace) {
      setCommandMode(true);
      parseInput(value);
      updateSuggestions(value);
      
      // Show popover if we have a textarea reference
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const rect = textarea.getBoundingClientRect();
        
        // Get cursor position within textarea
        const selectionStart = textarea.selectionStart || 0;
        const textBeforeCursor = value.substring(0, selectionStart);
        const lines = textBeforeCursor.split('\n');
        const currentLineIndex = lines.length - 1;
        const currentLine = lines[currentLineIndex];
        
        // Create a temporary element to measure text width
        const measureElement = document.createElement('div');
        measureElement.style.position = 'absolute';
        measureElement.style.visibility = 'hidden';
        measureElement.style.whiteSpace = 'pre';
        measureElement.style.font = window.getComputedStyle(textarea).font;
        measureElement.style.fontSize = window.getComputedStyle(textarea).fontSize;
        measureElement.style.fontFamily = window.getComputedStyle(textarea).fontFamily;
        measureElement.style.padding = '0';
        measureElement.style.margin = '0';
        measureElement.style.border = '0';
        measureElement.textContent = currentLine;
        
        document.body.appendChild(measureElement);
        const textWidth = measureElement.offsetWidth;
        document.body.removeChild(measureElement);
        
        // Calculate line height
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
        
        // Calculate position relative to viewport
        const newPosition = {
          x: rect.left + textWidth + 16, // Add padding offset
          y: rect.top + (currentLineIndex * lineHeight) + 16, // Add padding offset
        };
        
        setCursorPosition(newPosition);
        
        setIsPopoverVisible(true);
      } else {
        console.log('❌ No textarea ref');
      }
    } else {
      setCommandMode(false);
      setIsPopoverVisible(false);
      clearSuggestions();
    }
  }, [setCommandMode, parseInput, clearSuggestions, updateSuggestions, isPopoverVisible]);

  // Handle command selection from popover
  const handleSelectCommand = useCallback(async (command: string) => {
    setIsPopoverVisible(false);
    
    try {
      const result = await executeCommand(command, []);
      
      if (result.success && result.action) {
        switch (result.action.type) {
          case 'open_modal': {
            const modalPayload = result.action.payload as Record<string, unknown>;
            if (modalPayload.modalType === 'ticket_selector') {
              setModalData(modalPayload);
              setIsModalOpen(true);
              openTicketSelector((modalPayload.searchQuery as string) || '');
            }
            break;
          }
            
          case 'insert_text': {
            if (onInsertText) {
              const insertPayload = result.action.payload as { text: string; context?: Record<string, unknown> };
              onInsertText(
                insertPayload.text,
                insertPayload.context
              );
            }
            break;
          }
            
          case 'show_suggestions':
            // Handle showing help or suggestions
            break;
            
          case 'execute_function':
            // Handle function execution
            break;
        }
      }
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }, [executeCommand, onInsertText, openTicketSelector]);

  // Handle ticket selection from modal
  const handleSelectTicket = useCallback(async (ticket: Ticket) => {
    try {
      const result = await executeCommand('/ticket', [ticket.id]);
      
      if (result.success && result.action?.type === 'insert_text') {
        if (onInsertText) {
          const insertPayload = result.action.payload as { text: string; context?: Record<string, unknown> };
          onInsertText(
            insertPayload.text,
            insertPayload.context
          );
        }
      }
    } catch (error) {
      console.error('Failed to select ticket:', error);
    }
    
    setIsModalOpen(false);
    setModalData(null);
  }, [executeCommand, onInsertText]);

  // Close popover
  const closePopover = useCallback(() => {
    setIsPopoverVisible(false);
    clearSuggestions();
  }, [clearSuggestions]);

  // Close modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalData(null);
  }, []);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isPopoverVisible) {
        closePopover();
        e.preventDefault();
      } else if (isModalOpen) {
        closeModal();
        e.preventDefault();
      }
    }
  }, [isPopoverVisible, isModalOpen, closePopover, closeModal]);

  return {
    // State
    isPopoverVisible,
    isModalOpen,
    cursorPosition,
    modalData,
    
    // Refs
    textareaRef,
    
    // Handlers
    handleInputChange,
    handleSelectCommand,
    handleSelectTicket,
    handleKeyDown,
    closePopover,
    closeModal,
  };
};
