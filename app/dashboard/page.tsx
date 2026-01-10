import Link from 'next/link';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { COLLECTIONS, type League, type DraftStatus } from '@/types/firebase';

/**
 * Get the user's leagues from Firestore
 */
async function getUserLeagues(userId: string): Promise<League[]> {
  const db = getAdminFirestore();
  const leaguesSnapshot = await db
    .collection(COLLECTIONS.LEAGUES)
    .where('playerUids', 'array-contains', userId)
    .get();

  return leaguesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as League[];
}

/**
 * Get draft status badge styling based on status
 */
function getDraftStatusBadge(status: DraftStatus) {
  switch (status) {
    case 'pending':
      return {
        label: 'Not Started',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      };
    case 'completed':
      return {
        label: 'Completed',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      };
    default:
      return {
        label: 'Unknown',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      };
  }
}

/**
 * Dashboard page - Shows user's leagues with draft status
 * Server component that fetches leagues data
 */
export default async function DashboardPage() {
  // Verify session
  const session = await getCurrentUser();

  if (!session.authenticated) {
    redirect('/login');
  }

  const userId = session.user.uid;

  // Fetch user's leagues
  const leagues = await getUserLeagues(userId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Leagues</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View your fantasy leagues and participate in drafts
          </p>
        </header>

        {/* Leagues grid */}
        {leagues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues.map((league) => {
              const statusBadge = getDraftStatusBadge(league.draftStatus);
              const canAccessDraft = league.draftStatus === 'in_progress';

              return (
                <article
                  key={league.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    {/* League header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {league.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {league.season}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* League stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Players</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {league.playerUids.length}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Roster Size</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {league.rosterSize}
                        </p>
                      </div>
                    </div>

                    {/* Progress indicator for in-progress drafts */}
                    {league.draftStatus === 'in_progress' && league.currentPick && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Draft Progress</span>
                          <span>
                            Pick {league.currentPick} of{' '}
                            {league.playerUids.length * league.rosterSize}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(league.currentPick / (league.playerUids.length * league.rosterSize)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Link
                        href={`/dashboard/league/${league.id}`}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        View League
                      </Link>
                      {canAccessDraft && (
                        <Link
                          href={`/dashboard/league/${league.id}/draft`}
                          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-1.5"
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
                          Draft Now
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg
              className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No leagues yet
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              You haven&apos;t joined any fantasy leagues yet.
              <br />
              Ask a league admin to invite you to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
