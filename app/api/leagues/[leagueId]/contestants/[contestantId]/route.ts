import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import {
  getContestantById,
  updateContestant,
  deleteContestant,
  eliminateContestant,
  revealTraitor,
  setWinner,
} from '@/lib/firebase/contestants';
import { COLLECTIONS, User, League, ContestantStatus, ContestantRole } from '@/types/firebase';

/**
 * Route params type for dynamic [leagueId]/[contestantId] route
 */
interface RouteParams {
  params: Promise<{
    leagueId: string;
    contestantId: string;
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
 * GET /api/leagues/[leagueId]/contestants/[contestantId]
 * Gets a specific contestant's details
 *
 * Response:
 * - 200: Contestant details
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (user doesn't have access to the league)
 * - 404: League or contestant not found
 * - 500: Server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { leagueId, contestantId } = await params;

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

    // Get the contestant
    const contestant = await getContestantById(contestantId);

    if (!contestant) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Contestant not found' },
        { status: 404 }
      );
    }

    // Verify contestant belongs to the league
    if (contestant.leagueId !== leagueId) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Contestant not found in this league' },
        { status: 404 }
      );
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error getting contestant:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to get contestant' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/leagues/[leagueId]/contestants/[contestantId]
 * Updates a contestant (admin only)
 *
 * Request body:
 * - name: string (optional)
 * - status: 'active' | 'eliminated' | 'winner' | 'traitor_revealed' (optional)
 * - imageUrl: string (optional)
 * - role: 'faithful' | 'traitor' | 'unknown' (optional)
 * - eliminatedEpisode: number (optional)
 *
 * Special actions (alternative to direct field updates):
 * - action: 'eliminate' with episodeNumber: number
 * - action: 'reveal_traitor'
 * - action: 'set_winner'
 *
 * Response:
 * - 200: Updated contestant
 * - 400: Invalid request body
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (not an admin)
 * - 404: League or contestant not found
 * - 500: Server error
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { leagueId, contestantId } = await params;

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

    // Get the contestant to verify it exists and belongs to the league
    const existingContestant = await getContestantById(contestantId);

    if (!existingContestant) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Contestant not found' },
        { status: 404 }
      );
    }

    if (existingContestant.leagueId !== leagueId) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Contestant not found in this league' },
        { status: 404 }
      );
    }

    // Parse request body
    let body: {
      name?: string;
      status?: ContestantStatus;
      imageUrl?: string;
      role?: ContestantRole;
      eliminatedEpisode?: number;
      action?: 'eliminate' | 'reveal_traitor' | 'set_winner';
      episodeNumber?: number;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    let updatedContestant;

    // Handle special actions
    if (body.action) {
      switch (body.action) {
        case 'eliminate':
          if (typeof body.episodeNumber !== 'number') {
            return NextResponse.json(
              { error: 'Bad Request', message: 'episodeNumber is required for eliminate action' },
              { status: 400 }
            );
          }
          updatedContestant = await eliminateContestant(contestantId, body.episodeNumber);
          break;

        case 'reveal_traitor':
          updatedContestant = await revealTraitor(contestantId);
          break;

        case 'set_winner':
          updatedContestant = await setWinner(contestantId);
          break;

        default:
          return NextResponse.json(
            { error: 'Bad Request', message: 'Invalid action' },
            { status: 400 }
          );
      }
    } else {
      // Validate status if provided
      const validStatuses: ContestantStatus[] = ['active', 'eliminated', 'winner', 'traitor_revealed'];
      if (body.status && !validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Invalid status value' },
          { status: 400 }
        );
      }

      // Validate role if provided
      const validRoles: ContestantRole[] = ['faithful', 'traitor', 'unknown'];
      if (body.role && !validRoles.includes(body.role)) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Invalid role value' },
          { status: 400 }
        );
      }

      // Regular update
      const updateData: {
        name?: string;
        status?: ContestantStatus;
        imageUrl?: string;
        role?: ContestantRole;
        eliminatedEpisode?: number;
      } = {};

      if (body.name !== undefined) updateData.name = body.name;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
      if (body.role !== undefined) updateData.role = body.role;
      if (body.eliminatedEpisode !== undefined) updateData.eliminatedEpisode = body.eliminatedEpisode;

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'No fields to update' },
          { status: 400 }
        );
      }

      updatedContestant = await updateContestant(contestantId, updateData);
    }

    if (!updatedContestant) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to update contestant' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Contestant updated successfully',
      contestant: {
        id: updatedContestant.id,
        leagueId: updatedContestant.leagueId,
        name: updatedContestant.name,
        status: updatedContestant.status,
        imageUrl: updatedContestant.imageUrl || null,
        role: updatedContestant.role || null,
        eliminatedEpisode: updatedContestant.eliminatedEpisode || null,
        createdAt: updatedContestant.createdAt.toDate().toISOString(),
        updatedAt: updatedContestant.updatedAt.toDate().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating contestant:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update contestant' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leagues/[leagueId]/contestants/[contestantId]
 * Deletes a contestant (admin only)
 *
 * Response:
 * - 200: Contestant deleted
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (not an admin)
 * - 404: League or contestant not found
 * - 500: Server error
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { leagueId, contestantId } = await params;

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

    // Get the contestant to verify it exists and belongs to the league
    const existingContestant = await getContestantById(contestantId);

    if (!existingContestant) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Contestant not found' },
        { status: 404 }
      );
    }

    if (existingContestant.leagueId !== leagueId) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Contestant not found in this league' },
        { status: 404 }
      );
    }

    // Delete the contestant
    const deleted = await deleteContestant(contestantId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to delete contestant' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Contestant deleted successfully',
      contestantId,
    });
  } catch (error) {
    console.error('Error deleting contestant:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete contestant' },
      { status: 500 }
    );
  }
}
