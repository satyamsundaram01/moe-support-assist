// Slash command types for the chat input system
export interface SlashCommand {
  command: string;
  description: string;
  usage: string;
  examples: string[];
  category: SlashCommandCategory;
  requiresAuth: boolean;
  handler: (args: string[]) => Promise<SlashCommandResult>;
}

export interface SlashCommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
  action?: SlashCommandAction;
}

export interface SlashCommandAction {
  type: SlashCommandActionType;
  payload: unknown;
}

export type SlashCommandActionType = 
  | 'open_modal'
  | 'insert_text'
  | 'replace_text'
  | 'send_message'
  | 'show_suggestions'
  | 'execute_function';

export type SlashCommandCategory = 
  | 'tickets'
  | 'system'
  | 'campaigns'
  | 'analytics'
  | 'help'

// Command parsing
export interface ParsedCommand {
  command: string;
  args: string[];
  fullText: string;
  cursorPosition: number;
  isValid: boolean;
}

// Command suggestions
export interface CommandSuggestion {
  command: string;
  description: string;
  category: SlashCommandCategory;
  isSelected: boolean;
}

// Command registry
export interface CommandRegistry {
  [command: string]: SlashCommand;
}

// Command context
export interface CommandContext {
  userId: string;
  conversationId?: string;
  currentMode?: string;
  userPermissions?: string[];
}
