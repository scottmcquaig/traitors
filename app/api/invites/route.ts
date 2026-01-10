import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { createInvite, getInvitesByAdmin } from '@/lib/firebase/invites';
import { COLLECTIONS, User } from '@/types/firebase';

/**
 * Extracts and verifies the Firebase ID token from the Authorization header
 * @param request - The incoming request
 * @returns The decoded token with user info, or null if invalid
 */
async function verifyAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];

  if (!idToken) {
    return null;
  }

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

/**
 * Checks if the user has admin role in the database
 * @param uid - The user's UID
 * @returns true if the user is an admin, false otherwise
 */
async function isUserAdmin(uid: string): Promise<boolean> {
  try {
    const db = getAdminFirestore();
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

    if (!userDoc.exists) {
      return false;
    }

    const userData = userDoc.data() as User;
    return userData.role === 'admin';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}

/**
 * POST /api/invites
 * Creates a new invite token (admin only)
 *
 * Request body:
 * - email: string (required) - Email address to invite
 * - expirationDays: number (optional) - Days until expiration (default: 7)
 *
 * Response:
 * - 201: Created invite token
 * - 400: Invalid request body
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (not an admin)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyAuthToken(request);

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid authentication token required' },
        { status: 401 }
      );
    }

    // Check admin role
    const isAdmin = await isUserAdmin(decodedToken.uid);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin role required' },
        { status: 403 }
      );
    }

    // Parse request body
    let body: { email?: string; expirationDays?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate email
    const { email, expirationDays } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Calculate expiration time
    const expirationMs = expirationDays
      ? expirationDays * 24 * 60 * 60 * 1000
      : undefined;

    // Create the invite
    const invite = await createInvite(decodedToken.uid, email, expirationMs);

    return NextResponse.json(
      {
        message: 'Invite created successfully',
        invite: {
          id: invite.id,
          email: invite.email,
          token: invite.token,
          createdAt: invite.createdAt.toDate().toISOString(),
          expiresAt: invite.expiresAt.toDate().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create invite' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invites
 * Lists all invites created by the authenticated admin
 *
 * Query parameters:
 * - includeUsed: 'true' | 'false' (optional) - Include used invites (default: true)
 *
 * Response:
 * - 200: Array of invite tokens
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (not an admin)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyAuthToken(request);

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid authentication token required' },
        { status: 401 }
      );
    }

    // Check admin role
    const isAdmin = await isUserAdmin(decodedToken.uid);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin role required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeUsed = searchParams.get('includeUsed') !== 'false';

    // Get invites
    const invites = await getInvitesByAdmin(decodedToken.uid, includeUsed);

    // Format response
    const formattedInvites = invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      token: invite.token,
      createdAt: invite.createdAt.toDate().toISOString(),
      expiresAt: invite.expiresAt.toDate().toISOString(),
      usedAt: invite.usedAt ? invite.usedAt.toDate().toISOString() : null,
      usedBy: invite.usedBy || null,
      isExpired: invite.expiresAt.toMillis() < Date.now(),
      isUsed: !!invite.usedAt,
    }));

    return NextResponse.json({
      invites: formattedInvites,
      total: formattedInvites.length,
    });
  } catch (error) {
    console.error('Error listing invites:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to list invites' },
      { status: 500 }
    );
  }
}
