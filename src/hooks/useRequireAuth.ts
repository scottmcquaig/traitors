'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type AuthUser } from '@/context/AuthContext';

interface UseRequireAuthOptions {
  /** URL to redirect to when not authenticated. Defaults to '/login' */
  redirectTo?: string;
}

interface UseRequireAuthReturn {
  /** The authenticated user, or null if not authenticated */
  user: AuthUser | null;
  /** Whether the auth state is still loading */
  loading: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
}

/**
 * Hook that requires authentication to access a page.
 * Redirects to login page if the user is not authenticated.
 *
 * @param options - Configuration options
 * @returns Object containing user, loading state, and authentication status
 *
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { user, loading, isAuthenticated } = useRequireAuth();
 *
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   // At this point, user is guaranteed to be authenticated
 *   return <div>Welcome, {user?.email}</div>;
 * }
 * ```
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}): UseRequireAuthReturn {
  const { redirectTo = '/login' } = options;
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAuthenticated = !!user;

  useEffect(() => {
    // Don't redirect while still loading auth state
    if (loading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!user) {
      // Preserve the current URL to redirect back after login
      const currentPath = window.location.pathname;
      const searchParams = new URLSearchParams();

      if (currentPath !== '/' && currentPath !== '/login') {
        searchParams.set('returnTo', currentPath);
      }

      const redirectUrl = searchParams.toString()
        ? `${redirectTo}?${searchParams.toString()}`
        : redirectTo;

      router.replace(redirectUrl);
    }
  }, [user, loading, router, redirectTo]);

  return {
    user,
    loading,
    isAuthenticated,
  };
}

export default useRequireAuth;
