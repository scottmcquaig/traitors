import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getLeagueById } from '@/lib/firebase/leagues';
import { getDraftPicksByPlayer, getDraftPicksByLeague } from '@/lib/firebase/draft-picks';
import { getContestantsByLeague } from '@/lib/firebase/contestants';
import { getEpisodesByLeague } from '@/lib/firebase/episodes';
import { getUserByUid } from '@/lib/firebase/users';
import {
  getPlayerScoreBreakdown,
  calculatePlayerTotal,
} from '@/lib/scoring/calculator';
import type { Contestant, DraftPick, Episode, User } from '@/types/firebase';
import { RosterPageClient } from './RosterPageClient';

interface PageProps {
  params: Promise<{ leagueId: string }>;
}

/**
 * Fetch all league data needed for the roster page
 */
async function getRosterData(leagueId: string, playerUid: string) {
  const [league, draftPicks, contestants, episodes, playerScore] = await Promise.all([
    getLeagueById(leagueId),
    getDraftPicksByPlayer(leagueId, playerUid),
    getContestantsByLeague(leagueId),
    getEpisodesByLeague(leagueId),
    getPlayerScoreBreakdown(leagueId, playerUid),
  ]);

  return { league, draftPicks, contestants, episodes, playerScore };
}

/**
 * Fetch all players in the league with their scores
 */
async function getPlayersWithScores(
  leagueId: string,
  playerUids: string[],
  episodes: Episode[],
  allDraftPicks: DraftPick[]
) {
  const playersWithScores: Array<{
    uid: string;
    displayName: string;
    totalScore: number;
  }> = [];

  // Group picks by player
  const picksByPlayer = new Map<string, DraftPick[]>();
  allDraftPicks.forEach((pick) => {
    const existing = picksByPlayer.get(pick.playerUid) || [];
    existing.push(pick);
    picksByPlayer.set(pick.playerUid, existing);
  });

  // Fetch user data and calculate scores
  for (const uid of playerUids) {
    const user = await getUserByUid(uid);
    const picks = picksByPlayer.get(uid) || [];
    const totalScore = calculatePlayerTotal(episodes, picks);

    playersWithScores.push({
      uid,
      displayName: user?.displayName || 'Unknown Player',
      totalScore,
    });
  }

  // Sort by score descending
  playersWithScores.sort((a, b) => b.totalScore - a.totalScore);

  return playersWithScores;
}

/**
 * Roster page showing the current user's drafted contestants and their performance
 */
export default async function RosterPage({ params }: PageProps) {
  const { leagueId } = await params;

  // Verify session
  const session = await getCurrentUser();

  if (!session.authenticated) {
    redirect('/login');
  }

  const userId = session.user.uid;
  const isAdmin = session.user.admin;

  // Fetch league data
  const { league, draftPicks, contestants, episodes, playerScore } = await getRosterData(
    leagueId,
    userId
  );

  if (!league) {
    notFound();
  }

  // Check if user is a member of the league
  const isLeagueMember = league.playerUids.includes(userId);
  const isLeagueAdmin = league.adminUid === userId;

  if (!isLeagueMember && !isLeagueAdmin && !isAdmin) {
    redirect('/dashboard');
  }

  // Check if draft is completed
  if (league.draftStatus !== 'completed') {
    redirect(`/dashboard/league/${leagueId}`);
  }

  // Get all draft picks for player selector
  const allDraftPicks = await getDraftPicksByLeague(leagueId);

  // Get all players with their scores for the selector
  const playersWithScores = await getPlayersWithScores(
    leagueId,
    league.playerUids,
    episodes,
    allDraftPicks
  );

  // Get current user's display name
  const currentUser = await getUserByUid(userId);
  const playerName = currentUser?.displayName || 'Unknown Player';

  // Build the contestant data with scores for the client component
  const contestantMap = new Map(contestants.map((c) => [c.id, c]));

  const rosterData = draftPicks.map((pick) => {
    const contestant = contestantMap.get(pick.contestantId);
    const contestantScore = playerScore.contestantScores[pick.contestantId];

    // Build episode scores array
    const episodeScores = episodes.map((episode) => ({
      episodeId: episode.id,
      episodeNumber: episode.episodeNumber,
      score: contestantScore?.episodeBreakdown[episode.id] || 0,
    }));

    return {
      contestantId: pick.contestantId,
      name: contestant?.name || 'Unknown',
      imageUrl: contestant?.imageUrl,
      status: contestant?.status || 'active',
      role: contestant?.role,
      eliminatedEpisode: contestant?.eliminatedEpisode,
      totalScore: contestantScore?.totalScore || 0,
      episodeScores,
      draftRound: pick.round,
      draftPick: pick.pickOrder,
    };
  });

  // Sort by draft pick order
  rosterData.sort((a, b) => a.draftPick - b.draftPick);

  // Calculate summary stats
  const totalScore = playerScore.totalScore;
  const contestantScores = rosterData.map((r) => ({
    contestantId: r.contestantId,
    contestantName: r.name,
    totalScore: r.totalScore,
    status: r.status,
  }));

  // Serialize episodes data for client component
  const serializedEpisodes = episodes.map((ep) => ({
    id: ep.id,
    episodeNumber: ep.episodeNumber,
    airDate: ep.airDate instanceof Date ? ep.airDate.toISOString() :
             'toDate' in ep.airDate ? (ep.airDate as any).toDate().toISOString() :
             String(ep.airDate),
  }));

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

        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Roster</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                {league.name} - {league.season}
              </p>
            </div>
          </div>
        </header>

        {/* Client-side roster content */}
        <RosterPageClient
          leagueId={leagueId}
          currentPlayerUid={userId}
          playerName={playerName}
          isOwnRoster={true}
          totalScore={totalScore}
          contestantScores={contestantScores}
          rosterData={rosterData}
          episodeCount={episodes.length}
          episodes={serializedEpisodes}
          players={playersWithScores.map((p) => ({
            uid: p.uid,
            displayName: p.displayName,
            totalScore: p.totalScore,
            isCurrentUser: p.uid === userId,
          }))}
        />
      </div>
    </div>
  );
}
