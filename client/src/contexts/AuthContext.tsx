import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { setAccessToken, getAccessToken } from '../services/apiClient';
import { login as loginRequest, logout as logoutRequest, refreshAuthToken, type AuthUser } from '../services/authService';
import { AuthContext, type AuthContextType } from './useAuth';

type User = AuthUser;

interface ApiErrorLike {
  response?: {
    status?: number;
    data?: {
      message?: unknown;
    };
  };
  message?: unknown;
}

function getLoginErrorMessage(error: unknown) {
  const apiError = error as ApiErrorLike;
  const status = apiError.response?.status;
  const message = String(apiError.response?.data?.message || apiError.message || '').trim();
  const normalizedMessage = message.toLowerCase().replace(/[\s_-]/g, '');

  if (status === 401 || normalizedMessage.includes('invalid') || normalizedMessage.includes('unauthorized')) {
    return 'invalid_credentials';
  }

  if (status === 403 || normalizedMessage.includes('disabled') || normalizedMessage.includes('inactive')) {
    return 'account_disabled';
  }

  if (normalizedMessage.includes('norefreshtoken')) {
    return 'invalid_credentials';
  }

  return 'login_unavailable';
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const { accessToken, user: userData } = await loginRequest(username, password);
      
      setAccessToken(accessToken);
      setUser(userData);
      
      return { success: true };
    } catch (error: unknown) {
      const message = getLoginErrorMessage(error);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Ignore errors during logout
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const { accessToken, user: userData } = await refreshAuthToken();
      
      setAccessToken(accessToken);
      setUser(userData);
      
      return true;
    } catch {
      setAccessToken(null);
      setUser(null);
      return false;
    }
  }, []);

  // Silent refresh on app startup
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      // Try to refresh token on startup
      await refreshAuth();
      
      setIsLoading(false);
    };

    initAuth();
  }, [refreshAuth]);

  // Setup token refresh interval (refresh 1 minute before expiry)
  useEffect(() => {
    if (!user) return;

    // Refresh token every 14 minutes (access token expires in 15 minutes)
    const intervalId = setInterval(() => {
      refreshAuth();
    }, 14 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user, refreshAuth]);

  // Listen for logout event from api interceptor
  useEffect(() => {
    const handleLogout = () => {
      setAccessToken(null);
      setUser(null);
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!getAccessToken(),
    isLoading,
    login,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
