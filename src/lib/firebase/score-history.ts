import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from './admin';
import {
  ScoreHistory,
  CreateScoreHistoryData,
  EpisodeContestantScore,
  COLLECTIONS,
} from '@/types/firebase';

/**
 * Logs a score change to the audit history
 * @param data - The score change data to log
 * @returns The created ScoreHistory entry
 */
export async function logScoreChange(
  data: CreateScoreHistoryData
): Promise<ScoreHistory> {
  const db = getAdminFirestore();
  const now = Timestamp.now();

  const historyData = {
    episodeId: data.episodeId,
    leagueId: data.leagueId,
    contestantId: data.contestantId,
    adminUid: data.adminUid,
    previousValue: data.previousValue,
    newValue: data.newValue,
    changeType: data.changeType,
    timestamp: now,
    notes: data.notes,
  };

  // Remove undefined fields
  const cleanedData = Object.fromEntries(
    Object.entries(historyData).filter(([, value]) => value !== undefined)
  );

  try {
    const docRef = await db.collection(COLLECTIONS.SCORE_HISTORY).add(cleanedData);

    return {
      id: docRef.id,
      ...cleanedData,
    } as ScoreHistory;
  } catch (error) {
    console.error('Error logging score change:', error);
    throw error;
  }
}

/**
 * Gets all score history entries for an episode
 * @param episodeId - The ID of the episode
 * @returns Array of ScoreHistory entries, ordered by timestamp desc
 */
export async function getScoreHistoryByEpisode(
  episodeId: string
): Promise<ScoreHistory[]> {
  const db = getAdminFirestore();

  try {
    const snapshot = await db
      .collection(COLLECTIONS.SCORE_HISTORY)
      .where('episodeId', '==', episodeId)
      .orderBy('timestamp', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ScoreHistory[];
  } catch (error) {
    console.error('Error getting score history by episode:', error);
    throw error;
  }
}

/**
 * Gets recent score history entries for a league
 * @param leagueId - The ID of the league
 * @param limit - Maximum number of entries to return (default 50)
 * @returns Array of ScoreHistory entries, ordered by timestamp desc
 */
export async function getScoreHistoryByLeague(
  leagueId: string,
  limit: number = 50
): Promise<ScoreHistory[]> {
  const db = getAdminFirestore();

  try {
    const snapshot = await db
      .collection(COLLECTIONS.SCORE_HISTORY)
      .where('leagueId', '==', leagueId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ScoreHistory[];
  } catch (error) {
    console.error('Error getting score history by league:', error);
    throw error;
  }
}

/**
 * Gets score history entries made by a specific admin
 * For audit purposes
 * @param adminUid - The UID of the admin
 * @param limit - Maximum number of entries to return (default 50)
 * @returns Array of ScoreHistory entries, ordered by timestamp desc
 */
export async function getScoreHistoryByAdmin(
  adminUid: string,
  limit: number = 50
): Promise<ScoreHistory[]> {
  const db = getAdminFirestore();

  try {
    const snapshot = await db
      .collection(COLLECTIONS.SCORE_HISTORY)
      .where('adminUid', '==', adminUid)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ScoreHistory[];
  } catch (error) {
    console.error('Error getting score history by admin:', error);
    throw error;
  }
}

/**
 * Gets all score history entries for a contestant
 * @param contestantId - The ID of the contestant
 * @returns Array of ScoreHistory entries, ordered by timestamp desc
 */
export async function getScoreHistoryByContestant(
  contestantId: string
): Promise<ScoreHistory[]> {
  const db = getAdminFirestore();

  try {
    const snapshot = await db
      .collection(COLLECTIONS.SCORE_HISTORY)
      .where('contestantId', '==', contestantId)
      .orderBy('timestamp', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ScoreHistory[];
  } catch (error) {
    console.error('Error getting score history by contestant:', error);
    throw error;
  }
}

/**
 * Gets score history entries for a league since a specific date/time
 * @param leagueId - The ID of the league
 * @param since - The date/time to get changes since
 * @returns Array of ScoreHistory entries since the specified time, ordered by timestamp desc
 */
export async function getRecentScoreChanges(
  leagueId: string,
  since: Date
): Promise<ScoreHistory[]> {
  const db = getAdminFirestore();
  const sinceTimestamp = Timestamp.fromDate(since);

  try {
    const snapshot = await db
      .collection(COLLECTIONS.SCORE_HISTORY)
      .where('leagueId', '==', leagueId)
      .where('timestamp', '>=', sinceTimestamp)
      .orderBy('timestamp', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ScoreHistory[];
  } catch (error) {
    console.error('Error getting recent score changes:', error);
    throw error;
  }
}

/**
 * Helper function to track score updates with automatic change type detection
 * Determines the change type based on previous and new values and logs appropriately
 * @param episodeId - The ID of the episode
 * @param leagueId - The ID of the league
 * @param contestantId - The ID of the contestant
 * @param adminUid - The UID of the admin making the change
 * @param previousValue - The previous score value (null if creating new score)
 * @param newValue - The new score value (null if deleting score)
 * @param notes - Optional notes about the change
 * @returns The created ScoreHistory entry
 */
export async function trackScoreUpdate(
  episodeId: string,
  leagueId: string,
  contestantId: string,
  adminUid: string,
  previousValue: EpisodeContestantScore | null,
  newValue: EpisodeContestantScore | null,
  notes?: string
): Promise<ScoreHistory> {
  // Determine change type based on previous and new values
  let changeType: 'create' | 'update' | 'delete';

  if (previousValue === null && newValue !== null) {
    changeType = 'create';
  } else if (previousValue !== null && newValue === null) {
    changeType = 'delete';
  } else {
    changeType = 'update';
  }

  return logScoreChange({
    episodeId,
    leagueId,
    contestantId,
    adminUid,
    previousValue,
    newValue,
    changeType,
    notes,
  });
}
