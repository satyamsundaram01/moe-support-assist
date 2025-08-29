// ============================================================================
// CORE UI COMPONENTS
// ============================================================================

// Form Components
export { Button, buttonVariants } from './button';
export { Input } from './input';
export { Badge, badgeVariants } from './badge';

// Navigation Components
export { SidebarButton } from './sidebar-button';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu';

// ============================================================================
// AUTHENTICATION COMPONENTS
// ============================================================================

// Authentication Components
export { AnimatedSignIn } from './sign-in';
export { UserProfile } from '../auth/user-profile';

// ============================================================================
// FEEDBACK & STATUS
// ============================================================================

// Feedback Components
// export { ThinkingShimmer } from './shimmer';

// Toast System
export { ToastProvider, useToast, useToastEvents } from './toast';
export { SonnerToastProvider, useSonnerToast } from './sonner-toast-provider';

// Enhanced Toast System
export { 
  EnhancedToastItem, 
  EnhancedToastContainer, 
  useEnhancedToast,
  type EnhancedToastConfig,
  type ToastAction 
} from './enhanced-toast';

// Alert Modal System
export { 
  AlertModal, 
  useAlertModal,
  type AlertModalConfig,
  type AlertAction 
} from './alert-modal';

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Error Handling
export { 
  ErrorBoundary, 
  ErrorFallback, 
  ChatErrorFallback, 
  SidebarErrorFallback, 
  ComponentErrorFallback 
} from './error-boundary';
