import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { checkLeagueAccess } from '@/lib/firebase/leagues';
import { getEpisodeById, updateEpisode } from '@/lib/firebase/episodes';
import { trackScoreUpdate } from '@/lib/firebase/score-history';
import { EpisodeContestantScore } from '@/types/firebase';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Route params type for dynamic [leagueId]/episodes/[episodeId]/scores route
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
  scores: Record<string, EpisodeContestantScore>;
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
 * Validates the score object structure
 */
function isValidScore(score: unknown): score is EpisodeContestantScore {
  if (typeof score !== 'object' || score === null) {
    return false;
  }

  const s = score as Record<string, unknown>;

  // total is required and must be a number
  if (typeof s.total !== 'number') {
    return false;
  }

  // breakdown is required and must be an object (can be empty)
  if (typeof s.breakdown !== 'object' || s.breakdown === null) {
    return false;
  }

  // All breakdown values must be numbers
  for (const value of Object.values(s.breakdown as Record<string, unknown>)) {
    if (typeof value !== 'number') {
      return false;
    }
  }

  return true;
}

/**
 * POST /api/leagues/[leagueId]/episodes/[episodeId]/scores
 * Submit/update score for a single contestant in an episode
 *
 * Access: Admin only
 *
 * Request body:
 * - contestantId: string (required) - The contestant ID
 * - score: EpisodeContestantScore (required) - The score object
 *
 * Response:
 * - 200: Updated episode with new scores
 * - 400: Invalid request body
 * - 401: Unauthorized (missing or invalid session)
 * - 403: Forbidden (not admin)
 * - 404: League or episode not found
 * - 500: Server error
 */
export async function POST(
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
      contestantId?: string;
      score?: EpisodeContestantScore;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.contestantId || typeof body.contestantId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'contestantId is required' },
        { status: 400 }
      );
    }

    if (!body.score || !isValidScore(body.score)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'score is required and must have total (number) and breakdown (object) fields' },
        { status: 400 }
      );
    }

    const contestantId = body.contestantId;
    const newScore = body.score;

    // Get previous score for history tracking
    const previousScore = episode.scores?.[contestantId] || null;

    // Update the scores
    const updatedScores = {
      ...episode.scores,
      [contestantId]: newScore,
    };

    // Update the episode
    const updatedEpisode = await updateEpisode(episodeId, {
      scores: updatedScores,
    });

    if (!updatedEpisode) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to update scores' },
        { status: 500 }
      );
    }

    // Log the change to score history
    try {
      await trackScoreUpdate(
        episodeId,
        leagueId,
        contestantId,
        session.user.uid,
        previousScore,
        newScore
      );
    } catch (historyError) {
      // Log but don't fail the request if history logging fails
      console.error('Error logging score change to history:', historyError);
    }

    return NextResponse.json({
      message: 'Score updated successfully',
      episode: formatEpisode(updatedEpisode),
    });
  } catch (error) {
    console.error('Error updating score:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update score' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/leagues/[leagueId]/episodes/[episodeId]/scores
 * Bulk update all scores for an episode (replaces all scores)
 *
 * Access: Admin only
 *
 * Request body:
 * - scores: Record<string, EpisodeContestantScore> (required) - All scores keyed by contestant ID
 *
 * Response:
 * - 200: Updated episode with new scores
 * - 400: Invalid request body
 * - 401: Unauthorized (missing or invalid session)
 * - 403: Forbidden (not admin)
 * - 404: League or episode not found
 * - 500: Server error
 */
export async function PUT(
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
      scores?: Record<string, EpisodeContestantScore>;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.scores || typeof body.scores !== 'object') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'scores object is required' },
        { status: 400 }
      );
    }

    // Validate all scores
    for (const [contestantId, score] of Object.entries(body.scores)) {
      if (!isValidScore(score)) {
        return NextResponse.json(
          { error: 'Bad Request', message: `Invalid score for contestant ${contestantId}. Each score must have total (number) and breakdown (object) fields` },
          { status: 400 }
        );
      }
    }

    const newScores = body.scores;
    const previousScores = episode.scores || {};

    // Update the episode with all new scores
    const updatedEpisode = await updateEpisode(episodeId, {
      scores: newScores,
    });

    if (!updatedEpisode) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to update scores' },
        { status: 500 }
      );
    }

    // Log all changes to score history
    try {
      // Track all contestant IDs that have changes
      const allContestantIds = Array.from(new Set([
        ...Object.keys(previousScores),
        ...Object.keys(newScores),
      ]));

      for (const contestantId of allContestantIds) {
        const prevScore = previousScores[contestantId] || null;
        const newScore = newScores[contestantId] || null;

        // Only log if there's a change
        if (JSON.stringify(prevScore) !== JSON.stringify(newScore)) {
          await trackScoreUpdate(
            episodeId,
            leagueId,
            contestantId,
            session.user.uid,
            prevScore,
            newScore
          );
        }
      }
    } catch (historyError) {
      // Log but don't fail the request if history logging fails
      console.error('Error logging score changes to history:', historyError);
    }

    return NextResponse.json({
      message: 'All scores updated successfully',
      episode: formatEpisode(updatedEpisode),
    });
  } catch (error) {
    console.error('Error bulk updating scores:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update scores' },
      { status: 500 }
    );
  }
}
