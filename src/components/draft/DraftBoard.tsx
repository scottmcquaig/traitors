'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import type { User } from '@/types/firebase';
import { ContestantCard, type ContestantStatus, type ContestantData } from './ContestantCard';
import { DraftOrderDisplay } from './DraftOrderDisplay';
import { PlayerRoster, type DraftPickData } from './PlayerRoster';

export interface DraftBoardProps {
  /** League ID */
  leagueId: string;
  /** All contestants available for drafting */
  contestants: ContestantData[];
  /** Array of player UIDs in draft order */
  draftOrder: string[];
  /** Map of player UIDs to player data */
  players: Map<string, Pick<User, 'uid' | 'displayName'>>;
  /** All draft picks made so far */
  picks: DraftPickData[];
  /** Current pick number (1-indexed) */
  currentPick: number;
  /** Maximum roster size */
  rosterSize: number;
  /** Current user's UID */
  currentUserUid: string;
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** Whether the draft is active */
  isDraftActive: boolean;
  /** Callback when a draft pick is made */
  onDraftPick?: (contestantId: string) => Promise<void>;
  /** Error message to display */
  error?: string | null;
  /** Callback to clear error */
  onClearError?: () => void;
}

/**
 * DraftBoard is the main component for the draft interface.
 * Shows contestants grid, draft order, and player rosters.
 * Supports both regular player drafting and admin picking.
 */
export function DraftBoard({
  leagueId,
  contestants,
  draftOrder,
  players,
  picks,
  currentPick,
  rosterSize,
  currentUserUid,
  isAdmin,
  isDraftActive,
  onDraftPick,
  error,
  onClearError,
}: DraftBoardProps) {
  const [draftingContestantId, setDraftingContestantId] = useState<string | null>(null);

  // Calculate current picking player based on snake draft
  const currentPickingPlayerUid = useMemo(() => {
    const numPlayers = draftOrder.length;
    const round = Math.ceil(currentPick / numPlayers);
    const positionInRound = ((currentPick - 1) % numPlayers);

    // Snake draft: reverse order on even rounds
    if (round % 2 === 0) {
      return draftOrder[numPlayers - 1 - positionInRound];
    }
    return draftOrder[positionInRound];
  }, [currentPick, draftOrder]);

  // Check if it's current user's turn
  const isUsersTurn = currentPickingPlayerUid === currentUserUid;

  // Can the current user draft?
  const canDraft = isDraftActive && (isUsersTurn || isAdmin);

  // Get set of drafted contestant IDs
  const draftedContestantIds = useMemo(() => {
    return new Set(picks.map((pick) => pick.contestantId));
  }, [picks]);

  // Get map of contestant ID to player who drafted them
  const contestantToPlayer = useMemo(() => {
    const map = new Map<string, string>();
    picks.forEach((pick) => {
      const player = players.get(pick.playerUid);
      if (player) {
        map.set(pick.contestantId, player.displayName);
      }
    });
    return map;
  }, [picks, players]);

  // Calculate draft status for each contestant
  const getContestantDraftStatus = useCallback(
    (contestant: ContestantData): ContestantStatus => {
      if (draftedContestantIds.has(contestant.id)) {
        return 'drafted';
      }
      if (contestant.status === 'eliminated') {
        return 'eliminated';
      }
      return 'available';
    },
    [draftedContestantIds]
  );

  // Handle draft pick
  const handleDraft = async (contestantId: string) => {
    if (!onDraftPick || draftingContestantId) return;

    setDraftingContestantId(contestantId);
    try {
      await onDraftPick(contestantId);
    } finally {
      setDraftingContestantId(null);
    }
  };

  // Sort contestants: available first, then drafted, then eliminated
  const sortedContestants = useMemo(() => {
    return [...contestants].sort((a, b) => {
      const statusOrder: Record<ContestantStatus, number> = {
        available: 0,
        drafted: 1,
        eliminated: 2,
      };
      const aStatus = getContestantDraftStatus(a);
      const bStatus = getContestantDraftStatus(b);
      const orderDiff = statusOrder[aStatus] - statusOrder[bStatus];
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });
  }, [contestants, getContestantDraftStatus]);

  // Convert players map to array for roster display
  const playersArray = useMemo(() => {
    return draftOrder.map((uid) => players.get(uid)).filter(Boolean) as Pick<
      User,
      'uid' | 'displayName'
    >[];
  }, [draftOrder, players]);

  const currentPickingPlayer = players.get(currentPickingPlayerUid);
  const totalPicks = draftOrder.length * rosterSize;
  const isDraftComplete = currentPick > totalPicks;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main content area */}
      <div className="flex-1 space-y-6">
        {/* Draft status header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isDraftComplete ? 'Draft Complete' : 'Draft Board'}
              </h2>
              {!isDraftComplete && isDraftActive && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Pick {currentPick} of {totalPicks}
                  {currentPickingPlayer && (
                    <>
                      {' - '}
                      <span
                        className={cn(
                          'font-medium',
                          isUsersTurn
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-900 dark:text-white'
                        )}
                      >
                        {isUsersTurn ? "It's your turn!" : `${currentPickingPlayer.displayName}'s pick`}
                      </span>
                    </>
                  )}
                </p>
              )}
              {isDraftComplete && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  All {totalPicks} picks have been made!
                </p>
              )}
            </div>

            {/* Admin indicator */}
            {isAdmin && !isDraftComplete && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>Admin Mode - Can draft for any player</span>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2"
              role="alert"
            >
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
              {onClearError && (
                <button
                  onClick={onClearError}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                  aria-label="Dismiss error"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Draft order display */}
        {isDraftActive && !isDraftComplete && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <DraftOrderDisplay
              draftOrder={draftOrder}
              players={players}
              currentPick={currentPick}
              completedPicks={picks.length}
              rosterSize={rosterSize}
              currentUserUid={currentUserUid}
              orientation="horizontal"
            />
          </div>
        )}

        {/* Contestants grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Contestants ({sortedContestants.filter((c) => !draftedContestantIds.has(c.id)).length}{' '}
            available)
          </h3>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
            role="list"
            aria-label="Contestants"
          >
            {sortedContestants.map((contestant) => {
              const draftStatus = getContestantDraftStatus(contestant);
              const draftedByName = contestantToPlayer.get(contestant.id);
              const isLoading = draftingContestantId === contestant.id;

              return (
                <ContestantCard
                  key={contestant.id}
                  contestant={contestant}
                  draftStatus={draftStatus}
                  draftedByName={draftedByName}
                  canDraft={canDraft && draftStatus === 'available'}
                  onDraft={handleDraft}
                  isLoading={isLoading}
                  size="md"
                />
              );
            })}
          </div>

          {contestants.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p>No contestants available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar with player rosters */}
      <aside className="lg:w-72 xl:w-80 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Player Rosters
        </h3>

        <div className="space-y-3">
          {playersArray.map((player) => (
            <PlayerRoster
              key={player.uid}
              player={player}
              contestants={contestants}
              picks={picks}
              rosterSize={rosterSize}
              isCurrentUser={player.uid === currentUserUid}
              isHighlighted={isDraftActive && player.uid === currentPickingPlayerUid}
              size="sm"
            />
          ))}
        </div>

        {playersArray.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No players in this league yet.
          </div>
        )}
      </aside>
    </div>
  );
}

export default DraftBoard;
