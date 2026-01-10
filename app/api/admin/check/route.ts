import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { isAdmin } from '@/lib/firebase/roles';

/**
 * Session cookie name (Firebase convention)
 */
const SESSION_COOKIE_NAME = '__session';

/**
 * GET /api/admin/check
 * Check if the current authenticated user is an admin
 *
 * Returns:
 * - 200: { isAdmin: boolean }
 * - 401: Unauthorized (no valid session)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Get session cookie
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized', isAdmin: false },
        { status: 401 }
      );
    }

    // Verify the session cookie using Firebase Admin SDK
    const auth = getAdminAuth();
    let decodedToken;

    try {
      decodedToken = await auth.verifyIdToken(sessionCookie);
    } catch (verifyError) {
      // Token is invalid or expired
      return NextResponse.json(
        { error: 'Invalid session', isAdmin: false },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;

    // Check admin status from Firestore
    const adminStatus = await isAdmin(uid);

    return NextResponse.json({ isAdmin: adminStatus });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { error: 'Internal server error', isAdmin: false },
      { status: 500 }
    );
  }
}
