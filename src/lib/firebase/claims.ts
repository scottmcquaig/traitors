import { getAdminAuth } from './admin';
import { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Custom claims key for admin status
 */
const ADMIN_CLAIM_KEY = 'admin';

/**
 * Interface for custom claims
 */
export interface CustomClaims {
  admin?: boolean;
  role?: string;
  [key: string]: unknown;
}

/**
 * Set admin custom claim on a user
 * Custom claims are included in the user's ID token and can be checked client-side
 *
 * @param uid - The user's Firebase Auth UID
 * @param isAdmin - Whether to grant (true) or revoke (false) admin claim
 * @throws Error if user not found or operation fails
 *
 * @example
 * ```ts
 * // Grant admin claim
 * await setAdminClaim('user123', true);
 *
 * // Revoke admin claim
 * await setAdminClaim('user123', false);
 * ```
 */
export async function setAdminClaim(uid: string, isAdmin = true): Promise<void> {
  if (!uid) {
    throw new Error('User UID is required');
  }

  const auth = getAdminAuth();

  // Get existing custom claims
  const user = await auth.getUser(uid);
  const existingClaims = (user.customClaims as CustomClaims) || {};

  // Update claims
  const newClaims: CustomClaims = {
    ...existingClaims,
    [ADMIN_CLAIM_KEY]: isAdmin,
    role: isAdmin ? 'admin' : (existingClaims.role === 'admin' ? 'player' : existingClaims.role),
  };

  // Remove admin key if false to keep token size small
  if (!isAdmin) {
    delete newClaims[ADMIN_CLAIM_KEY];
    if (newClaims.role === 'admin') {
      newClaims.role = 'player';
    }
  }

  await auth.setCustomUserClaims(uid, newClaims);
}

/**
 * Verify admin claim from an ID token
 * Validates the token and checks if admin claim is present and true
 *
 * @param token - The Firebase ID token to verify
 * @returns Promise resolving to true if token is valid and has admin claim
 *
 * @example
 * ```ts
 * const isAdmin = await verifyAdminClaim(idToken);
 * if (isAdmin) {
 *   // User is verified admin
 * }
 * ```
 */
export async function verifyAdminClaim(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return decodedToken.admin === true || decodedToken.role === 'admin';
  } catch (error) {
    console.error('Error verifying admin claim:', error);
    return false;
  }
}

/**
 * Get decoded token with full claims verification
 * Returns null if token is invalid
 *
 * @param token - The Firebase ID token to verify
 * @returns Promise resolving to decoded token or null
 */
export async function verifyToken(token: string): Promise<DecodedIdToken | null> {
  if (!token) {
    return null;
  }

  try {
    const auth = getAdminAuth();
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * Get custom claims for a user
 *
 * @param uid - The user's Firebase Auth UID
 * @returns Promise resolving to the user's custom claims
 */
export async function getCustomClaims(uid: string): Promise<CustomClaims> {
  if (!uid) {
    throw new Error('User UID is required');
  }

  const auth = getAdminAuth();
  const user = await auth.getUser(uid);

  return (user.customClaims as CustomClaims) || {};
}

/**
 * Set multiple custom claims on a user
 * Merges with existing claims
 *
 * @param uid - The user's Firebase Auth UID
 * @param claims - Claims to set (will be merged with existing)
 */
export async function setCustomClaims(
  uid: string,
  claims: CustomClaims
): Promise<void> {
  if (!uid) {
    throw new Error('User UID is required');
  }

  const auth = getAdminAuth();

  // Get existing custom claims
  const user = await auth.getUser(uid);
  const existingClaims = (user.customClaims as CustomClaims) || {};

  // Merge claims
  const newClaims: CustomClaims = {
    ...existingClaims,
    ...claims,
  };

  await auth.setCustomUserClaims(uid, newClaims);
}

/**
 * Clear all custom claims for a user
 *
 * @param uid - The user's Firebase Auth UID
 */
export async function clearCustomClaims(uid: string): Promise<void> {
  if (!uid) {
    throw new Error('User UID is required');
  }

  const auth = getAdminAuth();
  await auth.setCustomUserClaims(uid, {});
}

/**
 * Sync admin claim with Firestore admin status
 * Updates the custom claim to match the Firestore admin collection
 *
 * @param uid - The user's Firebase Auth UID
 * @param isAdmin - Admin status from Firestore
 */
export async function syncAdminClaim(uid: string, isAdmin: boolean): Promise<void> {
  await setAdminClaim(uid, isAdmin);
}
