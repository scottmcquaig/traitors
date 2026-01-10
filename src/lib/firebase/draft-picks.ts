/**
 * Firestore operations for draft picks
 *
 * Provides CRUD operations for the draftPicks collection.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from './admin';
import { DraftPick, CreateDraftPickData, COLLECTIONS } from '@/types/firebase';

/**
 * Creates a new draft pick in Firestore
 *
 * @param leagueId - The league ID
 * @param data - The draft pick data
 * @returns The created draft pick with generated ID and timestamp
 */
export async function createDraftPick(
  leagueId: string,
  data: CreateDraftPickData
): Promise<DraftPick> {
  const db = getAdminFirestore();

  const pickData = {
    ...data,
    leagueId,
    createdAt: data.createdAt ?? Timestamp.now(),
  };

  const docRef = await db.collection(COLLECTIONS.DRAFT_PICKS).add(pickData);

  return {
    id: docRef.id,
    ...pickData,
  } as unknown as DraftPick;
}

/**
 * Gets all draft picks for a specific league, ordered by pick number
 *
 * @param leagueId - The league ID
 * @returns Array of draft picks sorted by pickOrder
 */
export async function getDraftPicksByLeague(
  leagueId: string
): Promise<DraftPick[]> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.DRAFT_PICKS)
    .where('leagueId', '==', leagueId)
    .orderBy('pickOrder', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DraftPick[];
}

/**
 * Gets all draft picks made by a specific player in a league
 *
 * @param leagueId - The league ID
 * @param playerUid - The player's UID
 * @returns Array of draft picks made by the player
 */
export async function getDraftPicksByPlayer(
  leagueId: string,
  playerUid: string
): Promise<DraftPick[]> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.DRAFT_PICKS)
    .where('leagueId', '==', leagueId)
    .where('playerUid', '==', playerUid)
    .orderBy('pickOrder', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DraftPick[];
}

/**
 * Checks if a contestant has already been picked in a league
 *
 * @param leagueId - The league ID
 * @param contestantId - The contestant ID
 * @returns The draft pick if the contestant was picked, null otherwise
 */
export async function getPickByContestant(
  leagueId: string,
  contestantId: string
): Promise<DraftPick | null> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.DRAFT_PICKS)
    .where('leagueId', '==', leagueId)
    .where('contestantId', '==', contestantId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as DraftPick;
}

/**
 * Deletes a draft pick by its ID
 *
 * @param pickId - The draft pick document ID
 * @returns true if deleted, false if not found
 */
export async function deleteDraftPick(pickId: string): Promise<boolean> {
  const db = getAdminFirestore();

  const docRef = db.collection(COLLECTIONS.DRAFT_PICKS).doc(pickId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return false;
  }

  await docRef.delete();
  return true;
}

/**
 * Gets the most recent draft pick for a league
 *
 * @param leagueId - The league ID
 * @returns The last draft pick made, or null if no picks exist
 */
export async function getLastPick(leagueId: string): Promise<DraftPick | null> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.DRAFT_PICKS)
    .where('leagueId', '==', leagueId)
    .orderBy('pickOrder', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as DraftPick;
}

/**
 * Gets a specific draft pick by its ID
 *
 * @param pickId - The draft pick document ID
 * @returns The draft pick if found, null otherwise
 */
export async function getDraftPickById(
  pickId: string
): Promise<DraftPick | null> {
  const db = getAdminFirestore();

  const doc = await db.collection(COLLECTIONS.DRAFT_PICKS).doc(pickId).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as DraftPick;
}

/**
 * Gets the draft pick at a specific pick number in a league
 *
 * @param leagueId - The league ID
 * @param pickNumber - The pick number (1-indexed)
 * @returns The draft pick at that number, or null if not yet made
 */
export async function getDraftPickByNumber(
  leagueId: string,
  pickNumber: number
): Promise<DraftPick | null> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.DRAFT_PICKS)
    .where('leagueId', '==', leagueId)
    .where('pickOrder', '==', pickNumber)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as DraftPick;
}

/**
 * Gets the count of draft picks made in a league
 *
 * @param leagueId - The league ID
 * @returns The number of picks made
 */
export async function getDraftPickCount(leagueId: string): Promise<number> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.DRAFT_PICKS)
    .where('leagueId', '==', leagueId)
    .count()
    .get();

  return snapshot.data().count;
}

/**
 * Deletes all draft picks for a league (useful for resetting a draft)
 *
 * @param leagueId - The league ID
 * @returns The number of picks deleted
 */
export async function deleteAllDraftPicksForLeague(
  leagueId: string
): Promise<number> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.DRAFT_PICKS)
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
}
