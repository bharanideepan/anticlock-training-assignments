import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import * as authApi from '../api/auth.api';
import type { AuthUser } from '../api/auth.api';

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (data: authApi.LoginResponse) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  isLoading: true,
  login: () => undefined,
  logout: async () => undefined,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt silent refresh on mount to restore session
  useEffect(() => {
    let cancelled = false;
    authApi
      .refresh()
      .then((data) => {
        if (cancelled) return;
        setAccessToken(data.accessToken);
        return authApi.getMe(data.accessToken);
      })
      .then((u) => {
        if (cancelled || !u) return;
        setUser(u);
      })
      .catch(() => {
        // No valid session — leave as guest
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((data: authApi.LoginResponse) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        await authApi.logout(accessToken);
      }
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, [accessToken]);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
