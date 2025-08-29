export type Theme = 'light' | 'dark' | 'system';
export type SidebarState = 'expanded' | 'collapsed' | 'hidden';
export type ViewMode = 'comfortable' | 'compact' | 'spacious';

export interface UIState {
  // Theme
  theme: Theme;
  
  // Layout
  sidebar: {
    isOpen: boolean;
    state: SidebarState;
    width: number;
  };
  
  // Responsive
  isMobile: boolean;
  isTablet: boolean;
  
  // Modals and dialogs
  modals: {
    settings: boolean;
    help: boolean;
    shortcuts: boolean;
    export: boolean;
    share: boolean;
  };
  
  // Notifications
  notifications: Notification[];
  
  // View preferences
  viewMode: ViewMode;
  fontSize: 'small' | 'medium' | 'large';
  
  // Interaction states
  isCommandPaletteOpen: boolean;
  focusedElement: string | null;
  
  // Error state
  globalError: AppError | null;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

export interface AppError {
  id: string;
  type: 'network' | 'auth' | 'validation' | 'server' | 'unknown';
  title: string;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  timestamp: number;
  stack?: string;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface AnimatedComponentProps extends BaseComponentProps {
  delay?: number;
  duration?: number;
  animate?: boolean;
}
