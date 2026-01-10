import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { generateLeaderboard, getEpisodeLeaderboard } from '@/lib/scoring/calculator';
import { getEpisodeByNumber } from '@/lib/firebase/episodes';
import {
  COLLECTIONS,
  type League,
} from '@/types/firebase';
import { StandingsClient } from './StandingsClient';

interface PageProps {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ episode?: string }>;
}

/**
 * Fetch league data from Firestore
 */
async function getLeague(leagueId: string): Promise<League | null> {
  const db = getAdminFirestore();
  const leagueDoc = await db.collection(COLLECTIONS.LEAGUES).doc(leagueId).get();

  if (!leagueDoc.exists) {
    return null;
  }

  return { id: leagueDoc.id, ...leagueDoc.data() } as League;
}

/**
 * Standings page - Shows league leaderboard
 * Server component that fetches data and renders the StandingsClient
 */
export default async function StandingsPage({ params, searchParams }: PageProps) {
  const { leagueId } = await params;
  const { episode: episodeParam } = await searchParams;

  // Verify session
  const session = await getCurrentUser();

  if (!session.authenticated) {
    redirect('/login');
  }

  const userId = session.user.uid;
  const isAdmin = session.user.admin;

  // Fetch league data
  const league = await getLeague(leagueId);

  if (!league) {
    notFound();
  }

  // Check if user has access to this league
  const isLeagueMember = league.playerUids.includes(userId);
  const isLeagueAdmin = league.adminUid === userId;

  if (!isLeagueMember && !isLeagueAdmin && !isAdmin) {
    redirect('/dashboard');
  }

  // Determine if we're viewing episode-specific or cumulative standings
  const episodeNumber = episodeParam ? parseInt(episodeParam, 10) : undefined;
  const isEpisodeView = !isNaN(episodeNumber as number) && episodeNumber && episodeNumber > 0;

  // Fetch leaderboard data
  let leaderboardData;
  let episodeId: string | undefined;

  try {
    if (isEpisodeView && episodeNumber) {
      // Fetch episode-specific leaderboard
      const episode = await getEpisodeByNumber(leagueId, episodeNumber);
      if (episode) {
        episodeId = episode.id;
        const entries = await getEpisodeLeaderboard(leagueId, episode.id);
        leaderboardData = {
          leagueId,
          entries,
          episodeCount: episodeNumber,
          lastUpdated: new Date(),
          type: 'episode' as const,
          episodeNumber,
        };
      } else {
        // Episode not found, fall back to cumulative
        leaderboardData = await generateLeaderboard(leagueId);
      }
    } else {
      // Fetch cumulative leaderboard
      leaderboardData = await generateLeaderboard(leagueId);
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    // Return empty leaderboard on error
    leaderboardData = {
      leagueId,
      entries: [],
      episodeCount: 0,
      lastUpdated: new Date(),
    };
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href={`/dashboard/league/${leagueId}`}
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to League
        </Link>

        {/* Client Component for Interactive Features */}
        <StandingsClient
          leagueId={leagueId}
          leagueName={league.name}
          season={league.season}
          currentUserUid={userId}
          initialData={{
            entries: leaderboardData.entries,
            episodeCount: leaderboardData.episodeCount,
            lastUpdated: leaderboardData.lastUpdated.toISOString(),
          }}
          initialEpisode={isEpisodeView ? episodeNumber : undefined}
        />
      </div>
    </div>
  );
}
