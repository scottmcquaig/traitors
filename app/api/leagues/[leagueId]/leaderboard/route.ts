import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { checkLeagueAccess } from '@/lib/firebase/leagues';
import {
  generateLeaderboard,
  getEpisodeLeaderboard,
  calculateCumulativeScoreAtEpisode,
} from '@/lib/scoring/calculator';
import { getEpisodeById, getEpisodeByNumber } from '@/lib/firebase/episodes';

/**
 * Route params type for dynamic [leagueId]/leaderboard route
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
 * GET /api/leagues/[leagueId]/leaderboard
 * Gets the league leaderboard
 *
 * Access: Admin or players in the league
 *
 * Query params:
 * - episode: string (optional) - Episode ID for episode-specific leaderboard
 * - episodeNumber: number (optional) - Episode number for cumulative leaderboard up to that episode
 *
 * If no query params provided, returns cumulative leaderboard across all episodes.
 *
 * Response:
 * - 200: Leaderboard with rankings
 * - 400: Invalid query parameters
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (not admin or player in the league)
 * - 404: League or episode not found
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const episodeIdParam = searchParams.get('episode');
    const episodeNumberParam = searchParams.get('episodeNumber');

    // Handle episode-specific leaderboard (by episode ID)
    if (episodeIdParam) {
      // Verify the episode exists and belongs to this league
      const episode = await getEpisodeById(episodeIdParam);

      if (!episode) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Episode not found' },
          { status: 404 }
        );
      }

      if (episode.leagueId !== leagueId) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Episode not found in this league' },
          { status: 404 }
        );
      }

      try {
        const entries = await getEpisodeLeaderboard(leagueId, episodeIdParam);

        return NextResponse.json({
          leaderboard: {
            leagueId,
            type: 'episode',
            episodeId: episodeIdParam,
            episodeNumber: episode.episodeNumber,
            entries,
            lastUpdated: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Error generating episode leaderboard:', error);
        return NextResponse.json(
          { error: 'Internal Server Error', message: 'Failed to generate episode leaderboard' },
          { status: 500 }
        );
      }
    }

    // Handle cumulative leaderboard up to a specific episode number
    if (episodeNumberParam) {
      const episodeNumber = parseInt(episodeNumberParam, 10);

      if (isNaN(episodeNumber) || episodeNumber < 1) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'episodeNumber must be a positive integer' },
          { status: 400 }
        );
      }

      // Check if an episode with this number exists
      const episode = await getEpisodeByNumber(leagueId, episodeNumber);

      if (!episode) {
        return NextResponse.json(
          { error: 'Not Found', message: `Episode ${episodeNumber} not found` },
          { status: 404 }
        );
      }

      try {
        const entries = await calculateCumulativeScoreAtEpisode(leagueId, episodeNumber);

        return NextResponse.json({
          leaderboard: {
            leagueId,
            type: 'cumulative',
            upToEpisodeNumber: episodeNumber,
            entries,
            lastUpdated: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Error generating cumulative leaderboard:', error);
        return NextResponse.json(
          { error: 'Internal Server Error', message: 'Failed to generate cumulative leaderboard' },
          { status: 500 }
        );
      }
    }

    // Default: full cumulative leaderboard across all episodes
    try {
      const leaderboardResult = await generateLeaderboard(leagueId);

      return NextResponse.json({
        leaderboard: {
          leagueId: leaderboardResult.leagueId,
          type: 'cumulative',
          entries: leaderboardResult.entries,
          episodeCount: leaderboardResult.episodeCount,
          lastUpdated: leaderboardResult.lastUpdated.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error generating leaderboard:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to generate leaderboard' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
}
