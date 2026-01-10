'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

interface UseAdminResult {
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** Whether the admin status is being loaded */
  loading: boolean;
  /** Any error that occurred during admin check */
  error: Error | null;
  /** Force refresh the admin status */
  refresh: () => void;
}

/**
 * Cache for admin status to prevent unnecessary API calls
 * Maps UID to { isAdmin, timestamp }
 */
const adminCache = new Map<string, { isAdmin: boolean; timestamp: number }>();

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Check if a cached value is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Hook to check if the current authenticated user is an admin
 * Caches the result to prevent unnecessary API calls
 *
 * @returns Object with isAdmin status, loading state, and error
 *
 * @example
 * ```tsx
 * function AdminDashboard() {
 *   const { isAdmin, loading } = useAdmin();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (!isAdmin) return <AccessDenied />;
 *
 *   return <AdminContent />;
 * }
 * ```
 */
export function useAdmin(): UseAdminResult {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  const checkAdminStatus = useCallback(async (uid: string, forceRefresh = false) => {
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = adminCache.get(uid);
      if (cached && isCacheValid(cached.timestamp)) {
        setIsAdmin(cached.isAdmin);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to check admin status');
      }

      const data = await response.json();
      const adminStatus = data.isAdmin === true;

      // Update cache
      adminCache.set(uid, {
        isAdmin: adminStatus,
        timestamp: Date.now(),
      });

      if (isMounted.current) {
        setIsAdmin(adminStatus);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsAdmin(false);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // If still loading auth, wait
    if (authLoading) {
      return;
    }

    // If no user, not admin
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check admin status
    checkAdminStatus(user.uid, refreshKey > 0);

    return () => {
      isMounted.current = false;
    };
  }, [user, authLoading, checkAdminStatus, refreshKey]);

  const refresh = useCallback(() => {
    if (user) {
      // Clear cache for this user
      adminCache.delete(user.uid);
      setRefreshKey((prev) => prev + 1);
    }
  }, [user]);

  return {
    isAdmin,
    loading: authLoading || loading,
    error,
    refresh,
  };
}

/**
 * Clear the admin cache for a specific user or all users
 * Useful after admin status changes
 *
 * @param uid - Optional UID to clear. If not provided, clears all cache.
 */
export function clearAdminCache(uid?: string): void {
  if (uid) {
    adminCache.delete(uid);
  } else {
    adminCache.clear();
  }
}
