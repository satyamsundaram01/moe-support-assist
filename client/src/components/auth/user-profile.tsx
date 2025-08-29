import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthUser, useAuthLogout } from '../../store/auth-store';
import { ThemeToggle } from '../layout/header/theme-toggle';
import Avatar, { genConfig } from 'react-nice-avatar';

interface UserProfileProps {
  variant?: 'compact' | 'full';
  showDropdown?: boolean;
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  variant = 'full', 
  showDropdown = true,
  className = ''
}) => {
  const user = useAuthUser();
  const logout = useAuthLogout();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  if (!user) return null;

  // Generate avatar config based on user name or email
  const avatarConfig = genConfig(user.name || user.email || 'user');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* User Avatar Button */}
      <motion.button
        onClick={() => showDropdown && setIsUserMenuOpen(!isUserMenuOpen)}
        className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors ${
          showDropdown ? 'cursor-pointer' : 'cursor-default'
        }`}
        whileHover={showDropdown ? { scale: 1.02 } : {}}
        whileTap={showDropdown ? { scale: 0.98 } : {}}
      >
        <div className="w-8 h-8 rounded-full border-2 border-border/50 overflow-hidden">
          <Avatar 
            style={{ width: '32px', height: '32px' }}
            {...avatarConfig}
          />
        </div>
        
        {variant === 'full' && (
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        )}
        
        {showDropdown && (
          <motion.svg
            className="w-4 h-4 text-muted-foreground"
            animate={{ rotate: isUserMenuOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        )}
      </motion.button>

      {/* User Dropdown Menu */}
      {showDropdown && (
        <AnimatePresence>
          {isUserMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-64 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl z-50"
            >
              <div className="p-4">
                {/* User Info */}
                <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-border/30">
                  <div className="w-10 h-10 rounded-full border-2 border-border/50 overflow-hidden">
                    <Avatar 
                      style={{ width: '40px', height: '40px' }}
                      {...avatarConfig}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-1">
                  {/* Dark Mode Toggle */}
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-muted-foreground">Dark Mode</span>
                    <ThemeToggle />
                  </div>

                  <button
                    onClick={() => {
                      // Handle profile settings
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Profile Settings</span>
                  </button>

                  <div className="border-t border-border/30 my-2" />

                  <button
                    onClick={() => {
                      handleLogout();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}; 