import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { checkLeagueAccess } from '@/lib/firebase/leagues';
import {
  createEpisode,
  getEpisodesByLeague,
  getEpisodeByNumber,
} from '@/lib/firebase/episodes';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Route params type for dynamic [leagueId] route
 */
interface RouteParams {
  params: Promise<{
    leagueId: string;
  }>;
}

/**
 * GET /api/leagues/[leagueId]/episodes
 * Lists all episodes for a league, ordered by episode number
 *
 * Access: Admin or players in the league
 *
 * Response:
 * - 200: Array of episodes
 * - 400: Missing leagueId parameter
 * - 401: Unauthorized (missing or invalid session)
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

    // Get all episodes for the league
    const episodes = await getEpisodesByLeague(leagueId);

    // Format episodes for response
    const formattedEpisodes = episodes.map((episode) => ({
      id: episode.id,
      leagueId: episode.leagueId,
      episodeNumber: episode.episodeNumber,
      airDate: episode.airDate instanceof Timestamp
        ? episode.airDate.toDate().toISOString()
        : episode.airDate,
      scores: episode.scores || {},
      notes: episode.notes,
      createdAt: episode.createdAt instanceof Timestamp
        ? episode.createdAt.toDate().toISOString()
        : episode.createdAt,
      updatedAt: episode.updatedAt instanceof Timestamp
        ? episode.updatedAt.toDate().toISOString()
        : episode.updatedAt,
    }));

    return NextResponse.json({
      episodes: formattedEpisodes,
      count: episodes.length,
    });
  } catch (error) {
    console.error('Error getting episodes:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to get episodes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leagues/[leagueId]/episodes
 * Creates a new episode for a league
 *
 * Access: Admin only
 *
 * Request body:
 * - episodeNumber: number (required) - Episode number (1-based)
 * - airDate: string (required) - ISO date string
 * - notes: string (optional) - Notes about the episode
 *
 * Response:
 * - 201: Created episode
 * - 400: Invalid request body or duplicate episode number
 * - 401: Unauthorized (missing or invalid session)
 * - 403: Forbidden (not admin)
 * - 404: League not found
 * - 500: Server error
 */
export async function POST(
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

    // Validate required fields
    if (typeof body.episodeNumber !== 'number' || body.episodeNumber < 1) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'episodeNumber is required and must be a positive number' },
        { status: 400 }
      );
    }

    if (!body.airDate || typeof body.airDate !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'airDate is required and must be a valid date string' },
        { status: 400 }
      );
    }

    // Validate airDate is a valid date
    const airDateParsed = new Date(body.airDate);
    if (isNaN(airDateParsed.getTime())) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'airDate must be a valid date string' },
        { status: 400 }
      );
    }

    // Check for duplicate episode number
    const existingEpisode = await getEpisodeByNumber(leagueId, body.episodeNumber);

    if (existingEpisode) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Episode ${body.episodeNumber} already exists for this league` },
        { status: 400 }
      );
    }

    // Create the episode
    const episode = await createEpisode({
      leagueId,
      episodeNumber: body.episodeNumber,
      airDate: airDateParsed,
      scores: {},
      notes: body.notes,
    });

    return NextResponse.json({
      message: 'Episode created successfully',
      episode: {
        id: episode.id,
        leagueId: episode.leagueId,
        episodeNumber: episode.episodeNumber,
        airDate: episode.airDate instanceof Timestamp
          ? episode.airDate.toDate().toISOString()
          : episode.airDate,
        scores: episode.scores || {},
        notes: episode.notes,
        createdAt: episode.createdAt instanceof Timestamp
          ? episode.createdAt.toDate().toISOString()
          : episode.createdAt,
        updatedAt: episode.updatedAt instanceof Timestamp
          ? episode.updatedAt.toDate().toISOString()
          : episode.updatedAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating episode:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create episode' },
      { status: 500 }
    );
  }
}
