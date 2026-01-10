/**
 * Snake Draft Order Utilities
 *
 * Implements snake draft logic where the order reverses each round.
 * Example with 3 players (A, B, C) and 4 rounds:
 * Round 1: A, B, C (forward)
 * Round 2: C, B, A (reverse)
 * Round 3: A, B, C (forward)
 * Round 4: C, B, A (reverse)
 * Full order: [A, B, C, C, B, A, A, B, C, C, B, A]
 */

/**
 * Round and pick position information
 */
export interface RoundAndPick {
  /** The round number (1-indexed) */
  round: number;
  /** The pick position within the round (1-indexed) */
  pickInRound: number;
}

/**
 * Generates the complete snake draft order for all rounds
 *
 * @param playerUids - Array of player UIDs in initial draft order
 * @param rounds - Total number of rounds in the draft
 * @returns Array of player UIDs representing the full draft order
 *
 * @example
 * // 3 players, 4 rounds
 * generateSnakeDraftOrder(['A', 'B', 'C'], 4)
 * // Returns: ['A', 'B', 'C', 'C', 'B', 'A', 'A', 'B', 'C', 'C', 'B', 'A']
 */
export function generateSnakeDraftOrder(
  playerUids: string[],
  rounds: number
): string[] {
  if (playerUids.length === 0 || rounds <= 0) {
    return [];
  }

  const order: string[] = [];

  for (let round = 1; round <= rounds; round++) {
    // Odd rounds go forward, even rounds go reverse
    const isReverseRound = round % 2 === 0;
    const roundOrder = isReverseRound
      ? [...playerUids].reverse()
      : [...playerUids];

    order.push(...roundOrder);
  }

  return order;
}

/**
 * Calculates the absolute pick number given round and pick position
 *
 * @param round - The round number (1-indexed)
 * @param pickInRound - The pick position within the round (1-indexed)
 * @param totalPlayers - Total number of players in the draft
 * @returns The absolute pick number (1-indexed)
 *
 * @example
 * // Round 2, pick 1, with 3 players
 * getPickNumber(2, 1, 3) // Returns: 4
 */
export function getPickNumber(
  round: number,
  pickInRound: number,
  totalPlayers: number
): number {
  if (round <= 0 || pickInRound <= 0 || totalPlayers <= 0) {
    throw new Error('Round, pickInRound, and totalPlayers must be positive');
  }

  if (pickInRound > totalPlayers) {
    throw new Error('pickInRound cannot exceed totalPlayers');
  }

  return (round - 1) * totalPlayers + pickInRound;
}

/**
 * Determines which player picks at a given absolute pick number
 *
 * @param pickNumber - The absolute pick number (1-indexed)
 * @param playerUids - Array of player UIDs in initial draft order
 * @param totalRounds - Total number of rounds (for validation)
 * @returns The player UID who picks at this number
 *
 * @example
 * // Pick 4 with players [A, B, C] and 4 rounds
 * getPlayerForPick(4, ['A', 'B', 'C'], 4) // Returns: 'C' (reverse order in round 2)
 */
export function getPlayerForPick(
  pickNumber: number,
  playerUids: string[],
  totalRounds: number
): string {
  if (playerUids.length === 0) {
    throw new Error('playerUids cannot be empty');
  }

  if (pickNumber <= 0) {
    throw new Error('pickNumber must be positive');
  }

  const totalPicks = playerUids.length * totalRounds;
  if (pickNumber > totalPicks) {
    throw new Error(`pickNumber ${pickNumber} exceeds total picks ${totalPicks}`);
  }

  const { round, pickInRound } = getRoundAndPick(pickNumber, playerUids.length);
  const isReverseRound = round % 2 === 0;

  // Calculate the index in the player array
  const index = isReverseRound
    ? playerUids.length - pickInRound
    : pickInRound - 1;

  return playerUids[index];
}

/**
 * Calculates the round and pick-in-round from an absolute pick number
 *
 * @param pickNumber - The absolute pick number (1-indexed)
 * @param totalPlayers - Total number of players in the draft
 * @returns Object containing round and pickInRound (both 1-indexed)
 *
 * @example
 * // Pick 7 with 3 players
 * getRoundAndPick(7, 3) // Returns: { round: 3, pickInRound: 1 }
 */
export function getRoundAndPick(
  pickNumber: number,
  totalPlayers: number
): RoundAndPick {
  if (pickNumber <= 0) {
    throw new Error('pickNumber must be positive');
  }

  if (totalPlayers <= 0) {
    throw new Error('totalPlayers must be positive');
  }

  const round = Math.ceil(pickNumber / totalPlayers);
  const pickInRound = ((pickNumber - 1) % totalPlayers) + 1;

  return { round, pickInRound };
}

/**
 * Checks if it's a specific player's turn at a given pick number
 *
 * @param pickNumber - The absolute pick number (1-indexed)
 * @param playerUid - The player UID to check
 * @param playerUids - Array of player UIDs in initial draft order
 * @returns true if it's the specified player's turn
 *
 * @example
 * // Is it player B's turn at pick 2?
 * isPlayersTurn(2, 'B', ['A', 'B', 'C']) // Returns: true
 */
export function isPlayersTurn(
  pickNumber: number,
  playerUid: string,
  playerUids: string[]
): boolean {
  if (playerUids.length === 0) {
    return false;
  }

  if (pickNumber <= 0) {
    return false;
  }

  // Calculate which round we're in and position
  const { round, pickInRound } = getRoundAndPick(pickNumber, playerUids.length);
  const isReverseRound = round % 2 === 0;

  // Find the player index
  const index = isReverseRound
    ? playerUids.length - pickInRound
    : pickInRound - 1;

  return playerUids[index] === playerUid;
}

/**
 * Gets the next pick number in the draft
 *
 * @param currentPick - The current pick number (1-indexed)
 * @param totalPicks - Total number of picks in the draft
 * @returns The next pick number, or null if draft is complete
 *
 * @example
 * getNextPick(5, 12) // Returns: 6
 * getNextPick(12, 12) // Returns: null (draft complete)
 */
export function getNextPick(
  currentPick: number,
  totalPicks: number
): number | null {
  if (currentPick <= 0) {
    return 1;
  }

  if (currentPick >= totalPicks) {
    return null;
  }

  return currentPick + 1;
}

/**
 * Gets the previous pick number in the draft
 *
 * @param currentPick - The current pick number (1-indexed)
 * @returns The previous pick number, or null if at the start
 *
 * @example
 * getPreviousPick(5) // Returns: 4
 * getPreviousPick(1) // Returns: null (at start)
 */
export function getPreviousPick(currentPick: number): number | null {
  if (currentPick <= 1) {
    return null;
  }

  return currentPick - 1;
}

/**
 * Gets all pick numbers for a specific player across all rounds
 *
 * @param playerUid - The player UID
 * @param playerUids - Array of player UIDs in initial draft order
 * @param totalRounds - Total number of rounds
 * @returns Array of pick numbers (1-indexed) for this player
 *
 * @example
 * // Get all picks for player B in a 3-player, 4-round draft
 * getPicksForPlayer('B', ['A', 'B', 'C'], 4)
 * // Returns: [2, 5, 8, 11]
 */
export function getPicksForPlayer(
  playerUid: string,
  playerUids: string[],
  totalRounds: number
): number[] {
  const playerIndex = playerUids.indexOf(playerUid);

  if (playerIndex === -1) {
    return [];
  }

  const picks: number[] = [];

  for (let round = 1; round <= totalRounds; round++) {
    const isReverseRound = round % 2 === 0;
    const pickInRound = isReverseRound
      ? playerUids.length - playerIndex
      : playerIndex + 1;

    const pickNumber = getPickNumber(round, pickInRound, playerUids.length);
    picks.push(pickNumber);
  }

  return picks;
}

/**
 * Validates if the draft order configuration is valid
 *
 * @param playerUids - Array of player UIDs
 * @param rounds - Number of rounds
 * @returns Object with isValid and optional error message
 */
export function validateDraftConfiguration(
  playerUids: string[],
  rounds: number
): { isValid: boolean; error?: string } {
  if (playerUids.length === 0) {
    return { isValid: false, error: 'At least one player is required' };
  }

  if (rounds <= 0) {
    return { isValid: false, error: 'Rounds must be a positive number' };
  }

  // Check for duplicate player UIDs
  const uniqueUids = new Set(playerUids);
  if (uniqueUids.size !== playerUids.length) {
    return { isValid: false, error: 'Duplicate player UIDs are not allowed' };
  }

  return { isValid: true };
}
