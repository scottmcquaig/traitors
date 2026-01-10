import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import {
  createLeague,
  getLeaguesByAdmin,
  getLeaguesByPlayer,
} from '@/lib/firebase/leagues';
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
 * Gets user data from the database
 * @param uid - The user's UID
 * @returns User data or null if not found
 */
async function getUserData(uid: string): Promise<User | null> {
  try {
    const db = getAdminFirestore();
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data() as User;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

/**
 * POST /api/leagues
 * Creates a new league (admin only)
 *
 * Request body:
 * - name: string (required) - Name of the league
 * - season: string (required) - Season identifier (e.g., "Season 3")
 * - rosterSize: number (optional) - Max contestants per player (default: 4)
 *
 * Response:
 * - 201: Created league
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

    // Get user data and check admin role
    const userData = await getUserData(decodedToken.uid);

    if (!userData) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not found' },
        { status: 401 }
      );
    }

    if (userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin role required to create leagues' },
        { status: 403 }
      );
    }

    // Parse request body
    let body: { name?: string; season?: string; rosterSize?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { name, season, rosterSize } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'League name is required' },
        { status: 400 }
      );
    }

    if (!season || typeof season !== 'string' || season.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Season is required' },
        { status: 400 }
      );
    }

    // Validate rosterSize if provided
    if (rosterSize !== undefined) {
      if (typeof rosterSize !== 'number' || rosterSize < 1 || rosterSize > 20) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Roster size must be a number between 1 and 20' },
          { status: 400 }
        );
      }
    }

    // Create the league
    const league = await createLeague(decodedToken.uid, {
      name,
      season,
      rosterSize,
    });

    return NextResponse.json(
      {
        message: 'League created successfully',
        league: {
          id: league.id,
          name: league.name,
          season: league.season,
          adminUid: league.adminUid,
          draftStatus: league.draftStatus,
          draftOrder: league.draftOrder,
          rosterSize: league.rosterSize,
          playerUids: league.playerUids,
          createdAt: league.createdAt.toDate().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating league:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create league' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leagues
 * Lists leagues for the authenticated user
 * - Admins see leagues they created
 * - Players see leagues they are participating in
 * - Optionally filter by role
 *
 * Query parameters:
 * - role: 'admin' | 'player' | 'all' (optional) - Filter by user's role in leagues (default: 'all')
 *
 * Response:
 * - 200: Array of leagues
 * - 401: Unauthorized (missing or invalid token)
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

    // Get user data
    const userData = await getUserData(decodedToken.uid);

    if (!userData) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not found' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role') || 'all';

    let leagues = [];

    if (roleFilter === 'admin' || roleFilter === 'all') {
      // Get leagues where user is admin
      const adminLeagues = await getLeaguesByAdmin(decodedToken.uid);
      leagues.push(
        ...adminLeagues.map((league) => ({
          ...league,
          userRole: 'admin' as const,
        }))
      );
    }

    if (roleFilter === 'player' || roleFilter === 'all') {
      // Get leagues where user is a player
      const playerLeagues = await getLeaguesByPlayer(decodedToken.uid);

      // Avoid duplicates (admin might also be in playerUids)
      const existingIds = new Set(leagues.map((l) => l.id));
      for (const league of playerLeagues) {
        if (!existingIds.has(league.id)) {
          leagues.push({
            ...league,
            userRole: 'player' as const,
          });
        }
      }
    }

    // Sort by createdAt descending
    leagues.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    // Format response
    const formattedLeagues = leagues.map((league) => ({
      id: league.id,
      name: league.name,
      season: league.season,
      adminUid: league.adminUid,
      draftStatus: league.draftStatus,
      draftOrder: league.draftOrder,
      rosterSize: league.rosterSize,
      playerUids: league.playerUids,
      playerCount: league.playerUids.length,
      userRole: league.userRole,
      createdAt: league.createdAt.toDate().toISOString(),
    }));

    return NextResponse.json({
      leagues: formattedLeagues,
      total: formattedLeagues.length,
    });
  } catch (error) {
    console.error('Error listing leagues:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to list leagues' },
      { status: 500 }
    );
  }
}
