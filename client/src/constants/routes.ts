// Route constants
export const ROUTES = {
  ROOT: '/',
  CHAT: '/chat',
  CHAT_NEW: '/chat/new',
  CHAT_ASK: '/chat/ask',
  CHAT_INVESTIGATE: '/chat/investigate',
  CHAT_ASK_SESSION: '/chat/ask/:sessionId',
  CHAT_INVESTIGATE_SESSION: '/chat/investigate/:sessionId',
  CHAT_SESSION: '/chat/:sessionId',
  SETTINGS: '/settings',
  PROMPTS: '/prompts',
};

// Route builders for dynamic URLs
export const buildChatRoute = (sessionId?: string, mode?: 'ask' | 'investigate') => {
  if (!sessionId) {
    // Return mode-specific route when no sessionId
    if (mode === 'ask') return ROUTES.CHAT_ASK;
    if (mode === 'investigate') return ROUTES.CHAT_INVESTIGATE;
    return ROUTES.CHAT; // fallback to base chat route
  }
  if (mode === 'ask') return `/chat/ask/${sessionId}`;
  if (mode === 'investigate') return `/chat/investigate/${sessionId}`;
  return `/chat/${sessionId}`;
};

export const buildNewChatRoute = (mode?: 'ask' | 'investigate') => {
  if (mode === 'ask') return ROUTES.CHAT_ASK;
  if (mode === 'investigate') return ROUTES.CHAT_INVESTIGATE;
  return ROUTES.CHAT_NEW;
};
