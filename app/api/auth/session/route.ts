import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

/**
 * Session cookie name (Firebase convention for Edge-compatible apps)
 */
const SESSION_COOKIE_NAME = '__session';

/**
 * Session cookie expiration time (5 days in seconds)
 * This should match the expiresIn used when creating the session cookie
 */
const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 5; // 5 days

/**
 * Maximum session cookie expiration allowed by Firebase (14 days)
 */
const MAX_SESSION_EXPIRATION_MS = 60 * 60 * 24 * 14 * 1000; // 14 days in milliseconds

/**
 * POST /api/auth/session
 * Creates a session cookie from a Firebase ID token
 *
 * Request body:
 * { idToken: string }
 *
 * Response:
 * 200: { success: true, expiresAt: number }
 * 400: { error: string } - Missing or invalid token
 * 401: { error: string } - Token verification failed
 * 500: { error: string } - Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => null);

    if (!body || typeof body.idToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid idToken in request body' },
        { status: 400 }
      );
    }

    const { idToken } = body;

    // Get Firebase Admin Auth instance
    const adminAuth = getAdminAuth();

    // Verify the ID token
    let decodedToken;
    try {
      // checkRevoked: true ensures we catch revoked tokens
      decodedToken = await adminAuth.verifyIdToken(idToken, true);
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Ensure the token was issued recently (within the last 5 minutes)
    // This prevents session fixation attacks using old tokens
    const authTime = decodedToken.auth_time;
    const currentTime = Math.floor(Date.now() / 1000);
    const fiveMinutesAgo = currentTime - 5 * 60;

    if (authTime < fiveMinutesAgo) {
      return NextResponse.json(
        { error: 'Token is too old. Please sign in again.' },
        { status: 401 }
      );
    }

    // Create session cookie
    // Note: Firebase Admin's createSessionCookie creates a new token
    // that's specifically designed for session management
    const expiresIn = Math.min(
      SESSION_EXPIRATION_SECONDS * 1000,
      MAX_SESSION_EXPIRATION_MS
    );

    let sessionCookie;
    try {
      sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn,
      });
    } catch (cookieError) {
      console.error('Failed to create session cookie:', cookieError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Calculate expiration date
    const expiresAt = Date.now() + expiresIn;

    // Set the cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRATION_SECONDS,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      expiresAt,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
      },
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * Clears the session cookie (logout)
 *
 * Response:
 * 200: { success: true }
 * 500: { error: string } - Server error
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    // If there's a session, revoke it server-side
    if (sessionCookie) {
      try {
        const adminAuth = getAdminAuth();

        // Verify the session cookie to get the user ID
        const decodedClaims = await adminAuth.verifySessionCookie(
          sessionCookie,
          true // checkRevoked
        );

        // Revoke all refresh tokens for this user
        // This invalidates all sessions for the user
        await adminAuth.revokeRefreshTokens(decodedClaims.sub);
      } catch (revokeError) {
        // Log but don't fail - the cookie will still be cleared
        console.error('Failed to revoke session server-side:', revokeError);
      }
    }

    // Clear the cookie
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/session
 * Verifies the current session and returns user info
 *
 * Response:
 * 200: { authenticated: true, user: {...} }
 * 200: { authenticated: false }
 * 500: { error: string } - Server error
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }

    try {
      const adminAuth = getAdminAuth();

      // Verify session cookie
      const decodedClaims = await adminAuth.verifySessionCookie(
        sessionCookie,
        true // checkRevoked
      );

      return NextResponse.json({
        authenticated: true,
        user: {
          uid: decodedClaims.uid,
          email: decodedClaims.email,
          emailVerified: decodedClaims.email_verified,
          admin: decodedClaims.admin === true || decodedClaims.role === 'admin',
        },
      });
    } catch (verifyError) {
      // Session is invalid or expired
      return NextResponse.json({ authenticated: false });
    }
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
