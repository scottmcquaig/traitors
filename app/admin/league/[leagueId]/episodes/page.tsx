import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getLeagueById } from '@/lib/firebase/leagues';
import { getEpisodesByLeague } from '@/lib/firebase/episodes';
import { getContestantsByLeague } from '@/lib/firebase/contestants';
import type { Episode, Contestant } from '@/types/firebase';
import { EpisodeList } from '@/components/scoring/EpisodeList';

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
 * Admin Episode Management Page
 * Allows admins to manage episodes and scores for a league
 */
export default async function AdminEpisodesPage({ params }: PageProps) {
  const { leagueId } = await params;

  // Verify session and admin status
  const session = await getCurrentUser();

  if (!session.authenticated) {
    redirect('/login');
  }

  if (!session.user.admin) {
    redirect('/dashboard');
  }

  // Fetch data
  const league = await getLeagueById(leagueId);

  if (!league) {
    notFound();
  }

  const [episodes, contestants] = await Promise.all([
    getEpisodesByLeague(leagueId),
    getContestantsByLeague(leagueId),
  ]);

  // Serialize episodes for client component
  // Convert EpisodeContestantScore to simple number for UI
  const serializedEpisodes = episodes.map((episode) => ({
    id: episode.id,
    leagueId: episode.leagueId,
    episodeNumber: episode.episodeNumber,
    airDate: toISOString(episode.airDate),
    notes: episode.notes || '',
    // Convert EpisodeContestantScore to simple totals for display
    scores: Object.fromEntries(
      Object.entries(episode.scores || {}).map(([contestantId, score]) => [
        contestantId,
        typeof score === 'number' ? score : score.total,
      ])
    ),
  }));

  // Serialize contestants for client component
  const serializedContestants = contestants.map((contestant) => ({
    id: contestant.id,
    leagueId: contestant.leagueId,
    name: contestant.name,
    status: contestant.status,
    imageUrl: contestant.imageUrl || null,
    role: contestant.role || null,
    eliminatedEpisode: contestant.eliminatedEpisode || null,
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/admin"
          className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Admin
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link
          href="/admin/leagues"
          className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Leagues
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 dark:text-white font-medium">{league.name}</span>
      </nav>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Episode Management
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {league.name} - {league.season}
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Episodes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {episodes.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Contestants</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {contestants.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Contestants</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {contestants.filter((c) => c.status === 'active').length}
          </p>
        </div>
      </div>

      {/* Episode List Component */}
      <EpisodeList
        leagueId={leagueId}
        episodes={serializedEpisodes}
        contestants={serializedContestants}
      />
    </div>
  );
}
