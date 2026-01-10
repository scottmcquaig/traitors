import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getLeagueById, checkLeagueAccess } from '@/lib/firebase/leagues';
import { getEpisodeById } from '@/lib/firebase/episodes';
import { getContestantsByLeague } from '@/lib/firebase/contestants';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { EpisodeScoreTable } from '@/components/episodes';
import type { DraftPick, EpisodeContestantScore, Contestant, User } from '@/types/firebase';
import { COLLECTIONS } from '@/types/firebase';
import { SCORING_CATEGORIES, type ScoringCategory } from '@/constants';

interface PageProps {
  params: Promise<{ leagueId: string; episodeId: string }>;
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
 * Fetch draft picks for the league
 */
async function getDraftPicks(leagueId: string): Promise<DraftPick[]> {
  const db = getAdminFirestore();
  const picksSnapshot = await db
    .collection(COLLECTIONS.DRAFT_PICKS)
    .where('leagueId', '==', leagueId)
    .get();

  return picksSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DraftPick[];
}

/**
 * Fetch players by UIDs
 */
async function getPlayersByUids(uids: string[]): Promise<Map<string, Pick<User, 'uid' | 'displayName'>>> {
  if (uids.length === 0) {
    return new Map();
  }

  const db = getAdminFirestore();
  const playersMap = new Map<string, Pick<User, 'uid' | 'displayName'>>();

  // Firestore 'in' query is limited to 30 items
  const chunks = [];
  for (let i = 0; i < uids.length; i += 30) {
    chunks.push(uids.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const playersSnapshot = await db
      .collection(COLLECTIONS.USERS)
      .where('uid', 'in', chunk)
      .get();

    playersSnapshot.docs.forEach((doc) => {
      const data = doc.data() as User;
      playersMap.set(data.uid, { uid: data.uid, displayName: data.displayName });
    });
  }

  return playersMap;
}

/**
 * Serialize contestant score for client component
 */
interface SerializedContestantScore {
  contestantId: string;
  contestantName: string;
  contestantImage: string | null;
  contestantStatus: Contestant['status'];
  total: number;
  breakdown: Partial<Record<ScoringCategory, number>>;
  draftedByUid: string | null;
  draftedByName: string | null;
}

/**
 * Episode Detail Page
 * Shows detailed scores for a specific episode
 */
export default async function EpisodeDetailPage({ params }: PageProps) {
  const { leagueId, episodeId } = await params;

  // Verify session
  const session = await getCurrentUser();

  if (!session.authenticated) {
    redirect('/login');
  }

  const userId = session.user.uid;

  // Check league access
  const accessCheck = await checkLeagueAccess(leagueId, userId);

  if (!accessCheck.league) {
    notFound();
  }

  // Allow access to admins even if not in league
  if (!accessCheck.hasAccess && !session.user.admin) {
    redirect('/dashboard');
  }

  const league = accessCheck.league;

  // Fetch episode
  const episode = await getEpisodeById(episodeId);

  if (!episode) {
    notFound();
  }

  // Verify episode belongs to this league
  if (episode.leagueId !== leagueId) {
    notFound();
  }

  // Fetch contestants and draft picks
  const [contestants, draftPicks] = await Promise.all([
    getContestantsByLeague(leagueId),
    getDraftPicks(leagueId),
  ]);

  // Build contestant ID to drafted by player UID map
  const contestantToDrafter = new Map<string, string>();
  draftPicks.forEach((pick) => {
    contestantToDrafter.set(pick.contestantId, pick.playerUid);
  });

  // Get unique player UIDs for fetching display names
  const playerUids = Array.from(new Set(draftPicks.map((pick) => pick.playerUid)));
  const playersMap = await getPlayersByUids(playerUids);

  // Build serialized contestant scores
  const contestantScores: SerializedContestantScore[] = contestants.map((contestant) => {
    const score = episode.scores?.[contestant.id];
    const drafterUid = contestantToDrafter.get(contestant.id) || null;
    const drafterInfo = drafterUid ? playersMap.get(drafterUid) : null;

    // Handle both old number format and new EpisodeContestantScore format
    let total = 0;
    let breakdown: Partial<Record<ScoringCategory, number>> = {};

    if (score) {
      if (typeof score === 'number') {
        total = score;
      } else {
        total = score.total;
        breakdown = score.breakdown || {};
      }
    }

    return {
      contestantId: contestant.id,
      contestantName: contestant.name,
      contestantImage: contestant.imageUrl || null,
      contestantStatus: contestant.status,
      total,
      breakdown,
      draftedByUid: drafterUid,
      draftedByName: drafterInfo?.displayName || null,
    };
  });

  // Sort contestants by score (highest first)
  contestantScores.sort((a, b) => b.total - a.total);

  // Calculate total points for this episode
  const totalEpisodePoints = contestantScores.reduce((sum, cs) => sum + cs.total, 0);

  // Format date for display
  const formattedDate = new Date(toISOString(episode.airDate)).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href={`/dashboard/league/${leagueId}/episodes`}
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
          Back to Episodes
        </Link>

        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <span className="text-lg font-bold text-purple-700 dark:text-purple-300">
                  {episode.episodeNumber}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Episode {episode.episodeNumber}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {league.name} - {league.season}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Episode Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Air Date</p>
              <p className="mt-1 text-gray-900 dark:text-white">{formattedDate}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Points</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {totalEpisodePoints}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Contestants Scored</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {contestantScores.filter((cs) => cs.total > 0).length} / {contestants.length}
              </p>
            </div>
          </div>
          {episode.notes && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</p>
              <p className="mt-1 text-gray-900 dark:text-white">{episode.notes}</p>
            </div>
          )}
        </div>

        {/* Scores Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Contestant Scores
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sorted by total points (highest first)
            </p>
          </div>

          {contestantScores.length > 0 ? (
            <EpisodeScoreTable
              contestantScores={contestantScores}
              currentUserUid={userId}
              scoringCategories={SCORING_CATEGORIES}
            />
          ) : (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              No contestants found for this episode.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
