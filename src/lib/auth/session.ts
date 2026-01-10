import 'server-only';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';

/**
 * Server-side session management helpers
 * For client-side functions, import from '@/lib/auth/client'
 */

/**
 * Session cookie name (Firebase convention)
 */
export const SESSION_COOKIE_NAME = '__session';

/**
 * Session expiration time in seconds (5 days)
 */
export const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 5;

/**
 * User information from session
 */
export interface SessionUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  admin: boolean;
  displayName?: string;
  photoURL?: string;
}

/**
 * Session result type
 */
export type SessionResult =
  | { authenticated: true; user: SessionUser }
  | { authenticated: false; user: null };

/**
 * Get the current user from the session (server-side only)
 * This function should be called from Server Components or Route Handlers
 */
export async function getCurrentUser(): Promise<SessionResult> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return { authenticated: false, user: null };
    }

    const adminAuth = getAdminAuth();

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true // checkRevoked
    );

    const user: SessionUser = {
      uid: decodedClaims.uid,
      email: decodedClaims.email || null,
      emailVerified: decodedClaims.email_verified || false,
      admin: decodedClaims.admin === true || decodedClaims.role === 'admin',
      displayName: decodedClaims.name as string | undefined,
      photoURL: decodedClaims.picture as string | undefined,
    };

    return { authenticated: true, user };
  } catch (error) {
    console.error('Session verification failed:', error);
    return { authenticated: false, user: null };
  }
}

/**
 * Check if the current user is authenticated (server-side only)
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentUser();
  return session.authenticated;
}

/**
 * Check if the current user is an admin (server-side only)
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getCurrentUser();
  return session.authenticated && session.user.admin;
}

/**
 * Require authentication for a server component or route handler
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await getCurrentUser();

  if (!session.authenticated) {
    throw new Error('Authentication required');
  }

  return session.user;
}

/**
 * Require admin role for a server component or route handler
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await getCurrentUser();

  if (!session.authenticated) {
    throw new Error('Authentication required');
  }

  if (!session.user.admin) {
    throw new Error('Admin access required');
  }

  return session.user;
}
