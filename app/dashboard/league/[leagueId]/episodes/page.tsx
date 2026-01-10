import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getLeagueById, checkLeagueAccess } from '@/lib/firebase/leagues';
import { getEpisodesByLeague } from '@/lib/firebase/episodes';
import { EpisodeCard } from '@/components/episodes';
import type { Episode, EpisodeContestantScore } from '@/types/firebase';

interface PageProps {
  params: Promise<{ leagueId: string }>;
}

/**
 * Convert Timestamp to ISO string safely
 */
function toISOString(date: unknown): string {
  if (date && typeof date === 'object' && 'toDate' in date) {
    return (date as { toDate: () => Date }).toDate().toISOString();
  }
  if (date instanceof Date) {
    return date.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Calculate total points distributed for an episode
 */
function getTotalPoints(scores: Record<string, EpisodeContestantScore | number>): number {
  let total = 0;
  for (const score of Object.values(scores)) {
    const points = typeof score === 'number' ? score : score.total;
    total += points;
  }
  return total;
}

/**
 * Episodes List Page
 * Lists all episodes for a league with links to episode detail pages
 */
export default async function EpisodesPage({ params }: PageProps) {
  const { leagueId } = await params;

  // Verify session
  const session = await getCurrentUser();

  if (!session.authenticated) {
    redirect('/login');
  }

  // Check league access
  const accessCheck = await checkLeagueAccess(leagueId, session.user.uid);

  if (!accessCheck.league) {
    notFound();
  }

  // Allow access to admins even if not in league
  if (!accessCheck.hasAccess && !session.user.admin) {
    redirect('/dashboard');
  }

  const league = accessCheck.league;

  // Fetch episodes
  const episodes = await getEpisodesByLeague(leagueId);

  // Serialize episodes for display
  const serializedEpisodes = episodes.map((episode) => ({
    id: episode.id,
    leagueId: episode.leagueId,
    episodeNumber: episode.episodeNumber,
    airDate: toISOString(episode.airDate),
    notes: episode.notes || '',
    totalPoints: getTotalPoints(episode.scores || {}),
    contestantCount: Object.keys(episode.scores || {}).length,
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Episodes</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                {league.name} - {league.season}
              </p>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Episodes</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {serializedEpisodes.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Points Distributed</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {serializedEpisodes.reduce((sum, ep) => sum + ep.totalPoints, 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Episodes with Scores</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {serializedEpisodes.filter((ep) => ep.totalPoints > 0).length}
            </p>
          </div>
        </div>

        {/* Episodes List */}
        {serializedEpisodes.length > 0 ? (
          <div className="space-y-4">
            {serializedEpisodes.map((episode) => (
              <Link
                key={episode.id}
                href={`/dashboard/league/${leagueId}/episodes/${episode.id}`}
                className="block"
              >
                <EpisodeCard
                  episodeNumber={episode.episodeNumber}
                  airDate={episode.airDate}
                  notes={episode.notes}
                  totalPoints={episode.totalPoints}
                  contestantCount={episode.contestantCount}
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No episodes yet
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Episodes will appear here once they are added by the league admin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
