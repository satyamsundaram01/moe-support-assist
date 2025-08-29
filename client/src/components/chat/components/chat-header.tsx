import React from 'react';
import { Button } from '../../ui/button';
import { UserProfile } from '../../auth/user-profile';

export const ChatHeader: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-background transition-colors duration-300">
      {/* Left side - Title only */}
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-foreground transition-colors duration-300">
          Support Assist
        </h1>
      </div>

      {/* Right side - Share button and User profile */}
      <div className="flex items-center space-x-3">
        {/* Share Button */}
        <Button
          variant="ghost"
          size="sm"
          className="px-3 py-1 text-sm font-medium text-text-secondary dark:text-text-secondary hover:bg-surface-200/80 dark:hover:bg-surface-800/60 border border-border dark:border-border rounded-full transition-all duration-150"
        >
          Share
        </Button>
        
        {/* User Profile Section with Theme Toggle in dropdown */}
        <UserProfile variant="full" showDropdown={true} />
      </div>
    </div>
  );
}; 