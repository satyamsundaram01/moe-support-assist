import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Settings, ChevronDown, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../ui/button';
import { UserProfile } from '../../auth/user-profile';
import { cn } from '../../../lib/utils';
import { useCurrentMode } from '../../../stores/conversation-store';
import { useChatNavigation } from '../../../hooks/use-chat-navigation';
import { ChatMode } from '../../../types/chat';
import { CHAT_MODE_CONFIGS } from '../../../constants/chat-modes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';
import { EnhancedBanner } from '../../announcements/enhanced-banner';

interface AppHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  className?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onToggleSidebar,
  sidebarOpen,
  className,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentMode = useCurrentMode();
  const { navigateToMode } = useChatNavigation();

  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isAdminPage = location.pathname.startsWith('/admin');
  const isPromptLibraryPage = location.pathname.startsWith('/prompts');
  
  const handleAdminToggle = () => {
    if (isAdminPage) {
      navigate('/chat');
    } else {
      navigate('/admin');
    }
  };

  const handleBackToChat = () => {
    navigate('/chat');
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModeSelect = (mode: ChatMode) => {
    console.log('🔄 [AppHeader] Mode selection triggered:', {
      selectedMode: mode,
      currentMode,
      modes: modes.map(m => ({ key: m.key, label: m.label }))
    });
    
    if (mode !== currentMode) {
      try {
        console.log('🔄 [AppHeader] Switching mode from', currentMode, 'to', mode);
        navigateToMode(mode);
        console.log('✅ [AppHeader] Mode switch navigation completed');
      } catch (error) {
        console.error('❌ [AppHeader] Failed to switch mode:', error);
      }
    } else {
      console.log('ℹ️ [AppHeader] Mode already set to', mode);
    }
    setIsModeDropdownOpen(false);
  };

  const currentConfig = CHAT_MODE_CONFIGS[currentMode as keyof typeof CHAT_MODE_CONFIGS] || CHAT_MODE_CONFIGS[ChatMode.INVESTIGATE];
  const modes = [
    { key: ChatMode.ASK, label: 'Ask', config: CHAT_MODE_CONFIGS[ChatMode.ASK] },
    { key: ChatMode.INVESTIGATE, label: 'Investigate', config: CHAT_MODE_CONFIGS[ChatMode.INVESTIGATE] }
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn(
        'flex-shrink-0 sticky top-0 z-50  bg-transparent backdrop-blur-2xl dark:bg-transparent',
        className
      )}
    >
      <div className="w-full rounded-2xl px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left side - Sidebar toggle and mode selector */}
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button
                onClick={onToggleSidebar}
                variant="ghost"
                size="sm"
                className="p-1.5 hover:bg-primary/10 rounded-md cursor-pointer"
                aria-label="Open sidebar"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            
            {/* Show Prompt Library title or Mode Selector */}
            {isPromptLibraryPage ? (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleBackToChat}
                  variant="ghost"
                  size="sm"
                  className="p-1.5 hover:bg-primary/10 rounded-md cursor-pointer"
                  aria-label="Back to chat"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="font-semibold text-foreground">Prompt Library</span>
                </div>
              </div>
            ) : (
              /* Mode Selector Dropdown */
              <TooltipProvider>
                <div className="relative" ref={dropdownRef}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                          'hover:bg-muted/50 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]',
                          'text-foreground cursor-pointer',
                          isModeDropdownOpen && 'bg-muted/50'
                        )}
                      >
                        <span className="font-semibold">{currentConfig.title}</span>
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 transition-transform duration-200 text-muted-foreground',
                            isModeDropdownOpen && 'rotate-180'
                          )}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Switch between Ask and Investigate modes</p>
                    </TooltipContent>
                  </Tooltip>

                  <AnimatePresence>
                    {isModeDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-3 min-w-md z-50"
                      >
                        <div className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl dark:shadow-black/30 p-3">
                          {modes.map((mode) => (
                            <button
                              key={mode.key}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => handleModeSelect(mode.key)}
                              className={cn(
                                'w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                                'hover:bg-muted/60 focus:outline-none focus:bg-muted/60',
                                'active:scale-[0.98] cursor-pointer group',
                                currentMode === mode.key
                                  ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm'
                                  : 'text-foreground hover:border-border/50 border border-transparent'
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="flex flex-col">
                                    <div className="font-semibold text-sm leading-tight">{mode.config.title}</div>
                                    <div className="text-xs text-muted-foreground mt-1 leading-tight max-w-lg">
                                      {mode.config.description}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </TooltipProvider>
            )}
          </div>

          {/* Right side - Admin, Share button and User profile */}
          <div className="flex items-center gap-2">
            {!isPromptLibraryPage && (
              <Button
                onClick={handleAdminToggle}
                variant={isAdminPage ? "primary" : "ghost"}
                size="sm"
                className={cn(
                  "px-3 py-1 text-sm font-medium transition-all duration-150 rounded-full",
                  isAdminPage 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "text-muted-foreground hover:bg-muted/80 border border-border"
                )}
              >
                <Settings className="h-3 w-3 mr-1" />
                {isAdminPage ? 'Chat' : 'Admin'}
              </Button>
            )}
            
            {!isPromptLibraryPage && (
              <Button
                variant="ghost"
                size="sm"
                className="px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-muted/80 border border-border rounded-full transition-all duration-150"
              >
                Share
              </Button>
            )}
            
            {/* User Profile with Theme Toggle in dropdown */}
            <UserProfile variant="compact" showDropdown={true} />
          </div>
        </div>
      </div>

      {/* Enhanced Banner Component */}
      <EnhancedBanner />
    </motion.header>
  );
};