'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useDraft } from '@/hooks/useDraft';
import {
  DraftBoard,
  DraftControls,
  DraftStatus,
  type ContestantData,
  type DraftPickData,
} from '@/components/draft';
import type { User } from '@/types/firebase';

/**
 * Loading skeleton for the draft page
 */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 mx-auto mb-4 text-red-500">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Unable to load draft
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

/**
 * Draft board page - Client component for real-time draft updates
 */
export default function DraftPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.leagueId as string;

  const { user, loading: authLoading } = useAuth();
  const {
    draftState,
    isLoading,
    error,
    makePick,
    startDraft,
    completeDraft,
    undoPick,
    refresh,
    isMutating,
  } = useDraft(leagueId);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Transform draft state data to match DraftBoard props
  const contestants = useMemo((): ContestantData[] => {
    if (!draftState) return [];

    // Combine available contestants with drafted ones
    const allContestants = new Map<string, ContestantData>();

    // Add available contestants
    draftState.availableContestants.forEach((c) => {
      allContestants.set(c.id, {
        id: c.id,
        name: c.name,
        status: 'active',
        imageUrl: c.imageUrl,
      });
    });

    // Add drafted contestants from picks
    draftState.picks.forEach((pick) => {
      if (!allContestants.has(pick.contestantId)) {
        // We don't have full info for drafted contestants from picks alone
        // They should already be in the available list or we need the API to include them
        allContestants.set(pick.contestantId, {
          id: pick.contestantId,
          name: 'Unknown', // Placeholder - ideally API returns all contestants
          status: 'active',
        });
      }
    });

    return Array.from(allContestants.values());
  }, [draftState]);

  const players = useMemo((): Map<string, Pick<User, 'uid' | 'displayName'>> => {
    const map = new Map<string, Pick<User, 'uid' | 'displayName'>>();
    if (!draftState) return map;

    draftState.draftOrder.forEach((player) => {
      map.set(player.uid, {
        uid: player.uid,
        displayName: player.displayName,
      });
    });

    return map;
  }, [draftState]);

  const draftOrder = useMemo((): string[] => {
    if (!draftState) return [];
    return draftState.draftOrder.map((p) => p.uid);
  }, [draftState]);

  const picks = useMemo((): DraftPickData[] => {
    if (!draftState) return [];

    return draftState.picks.map((pick) => ({
      id: pick.id,
      leagueId,
      contestantId: pick.contestantId,
      playerUid: pick.playerUid,
      pickOrder: pick.pickOrder,
      round: pick.round,
    }));
  }, [draftState, leagueId]);

  const handleDraftPick = useCallback(
    async (contestantId: string) => {
      await makePick(contestantId);
    },
    [makePick]
  );

  const handleClearError = useCallback(() => {
    refresh();
  }, [refresh]);

  // Show loading state
  if (authLoading || (isLoading && !draftState)) {
    return <LoadingSkeleton />;
  }

  // Show error state
  if (error && !draftState) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  // No draft state available
  if (!draftState) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">No draft information available.</p>
          <Link
            href={`/dashboard/league/${leagueId}`}
            className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
          >
            Return to league
          </Link>
        </div>
      </div>
    );
  }

  const isDraftActive = draftState.status === 'in_progress';
  const currentPick = draftState.currentPick || 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href={`/dashboard/league/${leagueId}`}
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to League
        </Link>

        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Draft Board</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Make your picks to build your roster
              </p>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              aria-label="Refresh draft state"
            >
              <svg
                className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        {/* Draft Status */}
        <DraftStatus
          draftState={draftState}
          isLoading={isLoading}
          className="mb-6"
        />

        {/* Admin Controls */}
        {draftState.isAdmin && (
          <DraftControls
            draftState={draftState}
            isMutating={isMutating}
            isLoading={isLoading}
            onStartDraft={startDraft}
            onUndoPick={undoPick}
            onCompleteDraft={completeDraft}
            className="mb-6"
          />
        )}

        {/* Main Draft Board */}
        {(isDraftActive || draftState.status === 'completed') && (
          <DraftBoard
            leagueId={leagueId}
            contestants={contestants}
            draftOrder={draftOrder}
            players={players}
            picks={picks}
            currentPick={currentPick}
            rosterSize={draftState.rosterSize}
            currentUserUid={user?.uid || ''}
            isAdmin={draftState.isAdmin}
            isDraftActive={isDraftActive}
            onDraftPick={handleDraftPick}
            error={error}
            onClearError={handleClearError}
          />
        )}

        {/* Pending state message */}
        {draftState.status === 'pending' && !draftState.isAdmin && (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg
              className="mx-auto h-16 w-16 text-yellow-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Waiting for Draft to Start
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              The league administrator hasn&apos;t started the draft yet.
              Check back soon or ask them when the draft will begin!
            </p>
            <div className="mt-6 text-sm text-gray-400 dark:text-gray-500">
              <p>
                {draftState.draftOrder.length} players in draft order
                {' | '}
                {draftState.rosterSize} picks per player
                {' | '}
                {draftState.totalPicks} total picks
              </p>
            </div>
          </div>
        )}

        {/* Pending state with admin controls */}
        {draftState.status === 'pending' && draftState.isAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Draft Preview
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Review the draft order below before starting the draft.
              Once started, players can begin making their picks.
            </p>

            {/* Draft Order Preview */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Draft Order
              </h4>
              <div className="flex flex-wrap gap-2">
                {draftState.draftOrder.map((player, index) => (
                  <div
                    key={player.uid}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md"
                  >
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {player.displayName}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Contestants Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Available Contestants ({draftState.availableContestants.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {draftState.availableContestants.slice(0, 10).map((contestant) => (
                  <div
                    key={contestant.id}
                    className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-md"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                      {contestant.imageUrl ? (
                        <img
                          src={contestant.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      {contestant.name}
                    </span>
                  </div>
                ))}
                {draftState.availableContestants.length > 10 && (
                  <div className="flex items-center justify-center px-2 py-1.5 text-xs text-gray-400 dark:text-gray-500">
                    +{draftState.availableContestants.length - 10} more
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
