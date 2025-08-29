export const AUTH_CONFIG = {
  // Okta OIDC Configuration
  okta: {
    clientId: import.meta.env.VITE_OKTA_CLIENT_ID || '',
    issuer: import.meta.env.VITE_OKTA_ISSUER || '',
    redirectUri: import.meta.env.VITE_OKTA_REDIRECT_URI || `${window.location.origin}/login`,
    scope: 'openid profile email',
  },

  // Application Configuration
  app: {
    name: 'AI Assistant',
    version: '1.0.0',
  },

  // Token Configuration
  tokens: {
    // Token refresh threshold (refresh 5 minutes before expiry)
    refreshThreshold: 5 * 60 * 1000,
    // Maximum token age (24 hours)
    maxAge: 24 * 60 * 60 * 1000,
  },

  // Route Configuration
  routes: {
    login: '/login',
    callback: '/callback',
    chat: '/chat',
    home: '/',
  },
};

// Validate required environment variables
export const validateAuthConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  console.log('Validating auth config:', {
    clientId: AUTH_CONFIG.okta.clientId,
    issuer: AUTH_CONFIG.okta.issuer,
    redirectUri: AUTH_CONFIG.okta.redirectUri,
  });

  if (!AUTH_CONFIG.okta.clientId) {
    errors.push('VITE_OKTA_CLIENT_ID is required');
  }

  if (!AUTH_CONFIG.okta.issuer) {
    errors.push('VITE_OKTA_ISSUER is required');
  }

  if (!AUTH_CONFIG.okta.redirectUri) {
    errors.push('VITE_OKTA_REDIRECT_URI is required');
  }

  if (errors.length > 0) {
    console.error('Auth configuration errors:', errors);
  } else {
    console.log('Auth configuration is valid');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Helper function to get Okta authorization URL
export const getOktaAuthUrl = (state: string): string => {
  const params = new URLSearchParams({
    client_id: AUTH_CONFIG.okta.clientId,
    redirect_uri: AUTH_CONFIG.okta.redirectUri,
    scope: AUTH_CONFIG.okta.scope,
    response_type: 'code',
    state: state,
  });

  return `${AUTH_CONFIG.okta.issuer}?${params.toString()}`;
};

// Helper function to get Okta token URL
export const getOktaTokenUrl = (): string => {
  return `${AUTH_CONFIG.okta.issuer}/token`;
};

// Helper function to get Okta userinfo URL
export const getOktaUserInfoUrl = (): string => {
  return `${AUTH_CONFIG.okta.issuer}/userinfo`;
};

// Helper function to get Okta revoke URL
export const getOktaRevokeUrl = (): string => {
  return `${AUTH_CONFIG.okta.issuer}/revoke`;
}; 