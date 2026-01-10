import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import {
  createContestant,
  getContestantsByLeague,
  getActiveContestants,
  bulkCreateContestants,
  BulkContestantData,
} from '@/lib/firebase/contestants';
import { COLLECTIONS, User, League, ContestantStatus, ContestantRole } from '@/types/firebase';

/**
 * Route params type for dynamic [leagueId] route
 */
interface RouteParams {
  params: Promise<{
    leagueId: string;
  }>;
}

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
 * Gets a league by its ID
 * @param leagueId - The league ID
 * @returns The League if found, null otherwise
 */
async function getLeagueById(leagueId: string): Promise<League | null> {
  try {
    const db = getAdminFirestore();
    const leagueDoc = await db.collection(COLLECTIONS.LEAGUES).doc(leagueId).get();

    if (!leagueDoc.exists) {
      return null;
    }

    return {
      id: leagueDoc.id,
      ...leagueDoc.data(),
    } as League;
  } catch (error) {
    console.error('Error getting league:', error);
    return null;
  }
}

/**
 * Checks if a user has access to a league (admin or player in the league)
 * @param uid - The user's UID
 * @param league - The league to check
 * @returns true if the user has access, false otherwise
 */
function userHasLeagueAccess(uid: string, league: League): boolean {
  return league.adminUid === uid || league.playerUids.includes(uid);
}

/**
 * POST /api/leagues/[leagueId]/contestants
 * Creates one or more contestants in a league (admin only)
 *
 * Request body:
 * - name: string (required for single contestant)
 * - status: 'active' | 'eliminated' | 'winner' | 'traitor_revealed' (optional, default: 'active')
 * - imageUrl: string (optional)
 * - role: 'faithful' | 'traitor' | 'unknown' (optional)
 * OR
 * - contestants: Array<{ name, status?, imageUrl?, role? }> (for bulk creation)
 *
 * Response:
 * - 201: Created contestant(s)
 * - 400: Invalid request body
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (not an admin)
 * - 404: League not found
 * - 500: Server error
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { leagueId } = await params;

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

    // Verify league exists
    const league = await getLeagueById(leagueId);

    if (!league) {
      return NextResponse.json(
        { error: 'Not Found', message: 'League not found' },
        { status: 404 }
      );
    }

    // Parse request body
    let body: {
      name?: string;
      status?: ContestantStatus;
      imageUrl?: string;
      role?: ContestantRole;
      contestants?: BulkContestantData[];
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Handle bulk creation
    if (body.contestants && Array.isArray(body.contestants)) {
      // Validate each contestant in the array
      for (let i = 0; i < body.contestants.length; i++) {
        const contestant = body.contestants[i];
        if (!contestant.name || typeof contestant.name !== 'string') {
          return NextResponse.json(
            { error: 'Bad Request', message: `Contestant at index ${i} is missing a valid name` },
            { status: 400 }
          );
        }
      }

      const createdContestants = await bulkCreateContestants(leagueId, body.contestants);

      return NextResponse.json(
        {
          message: `Created ${createdContestants.length} contestants successfully`,
          contestants: createdContestants.map((contestant) => ({
            id: contestant.id,
            leagueId: contestant.leagueId,
            name: contestant.name,
            status: contestant.status,
            imageUrl: contestant.imageUrl || null,
            role: contestant.role || null,
            eliminatedEpisode: contestant.eliminatedEpisode || null,
            createdAt: contestant.createdAt.toDate().toISOString(),
            updatedAt: contestant.updatedAt.toDate().toISOString(),
          })),
        },
        { status: 201 }
      );
    }

    // Handle single contestant creation
    const { name, status, imageUrl, role } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses: ContestantStatus[] = ['active', 'eliminated', 'winner', 'traitor_revealed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Validate role if provided
    const validRoles: ContestantRole[] = ['faithful', 'traitor', 'unknown'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid role value' },
        { status: 400 }
      );
    }

    // Create the contestant
    const contestant = await createContestant(leagueId, {
      name,
      status: status || 'active',
      imageUrl,
      role,
    });

    return NextResponse.json(
      {
        message: 'Contestant created successfully',
        contestant: {
          id: contestant.id,
          leagueId: contestant.leagueId,
          name: contestant.name,
          status: contestant.status,
          imageUrl: contestant.imageUrl || null,
          role: contestant.role || null,
          eliminatedEpisode: contestant.eliminatedEpisode || null,
          createdAt: contestant.createdAt.toDate().toISOString(),
          updatedAt: contestant.updatedAt.toDate().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating contestant:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create contestant' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leagues/[leagueId]/contestants
 * Lists all contestants in a league
 *
 * Query parameters:
 * - activeOnly: 'true' | 'false' (optional) - Only return active contestants (default: false)
 *
 * Response:
 * - 200: Array of contestants
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (user doesn't have access to the league)
 * - 404: League not found
 * - 500: Server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { leagueId } = await params;

    // Verify authentication
    const decodedToken = await verifyAuthToken(request);

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid authentication token required' },
        { status: 401 }
      );
    }

    // Verify league exists
    const league = await getLeagueById(leagueId);

    if (!league) {
      return NextResponse.json(
        { error: 'Not Found', message: 'League not found' },
        { status: 404 }
      );
    }

    // Verify user has access to the league
    if (!userHasLeagueAccess(decodedToken.uid, league)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this league' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Get contestants
    const contestants = activeOnly
      ? await getActiveContestants(leagueId)
      : await getContestantsByLeague(leagueId);

    // Format response
    const formattedContestants = contestants.map((contestant) => ({
      id: contestant.id,
      leagueId: contestant.leagueId,
      name: contestant.name,
      status: contestant.status,
      imageUrl: contestant.imageUrl || null,
      role: contestant.role || null,
      eliminatedEpisode: contestant.eliminatedEpisode || null,
      createdAt: contestant.createdAt.toDate().toISOString(),
      updatedAt: contestant.updatedAt.toDate().toISOString(),
    }));

    return NextResponse.json({
      contestants: formattedContestants,
      total: formattedContestants.length,
    });
  } catch (error) {
    console.error('Error listing contestants:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to list contestants' },
      { status: 500 }
    );
  }
}
