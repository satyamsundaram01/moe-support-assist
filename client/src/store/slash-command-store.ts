// Slash command store for managing command state and suggestions
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  SlashCommandResult, 
  ParsedCommand, 
  CommandSuggestion,
  CommandContext 
} from '../types/slash-commands';
import { SLASH_COMMANDS, getCommandSuggestions } from '../constants/slash-commands';
import { getSlashCommandService } from '../services/slash-command-service';

interface SlashCommandState {
  // Command parsing
  parsedCommand: ParsedCommand | null;
  isCommandMode: boolean;
  
  // Suggestions and autocomplete
  suggestions: CommandSuggestion[];
  selectedSuggestionIndex: number;
  showSuggestions: boolean;
  
  // Command execution
  isExecuting: boolean;
  lastResult: SlashCommandResult | null;
  executionError: string | null;
  
  // Context
  context: CommandContext;
  
  // UI state
  isHelpVisible: boolean;
  helpCategory: string | null;
}

interface SlashCommandActions {
  // Command parsing
  parseInput: (text: string) => void;
  setCommandMode: (mode: boolean) => void;
  
  // Suggestions management
  updateSuggestions: (input: string) => void;
  selectSuggestion: (index: number) => void;
  nextSuggestion: () => void;
  prevSuggestion: () => void;
  clearSuggestions: () => void;
  setShowSuggestions: (show: boolean) => void;
  
  // Command execution
  executeCommand: (command: string, args: string[]) => Promise<SlashCommandResult>;
  setExecuting: (executing: boolean) => void;
  setLastResult: (result: SlashCommandResult | null) => void;
  clearExecutionError: () => void;
  
  // Context management
  updateContext: (context: Partial<CommandContext>) => void;
  setContext: (context: CommandContext) => void;
  
  // Help system
  showHelp: (category?: string) => void;
  hideHelp: () => void;
  
  // Utility
  reset: () => void;
  clearAllData: () => void;
}

type SlashCommandStore = SlashCommandState & SlashCommandActions;

const initialState: SlashCommandState = {
  parsedCommand: null,
  isCommandMode: false,
  suggestions: [],
  selectedSuggestionIndex: 0,
  showSuggestions: false,
  isExecuting: false,
  lastResult: null,
  executionError: null,
  context: {
    userId: '',
    conversationId: undefined,
    currentMode: undefined,
    userPermissions: [],
  },
  isHelpVisible: false,
  helpCategory: null,
};

export const useSlashCommandStore = create<SlashCommandStore>()(
  devtools(
    immer((set, _get) => ({
      ...initialState,

      // Command parsing actions
      parseInput: (text: string) => {
        const slashCommandService = getSlashCommandService();
        if (!slashCommandService) {
          return;
        }

        const parsed = slashCommandService.parseCommand(text);
        
        set((draft) => {
          draft.parsedCommand = parsed;
          draft.isCommandMode = parsed.isValid;
          
          if (parsed.isValid) {
            draft.showSuggestions = false; // Hide suggestions when valid command is entered
          }
        });
      },

      setCommandMode: (mode: boolean) => {
        set((draft) => {
          draft.isCommandMode = mode;
          if (!mode) {
            draft.showSuggestions = false;
            draft.parsedCommand = null;
          }
        });
      },

      // Suggestions management actions
      updateSuggestions: (input: string) => {
        console.log('🔄 updateSuggestions called with:', input);
        
        // Check if input has a slash with space before it or starts with slash
        const hasSlashWithSpace = /\s\/$/.test(input) || input === '/';
        console.log('🔄 hasSlashWithSpace:', hasSlashWithSpace);
        
        if (!hasSlashWithSpace) {
          console.log('❌ Input does not match pattern, clearing suggestions');
          set((draft) => {
            draft.suggestions = [];
            draft.showSuggestions = false;
          });
          return;
        }

        const suggestions = getCommandSuggestions(input);
        console.log('📋 Raw suggestions from getCommandSuggestions:', suggestions);
        
        const commandSuggestions: CommandSuggestion[] = suggestions.map(cmd => {
          const command = SLASH_COMMANDS[cmd];
          return {
            command: cmd,
            description: command?.description || '',
            category: command?.category || 'help',
            isSelected: false,
          };
        });

        console.log('🎯 Final command suggestions:', commandSuggestions);

        set((draft) => {
          draft.suggestions = commandSuggestions;
          draft.selectedSuggestionIndex = 0;
          draft.showSuggestions = commandSuggestions.length > 0;
          
          // Mark first suggestion as selected
          if (commandSuggestions.length > 0) {
            draft.suggestions[0].isSelected = true;
          }
        });
        
        console.log('✅ Suggestions updated in store');
      },

      selectSuggestion: (index: number) => {
        set((draft) => {
          // Clear previous selection
          draft.suggestions.forEach(s => s.isSelected = false);
          
          // Set new selection
          if (draft.suggestions[index]) {
            draft.suggestions[index].isSelected = true;
            draft.selectedSuggestionIndex = index;
          }
        });
      },

      nextSuggestion: () => {
        set((draft) => {
          if (draft.suggestions.length === 0) return;
          
          // Clear current selection
          draft.suggestions[draft.selectedSuggestionIndex].isSelected = false;
          
          // Move to next suggestion
          draft.selectedSuggestionIndex = (draft.selectedSuggestionIndex + 1) % draft.suggestions.length;
          draft.suggestions[draft.selectedSuggestionIndex].isSelected = true;
        });
      },

      prevSuggestion: () => {
        set((draft) => {
          if (draft.suggestions.length === 0) return;
          
          // Clear current selection
          draft.suggestions[draft.selectedSuggestionIndex].isSelected = false;
          
          // Move to previous suggestion
          draft.selectedSuggestionIndex = draft.selectedSuggestionIndex === 0 
            ? draft.suggestions.length - 1 
            : draft.selectedSuggestionIndex - 1;
          draft.suggestions[draft.selectedSuggestionIndex].isSelected = true;
        });
      },

      clearSuggestions: () => {
        set((draft) => {
          draft.suggestions = [];
          draft.selectedSuggestionIndex = 0;
          draft.showSuggestions = false;
        });
      },

      setShowSuggestions: (show: boolean) => {
        set((draft) => {
          draft.showSuggestions = show;
        });
      },

      // Command execution actions
      executeCommand: async (command: string, args: string[]): Promise<SlashCommandResult> => {
        const slashCommandService = getSlashCommandService();
        if (!slashCommandService) {
          const errorResult: SlashCommandResult = {
            success: false,
            error: 'Slash command service not available',
            action: {
              type: 'show_suggestions',
              payload: { category: 'help' }
            }
          };
          
          set((draft) => {
            draft.lastResult = errorResult;
            draft.executionError = errorResult.error || null;
          });
          
          return errorResult;
        }

        set((draft) => {
          draft.isExecuting = true;
          draft.executionError = null;
        });

        try {
          const result = await slashCommandService.executeCommand(command, args);
          
          set((draft) => {
            draft.lastResult = result;
            draft.isExecuting = false;
            
            if (!result.success) {
              draft.executionError = result.error || null;
            }
          });
          
          return result;
        } catch (error) {
          const errorResult: SlashCommandResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Command execution failed',
            action: {
              type: 'show_suggestions',
              payload: { category: 'help' }
            }
          };
          
          set((draft) => {
            draft.lastResult = errorResult;
            draft.executionError = errorResult.error || null;
            draft.isExecuting = false;
          });
          
          return errorResult;
        }
      },

      setExecuting: (executing: boolean) => {
        set((draft) => {
          draft.isExecuting = executing;
        });
      },

      setLastResult: (result: SlashCommandResult | null) => {
        set((draft) => {
          draft.lastResult = result;
        });
      },

      clearExecutionError: () => {
        set((draft) => {
          draft.executionError = null;
        });
      },

      // Context management actions
      updateContext: (context: Partial<CommandContext>) => {
        set((draft) => {
          draft.context = { ...draft.context, ...context };
        });
        
        // Update the service context as well
        const slashCommandService = getSlashCommandService();
        if (slashCommandService) {
          slashCommandService.updateContext(context);
        }
      },

      setContext: (context: CommandContext) => {
        set((draft) => {
          draft.context = context;
        });
        
        // Update the service context as well
        const slashCommandService = getSlashCommandService();
        if (slashCommandService) {
          slashCommandService.updateContext(context);
        }
      },

      // Help system actions
      showHelp: (category?: string) => {
        set((draft) => {
          draft.isHelpVisible = true;
          draft.helpCategory = category || null;
        });
      },

      hideHelp: () => {
        set((draft) => {
          draft.isHelpVisible = false;
          draft.helpCategory = null;
        });
      },

      // Utility actions
      reset: () => {
        set((draft) => {
          draft.parsedCommand = null;
          draft.isCommandMode = false;
          draft.suggestions = [];
          draft.selectedSuggestionIndex = 0;
          draft.showSuggestions = false;
          draft.isExecuting = false;
          draft.lastResult = null;
          draft.executionError = null;
          draft.isHelpVisible = false;
          draft.helpCategory = null;
        });
      },

      clearAllData: () => {
        set((draft) => {
          Object.assign(draft, initialState);
        });
      },
    })),
    {
      name: 'slash-command-store',
    }
  )
);

// Selectors
export const useSlashCommandParsed = () => useSlashCommandStore((state) => state.parsedCommand);
export const useSlashCommandMode = () => useSlashCommandStore((state) => state.isCommandMode);
export const useSlashCommandSuggestions = () => useSlashCommandStore((state) => state.suggestions);
export const useSlashCommandSelectedIndex = () => useSlashCommandStore((state) => state.selectedSuggestionIndex);
export const useSlashCommandShowSuggestions = () => useSlashCommandStore((state) => state.showSuggestions);
export const useSlashCommandExecuting = () => useSlashCommandStore((state) => state.isExecuting);
export const useSlashCommandLastResult = () => useSlashCommandStore((state) => state.lastResult);
export const useSlashCommandError = () => useSlashCommandStore((state) => state.executionError);
export const useSlashCommandContext = () => useSlashCommandStore((state) => state.context);
export const useSlashCommandHelp = () => useSlashCommandStore((state) => ({
  isVisible: state.isHelpVisible,
  category: state.helpCategory,
})); 