'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';

/**
 * Leaderboard entry type matching the API response
 */
export interface LeaderboardEntry {
  rank: number;
  playerUid: string;
  playerName?: string;
  totalScore: number;
  contestantCount: number;
}

export interface LeaderboardTableProps {
  /** Array of leaderboard entries */
  entries: LeaderboardEntry[];
  /** Current user's UID to highlight their row */
  currentUserUid: string;
  /** League ID for linking to detailed breakdown */
  leagueId: string;
  /** Whether to show the detailed breakdown link */
  showBreakdownLink?: boolean;
  /** Optional className for the container */
  className?: string;
}

/**
 * Get rank styling for top 3 positions
 */
function getRankStyle(rank: number): {
  bgClass: string;
  textClass: string;
  icon?: string;
} {
  switch (rank) {
    case 1:
      return {
        bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
        textClass: 'text-yellow-700 dark:text-yellow-300',
        icon: 'gold',
      };
    case 2:
      return {
        bgClass: 'bg-gray-200 dark:bg-gray-600',
        textClass: 'text-gray-700 dark:text-gray-300',
        icon: 'silver',
      };
    case 3:
      return {
        bgClass: 'bg-amber-100 dark:bg-amber-900/30',
        textClass: 'text-amber-700 dark:text-amber-300',
        icon: 'bronze',
      };
    default:
      return {
        bgClass: 'bg-gray-100 dark:bg-gray-700',
        textClass: 'text-gray-500 dark:text-gray-400',
      };
  }
}

/**
 * Medal icon for top 3
 */
function MedalIcon({ type }: { type: 'gold' | 'silver' | 'bronze' }) {
  const colors = {
    gold: 'text-yellow-500',
    silver: 'text-gray-400',
    bronze: 'text-amber-600',
  };

  return (
    <svg
      className={cn('w-4 h-4', colors[type])}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * LeaderboardTable - Displays league standings in a sortable table
 * Shows player rankings with visual indicators for top 3 positions
 */
export function LeaderboardTable({
  entries,
  currentUserUid,
  leagueId,
  showBreakdownLink = true,
  className,
}: LeaderboardTableProps) {
  /**
   * Sort entries by rank (they should already be sorted, but ensure it)
   */
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => a.rank - b.rank);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className={cn('text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
        <svg
          className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          No standings yet
        </h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Standings will appear once episodes have been scored.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden', className)}>
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16"
              >
                Rank
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Player
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24"
              >
                Contestants
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24"
              >
                Score
              </th>
              {showBreakdownLink && (
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20"
                >
                  Details
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedEntries.map((entry) => {
              const isCurrentUser = entry.playerUid === currentUserUid;
              const rankStyle = getRankStyle(entry.rank);
              const isTopThree = entry.rank <= 3;

              return (
                <tr
                  key={entry.playerUid}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                    isCurrentUser && 'bg-blue-50 dark:bg-blue-900/20',
                    isTopThree && !isCurrentUser && 'bg-gray-50/50 dark:bg-gray-700/25'
                  )}
                >
                  {/* Rank */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                          rankStyle.bgClass,
                          rankStyle.textClass
                        )}
                      >
                        {entry.rank}
                      </div>
                      {rankStyle.icon && (
                        <MedalIcon type={rankStyle.icon as 'gold' | 'silver' | 'bronze'} />
                      )}
                    </div>
                  </td>

                  {/* Player */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {entry.playerName || 'Unknown Player'}
                      </span>
                      {isCurrentUser && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          You
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Contestants */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      {entry.contestantCount}
                    </span>
                  </td>

                  {/* Score */}
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <span
                      className={cn(
                        'font-semibold text-lg',
                        entry.totalScore > 0
                          ? 'text-green-600 dark:text-green-400'
                          : entry.totalScore < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      )}
                    >
                      {entry.totalScore > 0 ? '+' : ''}
                      {entry.totalScore}
                    </span>
                  </td>

                  {/* Details Link */}
                  {showBreakdownLink && (
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/dashboard/league/${leagueId}/standings/${entry.playerUid}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
        {sortedEntries.map((entry) => {
          const isCurrentUser = entry.playerUid === currentUserUid;
          const rankStyle = getRankStyle(entry.rank);

          return (
            <div
              key={entry.playerUid}
              className={cn(
                'p-4',
                isCurrentUser && 'bg-blue-50 dark:bg-blue-900/20'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                      rankStyle.bgClass,
                      rankStyle.textClass
                    )}
                  >
                    {entry.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {entry.playerName || 'Unknown Player'}
                      </span>
                      {isCurrentUser && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.contestantCount} contestant{entry.contestantCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      'font-bold text-xl',
                      entry.totalScore > 0
                        ? 'text-green-600 dark:text-green-400'
                        : entry.totalScore < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {entry.totalScore > 0 ? '+' : ''}
                    {entry.totalScore}
                  </span>
                  {showBreakdownLink && (
                    <Link
                      href={`/dashboard/league/${leagueId}/standings/${entry.playerUid}`}
                      className="block text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
                    >
                      View details
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LeaderboardTable;
