'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Draft pick information
 */
export interface DraftPickInfo {
  id: string;
  contestantId: string;
  playerUid: string;
  playerName: string;
  pickOrder: number;
  round: number;
}

/**
 * Available contestant for drafting
 */
export interface AvailableContestant {
  id: string;
  name: string;
  imageUrl?: string;
}

/**
 * Player in draft order
 */
export interface DraftOrderPlayer {
  uid: string;
  displayName: string;
  position: number;
}

/**
 * Draft state returned from the API
 */
export interface DraftState {
  leagueId: string;
  status: 'pending' | 'in_progress' | 'completed';
  currentPick: number | null;
  totalPicks: number;
  currentPlayerUid: string | null;
  currentPlayerName: string | null;
  picks: DraftPickInfo[];
  availableContestants: AvailableContestant[];
  draftOrder: DraftOrderPlayer[];
  rosterSize: number;
  isAdmin: boolean;
  isCurrentPlayer: boolean;
}

/**
 * Result of the useDraft hook
 */
export interface UseDraftResult {
  /** Current draft state */
  draftState: DraftState | null;
  /** Whether the draft state is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Make a draft pick */
  makePick: (contestantId: string) => Promise<boolean>;
  /** Start the draft (admin only) */
  startDraft: () => Promise<boolean>;
  /** Complete the draft (admin only) */
  completeDraft: () => Promise<boolean>;
  /** Undo the last pick (admin only) */
  undoPick: () => Promise<boolean>;
  /** Refresh the draft state */
  refresh: () => Promise<void>;
  /** Whether a mutation is in progress */
  isMutating: boolean;
}

/**
 * Polling interval in milliseconds
 */
const POLL_INTERVAL = 5000; // 5 seconds

/**
 * Hook for managing draft state
 *
 * @param leagueId - The league ID to manage draft for
 * @returns Draft state and control functions
 *
 * @example
 * ```tsx
 * function DraftPage({ leagueId }) {
 *   const { draftState, isLoading, makePick, startDraft } = useDraft(leagueId);
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <div>
 *       <p>Status: {draftState?.status}</p>
 *       {draftState?.isCurrentPlayer && (
 *         <button onClick={() => makePick(contestantId)}>Pick</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDraft(leagueId: string): UseDraftResult {
  const { user } = useAuth();
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const isMounted = useRef(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch the current draft state from the API
   */
  const fetchDraftState = useCallback(async (showLoading = true) => {
    if (!leagueId) return;

    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      const response = await fetch(`/api/leagues/${leagueId}/draft`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch draft state');
      }

      const data = await response.json();

      if (isMounted.current) {
        setDraftState(data);
      }
    } catch (err) {
      console.error('Error fetching draft state:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [leagueId]);

  /**
   * Make a draft pick
   */
  const makePick = useCallback(async (contestantId: string): Promise<boolean> => {
    if (!leagueId || isMutating) return false;

    try {
      setIsMutating(true);
      setError(null);

      const response = await fetch(`/api/leagues/${leagueId}/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ contestantId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to make pick');
      }

      // Optimistic update - refresh to get latest state
      await fetchDraftState(false);
      return true;
    } catch (err) {
      console.error('Error making pick:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [leagueId, isMutating, fetchDraftState]);

  /**
   * Start the draft (admin only)
   */
  const startDraft = useCallback(async (): Promise<boolean> => {
    if (!leagueId || isMutating) return false;

    try {
      setIsMutating(true);
      setError(null);

      const response = await fetch(`/api/leagues/${leagueId}/draft/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to start draft');
      }

      // Refresh to get latest state
      await fetchDraftState(false);
      return true;
    } catch (err) {
      console.error('Error starting draft:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [leagueId, isMutating, fetchDraftState]);

  /**
   * Complete the draft (admin only)
   */
  const completeDraft = useCallback(async (): Promise<boolean> => {
    if (!leagueId || isMutating) return false;

    try {
      setIsMutating(true);
      setError(null);

      const response = await fetch(`/api/leagues/${leagueId}/draft/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to complete draft');
      }

      // Refresh to get latest state
      await fetchDraftState(false);
      return true;
    } catch (err) {
      console.error('Error completing draft:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [leagueId, isMutating, fetchDraftState]);

  /**
   * Undo the last pick (admin only)
   */
  const undoPick = useCallback(async (): Promise<boolean> => {
    if (!leagueId || isMutating) return false;

    try {
      setIsMutating(true);
      setError(null);

      const response = await fetch(`/api/leagues/${leagueId}/draft`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'undo' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to undo pick');
      }

      // Refresh to get latest state
      await fetchDraftState(false);
      return true;
    } catch (err) {
      console.error('Error undoing pick:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [leagueId, isMutating, fetchDraftState]);

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    await fetchDraftState(true);
  }, [fetchDraftState]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    fetchDraftState(true);

    return () => {
      isMounted.current = false;
    };
  }, [fetchDraftState]);

  // Polling for updates when draft is in progress
  useEffect(() => {
    if (draftState?.status === 'in_progress') {
      pollIntervalRef.current = setInterval(() => {
        fetchDraftState(false);
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [draftState?.status, fetchDraftState]);

  return {
    draftState,
    isLoading,
    error,
    makePick,
    startDraft,
    completeDraft,
    undoPick,
    refresh,
    isMutating,
  };
}
