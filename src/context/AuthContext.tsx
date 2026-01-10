'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { clearSessionCookie } from '@/lib/auth/client';

/**
 * User type for authenticated users
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  admin?: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check server session on mount
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser({
          uid: data.user.uid,
          email: data.user.email || null,
          displayName: data.user.displayName || null,
          photoURL: data.user.photoURL || null,
          emailVerified: data.user.emailVerified || false,
          admin: data.user.admin,
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to check server session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await clearSessionCookie();
      setUser(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign out failed');
      setError(error);
      throw error;
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<void> => {
    await checkSession();
  }, [checkSession]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    signOut,
    refreshSession,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * Must be used within an AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
