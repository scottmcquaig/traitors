'use client';

import { cn } from '@/lib/utils/cn';
import type { User } from '@/types/firebase';
import type { ContestantData } from './ContestantCard';

/**
 * Simplified draft pick data for draft components
 * Does not include Firestore-specific fields like timestamps
 */
export interface DraftPickData {
  id: string;
  leagueId: string;
  contestantId: string;
  playerUid: string;
  pickOrder: number;
  round: number;
}

export interface PlayerRosterProps {
  /** The player whose roster to display */
  player: Pick<User, 'uid' | 'displayName'>;
  /** All contestants in the league */
  contestants: ContestantData[];
  /** All draft picks for this league */
  picks: DraftPickData[];
  /** Maximum roster size */
  rosterSize: number;
  /** Whether this player is the current user */
  isCurrentUser?: boolean;
  /** Whether to highlight this player (e.g., it's their turn) */
  isHighlighted?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * PlayerRoster displays a player's drafted contestants.
 * Shows empty slots for remaining picks and highlights the current user.
 */
export function PlayerRoster({
  player,
  contestants,
  picks,
  rosterSize,
  isCurrentUser = false,
  isHighlighted = false,
  size = 'md',
}: PlayerRosterProps) {
  // Get picks for this player, sorted by pick order
  const playerPicks = picks
    .filter((pick) => pick.playerUid === player.uid)
    .sort((a, b) => a.pickOrder - b.pickOrder);

  // Map picks to contestants
  const draftedContestants = playerPicks.map((pick) => {
    const contestant = contestants.find((c) => c.id === pick.contestantId);
    return {
      pick,
      contestant,
    };
  });

  // Calculate empty slots
  const emptySlots = Math.max(0, rosterSize - playerPicks.length);

  const sizeClasses = {
    sm: {
      container: 'p-2',
      header: 'text-sm',
      item: 'p-1.5 text-xs',
      image: 'w-6 h-6',
      empty: 'h-8',
    },
    md: {
      container: 'p-3',
      header: 'text-base',
      item: 'p-2 text-sm',
      image: 'w-8 h-8',
      empty: 'h-10',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        classes.container,
        isHighlighted
          ? 'border-yellow-400 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
        isCurrentUser && !isHighlighted && 'border-blue-300 dark:border-blue-600'
      )}
      aria-label={`${player.displayName}'s roster`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3
          className={cn(
            'font-semibold text-gray-900 dark:text-white truncate',
            classes.header
          )}
        >
          {player.displayName}
          {isCurrentUser && (
            <span className="ml-1.5 text-xs font-normal text-blue-600 dark:text-blue-400">
              (You)
            </span>
          )}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
          {playerPicks.length}/{rosterSize}
        </span>
      </div>

      {/* Roster list */}
      <ul className="space-y-1" role="list" aria-label="Drafted contestants">
        {draftedContestants.map(({ pick, contestant }) => (
          <li
            key={pick.id}
            className={cn(
              'flex items-center gap-2 rounded-md bg-gray-50 dark:bg-gray-700/50',
              classes.item
            )}
          >
            {/* Pick number */}
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-[10px] font-medium text-gray-600 dark:text-gray-300 flex-shrink-0">
              {pick.pickOrder}
            </span>

            {/* Contestant image */}
            <div
              className={cn(
                'rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0',
                classes.image
              )}
            >
              {contestant?.imageUrl ? (
                <img
                  src={contestant.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Contestant name */}
            <span
              className={cn(
                'truncate text-gray-700 dark:text-gray-200',
                contestant?.status === 'eliminated' &&
                  'line-through text-gray-400 dark:text-gray-500'
              )}
            >
              {contestant?.name || 'Unknown'}
            </span>

            {/* Status indicator */}
            {contestant?.status === 'eliminated' && (
              <span className="ml-auto flex-shrink-0">
                <svg
                  className="w-4 h-4 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Eliminated"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </span>
            )}
            {contestant?.status === 'winner' && (
              <span className="ml-auto flex-shrink-0">
                <svg
                  className="w-4 h-4 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-label="Winner"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </span>
            )}
          </li>
        ))}

        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <li
            key={`empty-${index}`}
            className={cn(
              'flex items-center justify-center rounded-md border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500',
              classes.empty
            )}
            aria-label="Empty roster slot"
          >
            <span className="text-xs">Pick {playerPicks.length + index + 1}</span>
          </li>
        ))}
      </ul>

      {/* Turn indicator */}
      {isHighlighted && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-yellow-700 dark:text-yellow-400">
          <svg
            className="w-4 h-4 animate-pulse"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs font-medium">Now Picking</span>
        </div>
      )}
    </div>
  );
}

export default PlayerRoster;
