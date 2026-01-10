import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { createFirstAdmin, hasAdmins } from '@/lib/firebase/roles';

/**
 * Session cookie name (Firebase convention)
 */
const SESSION_COOKIE_NAME = '__session';

/**
 * POST /api/admin/setup
 * One-time endpoint to create the first admin user.
 * Only works if no admins exist in the system.
 * Requires authenticated user.
 *
 * Request:
 * - No body required
 * - Must be authenticated (session cookie)
 *
 * Returns:
 * - 200: { success: true, message: string }
 * - 400: Admins already exist
 * - 401: Unauthorized (no valid session)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Get session cookie
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in first' },
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
        { error: 'Invalid session: Please sign in again' },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email || 'unknown';

    // Check if admins already exist
    const adminsExist = await hasAdmins();

    if (adminsExist) {
      return NextResponse.json(
        {
          error: 'Setup already completed',
          message: 'Admins already exist in the system. Contact an existing admin to be granted admin access.',
        },
        { status: 400 }
      );
    }

    // Create the first admin
    await createFirstAdmin(uid);

    console.log(`First admin created: ${email} (${uid})`);

    return NextResponse.json({
      success: true,
      message: `Successfully set up ${email} as the first admin.`,
    });
  } catch (error) {
    console.error('Error during admin setup:', error);

    // Handle specific error messages
    if (error instanceof Error) {
      if (error.message.includes('User not found')) {
        return NextResponse.json(
          { error: 'User not found in Firebase Auth' },
          { status: 400 }
        );
      }
      if (error.message.includes('already exist')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error during admin setup' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/setup
 * Check if the admin setup is needed (no admins exist yet)
 *
 * Returns:
 * - 200: { setupNeeded: boolean }
 * - 500: Server error
 */
export async function GET() {
  try {
    const adminsExist = await hasAdmins();

    return NextResponse.json({
      setupNeeded: !adminsExist,
    });
  } catch (error) {
    console.error('Error checking admin setup status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
