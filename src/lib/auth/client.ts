/**
 * Client-side session management helpers
 * These functions make API calls to manage the server session
 */

/**
 * API response types
 */
interface SessionApiResponse {
  success?: boolean;
  error?: string;
  expiresAt?: number;
  user?: {
    uid: string;
    email?: string;
    emailVerified?: boolean;
  };
}

/**
 * Create a session cookie from a Firebase ID token
 * This function should be called from client-side code after successful authentication
 *
 * @param idToken - The Firebase ID token obtained from the client SDK
 * @returns Promise<void> - Resolves on success, throws on error
 */
export async function createSessionCookie(idToken: string): Promise<void> {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  const data: SessionApiResponse = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create session');
  }

  if (!data.success) {
    throw new Error(data.error || 'Session creation failed');
  }
}

/**
 * Clear the session cookie (logout)
 * This function should be called from client-side code when logging out
 *
 * @returns Promise<void> - Resolves on success, throws on error
 */
export async function clearSessionCookie(): Promise<void> {
  const response = await fetch('/api/auth/session', {
    method: 'DELETE',
  });

  const data: SessionApiResponse = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to clear session');
  }
}
