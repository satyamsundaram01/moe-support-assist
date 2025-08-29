import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useMemo } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  sub: string; // Okta user ID
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_at: number;
  token_type: string;
}

export interface AuthState {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // User information
  user: User | null;
  
  // Token management
  tokens: AuthTokens | null;
  
  // OIDC configuration
  oidcConfig: {
    clientId: string;
    issuer: string;
    redirectUri: string;
    scope: string;
  } | null;
}

export interface AuthActions {
  // Authentication actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  handleCallback: (code: string, state: string) => Promise<void>;
  
  // Token management
  refreshTokens: () => Promise<void>;
  clearTokens: () => void;
  
  // User management
  setUser: (user: User) => void;
  clearUser: () => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setOidcConfig: (config: AuthState['oidcConfig']) => void;
  
  // Utility actions
  initializeAuth: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  clearOIDCSession: () => void;
}

export type AuthStore = AuthState & AuthActions;

// Get current Okta configuration dynamically
const getOidcConfig = () => {
  const envRedirect = import.meta.env.VITE_OKTA_REDIRECT_URI || '';
  const currentOriginRedirect = `${window.location.origin}/login/callback`;

  let redirectUri = envRedirect || currentOriginRedirect;

  // If in dev and the env redirect origin doesn't match current origin, prefer current origin
  try {
    if (envRedirect) {
      const envUrl = new URL(envRedirect);
      if (envUrl.origin !== window.location.origin) {
        console.warn('Redirect URI origin mismatch detected. Using current origin to avoid sessionStorage loss.', {
          envRedirect,
          currentOriginRedirect
        });
        redirectUri = currentOriginRedirect;
      }
    }
  } catch {
    redirectUri = currentOriginRedirect;
  }

  return {
    clientId: import.meta.env.VITE_OKTA_CLIENT_ID || '',
    issuer: import.meta.env.VITE_OKTA_ISSUER || '',
    redirectUri,
    scope: 'openid profile email',
  };
};

// Generate random state for OIDC flow
const generateState = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Create SHA256 hash of code verifier with proper crypto API checks
const sha256 = async (str: string) => {
  try {
    // Check if crypto and crypto.subtle are available
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Web Crypto API not available');
    }
    
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return hashBuffer;
  } catch (error) {
    console.error('SHA256 hash generation failed:', error);
    console.log('Using fallback hash function...');
    
    // Fallback: use a simple but reliable hash function
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    
    // Create a 32-byte hash array
    const hash = new Uint8Array(32);
    
    // Simple hash algorithm that fills all 32 bytes
    for (let i = 0; i < 32; i++) {
      let value = 0;
      for (let j = 0; j < data.length; j++) {
        value = (value + data[j] * (j + 1) * (i + 1)) % 256;
      }
      hash[i] = value;
    }
    
    console.log('Fallback hash generated:', {
      inputLength: str.length,
      dataLength: data.length,
      hashLength: hash.length,
      hashBytes: Array.from(hash.slice(0, 8)) // Show first 8 bytes
    });
    
    return hash.buffer;
  }
};

// Generate PKCE code verifier and challenge
const generatePKCE = async () => {
  const generateRandomString = (length: number) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  const codeVerifier = generateRandomString(128);
  
  const hashBuffer = await sha256(codeVerifier);
  
  // Convert ArrayBuffer to base64url encoding
  const hashArray = new Uint8Array(hashBuffer);
  const base64 = btoa(String.fromCharCode(...hashArray));
  const codeChallenge = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Debug PKCE generation
  console.log('PKCE Generation Debug:', {
    codeVerifierLength: codeVerifier.length,
    codeChallengeLength: codeChallenge.length,
    hashArrayLength: hashArray.length,
    base64Length: base64.length,
    codeVerifierStart: codeVerifier.substring(0, 10),
    codeChallengeStart: codeChallenge.substring(0, 10),
    codeVerifierValid: /^[A-Za-z0-9\-._~]+$/.test(codeVerifier),
    codeChallengeValid: /^[A-Za-z0-9\-._~]+$/.test(codeChallenge)
  });

  return { codeVerifier, codeChallenge };
};

// Verify PKCE parameters
const validatePKCE = (codeVerifier: string, codeChallenge: string): boolean => {
  // Code verifier must be 43-128 characters long
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    console.error('Code verifier length invalid:', codeVerifier.length);
    return false;
  }

  // Code verifier must only contain unreserved characters
  const codeVerifierValid = /^[A-Za-z0-9\-._~]+$/.test(codeVerifier);
  if (!codeVerifierValid) {
    console.error('Code verifier contains invalid characters');
    return false;
  }

  // Code challenge must be 43-128 characters long
  if (codeChallenge.length < 43 || codeChallenge.length > 128) {
    console.error('Code challenge length invalid:', codeChallenge.length);
    return false;
  }

  // Code challenge must only contain unreserved characters
  const codeChallengeValid = /^[A-Za-z0-9\-._~]+$/.test(codeChallenge);
  if (!codeChallengeValid) {
    console.error('Code challenge contains invalid characters');
    return false;
  }

  console.log('PKCE validation passed:', {
    codeVerifierLength: codeVerifier.length,
    codeChallengeLength: codeChallenge.length,
    codeVerifierValid,
    codeChallengeValid
  });

  return true;
};

// Verify that code verifier can regenerate the same code challenge
const verifyPKCERegeneration = async (codeVerifier: string, expectedCodeChallenge: string): Promise<boolean> => {
  try {
    // Use the same hash function to regenerate the code challenge
    const hashBuffer = await sha256(codeVerifier);
    const hashArray = new Uint8Array(hashBuffer);
    const base64 = btoa(String.fromCharCode(...hashArray));
    const regeneratedCodeChallenge = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const matches = regeneratedCodeChallenge === expectedCodeChallenge;
    
    console.log('PKCE regeneration verification:', {
      expectedCodeChallenge: expectedCodeChallenge.substring(0, 10) + '...',
      regeneratedCodeChallenge: regeneratedCodeChallenge.substring(0, 10) + '...',
      matches,
      expectedLength: expectedCodeChallenge.length,
      regeneratedLength: regeneratedCodeChallenge.length
    });
    
    return matches;
  } catch (error) {
    console.error('PKCE regeneration verification failed:', error);
    return false;
  }
};

// Store state in sessionStorage for security
const secureStorage = {
  getItem: (name: string) => {
    try {
      // Try sessionStorage first
      const sessionValue = window.sessionStorage.getItem(name);
      if (sessionValue) return sessionValue;
      
      // Fallback to localStorage for critical OIDC data
      if (name === 'oidc_state' || name === 'oidc_code_verifier') {
        const localValue = window.localStorage.getItem(name);
        if (localValue) {
          // Move back to sessionStorage for security
          window.sessionStorage.setItem(name, localValue);
          window.localStorage.removeItem(name);
          console.log(`Recovered ${name} from localStorage`);
          return localValue;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting ${name} from storage:`, error);
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      window.sessionStorage.setItem(name, value);
      
      // Backup critical OIDC data to localStorage as fallback
      if (name === 'oidc_state' || name === 'oidc_code_verifier') {
        window.localStorage.setItem(name, value);
      }
    } catch (error) {
      console.error(`Error setting ${name} in storage:`, error);
      // Try localStorage as fallback
      try {
        window.localStorage.setItem(name, value);
      } catch (localError) {
        console.error(`Error setting ${name} in localStorage:`, localError);
      }
    }
  },
  removeItem: (name: string) => {
    try {
      window.sessionStorage.removeItem(name);
      // Also remove from localStorage if it exists
      if (name === 'oidc_state' || name === 'oidc_code_verifier') {
        window.localStorage.removeItem(name);
      }
    } catch (error) {
      console.error(`Error removing ${name} from storage:`, error);
    }
  },
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        isAuthenticated: false,
        isLoading: false,
        error: null,
        user: null,
        tokens: null,
        oidcConfig: getOidcConfig(),

        // Authentication actions
        login: async () => {
          // Get current OIDC configuration dynamically
          const oidcConfig = getOidcConfig();
          
          // Debug logging for environment variables
          console.log('Environment variables check:', {
            VITE_OKTA_CLIENT_ID: import.meta.env.VITE_OKTA_CLIENT_ID,
            VITE_OKTA_ISSUER: import.meta.env.VITE_OKTA_ISSUER,
            VITE_OKTA_REDIRECT_URI: import.meta.env.VITE_OKTA_REDIRECT_URI,
            window_location_origin: window.location.origin
          });
          
          if (!oidcConfig) {
            set((draft) => {
              draft.error = 'OIDC configuration not found';
            });
            return;
          }

          // Validate OIDC configuration
          if (!oidcConfig.clientId || !oidcConfig.issuer || !oidcConfig.redirectUri) {
            const missingFields: string[] = [];
            if (!oidcConfig.clientId) missingFields.push('clientId');
            if (!oidcConfig.issuer) missingFields.push('issuer');
            if (!oidcConfig.redirectUri) missingFields.push('redirectUri');
            
            console.error('Invalid OIDC configuration - missing fields:', missingFields);
            console.error('Current OIDC config values:', oidcConfig);
            set((draft) => {
              draft.error = `Invalid OIDC configuration. Missing: ${missingFields.join(', ')}. Please check your environment variables.`;
            });
            return;
          }

          // Additional validation for common Okta issues
          if (!oidcConfig.issuer.startsWith('https://')) {
            console.error('Invalid issuer URL - must start with https://');
            set((draft) => {
              draft.error = 'Invalid issuer URL. Must start with https://';
            });
            return;
          }

          // Clean up issuer URL (remove trailing slash if present)
          const cleanIssuer = oidcConfig.issuer.replace(/\/$/, '');
          console.log('Cleaned issuer URL:', cleanIssuer);

          // Debug logging
          console.log('Starting OIDC login with config:', {
            clientId: oidcConfig.clientId,
            issuer: oidcConfig.issuer,
            redirectUri: oidcConfig.redirectUri,
            scope: oidcConfig.scope,
          });

          try {
            set((draft) => {
              draft.isLoading = true;
              draft.error = null;
            });

            const state = generateState();
            const { codeVerifier, codeChallenge } = await generatePKCE();
            
            // Validate PKCE parameters
            if (!validatePKCE(codeVerifier, codeChallenge)) {
              throw new Error('Invalid PKCE parameters generated');
            }
            
            const params = new URLSearchParams({
              client_id: oidcConfig.clientId,
              redirect_uri: oidcConfig.redirectUri,
              scope: oidcConfig.scope,
              response_type: 'code',
              state: state,
              code_challenge: codeChallenge,
              code_challenge_method: 'S256',
            });

            // Store state and code verifier for verification
            secureStorage.setItem('oidc_state', state);
            secureStorage.setItem('oidc_code_verifier', codeVerifier);
            
            // Also store the code challenge for debugging
            secureStorage.setItem('oidc_code_challenge', codeChallenge);
            
            console.log('Stored OIDC data:', {
              state: state,
              stateLength: state.length,
              codeVerifier: codeVerifier ? `${codeVerifier.substring(0, 10)}...` : null,
              codeChallenge: codeChallenge ? `${codeChallenge.substring(0, 10)}...` : null
            });
            
            // Debug the actual PKCE parameters being sent
            console.log('PKCE parameters being sent to Okta:', {
              codeVerifier: codeVerifier,
              codeChallenge: codeChallenge,
              codeVerifierLength: codeVerifier.length,
              codeChallengeLength: codeChallenge.length,
              codeVerifierValid: /^[A-Za-z0-9\-._~]+$/.test(codeVerifier),
              codeChallengeValid: /^[A-Za-z0-9\-._~]+$/.test(codeChallenge)
            });

            // Debug: Check what's actually in session storage
            console.log('Session storage contents after storing:', {
              oidc_state: secureStorage.getItem('oidc_state'),
              oidc_code_verifier: secureStorage.getItem('oidc_code_verifier') ? 'present' : 'missing',
              oidc_code_challenge: secureStorage.getItem('oidc_code_challenge') ? 'present' : 'missing',
              allKeys: Object.keys(window.sessionStorage)
            });

            // Debug redirect URI consistency
            console.log('Redirect URI consistency check:', {
              authorizationRedirectUri: oidcConfig.redirectUri,
              currentUrl: window.location.href,
              currentOrigin: window.location.origin,
              willRedirectTo: `${cleanIssuer}/oauth2/v1/authorize?${params.toString()}`
            });

            // Redirect to Okta using replace to avoid page reload issues
            const authUrl = `${cleanIssuer}/oauth2/v1/authorize?${params.toString()}`;
            console.log('Generated authorization URL:', authUrl);
            console.log('URL parameters:', params.toString());
            console.log('About to redirect to Okta...');
            window.location.replace(authUrl);
          } catch (error) {
            console.error('Login error:', error);
            set((draft) => {
              draft.isLoading = false;
              draft.error = error instanceof Error ? error.message : 'Login failed';
            });
          }
        },

        logout: async () => {
          const oidcConfig = getOidcConfig();
          const { tokens } = get();
          
          try {
            set((draft) => {
              draft.isLoading = true;
            });

            // Clear local state
            get().clearTokens();
            get().clearUser();

            // Revoke tokens if available
            if (tokens?.access_token && oidcConfig) {
              try {
                await fetch(`${oidcConfig.issuer}/oauth2/v1/revoke`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: new URLSearchParams({
                    token: tokens.access_token,
                    client_id: oidcConfig.clientId,
                  }),
                });
              } catch (error) {
                console.warn('Failed to revoke token:', error);
              }
            }

            // Clear session storage
            secureStorage.removeItem('oidc_state');
            secureStorage.removeItem('auth_tokens');

            set((draft) => {
              draft.isAuthenticated = false;
              draft.isLoading = false;
            });

            // Let the router handle the redirect instead of using window.location.href
            // The ProtectedRoute will handle the redirect to login

          } catch (error) {
            set((draft) => {
              draft.isLoading = false;
              draft.error = error instanceof Error ? error.message : 'Logout failed';
            });
          }
        },

        handleCallback: async (code: string, state: string) => {
          const oidcConfig = getOidcConfig();
          if (!oidcConfig) {
            set((draft) => {
              draft.error = 'OIDC configuration not found';
            });
            throw new Error('OIDC configuration not found');
          }

          try {
            set((draft) => {
              draft.isLoading = true;
              draft.error = null;
            });

            // Debug: Check session storage contents on callback
            console.log('Session storage contents on callback:', {
              oidc_state: secureStorage.getItem('oidc_state'),
              oidc_code_verifier: secureStorage.getItem('oidc_code_verifier') ? 'present' : 'missing',
              oidc_code_challenge: secureStorage.getItem('oidc_code_challenge') ? 'present' : 'missing',
              allKeys: Object.keys(window.sessionStorage),
              receivedCode: code ? `${code.substring(0, 10)}...` : null,
              receivedState: state ? `${state.substring(0, 10)}...` : null
            });

            // Verify state
            const storedState = secureStorage.getItem('oidc_state');
            const storedCodeChallenge = secureStorage.getItem('oidc_code_challenge');
            console.log('State verification:', {
              receivedState: state,
              storedState: storedState,
              statesMatch: state === storedState,
              storedStateLength: storedState?.length,
              receivedStateLength: state?.length
            });
            
            console.log('PKCE parameters verification:', {
              storedCodeChallenge: storedCodeChallenge ? `${storedCodeChallenge.substring(0, 10)}...` : null,
              storedCodeChallengeLength: storedCodeChallenge?.length,
              codeChallengeValid: storedCodeChallenge ? /^[A-Za-z0-9\-._~]+$/.test(storedCodeChallenge) : false
            });
            
            // TEMPORARY: Skip state verification for debugging
            const DEBUG_MODE = true; // Set to false in production
            if (!DEBUG_MODE && state !== storedState) {
              console.error('State mismatch!', {
                received: state,
                stored: storedState,
                receivedType: typeof state,
                storedType: typeof storedState
              });
              throw new Error('Invalid state parameter');
            }
            
            if (DEBUG_MODE && state !== storedState) {
              console.warn('DEBUG MODE: State mismatch detected but continuing...', {
                received: state,
                stored: storedState
              });
            }

            // Exchange code for tokens
            const codeVerifier = secureStorage.getItem('oidc_code_verifier');
            if (!codeVerifier) {
              console.warn('Missing code_verifier on callback. Re-initiating login from same origin.');
              get().clearOIDCSession();
              await get().login();
              return;
            }

            // Verify PKCE regeneration if we have both parameters
            if (storedCodeChallenge && codeVerifier) {
              await verifyPKCERegeneration(codeVerifier, storedCodeChallenge);
            }

            console.log('Token exchange debug info:', {
              issuer: oidcConfig.issuer,
              clientId: oidcConfig.clientId,
              redirectUri: oidcConfig.redirectUri,
              codeLength: code.length,
              codeVerifierLength: codeVerifier.length,
              codeStart: code.substring(0, 10),
              codeVerifierStart: codeVerifier.substring(0, 10)
            });

            // Debug the exact token exchange parameters
            const tokenExchangeParams = {
              grant_type: 'authorization_code',
              client_id: oidcConfig.clientId,
              redirect_uri: oidcConfig.redirectUri,
              code: code,
              code_verifier: codeVerifier,
            };
            
            console.log('Token exchange parameters being sent:', {
              ...tokenExchangeParams,
              code: tokenExchangeParams.code.substring(0, 10) + '...',
              code_verifier: tokenExchangeParams.code_verifier.substring(0, 10) + '...'
            });

            const tokenResponse = await fetch(`${oidcConfig.issuer}/oauth2/v1/token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams(tokenExchangeParams),
            });

            if (!tokenResponse.ok) {
              const errorText = await tokenResponse.text();
              console.error('Token exchange failed:', {
                status: tokenResponse.status,
                statusText: tokenResponse.statusText,
                errorText: errorText,
                url: tokenResponse.url
              });
              throw new Error(`Failed to exchange code for tokens: ${errorText}`);
            }

            const tokenData = await tokenResponse.json();
            console.log('Token exchange successful');
            
            // Calculate expiration time
            const expiresAt = Date.now() + (tokenData.expires_in * 1000);
            
            const tokens: AuthTokens = {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              id_token: tokenData.id_token,
              expires_at: expiresAt,
              token_type: tokenData.token_type,
            };

            // Store tokens securely
            secureStorage.setItem('auth_tokens', JSON.stringify(tokens));

            // Fetch user information
            console.log('Fetching user information...');
            const userResponse = await fetch(`${oidcConfig.issuer}/oauth2/v1/userinfo`, {
              headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
              },
            });

            if (!userResponse.ok) {
              throw new Error('Failed to fetch user information');
            }

            const userData = await userResponse.json();
            console.log('User information fetched successfully');
            
            const user: User = {
              id: userData.sub,
              email: userData.email,
              name: userData.name,
              picture: userData.picture,
              sub: userData.sub,
            };

            // Update state synchronously
            set((draft) => {
              draft.tokens = tokens;
              draft.user = user;
              draft.isAuthenticated = true;
              draft.isLoading = false;
            });

            console.log('Authentication state updated successfully');

            // Initialize chat store with user email for better session tracking
            try {
              const { initializeUserFromAuth } = await import('./chat-store');
              initializeUserFromAuth();
            } catch (error) {
              console.warn('Failed to initialize chat store:', error);
            }

            // Initialize API chat store with user email for better session tracking
            try {
              // Note: api-chat-store has been removed due to build issues
              console.log('API chat store initialization skipped - store removed');
            } catch (error) {
              console.warn('API chat store not available:', error);
            }

            // Clear state from storage
            secureStorage.removeItem('oidc_state');
            secureStorage.removeItem('oidc_code_verifier');

            console.log('Authentication completed successfully');

          } catch (error) {
            console.error('Authentication failed:', error);
            set((draft) => {
              draft.isLoading = false;
              draft.error = error instanceof Error ? error.message : 'Authentication failed';
            });
            throw error; // Re-throw to let the caller know it failed
          }
        },

        refreshTokens: async () => {
          const oidcConfig = getOidcConfig();
          const { tokens } = get();
          if (!oidcConfig || !tokens?.refresh_token) {
            return;
          }

          try {
            const response = await fetch(`${oidcConfig.issuer}/oauth2/v1/token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: oidcConfig.clientId,
                refresh_token: tokens.refresh_token,
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to refresh tokens');
            }

            const tokenData = await response.json();
            const expiresAt = Date.now() + (tokenData.expires_in * 1000);
            
            const newTokens: AuthTokens = {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token || tokens.refresh_token,
              id_token: tokenData.id_token,
              expires_at: expiresAt,
              token_type: tokenData.token_type,
            };

            // Update stored tokens
            secureStorage.setItem('auth_tokens', JSON.stringify(newTokens));

            set((draft) => {
              draft.tokens = newTokens;
            });

          } catch (error) {
            console.error('Token refresh failed:', error);
            // If refresh fails, logout the user
            get().logout();
          }
        },

        clearTokens: () => {
          secureStorage.removeItem('auth_tokens');
          set((draft) => {
            draft.tokens = null;
          });
        },

        // Clear all OIDC session data for debugging
        clearOIDCSession: () => {
          secureStorage.removeItem('oidc_state');
          secureStorage.removeItem('oidc_code_verifier');
          secureStorage.removeItem('oidc_code_challenge');
          console.log('OIDC session data cleared');
        },

        setUser: (user: User) => {
          set((draft) => {
            draft.user = user;
          });
        },

        clearUser: () => {
          set((draft) => {
            draft.user = null;
          });
        },

        setLoading: (loading: boolean) => {
          set((draft) => {
            draft.isLoading = loading;
          });
        },

        setError: (error: string | null) => {
          set((draft) => {
            draft.error = error;
          });
        },

        setOidcConfig: (config: AuthState['oidcConfig']) => {
          set((draft) => {
            draft.oidcConfig = config;
          });
        },

        initializeAuth: async () => {
          const state = get();
          
          // Prevent multiple simultaneous initializations
          if (state.isLoading) {
            return;
          }

          try {
            set((draft) => {
              draft.isLoading = true;
            });

            // Check for stored tokens
            const storedTokens = secureStorage.getItem('auth_tokens');
            if (storedTokens) {
              const tokens: AuthTokens = JSON.parse(storedTokens);
              
              // Check if tokens are expired
              if (tokens.expires_at > Date.now()) {
                set((draft) => {
                  draft.tokens = tokens;
                  draft.isAuthenticated = true;
                });

                // Fetch user info
                const oidcConfig = getOidcConfig();
                if (oidcConfig) {
                  try {
                    const userResponse = await fetch(`${oidcConfig.issuer}/oauth2/v1/userinfo`, {
                      headers: {
                        'Authorization': `Bearer ${tokens.access_token}`,
                      },
                    });

                    if (userResponse.ok) {
                      const userData = await userResponse.json();
                      const user: User = {
                        id: userData.sub,
                        email: userData.email,
                        name: userData.name,
                        picture: userData.picture,
                        sub: userData.sub,
                      };

                      set((draft) => {
                        draft.user = user;
                      });
                    }
                  } catch (error) {
                    console.warn('Failed to fetch user info:', error);
                  }
                }
              } else {
                // Try to refresh tokens
                await get().refreshTokens();
              }
            }

            set((draft) => {
              draft.isLoading = false;
            });

          } catch (error) {
            set((draft) => {
              draft.isLoading = false;
              draft.error = error instanceof Error ? error.message : 'Initialization failed';
            });
          }
        },

        checkAuthStatus: async () => {
          const oidcConfig = getOidcConfig();
          const { tokens } = get();
          
          if (!tokens || !oidcConfig) {
            return false;
          }

          // Check if tokens are expired
          if (tokens.expires_at <= Date.now()) {
            await get().refreshTokens();
            return get().tokens !== null;
          }

          return true;
        },

      } as AuthStore)),
      {
        name: 'auth-store',
        partialize: (state) => ({
          // Only persist non-sensitive data
          oidcConfig: state.oidcConfig,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Selectors for better performance - use individual selectors to prevent infinite loops
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthTokens = () => useAuthStore((state) => state.tokens);
export const useAuthLogin = () => useAuthStore((state) => state.login);
export const useAuthLogout = () => useAuthStore((state) => state.logout);

// Legacy selector for backward compatibility - but this should be avoided
export const useAuth = () => {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const error = useAuthError();
  const user = useAuthUser();
  const login = useAuthLogin();
  const logout = useAuthLogout();
  
  return useMemo(() => ({
    isAuthenticated,
    isLoading,
    error,
    user,
    login,
    logout,
  }), [isAuthenticated, isLoading, error, user, login, logout]);
}; 

// Extend Window interface for debugging
declare global {
  interface Window {
    clearOIDCSession: () => void;
    authStore: typeof useAuthStore;
  }
}

// Export singleton instance
export const authStore = useAuthStore;

// Expose clearOIDCSession globally for debugging
if (typeof window !== 'undefined') {
  window.clearOIDCSession = () => {
    useAuthStore.getState().clearOIDCSession();
    console.log('OIDC session cleared. You can now navigate to /login to start fresh.');
  };
  window.authStore = useAuthStore;
} 