/**
 * Draft Manager
 *
 * Provides high-level draft management functionality that combines
 * draft order logic with Firestore operations.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '../firebase/admin';
import { League, DraftPick, COLLECTIONS } from '@/types/firebase';
import {
  getRoundAndPick,
  getPlayerForPick,
  isPlayersTurn,
  getNextPick,
  getPreviousPick,
  validateDraftConfiguration,
} from './order';
import {
  createDraftPick,
  getDraftPicksByLeague,
  getPickByContestant,
  deleteDraftPick,
  getLastPick,
  getDraftPickCount,
} from '../firebase/draft-picks';

/**
 * Current pick information during an active draft
 */
export interface CurrentPickInfo {
  /** The current pick number (1-indexed) */
  pickNumber: number;
  /** The round number (1-indexed) */
  round: number;
  /** The pick position within the round (1-indexed) */
  pickInRound: number;
  /** The UID of the player whose turn it is */
  playerUid: string;
  /** Total picks remaining in the draft */
  picksRemaining: number;
}

/**
 * Full draft state for a league
 */
export interface DraftState {
  /** The league ID */
  leagueId: string;
  /** Current draft status */
  status: 'pending' | 'in_progress' | 'completed';
  /** Total number of rounds in the draft */
  totalRounds: number;
  /** Total number of picks in the draft */
  totalPicks: number;
  /** Number of picks made so far */
  picksMade: number;
  /** Current pick info, or null if draft is complete or not started */
  currentPick: CurrentPickInfo | null;
  /** Array of player UIDs in draft order */
  draftOrder: string[];
  /** All picks made so far */
  picks: DraftPick[];
}

/**
 * Result of a pick validation
 */
export interface PickValidationResult {
  /** Whether the pick is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?:
    | 'DRAFT_NOT_STARTED'
    | 'DRAFT_COMPLETE'
    | 'NOT_YOUR_TURN'
    | 'CONTESTANT_ALREADY_PICKED'
    | 'INVALID_CONTESTANT'
    | 'LEAGUE_NOT_FOUND';
}

/**
 * Result of making a pick
 */
export interface MakePickResult {
  /** Whether the pick was successful */
  success: boolean;
  /** The created pick, if successful */
  pick?: DraftPick;
  /** Error message if unsuccessful */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: PickValidationResult['errorCode'];
  /** Whether the draft is now complete */
  draftComplete?: boolean;
}

/**
 * Result of undoing a pick
 */
export interface UndoPickResult {
  /** Whether the undo was successful */
  success: boolean;
  /** The deleted pick, if successful */
  deletedPick?: DraftPick;
  /** Error message if unsuccessful */
  error?: string;
}

/**
 * Gets a league by its ID
 */
async function getLeague(leagueId: string): Promise<League | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(COLLECTIONS.LEAGUES).doc(leagueId).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as League;
}

/**
 * Updates a league's draft-related fields
 */
async function updateLeagueDraftFields(
  leagueId: string,
  updates: {
    draftStatus?: 'pending' | 'in_progress' | 'completed';
    currentPick?: number | null;
  }
): Promise<void> {
  const db = getAdminFirestore();
  const updateData: Record<string, unknown> = {};

  if (updates.draftStatus !== undefined) {
    updateData.draftStatus = updates.draftStatus;
  }

  if (updates.currentPick !== undefined) {
    updateData.currentPick = updates.currentPick;
  }

  await db.collection(COLLECTIONS.LEAGUES).doc(leagueId).update(updateData);
}

/**
 * Initializes a draft for a league
 *
 * Sets up the draft state, validates configuration, and prepares
 * the league for drafting.
 *
 * @param leagueId - The league ID
 * @returns The initialized draft state
 */
export async function initializeDraft(leagueId: string): Promise<DraftState> {
  const league = await getLeague(leagueId);

  if (!league) {
    throw new Error(`League ${leagueId} not found`);
  }

  const validation = validateDraftConfiguration(
    league.draftOrder,
    league.rosterSize
  );

  if (!validation.isValid) {
    throw new Error(`Invalid draft configuration: ${validation.error}`);
  }

  // Update the league status to in_progress and set current pick to 1
  await updateLeagueDraftFields(leagueId, {
    draftStatus: 'in_progress',
    currentPick: 1,
  });

  return getDraftState(leagueId);
}

/**
 * Gets the current pick information for a league
 *
 * @param leagueId - The league ID
 * @returns Current pick info, or null if draft is not active
 */
export async function getCurrentPick(
  leagueId: string
): Promise<CurrentPickInfo | null> {
  const league = await getLeague(leagueId);

  if (!league) {
    return null;
  }

  if (league.draftStatus !== 'in_progress' || !league.currentPick) {
    return null;
  }

  const totalPicks = league.draftOrder.length * league.rosterSize;
  const { round, pickInRound } = getRoundAndPick(
    league.currentPick,
    league.draftOrder.length
  );

  const playerUid = getPlayerForPick(
    league.currentPick,
    league.draftOrder,
    league.rosterSize
  );

  return {
    pickNumber: league.currentPick,
    round,
    pickInRound,
    playerUid,
    picksRemaining: totalPicks - league.currentPick + 1,
  };
}

/**
 * Validates a pick before making it
 *
 * @param leagueId - The league ID
 * @param contestantId - The contestant being picked
 * @param playerUid - The player making the pick
 * @returns Validation result
 */
export async function validatePick(
  leagueId: string,
  contestantId: string,
  playerUid: string
): Promise<PickValidationResult> {
  const league = await getLeague(leagueId);

  if (!league) {
    return {
      isValid: false,
      error: 'League not found',
      errorCode: 'LEAGUE_NOT_FOUND',
    };
  }

  if (league.draftStatus === 'pending') {
    return {
      isValid: false,
      error: 'Draft has not started yet',
      errorCode: 'DRAFT_NOT_STARTED',
    };
  }

  if (league.draftStatus === 'completed') {
    return {
      isValid: false,
      error: 'Draft is already complete',
      errorCode: 'DRAFT_COMPLETE',
    };
  }

  if (!league.currentPick) {
    return {
      isValid: false,
      error: 'Draft has not started yet',
      errorCode: 'DRAFT_NOT_STARTED',
    };
  }

  // Check if it's this player's turn
  if (!isPlayersTurn(league.currentPick, playerUid, league.draftOrder)) {
    return {
      isValid: false,
      error: 'It is not your turn to pick',
      errorCode: 'NOT_YOUR_TURN',
    };
  }

  // Check if contestant is already picked
  const existingPick = await getPickByContestant(leagueId, contestantId);
  if (existingPick) {
    return {
      isValid: false,
      error: 'This contestant has already been picked',
      errorCode: 'CONTESTANT_ALREADY_PICKED',
    };
  }

  // Validate contestant exists in the league
  const db = getAdminFirestore();
  const contestantDoc = await db
    .collection(COLLECTIONS.CONTESTANTS)
    .doc(contestantId)
    .get();

  if (!contestantDoc.exists) {
    return {
      isValid: false,
      error: 'Contestant not found',
      errorCode: 'INVALID_CONTESTANT',
    };
  }

  const contestant = contestantDoc.data();
  if (contestant?.leagueId !== leagueId) {
    return {
      isValid: false,
      error: 'Contestant does not belong to this league',
      errorCode: 'INVALID_CONTESTANT',
    };
  }

  return { isValid: true };
}

/**
 * Makes a draft pick for a player
 *
 * @param leagueId - The league ID
 * @param contestantId - The contestant being picked
 * @param playerUid - The player making the pick
 * @returns Result of the pick attempt
 */
export async function makePick(
  leagueId: string,
  contestantId: string,
  playerUid: string
): Promise<MakePickResult> {
  // Validate the pick first
  const validation = await validatePick(leagueId, contestantId, playerUid);

  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
      errorCode: validation.errorCode,
    };
  }

  const league = await getLeague(leagueId);
  if (!league || !league.currentPick) {
    return {
      success: false,
      error: 'League not found or draft not started',
      errorCode: 'LEAGUE_NOT_FOUND',
    };
  }

  const { round } = getRoundAndPick(
    league.currentPick,
    league.draftOrder.length
  );

  // Create the pick
  const pick = await createDraftPick(leagueId, {
    contestantId,
    playerUid,
    pickOrder: league.currentPick,
    round,
  });

  // Determine next pick
  const totalPicks = league.draftOrder.length * league.rosterSize;
  const nextPickNumber = getNextPick(league.currentPick, totalPicks);

  // Update league state
  if (nextPickNumber === null) {
    // Draft is complete
    await updateLeagueDraftFields(leagueId, {
      draftStatus: 'completed',
      currentPick: null,
    });

    return {
      success: true,
      pick,
      draftComplete: true,
    };
  } else {
    // More picks to go
    await updateLeagueDraftFields(leagueId, {
      currentPick: nextPickNumber,
    });

    return {
      success: true,
      pick,
      draftComplete: false,
    };
  }
}

/**
 * Undoes the last pick in a draft (admin only)
 *
 * @param leagueId - The league ID
 * @returns Result of the undo attempt
 */
export async function undoLastPick(leagueId: string): Promise<UndoPickResult> {
  const league = await getLeague(leagueId);

  if (!league) {
    return {
      success: false,
      error: 'League not found',
    };
  }

  // Get the last pick
  const lastPick = await getLastPick(leagueId);

  if (!lastPick) {
    return {
      success: false,
      error: 'No picks to undo',
    };
  }

  // Delete the pick
  const deleted = await deleteDraftPick(lastPick.id);

  if (!deleted) {
    return {
      success: false,
      error: 'Failed to delete pick',
    };
  }

  // Calculate the previous pick number
  const previousPick = lastPick.pickOrder;

  // Update league state
  await updateLeagueDraftFields(leagueId, {
    draftStatus: 'in_progress',
    currentPick: previousPick,
  });

  return {
    success: true,
    deletedPick: lastPick,
  };
}

/**
 * Checks if a draft is complete
 *
 * @param leagueId - The league ID
 * @returns true if draft is complete
 */
export async function isDraftComplete(leagueId: string): Promise<boolean> {
  const league = await getLeague(leagueId);

  if (!league) {
    return false;
  }

  return league.draftStatus === 'completed';
}

/**
 * Gets the full draft state for a league
 *
 * @param leagueId - The league ID
 * @returns The complete draft state
 */
export async function getDraftState(leagueId: string): Promise<DraftState> {
  const league = await getLeague(leagueId);

  if (!league) {
    throw new Error(`League ${leagueId} not found`);
  }

  const totalRounds = league.rosterSize;
  const totalPicks = league.draftOrder.length * totalRounds;
  const picks = await getDraftPicksByLeague(leagueId);
  const picksMade = picks.length;

  let currentPick: CurrentPickInfo | null = null;

  if (league.draftStatus === 'in_progress' && league.currentPick) {
    const { round, pickInRound } = getRoundAndPick(
      league.currentPick,
      league.draftOrder.length
    );

    const playerUid = getPlayerForPick(
      league.currentPick,
      league.draftOrder,
      totalRounds
    );

    currentPick = {
      pickNumber: league.currentPick,
      round,
      pickInRound,
      playerUid,
      picksRemaining: totalPicks - league.currentPick + 1,
    };
  }

  return {
    leagueId,
    status: league.draftStatus,
    totalRounds,
    totalPicks,
    picksMade,
    currentPick,
    draftOrder: league.draftOrder,
    picks,
  };
}

/**
 * Resets a draft to its initial state
 *
 * Deletes all picks and resets the league draft status to pending.
 * This is an admin-only operation.
 *
 * @param leagueId - The league ID
 * @returns The number of picks deleted
 */
export async function resetDraft(leagueId: string): Promise<number> {
  const league = await getLeague(leagueId);

  if (!league) {
    throw new Error(`League ${leagueId} not found`);
  }

  // Get all picks for this league
  const picks = await getDraftPicksByLeague(leagueId);

  // Delete all picks
  const db = getAdminFirestore();
  const batch = db.batch();

  for (const pick of picks) {
    const pickRef = db.collection(COLLECTIONS.DRAFT_PICKS).doc(pick.id);
    batch.delete(pickRef);
  }

  await batch.commit();

  // Reset league state
  await updateLeagueDraftFields(leagueId, {
    draftStatus: 'pending',
    currentPick: null,
  });

  return picks.length;
}

/**
 * Gets all picks made by a specific player in a league
 *
 * @param leagueId - The league ID
 * @param playerUid - The player's UID
 * @returns Array of draft picks made by the player
 */
export async function getPlayerPicks(
  leagueId: string,
  playerUid: string
): Promise<DraftPick[]> {
  const picks = await getDraftPicksByLeague(leagueId);
  return picks.filter((pick) => pick.playerUid === playerUid);
}

/**
 * Gets the next player to pick after the current one
 *
 * @param leagueId - The league ID
 * @returns The UID of the next player to pick, or null if draft is complete
 */
export async function getNextPlayerToPick(
  leagueId: string
): Promise<string | null> {
  const currentPickInfo = await getCurrentPick(leagueId);

  if (!currentPickInfo) {
    return null;
  }

  const league = await getLeague(leagueId);
  if (!league) {
    return null;
  }

  const totalPicks = league.draftOrder.length * league.rosterSize;
  const nextPickNumber = getNextPick(currentPickInfo.pickNumber, totalPicks);

  if (nextPickNumber === null) {
    return null;
  }

  return getPlayerForPick(nextPickNumber, league.draftOrder, league.rosterSize);
}
