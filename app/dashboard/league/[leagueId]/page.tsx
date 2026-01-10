import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import {
  COLLECTIONS,
  type League,
  type Contestant,
  type DraftPick,
  type User,
  type DraftStatus,
} from '@/types/firebase';

interface PageProps {
  params: Promise<{ leagueId: string }>;
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
 * Fetch contestants for the league
 */
async function getContestants(): Promise<Contestant[]> {
  const db = getAdminFirestore();
  const contestantsSnapshot = await db.collection(COLLECTIONS.CONTESTANTS).get();

  return contestantsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Contestant[];
}

/**
 * Fetch draft picks for the league
 */
async function getDraftPicks(leagueId: string): Promise<DraftPick[]> {
  const db = getAdminFirestore();
  const picksSnapshot = await db
    .collection(COLLECTIONS.DRAFT_PICKS)
    .where('leagueId', '==', leagueId)
    .orderBy('pickOrder', 'asc')
    .get();

  return picksSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DraftPick[];
}

/**
 * Fetch players in the league
 */
async function getPlayers(playerUids: string[]): Promise<Map<string, Pick<User, 'uid' | 'displayName'>>> {
  if (playerUids.length === 0) {
    return new Map();
  }

  const db = getAdminFirestore();
  const playersMap = new Map<string, Pick<User, 'uid' | 'displayName'>>();

  // Firestore 'in' query is limited to 30 items
  const chunks = [];
  for (let i = 0; i < playerUids.length; i += 30) {
    chunks.push(playerUids.slice(i, i + 30));
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
 * Get draft status styling
 */
function getDraftStatusInfo(status: DraftStatus) {
  switch (status) {
    case 'pending':
      return {
        label: 'Draft Not Started',
        description: 'Waiting for the league admin to start the draft.',
        className: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        textClass: 'text-yellow-800 dark:text-yellow-200',
        iconClass: 'text-yellow-500',
      };
    case 'in_progress':
      return {
        label: 'Draft In Progress',
        description: 'The draft is currently active. Join now to make your picks!',
        className: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        textClass: 'text-blue-800 dark:text-blue-200',
        iconClass: 'text-blue-500',
      };
    case 'completed':
      return {
        label: 'Draft Completed',
        description: 'All picks have been made. View the final rosters below.',
        className: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        textClass: 'text-green-800 dark:text-green-200',
        iconClass: 'text-green-500',
      };
    default:
      return {
        label: 'Unknown Status',
        description: '',
        className: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
        textClass: 'text-gray-800 dark:text-gray-200',
        iconClass: 'text-gray-500',
      };
  }
}

/**
 * League overview page
 * Shows contestants, players, and draft status
 */
export default async function LeaguePage({ params }: PageProps) {
  const { leagueId } = await params;

  // Verify session
  const session = await getCurrentUser();

  if (!session.authenticated) {
    redirect('/login');
  }

  const userId = session.user.uid;
  const isAdmin = session.user.admin;

  // Fetch data
  const league = await getLeague(leagueId);

  if (!league) {
    notFound();
  }

  // Check if user is a member of the league
  const isLeagueMember = league.playerUids.includes(userId);
  const isLeagueAdmin = league.adminUid === userId;

  if (!isLeagueMember && !isLeagueAdmin && !isAdmin) {
    redirect('/dashboard');
  }

  const [contestants, picks, players] = await Promise.all([
    getContestants(),
    getDraftPicks(leagueId),
    getPlayers(league.playerUids),
  ]);

  const statusInfo = getDraftStatusInfo(league.draftStatus);
  const totalPicks = league.playerUids.length * league.rosterSize;
  const currentPick = league.currentPick || 1;

  // Get player rosters
  const playerRosters = new Map<string, { contestant: Contestant; pick: DraftPick }[]>();
  league.playerUids.forEach((uid) => playerRosters.set(uid, []));

  picks.forEach((pick) => {
    const contestant = contestants.find((c) => c.id === pick.contestantId);
    if (contestant) {
      const roster = playerRosters.get(pick.playerUid) || [];
      roster.push({ contestant, pick });
      playerRosters.set(pick.playerUid, roster);
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
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
          Back to Dashboard
        </Link>

        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{league.name}</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">{league.season}</p>
            </div>

            {/* Draft button */}
            {league.draftStatus === 'in_progress' && (
              <Link
                href={`/dashboard/league/${leagueId}/draft`}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Go to Draft Board
              </Link>
            )}
          </div>
        </header>

        {/* Draft Status Banner */}
        <div className={`rounded-lg border p-4 mb-8 ${statusInfo.className}`}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 ${statusInfo.iconClass}`}>
              {league.draftStatus === 'pending' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              {league.draftStatus === 'in_progress' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              )}
              {league.draftStatus === 'completed' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h2 className={`text-lg font-semibold ${statusInfo.textClass}`}>
                {statusInfo.label}
              </h2>
              <p className={`text-sm mt-1 ${statusInfo.textClass} opacity-80`}>
                {statusInfo.description}
              </p>
              {league.draftStatus === 'in_progress' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={statusInfo.textClass}>Progress</span>
                    <span className={statusInfo.textClass}>
                      Pick {currentPick} of {totalPicks}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(picks.length / totalPicks) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* League stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Players</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {league.playerUids.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Roster Size</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{league.rosterSize}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Picks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPicks}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Picks Made</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{picks.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contestants section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Contestants ({contestants.length})
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {contestants.length > 0 ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700" role="list">
                  {contestants.map((contestant) => {
                    const draftedBy = picks.find((p) => p.contestantId === contestant.id);
                    const draftedByPlayer = draftedBy
                      ? players.get(draftedBy.playerUid)
                      : null;

                    return (
                      <li
                        key={contestant.id}
                        className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                          {contestant.imageUrl ? (
                            <img
                              src={contestant.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                              </svg>
                            </div>
                          )}
                          {contestant.status === 'eliminated' && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium truncate ${
                              contestant.status === 'eliminated'
                                ? 'text-gray-400 dark:text-gray-500 line-through'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {contestant.name}
                          </p>
                          {draftedByPlayer && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              Drafted by {draftedByPlayer.displayName}
                            </p>
                          )}
                        </div>

                        {/* Status badge */}
                        <span
                          className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            contestant.status === 'eliminated'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : contestant.status === 'winner'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : draftedBy
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {contestant.status === 'eliminated'
                            ? 'Eliminated'
                            : contestant.status === 'winner'
                            ? 'Winner'
                            : draftedBy
                            ? 'Drafted'
                            : 'Available'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No contestants available yet.
                </div>
              )}
            </div>
          </section>

          {/* Players section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Players ({league.playerUids.length})
            </h2>
            <div className="space-y-4">
              {league.draftOrder.map((playerUid, index) => {
                const player = players.get(playerUid);
                const roster = playerRosters.get(playerUid) || [];
                const isCurrentUser = playerUid === userId;

                return (
                  <div
                    key={playerUid}
                    className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${
                      isCurrentUser
                        ? 'border-blue-300 dark:border-blue-600 ring-1 ring-blue-200 dark:ring-blue-700'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                          {index + 1}
                        </span>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {player?.displayName || 'Unknown Player'}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                              (You)
                            </span>
                          )}
                        </h3>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {roster.length}/{league.rosterSize}
                      </span>
                    </div>

                    {/* Roster */}
                    {roster.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {roster
                          .sort((a, b) => a.pick.pickOrder - b.pick.pickOrder)
                          .map(({ contestant, pick }) => (
                            <div
                              key={pick.id}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                                contestant.status === 'eliminated'
                                  ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                                  : contestant.status === 'winner'
                                  ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                              }`}
                            >
                              <span className="font-medium">#{pick.pickOrder}</span>
                              <span
                                className={
                                  contestant.status === 'eliminated' ? 'line-through' : ''
                                }
                              >
                                {contestant.name}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        No picks yet
                      </p>
                    )}
                  </div>
                );
              })}

              {league.playerUids.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
                  No players have joined this league yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
