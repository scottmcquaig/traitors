'use client';

import { DraftState } from '@/hooks/useDraft';

interface DraftStatusProps {
  /** Draft state from useDraft hook */
  draftState: DraftState | null;
  /** Whether the draft state is loading */
  isLoading?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Loading skeleton for draft status
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-48 bg-gray-200 rounded" />
    </div>
  );
}

/**
 * DraftStatus component
 *
 * Displays the current draft status:
 * - "Draft not started" when pending
 * - "Pick X of Y" and whose turn when in progress
 * - "Draft complete" when completed
 *
 * @example
 * ```tsx
 * function DraftPage({ leagueId }) {
 *   const { draftState, isLoading } = useDraft(leagueId);
 *
 *   return (
 *     <DraftStatus draftState={draftState} isLoading={isLoading} />
 *   );
 * }
 * ```
 */
export function DraftStatus({ draftState, isLoading, className = '' }: DraftStatusProps) {
  if (isLoading) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!draftState) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <p className="text-gray-500">Unable to load draft status</p>
      </div>
    );
  }

  const { status, currentPick, totalPicks, currentPlayerName, isCurrentPlayer } = draftState;

  // Pending state
  if (status === 'pending') {
    return (
      <div className={`p-4 bg-yellow-50 rounded-lg border border-yellow-200 ${className}`}>
        <h3 className="text-lg font-semibold text-yellow-800">Draft Not Started</h3>
        <p className="text-sm text-yellow-600 mt-1">
          Waiting for the league admin to start the draft.
        </p>
        <div className="mt-2 text-sm text-yellow-700">
          <span className="font-medium">{draftState.draftOrder.length}</span> players
          {' | '}
          <span className="font-medium">{draftState.rosterSize}</span> picks each
          {' | '}
          <span className="font-medium">{totalPicks}</span> total picks
        </div>
      </div>
    );
  }

  // Completed state
  if (status === 'completed') {
    return (
      <div className={`p-4 bg-green-50 rounded-lg border border-green-200 ${className}`}>
        <h3 className="text-lg font-semibold text-green-800">Draft Complete</h3>
        <p className="text-sm text-green-600 mt-1">
          All {totalPicks} picks have been made. The draft is now locked.
        </p>
      </div>
    );
  }

  // In progress state
  return (
    <div className={`p-4 bg-blue-50 rounded-lg border border-blue-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-blue-800">
            Pick {currentPick} of {totalPicks}
          </h3>
          <p className="text-sm text-blue-600 mt-1">
            Round {Math.ceil((currentPick || 1) / draftState.draftOrder.length)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-blue-700">
            {isCurrentPlayer ? (
              <span className="font-bold text-blue-900">Your turn!</span>
            ) : (
              <>
                Waiting for{' '}
                <span className="font-medium">{currentPlayerName || 'Unknown'}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentPick || 1) / totalPicks) * 100}%` }}
          />
        </div>
        <p className="text-xs text-blue-600 mt-1 text-center">
          {Math.round(((currentPick || 1) / totalPicks) * 100)}% complete
        </p>
      </div>

      {/* Available contestants count */}
      <div className="mt-2 text-sm text-blue-700">
        <span className="font-medium">{draftState.availableContestants.length}</span> contestants available
      </div>
    </div>
  );
}
