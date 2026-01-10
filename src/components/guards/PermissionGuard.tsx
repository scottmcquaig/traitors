'use client';

import { ReactNode } from 'react';
import type { Permission, UserPermissions } from '@/lib/permissions';
import { hasPermission } from '@/lib/permissions';

export interface PermissionGuardProps {
  /** The permission level required to view the children */
  requiredPermission: Permission;
  /** The user's current permissions */
  userPermissions: UserPermissions;
  /** The content to render if user has permission */
  children: ReactNode;
  /** Optional fallback content to render if user lacks permission */
  fallback?: ReactNode;
}

/**
 * Default fallback component for access denied
 */
function DefaultAccessDenied() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center max-w-md">
        <div className="mb-3">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          Access Restricted
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You don&apos;t have permission to view this content.
        </p>
      </div>
    </div>
  );
}

/**
 * PermissionGuard - Conditionally renders children based on user permissions
 *
 * A client component that checks if the user has the required permission
 * level and renders children if authorized, or a fallback otherwise.
 *
 * @example
 * ```tsx
 * // Basic usage - show edit button only for users with edit permission
 * <PermissionGuard
 *   requiredPermission="edit"
 *   userPermissions={permissions}
 * >
 *   <EditButton onClick={handleEdit} />
 * </PermissionGuard>
 *
 * // With custom fallback
 * <PermissionGuard
 *   requiredPermission="admin"
 *   userPermissions={permissions}
 *   fallback={<p>Contact admin for access</p>}
 * >
 *   <AdminPanel />
 * </PermissionGuard>
 *
 * // Hide content completely if no permission (no fallback)
 * <PermissionGuard
 *   requiredPermission="edit"
 *   userPermissions={permissions}
 *   fallback={null}
 * >
 *   <DeleteButton />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  requiredPermission,
  userPermissions,
  children,
  fallback,
}: PermissionGuardProps) {
  // Check if user has the required permission
  if (hasPermission(userPermissions, requiredPermission)) {
    return <>{children}</>;
  }

  // If no fallback provided, show default access denied
  // If fallback is null, render nothing
  if (fallback === undefined) {
    return <DefaultAccessDenied />;
  }

  return <>{fallback}</>;
}

/**
 * EditGuard - Convenience component for edit permission checks
 *
 * Shorthand for PermissionGuard with requiredPermission="edit"
 *
 * @example
 * ```tsx
 * <EditGuard userPermissions={permissions} fallback={null}>
 *   <EditButton />
 * </EditGuard>
 * ```
 */
export function EditGuard({
  userPermissions,
  children,
  fallback = null,
}: Omit<PermissionGuardProps, 'requiredPermission'>) {
  return (
    <PermissionGuard
      requiredPermission="edit"
      userPermissions={userPermissions}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * ViewGuard - Convenience component for view permission checks
 *
 * Shorthand for PermissionGuard with requiredPermission="view"
 *
 * @example
 * ```tsx
 * <ViewGuard userPermissions={permissions}>
 *   <LeagueDetails />
 * </ViewGuard>
 * ```
 */
export function ViewGuard({
  userPermissions,
  children,
  fallback,
}: Omit<PermissionGuardProps, 'requiredPermission'>) {
  return (
    <PermissionGuard
      requiredPermission="view"
      userPermissions={userPermissions}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * AdminOnlyGuard - Convenience component for admin-only content
 *
 * Shorthand for PermissionGuard with requiredPermission="admin"
 *
 * @example
 * ```tsx
 * <AdminOnlyGuard userPermissions={permissions} fallback={null}>
 *   <SiteSettings />
 * </AdminOnlyGuard>
 * ```
 */
export function AdminOnlyGuard({
  userPermissions,
  children,
  fallback = null,
}: Omit<PermissionGuardProps, 'requiredPermission'>) {
  return (
    <PermissionGuard
      requiredPermission="admin"
      userPermissions={userPermissions}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

export default PermissionGuard;
