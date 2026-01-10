'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/context/AuthContext';

interface AdminGuardProps {
  /** Content to render if user is an admin */
  children: ReactNode;
  /** URL to redirect to if user is not an admin (optional) */
  redirect?: string;
  /** Custom loading component (optional) */
  loadingComponent?: ReactNode;
  /** Custom access denied component (optional) */
  accessDeniedComponent?: ReactNode;
  /** Custom not authenticated component (optional) */
  notAuthenticatedComponent?: ReactNode;
}

/**
 * Default loading component shown while checking admin status
 */
function DefaultLoading() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        <p className="text-sm text-gray-500">Checking permissions...</p>
      </div>
    </div>
  );
}

/**
 * Default access denied component shown when user is not an admin
 */
function DefaultAccessDenied() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <div className="mb-2 text-4xl">
          <span role="img" aria-label="locked">&#128274;</span>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-red-800">Access Denied</h2>
        <p className="text-sm text-red-600">
          You do not have permission to access this page.
          <br />
          Please contact an administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
}

/**
 * Default not authenticated component shown when user is not logged in
 */
function DefaultNotAuthenticated() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
        <div className="mb-2 text-4xl">
          <span role="img" aria-label="warning">&#9888;&#65039;</span>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-yellow-800">
          Authentication Required
        </h2>
        <p className="text-sm text-yellow-600">
          Please sign in to access this page.
        </p>
      </div>
    </div>
  );
}

/**
 * Component wrapper that only renders children if the user is an admin.
 * Shows loading state while checking, and access denied message if not admin.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AdminGuard>
 *   <AdminDashboard />
 * </AdminGuard>
 *
 * // With redirect
 * <AdminGuard redirect="/login">
 *   <AdminSettings />
 * </AdminGuard>
 *
 * // With custom components
 * <AdminGuard
 *   loadingComponent={<CustomSpinner />}
 *   accessDeniedComponent={<Custom403Page />}
 * >
 *   <AdminPanel />
 * </AdminGuard>
 * ```
 */
export function AdminGuard({
  children,
  redirect,
  loadingComponent,
  accessDeniedComponent,
  notAuthenticatedComponent,
}: AdminGuardProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const isLoading = authLoading || adminLoading;
  const isAuthenticated = !!user;

  // Handle redirect when specified and access is denied
  useEffect(() => {
    if (!isLoading && redirect) {
      if (!isAuthenticated || !isAdmin) {
        router.push(redirect);
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, redirect, router]);

  // Show loading state
  if (isLoading) {
    return <>{loadingComponent ?? <DefaultLoading />}</>;
  }

  // Show not authenticated state
  if (!isAuthenticated) {
    // If redirect is set, don't show anything (will redirect)
    if (redirect) {
      return <>{loadingComponent ?? <DefaultLoading />}</>;
    }
    return <>{notAuthenticatedComponent ?? <DefaultNotAuthenticated />}</>;
  }

  // Show access denied state
  if (!isAdmin) {
    // If redirect is set, don't show anything (will redirect)
    if (redirect) {
      return <>{loadingComponent ?? <DefaultLoading />}</>;
    }
    return <>{accessDeniedComponent ?? <DefaultAccessDenied />}</>;
  }

  // User is admin, render children
  return <>{children}</>;
}

/**
 * Higher-order component version of AdminGuard
 * Wraps a component to require admin access
 *
 * @example
 * ```tsx
 * const ProtectedAdminPage = withAdminGuard(AdminPage, {
 *   redirect: '/login',
 * });
 * ```
 */
export function withAdminGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  guardProps?: Omit<AdminGuardProps, 'children'>
) {
  function WithAdminGuardComponent(props: P) {
    return (
      <AdminGuard {...guardProps}>
        <WrappedComponent {...props} />
      </AdminGuard>
    );
  }

  WithAdminGuardComponent.displayName = `WithAdminGuard(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithAdminGuardComponent;
}
