/**
 * Automatic Totals Calculator for FantaCTV
 *
 * Calculates player totals based on their drafted contestants' scores.
 * Server-side only - uses firebase-admin.
 */

import { getEpisodesByLeague, getEpisodesUpTo, getEpisodeById } from '@/lib/firebase/episodes';
import { getDraftPicksByLeague, getDraftPicksByPlayer } from '@/lib/firebase/draft-picks';
import { getLeagueById } from '@/lib/firebase/leagues';
import { getUserByUid } from '@/lib/firebase/users';
import { getContestantById } from '@/lib/firebase/contestants';
import type { Episode, DraftPick } from '@/types/firebase';

// ============================================================================
// Types
// ============================================================================

/**
 * Breakdown of scores for a single contestant
 */
export interface ContestantScoreBreakdown {
  /** The contestant's ID */
  contestantId: string;
  /** The contestant's name */
  contestantName: string;
  /** Total score across all episodes */
  totalScore: number;
  /** Score breakdown by episode (episodeId -> score) */
  episodeBreakdown: Record<string, number>;
}

/**
 * Complete score breakdown for a player
 */
export interface PlayerScore {
  /** The player's UID */
  playerUid: string;
  /** Total score across all contestants and episodes */
  totalScore: number;
  /** Score breakdown by episode (episodeId -> total score for that episode) */
  episodeScores: Record<string, number>;
  /** Score breakdown by contestant (contestantId -> breakdown) */
  contestantScores: Record<string, ContestantScoreBreakdown>;
}

/**
 * A single entry in the leaderboard
 */
export interface LeaderboardEntry {
  /** Rank in the leaderboard (1-indexed, ties share rank) */
  rank: number;
  /** The player's UID */
  playerUid: string;
  /** The player's display name (optional) */
  playerName?: string;
  /** Total score */
  totalScore: number;
  /** Number of contestants drafted */
  contestantCount: number;
}

/**
 * Complete leaderboard result for a league
 */
export interface LeaderboardResult {
  /** The league ID */
  leagueId: string;
  /** Sorted leaderboard entries */
  entries: LeaderboardEntry[];
  /** Number of episodes scored */
  episodeCount: number;
  /** When the leaderboard was generated */
  lastUpdated: Date;
}

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Calculates the total score for a contestant across all episodes
 *
 * @param episodes - Array of episodes with scores
 * @param contestantId - The contestant ID to calculate for
 * @returns The total score for the contestant
 */
export function calculateContestantTotal(
  episodes: Episode[],
  contestantId: string
): number {
  let total = 0;

  for (const episode of episodes) {
    const scoreEntry = episode.scores?.[contestantId];
    if (scoreEntry && typeof scoreEntry.total === 'number') {
      total += scoreEntry.total;
    }
  }

  return total;
}

/**
 * Calculates the total score for a player based on their draft picks
 *
 * @param episodes - Array of episodes with scores
 * @param draftPicks - Array of draft picks made by the player
 * @returns The total score across all drafted contestants
 */
export function calculatePlayerTotal(
  episodes: Episode[],
  draftPicks: DraftPick[]
): number {
  let total = 0;

  for (const pick of draftPicks) {
    total += calculateContestantTotal(episodes, pick.contestantId);
  }

  return total;
}

/**
 * Gets the score for a specific contestant in a specific episode
 *
 * @param episode - The episode to check
 * @param contestantId - The contestant ID
 * @returns The score, or 0 if not found
 */
export function getContestantEpisodeScore(
  episode: Episode,
  contestantId: string
): number {
  return episode.scores?.[contestantId]?.total ?? 0;
}

// ============================================================================
// Data Fetching and Breakdown Functions
// ============================================================================

/**
 * Gets a complete score breakdown for a player in a league
 *
 * @param leagueId - The league ID
 * @param playerUid - The player's UID
 * @returns Full breakdown of the player's scores
 */
export async function getPlayerScoreBreakdown(
  leagueId: string,
  playerUid: string
): Promise<PlayerScore> {
  // Fetch draft picks for this player
  const draftPicks = await getDraftPicksByPlayer(leagueId, playerUid);

  // Fetch all episodes for the league
  const episodes = await getEpisodesByLeague(leagueId);

  // Initialize the result
  const result: PlayerScore = {
    playerUid,
    totalScore: 0,
    episodeScores: {},
    contestantScores: {},
  };

  // Handle edge case: no picks
  if (draftPicks.length === 0) {
    return result;
  }

  // Handle edge case: no episodes
  if (episodes.length === 0) {
    // Still populate contestant info with zero scores
    for (const pick of draftPicks) {
      const contestant = await getContestantById(pick.contestantId);
      result.contestantScores[pick.contestantId] = {
        contestantId: pick.contestantId,
        contestantName: contestant?.name ?? 'Unknown',
        totalScore: 0,
        episodeBreakdown: {},
      };
    }
    return result;
  }

  // Process each draft pick
  for (const pick of draftPicks) {
    const contestant = await getContestantById(pick.contestantId);
    const contestantName = contestant?.name ?? 'Unknown';

    const breakdown: ContestantScoreBreakdown = {
      contestantId: pick.contestantId,
      contestantName,
      totalScore: 0,
      episodeBreakdown: {},
    };

    // Calculate scores for each episode
    for (const episode of episodes) {
      const score = getContestantEpisodeScore(episode, pick.contestantId);
      breakdown.episodeBreakdown[episode.id] = score;
      breakdown.totalScore += score;

      // Add to episode totals
      if (!result.episodeScores[episode.id]) {
        result.episodeScores[episode.id] = 0;
      }
      result.episodeScores[episode.id] += score;
    }

    result.contestantScores[pick.contestantId] = breakdown;
    result.totalScore += breakdown.totalScore;
  }

  return result;
}

/**
 * Generates a complete leaderboard for a league
 *
 * @param leagueId - The league ID
 * @returns The leaderboard with all players ranked
 */
export async function generateLeaderboard(
  leagueId: string
): Promise<LeaderboardResult> {
  // Fetch league to get player list
  const league = await getLeagueById(leagueId);

  if (!league) {
    throw new Error(`League not found: ${leagueId}`);
  }

  // Fetch all episodes
  const episodes = await getEpisodesByLeague(leagueId);

  // Fetch all draft picks for the league
  const allDraftPicks = await getDraftPicksByLeague(leagueId);

  // Group draft picks by player
  const picksByPlayer = new Map<string, DraftPick[]>();
  for (const pick of allDraftPicks) {
    const existing = picksByPlayer.get(pick.playerUid) ?? [];
    existing.push(pick);
    picksByPlayer.set(pick.playerUid, existing);
  }

  // Calculate scores for each player
  const playerScores: Array<{
    playerUid: string;
    totalScore: number;
    contestantCount: number;
  }> = [];

  // Include all players in the league, even those without picks
  const allPlayerUids = new Set([
    ...league.playerUids,
    ...Array.from(picksByPlayer.keys()),
  ]);

  for (const playerUid of Array.from(allPlayerUids)) {
    const picks = picksByPlayer.get(playerUid) ?? [];
    const totalScore = calculatePlayerTotal(episodes, picks);

    playerScores.push({
      playerUid,
      totalScore,
      contestantCount: picks.length,
    });
  }

  // Sort by score (descending), then by contestant count (descending) as tiebreaker
  playerScores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return b.contestantCount - a.contestantCount;
  });

  // Assign ranks (handling ties)
  const entries: LeaderboardEntry[] = [];
  let currentRank = 1;
  let previousScore: number | null = null;

  for (let i = 0; i < playerScores.length; i++) {
    const player = playerScores[i];

    // Fetch player name
    const user = await getUserByUid(player.playerUid);

    // Handle ties: same score gets same rank
    if (previousScore !== null && player.totalScore < previousScore) {
      currentRank = i + 1;
    }

    entries.push({
      rank: currentRank,
      playerUid: player.playerUid,
      playerName: user?.displayName,
      totalScore: player.totalScore,
      contestantCount: player.contestantCount,
    });

    previousScore = player.totalScore;
  }

  return {
    leagueId,
    entries,
    episodeCount: episodes.length,
    lastUpdated: new Date(),
  };
}

/**
 * Generates a leaderboard for a specific episode only
 *
 * @param leagueId - The league ID
 * @param episodeId - The episode ID
 * @returns Leaderboard entries for that episode
 */
export async function getEpisodeLeaderboard(
  leagueId: string,
  episodeId: string
): Promise<LeaderboardEntry[]> {
  // Fetch the specific episode
  const episode = await getEpisodeById(episodeId);

  if (!episode) {
    throw new Error(`Episode not found: ${episodeId}`);
  }

  if (episode.leagueId !== leagueId) {
    throw new Error(`Episode ${episodeId} does not belong to league ${leagueId}`);
  }

  // Fetch league to get player list
  const league = await getLeagueById(leagueId);

  if (!league) {
    throw new Error(`League not found: ${leagueId}`);
  }

  // Fetch all draft picks for the league
  const allDraftPicks = await getDraftPicksByLeague(leagueId);

  // Group draft picks by player
  const picksByPlayer = new Map<string, DraftPick[]>();
  for (const pick of allDraftPicks) {
    const existing = picksByPlayer.get(pick.playerUid) ?? [];
    existing.push(pick);
    picksByPlayer.set(pick.playerUid, existing);
  }

  // Calculate scores for each player (for this episode only)
  const playerScores: Array<{
    playerUid: string;
    totalScore: number;
    contestantCount: number;
  }> = [];

  // Include all players in the league
  const allPlayerUids = new Set([
    ...league.playerUids,
    ...Array.from(picksByPlayer.keys()),
  ]);

  for (const playerUid of Array.from(allPlayerUids)) {
    const picks = picksByPlayer.get(playerUid) ?? [];
    let episodeTotal = 0;

    for (const pick of picks) {
      episodeTotal += getContestantEpisodeScore(episode, pick.contestantId);
    }

    playerScores.push({
      playerUid,
      totalScore: episodeTotal,
      contestantCount: picks.length,
    });
  }

  // Sort by score (descending)
  playerScores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return b.contestantCount - a.contestantCount;
  });

  // Assign ranks (handling ties)
  const entries: LeaderboardEntry[] = [];
  let currentRank = 1;
  let previousScore: number | null = null;

  for (let i = 0; i < playerScores.length; i++) {
    const player = playerScores[i];

    // Fetch player name
    const user = await getUserByUid(player.playerUid);

    // Handle ties
    if (previousScore !== null && player.totalScore < previousScore) {
      currentRank = i + 1;
    }

    entries.push({
      rank: currentRank,
      playerUid: player.playerUid,
      playerName: user?.displayName,
      totalScore: player.totalScore,
      contestantCount: player.contestantCount,
    });

    previousScore = player.totalScore;
  }

  return entries;
}

/**
 * Calculates cumulative scores up to and including a specified episode number
 *
 * @param leagueId - The league ID
 * @param episodeNumber - The episode number (1-indexed) to calculate up to
 * @returns Leaderboard entries with cumulative scores
 */
export async function calculateCumulativeScoreAtEpisode(
  leagueId: string,
  episodeNumber: number
): Promise<LeaderboardEntry[]> {
  // Fetch episodes up to the specified number
  const episodes = await getEpisodesUpTo(leagueId, episodeNumber);

  if (episodes.length === 0) {
    return [];
  }

  // Fetch league to get player list
  const league = await getLeagueById(leagueId);

  if (!league) {
    throw new Error(`League not found: ${leagueId}`);
  }

  // Fetch all draft picks for the league
  const allDraftPicks = await getDraftPicksByLeague(leagueId);

  // Group draft picks by player
  const picksByPlayer = new Map<string, DraftPick[]>();
  for (const pick of allDraftPicks) {
    const existing = picksByPlayer.get(pick.playerUid) ?? [];
    existing.push(pick);
    picksByPlayer.set(pick.playerUid, existing);
  }

  // Calculate cumulative scores for each player
  const playerScores: Array<{
    playerUid: string;
    totalScore: number;
    contestantCount: number;
  }> = [];

  // Include all players in the league
  const allPlayerUids = new Set([
    ...league.playerUids,
    ...Array.from(picksByPlayer.keys()),
  ]);

  for (const playerUid of Array.from(allPlayerUids)) {
    const picks = picksByPlayer.get(playerUid) ?? [];
    const totalScore = calculatePlayerTotal(episodes, picks);

    playerScores.push({
      playerUid,
      totalScore,
      contestantCount: picks.length,
    });
  }

  // Sort by score (descending)
  playerScores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return b.contestantCount - a.contestantCount;
  });

  // Assign ranks (handling ties)
  const entries: LeaderboardEntry[] = [];
  let currentRank = 1;
  let previousScore: number | null = null;

  for (let i = 0; i < playerScores.length; i++) {
    const player = playerScores[i];

    // Fetch player name
    const user = await getUserByUid(player.playerUid);

    // Handle ties
    if (previousScore !== null && player.totalScore < previousScore) {
      currentRank = i + 1;
    }

    entries.push({
      rank: currentRank,
      playerUid: player.playerUid,
      playerName: user?.displayName,
      totalScore: player.totalScore,
      contestantCount: player.contestantCount,
    });

    previousScore = player.totalScore;
  }

  return entries;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the score difference between two players
 *
 * @param episodes - Array of episodes with scores
 * @param player1Picks - Draft picks for player 1
 * @param player2Picks - Draft picks for player 2
 * @returns The score difference (player1 - player2)
 */
export function getScoreDifference(
  episodes: Episode[],
  player1Picks: DraftPick[],
  player2Picks: DraftPick[]
): number {
  const player1Total = calculatePlayerTotal(episodes, player1Picks);
  const player2Total = calculatePlayerTotal(episodes, player2Picks);
  return player1Total - player2Total;
}

/**
 * Gets the top scoring contestants across all episodes
 *
 * @param episodes - Array of episodes with scores
 * @param limit - Maximum number of contestants to return (default: 10)
 * @returns Array of contestant IDs and their total scores, sorted by score
 */
export function getTopContestants(
  episodes: Episode[],
  limit: number = 10
): Array<{ contestantId: string; totalScore: number }> {
  // Aggregate all contestant IDs across all episodes
  const contestantIds = new Set<string>();
  for (const episode of episodes) {
    if (episode.scores) {
      for (const contestantId of Object.keys(episode.scores)) {
        contestantIds.add(contestantId);
      }
    }
  }

  // Calculate totals for each contestant
  const totals: Array<{ contestantId: string; totalScore: number }> = [];
  for (const contestantId of Array.from(contestantIds)) {
    totals.push({
      contestantId,
      totalScore: calculateContestantTotal(episodes, contestantId),
    });
  }

  // Sort by score descending and limit
  totals.sort((a, b) => b.totalScore - a.totalScore);
  return totals.slice(0, limit);
}

/**
 * Calculates the average score per episode for a player
 *
 * @param episodes - Array of episodes with scores
 * @param draftPicks - The player's draft picks
 * @returns Average score per episode, or 0 if no episodes
 */
export function calculateAverageScorePerEpisode(
  episodes: Episode[],
  draftPicks: DraftPick[]
): number {
  if (episodes.length === 0) {
    return 0;
  }

  const totalScore = calculatePlayerTotal(episodes, draftPicks);
  return totalScore / episodes.length;
}

/**
 * Gets the best and worst episodes for a player
 *
 * @param episodes - Array of episodes with scores
 * @param draftPicks - The player's draft picks
 * @returns Object with best and worst episode info, or null if no episodes
 */
export function getPlayerEpisodeExtremes(
  episodes: Episode[],
  draftPicks: DraftPick[]
): {
  best: { episodeId: string; score: number } | null;
  worst: { episodeId: string; score: number } | null;
} {
  if (episodes.length === 0 || draftPicks.length === 0) {
    return { best: null, worst: null };
  }

  let best: { episodeId: string; score: number } | null = null;
  let worst: { episodeId: string; score: number } | null = null;

  for (const episode of episodes) {
    let episodeTotal = 0;
    for (const pick of draftPicks) {
      episodeTotal += getContestantEpisodeScore(episode, pick.contestantId);
    }

    if (best === null || episodeTotal > best.score) {
      best = { episodeId: episode.id, score: episodeTotal };
    }
    if (worst === null || episodeTotal < worst.score) {
      worst = { episodeId: episode.id, score: episodeTotal };
    }
  }

  return { best, worst };
}
