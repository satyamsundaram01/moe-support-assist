import React from 'react';
import { cn } from '../../lib/utils/cn';

export const ThinkingShimmer: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'inline-block h-4 w-32 rounded-md bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200',
        'bg-[length:200%_100%] animate-shimmer',
        'dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
        className
      )}
    />
  );
};

// Generic shimmer component for other use cases
export const Shimmer: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200',
        'bg-[length:200%_100%] animate-shimmer',
        'dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
        className
      )}
    />
  );
};
