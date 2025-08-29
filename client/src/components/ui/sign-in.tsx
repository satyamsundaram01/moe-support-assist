import React from 'react';
import { LogIn } from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import { Button } from './button';

interface AnimatedSignInProps {
  onSignIn?: () => void;
  className?: string;
}

const AnimatedSignIn: React.FC<AnimatedSignInProps> = ({ onSignIn, className = '' }) => {
  const { login, isLoading, error } = useAuthStore();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login();
      onSignIn?.();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <div className={`relative rounded-2xl border p-8 ${className}`}>
      {/* Subtle card shine */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -top-1/2 left-0 right-0 h-full bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-50" />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
      </div>

      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-gradient-to-tr from-primary/90 to-primary/70 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a 2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-card-foreground mb-1 tracking-tight">Moegenie</h1>
        <p className="text-muted-foreground text-sm">Your AI Assistant</p>
      </div>

      {/* Welcome Message */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-medium text-card-foreground mb-2">Welcome back</h2>
        <p className="text-muted-foreground text-sm">Sign in to continue your conversation</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-destructive flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-destructive-foreground">{error}</span>
          </div>
        </div>
      )}

      {/* Sign In Button */}
      <form onSubmit={handleSignIn}>
        <Button
          type="submit"
          disabled={isLoading}
          variant="primary"
          size="lg"
          className="w-full relative group rounded-xl"
        >
          {!isLoading && (
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
              <span className="absolute -top-1 left-0 h-1 w-full bg-white/40 opacity-60" />
            </span>
          )}

          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/50 border-t-transparent rounded-full animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Continue with Okta</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export { AnimatedSignIn }; 