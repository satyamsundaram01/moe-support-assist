import { ChatMode, type ChatModeConfig } from '../types/chat';

export const CHAT_MODE_CONFIGS: Record<ChatMode, ChatModeConfig> = {
  [ChatMode.ASK]: {
    mode: ChatMode.ASK,
    showThinking: false,
    placeholder: "Ask me anything...",
    sessionPrefix: "ask_",
    title: "Ask Mode",
    description: "Get direct answers to your questions"
  },
  [ChatMode.INVESTIGATE]: {
    mode: ChatMode.INVESTIGATE,
    showThinking: true,
    placeholder: "What would you like me to investigate?",
    sessionPrefix: "investigate_",
    title: "Investigate Mode",
    description: "Deep dive with detailed reasoning and analysis"
  }
};

export const DEFAULT_MODE = ChatMode.INVESTIGATE;
