// Slash command constants and registry
import type { SlashCommand, SlashCommandCategory } from '../types/slash-commands';

export const SLASH_COMMANDS: Record<string, SlashCommand> = {
  '/ticket': {
    command: '/ticket',
    description: 'Search and select your unsolved tickets',
    usage: '/ticket [ticket ID or keywords]',
    examples: ['/ticket', '/ticket #12345', '/ticket delivery failure'],
    category: 'tickets',
    requiresAuth: true,
    handler: async (args: string[]) => {
      // This will be implemented in the service layer
      return {
        success: true,
        action: {
          type: 'open_modal',
          payload: {
            modalType: 'ticket_selector',
            searchQuery: args.join(' '),
          }
        }
      };
    }
  },
  
  '/campaign': {
    command: '/campaign',
    description: 'Search and select campaigns',
    usage: '/campaign [campaign ID or name]',
    examples: ['/campaign', '/campaign 12345', '/campaign welcome email'],
    category: 'campaigns',
    requiresAuth: true,
    handler: async (args: string[]) => {
      return {
        success: true,
        action: {
          type: 'open_modal',
          payload: {
            modalType: 'campaign_selector',
            searchQuery: args.join(' '),
          }
        }
      };
    }
  },
  
  '/analytics': {
    command: '/analytics',
    description: 'Get analytics data',
    usage: '/analytics [metric] [timeframe]',
    examples: ['/analytics', '/analytics delivery_rate', '/analytics open_rate 7d'],
    category: 'analytics',
    requiresAuth: true,
    handler: async (args: string[]) => {
      return {
        success: true,
        action: {
          type: 'execute_function',
          payload: {
            function: 'getAnalytics',
            args: args
          }
        }
      };
    }
  },
  
  '/help': {
    command: '/help',
    description: 'Show available commands',
    usage: '/help [category]',
    examples: ['/help', '/help tickets', '/help campaigns'],
    category: 'help',
    requiresAuth: false,
    handler: async (args: string[]) => {
      return {
        success: true,
        action: {
          type: 'show_suggestions',
          payload: {
            category: args[0] || 'all'
          }
        }
      };
    }
  },
  
  '/clear': {
    command: '/clear',
    description: 'Clear the current conversation',
    usage: '/clear',
    examples: ['/clear'],
    category: 'system',
    requiresAuth: false,
    handler: async () => {
      return {
        success: true,
        action: {
          type: 'execute_function',
          payload: {
            function: 'clearConversation'
          }
        }
      };
    }
  }
};

// Command categories for organization
export const COMMAND_CATEGORIES: Record<SlashCommandCategory, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  tickets: {
    name: 'Tickets',
    description: 'Manage and search support tickets',
    icon: '🎫',
    color: 'blue'
  },
  campaigns: {
    name: 'Campaigns',
    description: 'Access campaign data and analytics',
    icon: '📧',
    color: 'green'
  },
  analytics: {
    name: 'Analytics',
    description: 'Get insights and metrics',
    icon: '📊',
    color: 'purple'
  },
  system: {
    name: 'System',
    description: 'System and app controls',
    icon: '⚙️',
    color: 'gray'
  },
  help: {
    name: 'Help',
    description: 'Help and documentation',
    icon: '❓',
    color: 'yellow'
  }
};

// Command suggestions based on context
export const getCommandSuggestions = (input: string, category?: SlashCommandCategory | 'all'): string[] => {
  const suggestions: string[] = [];
  const lowerInput = input.toLowerCase();
  
  // Check if input has a slash with space before it or starts with slash
  const hasSlashWithSpace = /\s\/$/.test(input) || input === '/';
  
  if (hasSlashWithSpace) {
    // If input is just "/" or ends with " /", return all commands
    if (input === '/' || input.endsWith(' /')) {
      suggestions.push(...Object.keys(SLASH_COMMANDS));
    } else if (input.includes('/')) {
      // Filter commands that match the partial input after the slash
      const afterSlash = input.split('/').pop() || '';
      const partialCommand = '/' + afterSlash.toLowerCase();
      suggestions.push(...Object.keys(SLASH_COMMANDS).filter(cmd => 
        cmd.toLowerCase().startsWith(partialCommand)
      ));
    }
  } else {
    // Context-based suggestions
    if (lowerInput.includes('ticket') || lowerInput.includes('issue') || lowerInput.includes('problem')) {
      suggestions.push('/ticket');
    }
    
    if (lowerInput.includes('campaign') || lowerInput.includes('email') || lowerInput.includes('delivery')) {
      suggestions.push('/campaign');
    }
    
    if (lowerInput.includes('analytics') || lowerInput.includes('metrics') || lowerInput.includes('report')) {
      suggestions.push('/analytics');
    }
    
    if (lowerInput.includes('help') || lowerInput.includes('command') || lowerInput.includes('what')) {
      suggestions.push('/help');
    }
  }
  
  // Filter by category if specified
  if (category && category !== 'all') {
    return suggestions.filter(cmd => SLASH_COMMANDS[cmd]?.category === category);
  }
  
  return suggestions;
};

// Command parsing utilities
export const parseSlashCommand = (text: string): { command: string; args: string[]; isValid: boolean } => {
  const trimmed = text.trim();
  
  if (!trimmed.startsWith('/')) {
    return { command: '', args: [], isValid: false };
  }
  
  const parts = trimmed.split(' ');
  const command = parts[0];
  const args = parts.slice(1);
  
  return {
    command,
    args,
    isValid: !!SLASH_COMMANDS[command]
  };
};

// Command completion
export const getCommandCompletions = (partialCommand: string): string[] => {
  if (!partialCommand.startsWith('/')) {
    return [];
  }
  
  return Object.keys(SLASH_COMMANDS).filter(cmd => 
    cmd.startsWith(partialCommand.toLowerCase())
  );
};
