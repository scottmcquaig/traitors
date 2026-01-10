import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import {
  getLeagueById,
  updateLeague,
  deleteLeague,
  checkLeagueAccess,
  addPlayerToLeague,
  removePlayerFromLeague,
  setDraftOrder,
  startDraft,
  completeDraft,
} from '@/lib/firebase/leagues';
import { COLLECTIONS, User, UpdateLeagueData } from '@/types/firebase';

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
 * GET /api/leagues/[leagueId]
 * Gets details of a specific league
 *
 * Access: Admin or players in the league
 *
 * Response:
 * - 200: League details
 * - 400: Missing leagueId parameter
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (not admin or player in the league)
 * - 404: League not found
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { leagueId } = await params;

    if (!leagueId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'League ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const decodedToken = await verifyAuthToken(request);

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid authentication token required' },
        { status: 401 }
      );
    }

    // Check access to the league
    const accessCheck = await checkLeagueAccess(leagueId, decodedToken.uid);

    if (!accessCheck.league) {
      return NextResponse.json(
        { error: 'Not Found', message: 'League not found' },
        { status: 404 }
      );
    }

    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this league' },
        { status: 403 }
      );
    }

    const league = accessCheck.league;

    return NextResponse.json({
      league: {
        id: league.id,
        name: league.name,
        season: league.season,
        adminUid: league.adminUid,
        draftStatus: league.draftStatus,
        draftOrder: league.draftOrder,
        rosterSize: league.rosterSize,
        currentPick: league.currentPick,
        playerUids: league.playerUids,
        playerCount: league.playerUids.length,
        createdAt: league.createdAt.toDate().toISOString(),
      },
      access: {
        isAdmin: accessCheck.isAdmin,
        isPlayer: accessCheck.isPlayer,
      },
    });
  } catch (error) {
    console.error('Error getting league:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to get league' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/leagues/[leagueId]
 * Updates a league (admin only)
 *
 * Request body (all fields optional):
 * - name: string - New league name
 * - season: string - New season identifier
 * - rosterSize: number - New roster size
 * - action: string - Special actions: 'addPlayer', 'removePlayer', 'setDraftOrder', 'startDraft', 'completeDraft'
 * - playerUid: string - Required for 'addPlayer' and 'removePlayer' actions
 * - draftOrder: string[] - Required for 'setDraftOrder' action
 *
 * Response:
 * - 200: Updated league
 * - 400: Invalid request body
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (not the league admin)
 * - 404: League not found
 * - 500: Server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { leagueId } = await params;

    if (!leagueId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'League ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const decodedToken = await verifyAuthToken(request);

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid authentication token required' },
        { status: 401 }
      );
    }

    // Check if user is the league admin
    const accessCheck = await checkLeagueAccess(leagueId, decodedToken.uid);

    if (!accessCheck.league) {
      return NextResponse.json(
        { error: 'Not Found', message: 'League not found' },
        { status: 404 }
      );
    }

    if (!accessCheck.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only the league admin can update this league' },
        { status: 403 }
      );
    }

    // Parse request body
    let body: {
      name?: string;
      season?: string;
      rosterSize?: number;
      action?: string;
      playerUid?: string;
      draftOrder?: string[];
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    let updatedLeague = accessCheck.league;

    // Handle special actions
    if (body.action) {
      switch (body.action) {
        case 'addPlayer':
          if (!body.playerUid || typeof body.playerUid !== 'string') {
            return NextResponse.json(
              { error: 'Bad Request', message: 'playerUid is required for addPlayer action' },
              { status: 400 }
            );
          }
          const addResult = await addPlayerToLeague(leagueId, body.playerUid);
          if (!addResult) {
            return NextResponse.json(
              { error: 'Not Found', message: 'League not found' },
              { status: 404 }
            );
          }
          updatedLeague = addResult;
          break;

        case 'removePlayer':
          if (!body.playerUid || typeof body.playerUid !== 'string') {
            return NextResponse.json(
              { error: 'Bad Request', message: 'playerUid is required for removePlayer action' },
              { status: 400 }
            );
          }
          const removeResult = await removePlayerFromLeague(leagueId, body.playerUid);
          if (!removeResult) {
            return NextResponse.json(
              { error: 'Not Found', message: 'League not found' },
              { status: 404 }
            );
          }
          updatedLeague = removeResult;
          break;

        case 'setDraftOrder':
          if (!body.draftOrder || !Array.isArray(body.draftOrder)) {
            return NextResponse.json(
              { error: 'Bad Request', message: 'draftOrder array is required for setDraftOrder action' },
              { status: 400 }
            );
          }
          try {
            const orderResult = await setDraftOrder(leagueId, body.draftOrder);
            if (!orderResult) {
              return NextResponse.json(
                { error: 'Not Found', message: 'League not found' },
                { status: 404 }
              );
            }
            updatedLeague = orderResult;
          } catch (error) {
            return NextResponse.json(
              { error: 'Bad Request', message: (error as Error).message },
              { status: 400 }
            );
          }
          break;

        case 'startDraft':
          try {
            const startResult = await startDraft(leagueId);
            if (!startResult) {
              return NextResponse.json(
                { error: 'Not Found', message: 'League not found' },
                { status: 404 }
              );
            }
            updatedLeague = startResult;
          } catch (error) {
            return NextResponse.json(
              { error: 'Bad Request', message: (error as Error).message },
              { status: 400 }
            );
          }
          break;

        case 'completeDraft':
          try {
            const completeResult = await completeDraft(leagueId);
            if (!completeResult) {
              return NextResponse.json(
                { error: 'Not Found', message: 'League not found' },
                { status: 404 }
              );
            }
            updatedLeague = completeResult;
          } catch (error) {
            return NextResponse.json(
              { error: 'Bad Request', message: (error as Error).message },
              { status: 400 }
            );
          }
          break;

        default:
          return NextResponse.json(
            { error: 'Bad Request', message: `Unknown action: ${body.action}` },
            { status: 400 }
          );
      }
    } else {
      // Handle regular field updates
      const updateData: UpdateLeagueData = {};

      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim().length === 0) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'League name must be a non-empty string' },
            { status: 400 }
          );
        }
        updateData.name = body.name;
      }

      if (body.season !== undefined) {
        if (typeof body.season !== 'string' || body.season.trim().length === 0) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Season must be a non-empty string' },
            { status: 400 }
          );
        }
        updateData.season = body.season;
      }

      if (body.rosterSize !== undefined) {
        if (typeof body.rosterSize !== 'number' || body.rosterSize < 1 || body.rosterSize > 20) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Roster size must be a number between 1 and 20' },
            { status: 400 }
          );
        }
        updateData.rosterSize = body.rosterSize;
      }

      if (Object.keys(updateData).length > 0) {
        const updateResult = await updateLeague(leagueId, updateData);
        if (!updateResult) {
          return NextResponse.json(
            { error: 'Not Found', message: 'League not found' },
            { status: 404 }
          );
        }
        updatedLeague = updateResult;
      }
    }

    return NextResponse.json({
      message: 'League updated successfully',
      league: {
        id: updatedLeague.id,
        name: updatedLeague.name,
        season: updatedLeague.season,
        adminUid: updatedLeague.adminUid,
        draftStatus: updatedLeague.draftStatus,
        draftOrder: updatedLeague.draftOrder,
        rosterSize: updatedLeague.rosterSize,
        currentPick: updatedLeague.currentPick,
        playerUids: updatedLeague.playerUids,
        playerCount: updatedLeague.playerUids.length,
        createdAt: updatedLeague.createdAt.toDate().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating league:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update league' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leagues/[leagueId]
 * Deletes a league (admin only)
 *
 * Response:
 * - 200: League deleted successfully
 * - 400: Missing leagueId parameter
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (not the league admin)
 * - 404: League not found
 * - 500: Server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { leagueId } = await params;

    if (!leagueId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'League ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const decodedToken = await verifyAuthToken(request);

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid authentication token required' },
        { status: 401 }
      );
    }

    // Attempt to delete the league (function checks authorization)
    const deleted = await deleteLeague(leagueId, decodedToken.uid);

    if (!deleted) {
      // Check if the league exists to return appropriate error
      const league = await getLeagueById(leagueId);
      if (!league) {
        return NextResponse.json(
          { error: 'Not Found', message: 'League not found' },
          { status: 404 }
        );
      }
      // League exists but user is not the admin
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only the league admin can delete this league' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      message: 'League deleted successfully',
      leagueId,
    });
  } catch (error) {
    console.error('Error deleting league:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete league' },
      { status: 500 }
    );
  }
}
