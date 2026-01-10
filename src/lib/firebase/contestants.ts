import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from './admin';
import {
  Contestant,
  CreateContestantData,
  UpdateContestantData,
  COLLECTIONS,
  ContestantStatus,
} from '@/types/firebase';

/**
 * Creates a new contestant in a league
 * @param leagueId - The ID of the league this contestant belongs to
 * @param data - The contestant data to create
 * @returns The created Contestant
 */
export async function createContestant(
  leagueId: string,
  data: CreateContestantData
): Promise<Contestant> {
  const db = getAdminFirestore();
  const now = Timestamp.now();

  const contestantData = {
    leagueId,
    name: data.name,
    status: data.status || 'active',
    imageUrl: data.imageUrl,
    role: data.role,
    eliminatedEpisode: data.eliminatedEpisode,
    createdAt: now,
    updatedAt: now,
  };

  // Remove undefined fields
  const cleanedData = Object.fromEntries(
    Object.entries(contestantData).filter(([, value]) => value !== undefined)
  );

  const docRef = await db.collection(COLLECTIONS.CONTESTANTS).add(cleanedData);

  return {
    id: docRef.id,
    ...cleanedData,
  } as Contestant;
}

/**
 * Gets a contestant by their ID
 * @param contestantId - The document ID of the contestant
 * @returns The Contestant if found, null otherwise
 */
export async function getContestantById(contestantId: string): Promise<Contestant | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(COLLECTIONS.CONTESTANTS).doc(contestantId).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as Contestant;
}

/**
 * Gets all contestants in a league
 * @param leagueId - The ID of the league
 * @returns Array of Contestants in the league
 */
export async function getContestantsByLeague(leagueId: string): Promise<Contestant[]> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.CONTESTANTS)
    .where('leagueId', '==', leagueId)
    .orderBy('name', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Contestant[];
}

/**
 * Gets only active contestants in a league
 * @param leagueId - The ID of the league
 * @returns Array of active Contestants in the league
 */
export async function getActiveContestants(leagueId: string): Promise<Contestant[]> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.CONTESTANTS)
    .where('leagueId', '==', leagueId)
    .where('status', '==', 'active')
    .orderBy('name', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Contestant[];
}

/**
 * Updates a contestant
 * @param contestantId - The document ID of the contestant
 * @param data - The fields to update
 * @returns The updated Contestant, or null if not found
 */
export async function updateContestant(
  contestantId: string,
  data: UpdateContestantData
): Promise<Contestant | null> {
  const db = getAdminFirestore();
  const docRef = db.collection(COLLECTIONS.CONTESTANTS).doc(contestantId);

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
  } as Contestant;
}

/**
 * Marks a contestant as eliminated
 * @param contestantId - The document ID of the contestant
 * @param episodeNumber - The episode number when the contestant was eliminated
 * @returns The updated Contestant, or null if not found
 */
export async function eliminateContestant(
  contestantId: string,
  episodeNumber: number
): Promise<Contestant | null> {
  return updateContestant(contestantId, {
    status: 'eliminated' as ContestantStatus,
    eliminatedEpisode: episodeNumber,
  });
}

/**
 * Marks a contestant as having their traitor role revealed
 * @param contestantId - The document ID of the contestant
 * @returns The updated Contestant, or null if not found
 */
export async function revealTraitor(contestantId: string): Promise<Contestant | null> {
  return updateContestant(contestantId, {
    status: 'traitor_revealed' as ContestantStatus,
    role: 'traitor',
  });
}

/**
 * Marks a contestant as the winner
 * @param contestantId - The document ID of the contestant
 * @returns The updated Contestant, or null if not found
 */
export async function setWinner(contestantId: string): Promise<Contestant | null> {
  return updateContestant(contestantId, {
    status: 'winner' as ContestantStatus,
  });
}

/**
 * Deletes a contestant
 * @param contestantId - The document ID of the contestant
 * @returns true if deleted, false if not found
 */
export async function deleteContestant(contestantId: string): Promise<boolean> {
  const db = getAdminFirestore();
  const docRef = db.collection(COLLECTIONS.CONTESTANTS).doc(contestantId);

  const doc = await docRef.get();
  if (!doc.exists) {
    return false;
  }

  await docRef.delete();
  return true;
}

/**
 * Data for bulk creating contestants (name and optional fields)
 */
export interface BulkContestantData {
  name: string;
  status?: ContestantStatus;
  imageUrl?: string;
  role?: 'faithful' | 'traitor' | 'unknown';
}

/**
 * Creates multiple contestants for a league in a batch operation
 * @param leagueId - The ID of the league
 * @param contestants - Array of contestant data to create
 * @returns Array of created Contestants
 */
export async function bulkCreateContestants(
  leagueId: string,
  contestants: BulkContestantData[]
): Promise<Contestant[]> {
  const db = getAdminFirestore();
  const batch = db.batch();
  const now = Timestamp.now();

  const createdContestants: Contestant[] = [];

  for (const contestantData of contestants) {
    const docRef = db.collection(COLLECTIONS.CONTESTANTS).doc();

    const data = {
      leagueId,
      name: contestantData.name,
      status: contestantData.status || 'active',
      imageUrl: contestantData.imageUrl,
      role: contestantData.role,
      createdAt: now,
      updatedAt: now,
    };

    // Remove undefined fields
    const cleanedData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    batch.set(docRef, cleanedData);

    createdContestants.push({
      id: docRef.id,
      ...cleanedData,
    } as Contestant);
  }

  await batch.commit();

  return createdContestants;
}

/**
 * Verifies that a contestant belongs to a specific league
 * @param contestantId - The document ID of the contestant
 * @param leagueId - The ID of the league
 * @returns true if the contestant belongs to the league, false otherwise
 */
export async function verifyContestantLeague(
  contestantId: string,
  leagueId: string
): Promise<boolean> {
  const contestant = await getContestantById(contestantId);
  return contestant !== null && contestant.leagueId === leagueId;
}
