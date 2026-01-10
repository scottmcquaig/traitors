'use client';

import { cn } from '@/lib/utils/cn';
import Link from 'next/link';

export interface PlayerRankCardProps {
  /** Player's rank */
  rank: number;
  /** Player's display name */
  playerName?: string;
  /** Player's UID */
  playerUid: string;
  /** Total score */
  totalScore: number;
  /** Number of contestants drafted */
  contestantCount: number;
  /** Whether this is the current user */
  isCurrentUser?: boolean;
  /** League ID for linking to detailed breakdown */
  leagueId: string;
  /** Whether to show the detailed breakdown link */
  showBreakdownLink?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * Get medal color based on rank
 */
function getMedalColor(rank: number): string | null {
  switch (rank) {
    case 1:
      return 'text-yellow-500';
    case 2:
      return 'text-gray-400';
    case 3:
      return 'text-amber-600';
    default:
      return null;
  }
}

/**
 * Get rank badge styling
 */
function getRankBadgeStyle(rank: number): {
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (rank) {
    case 1:
      return {
        bgClass: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
        textClass: 'text-white',
        borderClass: 'border-yellow-300',
      };
    case 2:
      return {
        bgClass: 'bg-gradient-to-br from-gray-300 to-gray-500',
        textClass: 'text-white',
        borderClass: 'border-gray-200',
      };
    case 3:
      return {
        bgClass: 'bg-gradient-to-br from-amber-500 to-amber-700',
        textClass: 'text-white',
        borderClass: 'border-amber-400',
      };
    default:
      return {
        bgClass: 'bg-gray-100 dark:bg-gray-700',
        textClass: 'text-gray-600 dark:text-gray-300',
        borderClass: 'border-gray-200 dark:border-gray-600',
      };
  }
}

/**
 * PlayerRankCard - Shows a single player's rank and score
 * Used for mobile view, summary cards, or highlighting specific players
 */
export function PlayerRankCard({
  rank,
  playerName,
  playerUid,
  totalScore,
  contestantCount,
  isCurrentUser = false,
  leagueId,
  showBreakdownLink = true,
  compact = false,
  className,
}: PlayerRankCardProps) {
  const rankBadgeStyle = getRankBadgeStyle(rank);
  const medalColor = getMedalColor(rank);

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border',
          isCurrentUser
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border',
              rankBadgeStyle.bgClass,
              rankBadgeStyle.textClass,
              rankBadgeStyle.borderClass
            )}
          >
            {rank}
          </div>
          <div>
            <span className="font-medium text-gray-900 dark:text-white">
              {playerName || 'Unknown Player'}
            </span>
            {isCurrentUser && (
              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
            )}
          </div>
        </div>
        <span
          className={cn(
            'font-bold',
            totalScore > 0
              ? 'text-green-600 dark:text-green-400'
              : totalScore < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-600 dark:text-gray-400'
          )}
        >
          {totalScore > 0 ? '+' : ''}
          {totalScore}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border p-6 transition-shadow hover:shadow-md',
        isCurrentUser
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-200 dark:ring-blue-800'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Rank Badge */}
      <div className="absolute -top-3 -left-3">
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 shadow-lg',
            rankBadgeStyle.bgClass,
            rankBadgeStyle.textClass,
            rankBadgeStyle.borderClass
          )}
        >
          {rank}
        </div>
      </div>

      {/* Medal indicator for top 3 */}
      {medalColor && (
        <div className="absolute -top-2 -right-2">
          <svg
            className={cn('w-8 h-8', medalColor)}
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 15.75c-2.485 0-4.5-2.015-4.5-4.5S9.515 6.75 12 6.75s4.5 2.015 4.5 4.5-2.015 4.5-4.5 4.5zM12 4.5a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5z" />
            <path d="M8.25 16.5l-2.25 3h12l-2.25-3H8.25z" />
            <path d="M12 2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75z" />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className="ml-6 mt-2">
        {/* Player Name */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {playerName || 'Unknown Player'}
          </h3>
          {isCurrentUser && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              You
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Score</p>
            <p
              className={cn(
                'text-2xl font-bold',
                totalScore > 0
                  ? 'text-green-600 dark:text-green-400'
                  : totalScore < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              {totalScore > 0 ? '+' : ''}
              {totalScore}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Contestants</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{contestantCount}</p>
          </div>
        </div>

        {/* View Details Link */}
        {showBreakdownLink && (
          <Link
            href={`/dashboard/league/${leagueId}/standings/${playerUid}`}
            className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            View Score Breakdown
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}

export default PlayerRankCard;
