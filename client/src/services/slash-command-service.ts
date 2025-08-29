// Command service for handling command parsing and execution
import { SLASH_COMMANDS, parseSlashCommand, getCommandCompletions } from '../constants/slash-commands';
import type { 
  SlashCommand, 
  SlashCommandResult, 
  ParsedCommand, 
  CommandContext,
  CommandSuggestion 
} from '../types/slash-commands';
import { getTicketService } from './ticket-service';

export class SlashCommandService {
  private context: CommandContext;

  constructor(context: CommandContext) {
    this.context = context;
  }

  // Parse input text for slash commands
  parseCommand(text: string): ParsedCommand {
    const trimmed = text.trim();
    
    if (!trimmed.startsWith('/')) {
      return {
        command: '',
        args: [],
        fullText: text,
        cursorPosition: text.length,
        isValid: false
      };
    }

    const { command, args, isValid } = parseSlashCommand(trimmed);
    
    return {
      command,
      args,
      fullText: text,
      cursorPosition: text.length,
      isValid
    };
  }

  // Get command completions for autocomplete
  getCompletions(partialCommand: string): CommandSuggestion[] {
    const completions = getCommandCompletions(partialCommand);
    
    return completions.map(cmd => {
      const command = SLASH_COMMANDS[cmd];
      return {
        command: cmd,
        description: command?.description || '',
        category: command?.category || 'help',
        isSelected: false
      };
    });
  }

  // Execute a slash command
  async executeCommand(command: string, args: string[]): Promise<SlashCommandResult> {
    const cmd = SLASH_COMMANDS[command];
    
    if (!cmd) {
      return {
        success: false,
        error: `Unknown command: ${command}`,
        action: {
          type: 'show_suggestions',
          payload: { category: 'help' }
        }
      };
    }

    // Check authentication requirement
    if (cmd.requiresAuth && !this.context.userId) {
      return {
        success: false,
        error: 'Authentication required for this command',
        action: {
          type: 'show_suggestions',
          payload: { category: 'help' }
        }
      };
    }

    try {
      // Execute the command handler
      const result = await cmd.handler(args);
      
      // Add context to the result
      return {
        ...result,
        data: {
          ...(result.data || {}),
          context: this.context
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed',
        action: {
          type: 'show_suggestions',
          payload: { category: 'help' }
        }
      };
    }
  }

  // Handle ticket command specifically
  async handleTicketCommand(args: string[]): Promise<SlashCommandResult> {
    const searchQuery = args.join(' ');
    const ticketService = getTicketService();
    
    if (!ticketService) {
      return {
        success: false,
        error: 'Ticket service not configured',
        action: {
          type: 'show_suggestions',
          payload: { category: 'help' }
        }
      };
    }

    try {
      // Get tickets based on search query
      const response = await ticketService.getMyTickets({
        search: searchQuery
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to fetch tickets',
          action: {
            type: 'show_suggestions',
            payload: { category: 'help' }
          }
        };
      }

      return {
        success: true,
        data: {
          tickets: response.data?.tickets || [],
          searchQuery,
          total: response.data?.pagination.total || 0
        },
        action: {
          type: 'open_modal',
          payload: {
            modalType: 'ticket_selector',
            searchQuery,
            tickets: response.data?.tickets || []
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle ticket command',
        action: {
          type: 'show_suggestions',
          payload: { category: 'help' }
        }
      };
    }
  }

  // Handle ticket selection from modal
  async handleTicketSelection(ticketId: string): Promise<SlashCommandResult> {
    const ticketService = getTicketService();
    
    if (!ticketService) {
      return {
        success: false,
        error: 'Ticket service not configured'
      };
    }

    try {
      const response = await ticketService.selectTicket(ticketId);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to select ticket'
        };
      }

      const { ticket, summary, context } = response.data;

      return {
        success: true,
        data: {
          ticket,
          summary,
          context
        },
        action: {
          type: 'insert_text',
          payload: {
            text: summary,
            context: {
              ticketId: ticket.id,
              ticketData: context
            }
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to select ticket'
      };
    }
  }

  // Get available commands for help
  getAvailableCommands(category?: string): SlashCommand[] {
    const commands = Object.values(SLASH_COMMANDS);
    
    if (category && category !== 'all') {
      return commands.filter(cmd => cmd.category === category);
    }
    
    return commands;
  }

  // Get command help
  getCommandHelp(command: string): SlashCommand | null {
    return SLASH_COMMANDS[command] || null;
  }

  // Update context
  updateContext(newContext: Partial<CommandContext>): void {
    this.context = { ...this.context, ...newContext };
  }

  // Get current context
  getContext(): CommandContext {
    return this.context;
  }
}

// Create singleton instance
let slashCommandServiceInstance: SlashCommandService | null = null;

export const createSlashCommandService = (context: CommandContext): SlashCommandService => {
  if (!slashCommandServiceInstance) {
    slashCommandServiceInstance = new SlashCommandService(context);
  } else {
    slashCommandServiceInstance.updateContext(context);
  }
  return slashCommandServiceInstance;
};

export const getSlashCommandService = (): SlashCommandService | null => {
  return slashCommandServiceInstance;
}; 