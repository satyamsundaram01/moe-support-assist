import { useAuthTokens } from '../store/auth-store';

export const useAuthHeaders = () => {
  const tokens = useAuthTokens();

  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (tokens?.access_token) {
      headers['Authorization'] = `Bearer ${tokens.access_token}`;
    }

    return headers;
  };

  const getFormHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};

    if (tokens?.access_token) {
      headers['Authorization'] = `Bearer ${tokens.access_token}`;
    }

    return headers;
  };

  return {
    getHeaders,
    getFormHeaders,
    isAuthenticated: !!tokens?.access_token,
  };
}; 