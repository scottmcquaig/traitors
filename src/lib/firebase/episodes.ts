/**
 * Firestore operations for episodes
 *
 * Provides CRUD operations for the episodes collection.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from './admin';
import {
  Episode,
  CreateEpisodeData,
  UpdateEpisodeData,
  EpisodeContestantScore,
  COLLECTIONS,
} from '@/types/firebase';

/**
 * Creates a new episode in Firestore
 *
 * @param data - The episode data including leagueId
 * @returns The created episode with generated ID
 */
export async function createEpisode(data: CreateEpisodeData): Promise<Episode> {
  try {
    const db = getAdminFirestore();
    const now = Timestamp.now();

    const episodeData = {
      leagueId: data.leagueId,
      episodeNumber: data.episodeNumber,
      airDate: data.airDate,
      scores: data.scores || {},
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    // Remove undefined fields
    const cleanedData = Object.fromEntries(
      Object.entries(episodeData).filter(([, value]) => value !== undefined)
    );

    const docRef = await db.collection(COLLECTIONS.EPISODES).add(cleanedData);

    return {
      id: docRef.id,
      ...cleanedData,
    } as Episode;
  } catch (error) {
    console.error('Error creating episode:', error);
    throw error;
  }
}

/**
 * Gets an episode by its ID
 *
 * @param episodeId - The episode document ID
 * @returns The episode if found, null otherwise
 */
export async function getEpisodeById(episodeId: string): Promise<Episode | null> {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTIONS.EPISODES).doc(episodeId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as Episode;
  } catch (error) {
    console.error('Error getting episode by ID:', error);
    throw error;
  }
}

/**
 * Gets all episodes for a specific league, ordered by episode number
 *
 * @param leagueId - The league ID
 * @returns Array of episodes sorted by episode number
 */
export async function getEpisodesByLeague(leagueId: string): Promise<Episode[]> {
  try {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(COLLECTIONS.EPISODES)
      .where('leagueId', '==', leagueId)
      .orderBy('episodeNumber', 'asc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Episode[];
  } catch (error) {
    console.error('Error getting episodes by league:', error);
    throw error;
  }
}

/**
 * Gets episodes up to and including a specific episode number
 *
 * @param leagueId - The league ID
 * @param maxEpisodeNumber - The maximum episode number to include
 * @returns Array of episodes up to the specified episode number
 */
export async function getEpisodesUpTo(
  leagueId: string,
  maxEpisodeNumber: number
): Promise<Episode[]> {
  try {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(COLLECTIONS.EPISODES)
      .where('leagueId', '==', leagueId)
      .where('episodeNumber', '<=', maxEpisodeNumber)
      .orderBy('episodeNumber', 'asc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Episode[];
  } catch (error) {
    console.error('Error getting episodes up to number:', error);
    throw error;
  }
}

/**
 * Gets a specific episode by league and episode number
 *
 * @param leagueId - The league ID
 * @param episodeNumber - The episode number (1-based)
 * @returns The episode if found, null otherwise
 */
export async function getEpisodeByNumber(
  leagueId: string,
  episodeNumber: number
): Promise<Episode | null> {
  try {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(COLLECTIONS.EPISODES)
      .where('leagueId', '==', leagueId)
      .where('episodeNumber', '==', episodeNumber)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Episode;
  } catch (error) {
    console.error('Error getting episode by number:', error);
    throw error;
  }
}

/**
 * Updates an episode's data
 *
 * @param episodeId - The episode document ID
 * @param data - The fields to update
 * @returns The updated episode, or null if not found
 */
export async function updateEpisode(
  episodeId: string,
  data: UpdateEpisodeData
): Promise<Episode | null> {
  try {
    const db = getAdminFirestore();

    const docRef = db.collection(COLLECTIONS.EPISODES).doc(episodeId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const updateData = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    // Remove undefined fields
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined)
    );

    await docRef.update(cleanedData);

    const updatedDoc = await docRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as Episode;
  } catch (error) {
    console.error('Error updating episode:', error);
    throw error;
  }
}

/**
 * Updates the scores for an episode
 * Replaces the entire scores object
 *
 * @param episodeId - The episode document ID
 * @param scores - Record of contestantId to EpisodeContestantScore
 * @returns The updated episode, or null if not found
 */
export async function updateEpisodeScores(
  episodeId: string,
  scores: Record<string, EpisodeContestantScore>
): Promise<Episode | null> {
  try {
    const db = getAdminFirestore();

    const docRef = db.collection(COLLECTIONS.EPISODES).doc(episodeId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    await docRef.update({
      scores,
      updatedAt: Timestamp.now(),
    });

    const updatedDoc = await docRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as Episode;
  } catch (error) {
    console.error('Error updating episode scores:', error);
    throw error;
  }
}

/**
 * Sets a single contestant's score for an episode
 * Merges with existing scores for other contestants
 *
 * @param episodeId - The episode document ID
 * @param contestantId - The contestant ID
 * @param score - The score breakdown for this contestant
 * @returns The updated episode, or null if not found
 */
export async function setContestantScore(
  episodeId: string,
  contestantId: string,
  score: EpisodeContestantScore
): Promise<Episode | null> {
  try {
    const db = getAdminFirestore();

    const docRef = db.collection(COLLECTIONS.EPISODES).doc(episodeId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const existingData = doc.data() as Episode;
    const mergedScores = {
      ...existingData.scores,
      [contestantId]: score,
    };

    await docRef.update({
      scores: mergedScores,
      updatedAt: Timestamp.now(),
    });

    const updatedDoc = await docRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as Episode;
  } catch (error) {
    console.error('Error setting contestant score:', error);
    throw error;
  }
}

/**
 * Deletes an episode by its ID
 *
 * @param episodeId - The episode document ID
 * @returns true if deleted, false if not found
 */
export async function deleteEpisode(episodeId: string): Promise<boolean> {
  try {
    const db = getAdminFirestore();

    const docRef = db.collection(COLLECTIONS.EPISODES).doc(episodeId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return false;
    }

    await docRef.delete();
    return true;
  } catch (error) {
    console.error('Error deleting episode:', error);
    throw error;
  }
}

/**
 * Gets the latest episode for a league
 *
 * @param leagueId - The league ID
 * @returns The most recent episode, or null if no episodes exist
 */
export async function getLatestEpisode(leagueId: string): Promise<Episode | null> {
  try {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(COLLECTIONS.EPISODES)
      .where('leagueId', '==', leagueId)
      .orderBy('episodeNumber', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Episode;
  } catch (error) {
    console.error('Error getting latest episode:', error);
    throw error;
  }
}

/**
 * Gets the count of episodes for a league
 *
 * @param leagueId - The league ID
 * @returns The number of episodes
 */
export async function getEpisodeCount(leagueId: string): Promise<number> {
  try {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(COLLECTIONS.EPISODES)
      .where('leagueId', '==', leagueId)
      .count()
      .get();

    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting episode count:', error);
    throw error;
  }
}

/**
 * Deletes all episodes for a league
 *
 * @param leagueId - The league ID
 * @returns The number of episodes deleted
 */
export async function deleteAllEpisodesForLeague(leagueId: string): Promise<number> {
  try {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(COLLECTIONS.EPISODES)
      .where('leagueId', '==', leagueId)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.docs.length;
  } catch (error) {
    console.error('Error deleting all episodes for league:', error);
    throw error;
  }
}
