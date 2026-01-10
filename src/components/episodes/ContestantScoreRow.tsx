'use client';

import { cn } from '@/lib/utils/cn';
import type { ScoringCategory } from '@/constants';
import type { ContestantStatus } from '@/types/firebase';

/**
 * Category display configuration
 * Maps category keys to friendly display names and colors
 */
const CATEGORY_CONFIG: Record<ScoringCategory, { label: string; colorClass: string }> = {
  SURVIVED_EPISODE: {
    label: 'Survived',
    colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  WON_SEASON: {
    label: 'Won Season',
    colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  CORRECT_VOTE: {
    label: 'Correct Vote',
    colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  RECEIVED_VOTES: {
    label: 'Received Votes',
    colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  TRAITOR_SURVIVED_ROUND: {
    label: 'Traitor Survived',
    colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  TRAITOR_SUCCESSFUL_MURDER: {
    label: 'Murder',
    colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  FAITHFUL_CAUGHT_TRAITOR: {
    label: 'Caught Traitor',
    colorClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  WON_CHALLENGE: {
    label: 'Won Challenge',
    colorClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
  SHIELD_EARNED: {
    label: 'Shield',
    colorClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  },
  FAN_FAVORITE: {
    label: 'Fan Favorite',
    colorClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  },
  STRATEGIC_PLAY: {
    label: 'Strategic Play',
    colorClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  },
};

export interface ContestantScoreRowProps {
  /** Contestant's name */
  contestantName: string;
  /** Contestant's profile image URL */
  contestantImage: string | null;
  /** Contestant's current status */
  contestantStatus: ContestantStatus;
  /** Total points for this episode */
  total: number;
  /** Score breakdown by category */
  breakdown: Partial<Record<ScoringCategory, number>>;
  /** Name of player who drafted this contestant */
  draftedByName: string | null;
  /** UID of player who drafted this contestant */
  draftedByUid: string | null;
  /** Current user's UID for highlighting */
  currentUserUid: string;
  /** Position/rank in the list */
  rank: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ContestantScoreRow - Single row showing contestant's score breakdown
 * Displays category badges/chips for each earned category
 * Highlights if drafted by current user
 */
export function ContestantScoreRow({
  contestantName,
  contestantImage,
  contestantStatus,
  total,
  breakdown,
  draftedByName,
  draftedByUid,
  currentUserUid,
  rank,
  className,
}: ContestantScoreRowProps) {
  const isCurrentUser = draftedByUid === currentUserUid;
  const isEliminated = contestantStatus === 'eliminated';
  const isWinner = contestantStatus === 'winner';

  // Get categories that have points
  const earnedCategories = Object.entries(breakdown).filter(
    ([, points]) => points !== undefined && points !== 0
  ) as [ScoringCategory, number][];

  return (
    <tr
      className={cn(
        'border-b border-gray-100 dark:border-gray-700/50 last:border-0',
        'hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors',
        isCurrentUser && 'bg-blue-50 dark:bg-blue-900/20',
        className
      )}
    >
      {/* Rank */}
      <td className="px-4 py-3 text-center">
        <span
          className={cn(
            'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
            rank <= 3
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          )}
        >
          {rank}
        </span>
      </td>

      {/* Contestant */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            {contestantImage ? (
              <img
                src={contestantImage}
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
            {isEliminated && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>

          {/* Name and status */}
          <div className="min-w-0">
            <p
              className={cn(
                'font-medium truncate',
                isEliminated
                  ? 'text-gray-400 dark:text-gray-500 line-through'
                  : 'text-gray-900 dark:text-white'
              )}
            >
              {contestantName}
              {isCurrentUser && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Your pick)</span>
              )}
            </p>
            <span
              className={cn(
                'text-xs',
                isEliminated
                  ? 'text-red-500 dark:text-red-400'
                  : isWinner
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {isEliminated ? 'Eliminated' : isWinner ? 'Winner' : 'Active'}
            </span>
          </div>
        </div>
      </td>

      {/* Categories */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {earnedCategories.length > 0 ? (
            earnedCategories.map(([category, points]) => {
              const config = CATEGORY_CONFIG[category];
              const isNegative = points < 0;

              return (
                <span
                  key={category}
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    config?.colorClass || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  )}
                  title={`${config?.label || category}: ${points > 0 ? '+' : ''}${points}`}
                >
                  {config?.label || category}
                  <span className="ml-1 opacity-75">
                    {isNegative ? points : `+${points}`}
                  </span>
                </span>
              );
            })
          ) : total > 0 ? (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
              Points (no breakdown)
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
              No points
            </span>
          )}
        </div>
      </td>

      {/* Total */}
      <td className="px-4 py-3 text-right">
        <span
          className={cn(
            'text-lg font-semibold',
            total > 0
              ? 'text-green-600 dark:text-green-400'
              : total < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-400 dark:text-gray-500'
          )}
        >
          {total > 0 && '+'}
          {total}
        </span>
      </td>

      {/* Drafted By */}
      <td className="px-4 py-3">
        {draftedByName ? (
          <span
            className={cn(
              'text-sm',
              isCurrentUser
                ? 'text-blue-600 dark:text-blue-400 font-medium'
                : 'text-gray-600 dark:text-gray-400'
            )}
          >
            {draftedByName}
          </span>
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-500 italic">
            Undrafted
          </span>
        )}
      </td>
    </tr>
  );
}

export default ContestantScoreRow;
