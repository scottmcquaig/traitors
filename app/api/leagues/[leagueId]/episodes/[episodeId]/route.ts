import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { checkLeagueAccess } from '@/lib/firebase/leagues';
import {
  getEpisodeById,
  updateEpisode,
  deleteEpisode,
  getEpisodeByNumber,
} from '@/lib/firebase/episodes';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Route params type for dynamic [leagueId]/episodes/[episodeId] route
 */
interface RouteParams {
  params: Promise<{
    leagueId: string;
    episodeId: string;
  }>;
}

/**
 * Helper to format episode for response
 */
function formatEpisode(episode: {
  id: string;
  leagueId: string;
  episodeNumber: number;
  airDate: Date | Timestamp;
  scores: Record<string, unknown>;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}) {
  return {
    id: episode.id,
    leagueId: episode.leagueId,
    episodeNumber: episode.episodeNumber,
    airDate: episode.airDate instanceof Timestamp
      ? episode.airDate.toDate().toISOString()
      : episode.airDate instanceof Date
        ? episode.airDate.toISOString()
        : episode.airDate,
    scores: episode.scores || {},
    notes: episode.notes,
    createdAt: episode.createdAt instanceof Timestamp
      ? episode.createdAt.toDate().toISOString()
      : episode.createdAt,
    updatedAt: episode.updatedAt instanceof Timestamp
      ? episode.updatedAt.toDate().toISOString()
      : episode.updatedAt,
  };
}

/**
 * GET /api/leagues/[leagueId]/episodes/[episodeId]
 * Gets a single episode with full score data
 *
 * Access: Admin or players in the league
 *
 * Response:
 * - 200: Episode details with scores
 * - 400: Missing parameters
 * - 401: Unauthorized (missing or invalid session)
 * - 403: Forbidden (not admin or player in the league)
 * - 404: League or episode not found
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { leagueId, episodeId } = await params;

    if (!leagueId || !episodeId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'League ID and Episode ID are required' },
        { status: 400 }
      );
    }

    // Verify authentication using session
    const session = await getCurrentUser();

    if (!session.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check access to the league
    const accessCheck = await checkLeagueAccess(leagueId, session.user.uid);

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

    // Get the episode
    const episode = await getEpisodeById(episodeId);

    if (!episode) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Episode not found' },
        { status: 404 }
      );
    }

    // Verify episode belongs to the league
    if (episode.leagueId !== leagueId) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Episode not found in this league' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      episode: formatEpisode(episode),
    });
  } catch (error) {
    console.error('Error getting episode:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to get episode' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/leagues/[leagueId]/episodes/[episodeId]
 * Updates an episode
 *
 * Access: Admin only
 *
 * Request body (all fields optional):
 * - episodeNumber: number - New episode number
 * - airDate: string - New air date (ISO string)
 * - notes: string - New notes
 *
 * Response:
 * - 200: Updated episode
 * - 400: Invalid request body or duplicate episode number
 * - 401: Unauthorized (missing or invalid session)
 * - 403: Forbidden (not admin)
 * - 404: League or episode not found
 * - 500: Server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { leagueId, episodeId } = await params;

    if (!leagueId || !episodeId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'League ID and Episode ID are required' },
        { status: 400 }
      );
    }

    // Verify authentication using session
    const session = await getCurrentUser();

    if (!session.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!session.user.admin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check league exists
    const accessCheck = await checkLeagueAccess(leagueId, session.user.uid);

    if (!accessCheck.league) {
      return NextResponse.json(
        { error: 'Not Found', message: 'League not found' },
        { status: 404 }
      );
    }

    // Get the episode
    const episode = await getEpisodeById(episodeId);

    if (!episode) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Episode not found' },
        { status: 404 }
      );
    }

    // Verify episode belongs to the league
    if (episode.leagueId !== leagueId) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Episode not found in this league' },
        { status: 404 }
      );
    }

    // Parse request body
    let body: {
      episodeNumber?: number;
      airDate?: string;
      notes?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: {
      episodeNumber?: number;
      airDate?: Date;
      notes?: string;
    } = {};

    if (body.episodeNumber !== undefined) {
      if (typeof body.episodeNumber !== 'number' || body.episodeNumber < 1) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'episodeNumber must be a positive number' },
          { status: 400 }
        );
      }

      // Check for duplicate episode number (only if changing)
      if (body.episodeNumber !== episode.episodeNumber) {
        const existingEpisode = await getEpisodeByNumber(leagueId, body.episodeNumber);
        if (existingEpisode) {
          return NextResponse.json(
            { error: 'Bad Request', message: `Episode ${body.episodeNumber} already exists for this league` },
            { status: 400 }
          );
        }
      }

      updateData.episodeNumber = body.episodeNumber;
    }

    if (body.airDate !== undefined) {
      const airDateParsed = new Date(body.airDate);
      if (isNaN(airDateParsed.getTime())) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'airDate must be a valid date string' },
          { status: 400 }
        );
      }
      updateData.airDate = airDateParsed;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // Update the episode
    const updatedEpisode = await updateEpisode(episodeId, updateData);

    if (!updatedEpisode) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to update episode' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Episode updated successfully',
      episode: formatEpisode(updatedEpisode),
    });
  } catch (error) {
    console.error('Error updating episode:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update episode' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leagues/[leagueId]/episodes/[episodeId]
 * Deletes an episode
 *
 * Access: Admin only
 *
 * Response:
 * - 200: Episode deleted successfully
 * - 400: Missing parameters
 * - 401: Unauthorized (missing or invalid session)
 * - 403: Forbidden (not admin)
 * - 404: League or episode not found
 * - 500: Server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { leagueId, episodeId } = await params;

    if (!leagueId || !episodeId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'League ID and Episode ID are required' },
        { status: 400 }
      );
    }

    // Verify authentication using session
    const session = await getCurrentUser();

    if (!session.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!session.user.admin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check league exists
    const accessCheck = await checkLeagueAccess(leagueId, session.user.uid);

    if (!accessCheck.league) {
      return NextResponse.json(
        { error: 'Not Found', message: 'League not found' },
        { status: 404 }
      );
    }

    // Get the episode to verify it exists and belongs to this league
    const episode = await getEpisodeById(episodeId);

    if (!episode) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Episode not found' },
        { status: 404 }
      );
    }

    // Verify episode belongs to the league
    if (episode.leagueId !== leagueId) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Episode not found in this league' },
        { status: 404 }
      );
    }

    // Delete the episode
    const deleted = await deleteEpisode(episodeId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to delete episode' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Episode deleted successfully',
      episodeId,
    });
  } catch (error) {
    console.error('Error deleting episode:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete episode' },
      { status: 500 }
    );
  }
}
