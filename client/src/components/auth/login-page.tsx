import React, { useEffect, useRef } from 'react';
import { useIsAuthenticated, useAuthStore } from '../../store/auth-store';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatedSignIn } from '../ui/sign-in';
import BeamsBackground from '../ui/beams-background';

export const LoginPage: React.FC = () => {
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCallback } = useAuthStore();
  const hasProcessedRef = useRef(false);

  // Handle OIDC callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('LoginPage: Checking for OIDC callback', { 
      code: code ? `${code.substring(0, 10)}...` : null, 
      state: state ? `${state.substring(0, 10)}...` : null, 
      error,
      fullUrl: window.location.href
    });

    if (error) {
      console.error('OIDC error:', error);
      return;
    }

    if (code && state) {
      // Idempotency guard: ensure we process each state only once
      if (hasProcessedRef.current) {
        console.log('LoginPage: Callback already being processed - skipping');
        return;
      }
      const processedKey = `oidc_processed_state:${state}`;
      if (sessionStorage.getItem(processedKey)) {
        console.log('LoginPage: Callback for this state already processed - skipping');
        return;
      }

      hasProcessedRef.current = true;
      sessionStorage.setItem(processedKey, 'true');

      console.log('LoginPage: Processing OIDC callback with code and state');
      const processCallback = async () => {
        try {
          await handleCallback(code, state);
          console.log('LoginPage: Callback processed successfully, redirecting to chat');
          // Clear the URL parameters after successful callback
          navigate('/chat', { replace: true });
        } catch (error) {
          console.error('Error handling OIDC callback:', error);
          // Allow retry if it failed
          hasProcessedRef.current = false;
          sessionStorage.removeItem(processedKey);
        }
      };
      processCallback();
    }
  }, [searchParams, handleCallback, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('LoginPage: User is authenticated, redirecting to chat');
      navigate('/chat', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <BeamsBackground intensity="strong">
      <div className="min-h-screen relative flex items-center justify-center p-6">
        {/* Soft radial glows behind the card */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Decorative gradient ring */}
          <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-tr from-primary/30 via-primary/20 to-primary/10 opacity-60 blur-2xl" />

          <AnimatedSignIn
            className="w-full relative backdrop-blur-xl bg-white/10 dark:bg-white/5 border-white/20 shadow-2xl shadow-black/10 dark:shadow-black/30 animate-scale-in"
            onSignIn={() => {
              console.log('Sign in initiated from AnimatedSignIn component');
            }}
          />
        </div>
      </div>
    </BeamsBackground>
  );
}; 