/**
 * Permission utilities for FantaCTV
 *
 * Provides consistent permission checking across the application
 * for view-only vs. edit access to league data.
 */

/**
 * Permission levels for league access
 */
export type Permission = 'view' | 'edit' | 'admin';

/**
 * User permissions object with detailed access flags
 */
export interface UserPermissions {
  /** User can view league data */
  canView: boolean;
  /** User can edit league data (admin or league admin only) */
  canEdit: boolean;
  /** User is a site-wide admin */
  isAdmin: boolean;
  /** User is a member of the league (player or admin) */
  isLeagueMember: boolean;
  /** User is the league admin */
  isLeagueAdmin: boolean;
}

/**
 * Check user permissions for a league
 *
 * Determines what level of access a user has to a specific league
 * based on their role and league membership.
 *
 * @param userRole - The user's application role ('admin' or 'player')
 * @param leagueAdminUid - UID of the league's admin
 * @param userUid - UID of the user to check
 * @param leaguePlayerUids - Array of UIDs of players in the league
 * @returns UserPermissions object with access flags
 *
 * @example
 * ```typescript
 * const permissions = getUserLeaguePermissions(
 *   user.role,
 *   league.adminUid,
 *   user.uid,
 *   league.playerUids
 * );
 *
 * if (permissions.canEdit) {
 *   // Show edit controls
 * }
 * ```
 */
export function getUserLeaguePermissions(
  userRole: string,
  leagueAdminUid: string,
  userUid: string,
  leaguePlayerUids: string[]
): UserPermissions {
  // Site-wide admin status
  const isAdmin = userRole === 'admin';

  // League-specific admin status (the user created/manages the league)
  const isLeagueAdmin = leagueAdminUid === userUid;

  // Check if user is a player in the league
  const isPlayer = leaguePlayerUids.includes(userUid);

  // User is a member if they're the league admin or a player
  const isLeagueMember = isLeagueAdmin || isPlayer;

  // Can view if they're a site admin or league member
  const canView = isAdmin || isLeagueMember;

  // Can edit if they're a site admin or the league admin
  const canEdit = isAdmin || isLeagueAdmin;

  return {
    canView,
    canEdit,
    isAdmin,
    isLeagueMember,
    isLeagueAdmin,
  };
}

/**
 * Check if user can edit scores (admin only)
 *
 * Score editing requires elevated permissions - either site admin
 * or league admin status.
 *
 * @param permissions - The user's permissions object
 * @returns true if user can edit scores
 *
 * @example
 * ```typescript
 * if (canEditScores(permissions)) {
 *   // Show score entry form
 * }
 * ```
 */
export function canEditScores(permissions: UserPermissions): boolean {
  return permissions.canEdit;
}

/**
 * Check if user can manage league (league admin or site admin)
 *
 * League management includes editing league settings, managing players,
 * and other administrative tasks.
 *
 * @param permissions - The user's permissions object
 * @param userUid - UID of the user to check
 * @param leagueAdminUid - UID of the league's admin
 * @returns true if user can manage the league
 *
 * @example
 * ```typescript
 * if (canManageLeague(permissions, user.uid, league.adminUid)) {
 *   // Show league settings
 * }
 * ```
 */
export function canManageLeague(
  permissions: UserPermissions,
  userUid: string,
  leagueAdminUid: string
): boolean {
  // Site admin can manage any league
  if (permissions.isAdmin) {
    return true;
  }

  // League admin can manage their own league
  return userUid === leagueAdminUid;
}

/**
 * Check if user can view league data
 *
 * @param permissions - The user's permissions object
 * @returns true if user can view league data
 *
 * @example
 * ```typescript
 * if (!canViewLeague(permissions)) {
 *   return <AccessDenied />;
 * }
 * ```
 */
export function canViewLeague(permissions: UserPermissions): boolean {
  return permissions.canView;
}

/**
 * Check if user has a specific permission level or higher
 *
 * Permission hierarchy: view < edit < admin
 *
 * @param permissions - The user's permissions object
 * @param required - The required permission level
 * @returns true if user has the required permission level
 *
 * @example
 * ```typescript
 * if (hasPermission(permissions, 'edit')) {
 *   // Show edit controls
 * }
 * ```
 */
export function hasPermission(
  permissions: UserPermissions,
  required: Permission
): boolean {
  switch (required) {
    case 'view':
      return permissions.canView;
    case 'edit':
      return permissions.canEdit;
    case 'admin':
      return permissions.isAdmin;
    default:
      return false;
  }
}

/**
 * Create a read-only permissions object
 *
 * Useful for non-authenticated users or public views
 *
 * @returns UserPermissions with minimal access
 */
export function createReadOnlyPermissions(): UserPermissions {
  return {
    canView: true,
    canEdit: false,
    isAdmin: false,
    isLeagueMember: false,
    isLeagueAdmin: false,
  };
}

/**
 * Create a no-access permissions object
 *
 * Useful for default state before permissions are loaded
 *
 * @returns UserPermissions with no access
 */
export function createNoAccessPermissions(): UserPermissions {
  return {
    canView: false,
    canEdit: false,
    isAdmin: false,
    isLeagueMember: false,
    isLeagueAdmin: false,
  };
}

/**
 * Create full admin permissions object
 *
 * Useful for testing or server-side operations
 *
 * @returns UserPermissions with full access
 */
export function createAdminPermissions(): UserPermissions {
  return {
    canView: true,
    canEdit: true,
    isAdmin: true,
    isLeagueMember: true,
    isLeagueAdmin: true,
  };
}
