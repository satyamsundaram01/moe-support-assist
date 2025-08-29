import React, { useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/auth-store';
import { useAuthLoading, useAuthError } from '../../store/auth-store';
import { motion } from 'framer-motion';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { initializeAuth } = useAuthStore();
  const isLoading = useAuthLoading();
  const error = useAuthError();

  // Memoize the initialization function to prevent infinite loops
  const handleInitialize = useCallback(async () => {
    try {
      await initializeAuth();
    } catch (error) {
      console.error('Auth initialization failed:', error);
    }
  }, [initializeAuth]);

  useEffect(() => {
    // Only initialize once on mount
    handleInitialize();
  }, []); // Empty dependency array to run only once

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent backdrop-blur-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing...</p>
        </motion.div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Authentication Error
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}; 