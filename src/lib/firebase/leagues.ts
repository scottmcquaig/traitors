import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from './admin';
import { League, CreateLeagueData, UpdateLeagueData, COLLECTIONS } from '@/types/firebase';

/**
 * Default roster size for new leagues
 */
const DEFAULT_ROSTER_SIZE = 4;

/**
 * Creates a new league
 * @param adminUid - UID of the admin creating the league
 * @param data - League data (name, season, optional rosterSize)
 * @returns The created League
 */
export async function createLeague(
  adminUid: string,
  data: { name: string; season: string; rosterSize?: number }
): Promise<League> {
  const db = getAdminFirestore();
  const now = Timestamp.now();

  const leagueData = {
    name: data.name.trim(),
    season: data.season.trim(),
    adminUid,
    createdAt: now,
    draftStatus: 'pending' as const,
    draftOrder: [] as string[],
    rosterSize: data.rosterSize ?? DEFAULT_ROSTER_SIZE,
    playerUids: [] as string[],
  };

  const docRef = await db.collection(COLLECTIONS.LEAGUES).add(leagueData);

  return {
    id: docRef.id,
    ...leagueData,
  } as unknown as League;
}

/**
 * Gets a league by its ID
 * @param leagueId - The document ID of the league
 * @returns The League if found, null otherwise
 */
export async function getLeagueById(leagueId: string): Promise<League | null> {
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
 * Gets all leagues created by a specific admin
 * @param adminUid - UID of the admin
 * @returns Array of Leagues created by the admin
 */
export async function getLeaguesByAdmin(adminUid: string): Promise<League[]> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.LEAGUES)
    .where('adminUid', '==', adminUid)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as League[];
}

/**
 * Gets all leagues a player is participating in
 * @param playerUid - UID of the player
 * @returns Array of Leagues the player is in
 */
export async function getLeaguesByPlayer(playerUid: string): Promise<League[]> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.LEAGUES)
    .where('playerUids', 'array-contains', playerUid)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as League[];
}

/**
 * Updates a league with the provided data
 * Only the league admin can update the league
 * @param leagueId - The document ID of the league
 * @param data - Partial league data to update
 * @returns The updated League, or null if not found
 */
export async function updateLeague(
  leagueId: string,
  data: UpdateLeagueData
): Promise<League | null> {
  const db = getAdminFirestore();

  const docRef = db.collection(COLLECTIONS.LEAGUES).doc(leagueId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  // Remove undefined values and trim strings
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      updateData[key] = typeof value === 'string' ? value.trim() : value;
    }
  }

  if (Object.keys(updateData).length > 0) {
    await docRef.update(updateData);
  }

  const updatedDoc = await docRef.get();
  return {
    id: updatedDoc.id,
    ...updatedDoc.data(),
  } as League;
}

/**
 * Adds a player to a league
 * @param leagueId - The document ID of the league
 * @param playerUid - UID of the player to add
 * @returns The updated League, or null if not found
 */
export async function addPlayerToLeague(
  leagueId: string,
  playerUid: string
): Promise<League | null> {
  const db = getAdminFirestore();

  const docRef = db.collection(COLLECTIONS.LEAGUES).doc(leagueId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const leagueData = doc.data()!;

  // Check if player is already in the league
  if (leagueData.playerUids?.includes(playerUid)) {
    return {
      id: doc.id,
      ...leagueData,
    } as League;
  }

  await docRef.update({
    playerUids: FieldValue.arrayUnion(playerUid),
  });

  const updatedDoc = await docRef.get();
  return {
    id: updatedDoc.id,
    ...updatedDoc.data(),
  } as League;
}

/**
 * Removes a player from a league
 * Also removes them from the draft order if present
 * @param leagueId - The document ID of the league
 * @param playerUid - UID of the player to remove
 * @returns The updated League, or null if not found
 */
export async function removePlayerFromLeague(
  leagueId: string,
  playerUid: string
): Promise<League | null> {
  const db = getAdminFirestore();

  const docRef = db.collection(COLLECTIONS.LEAGUES).doc(leagueId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const league = doc.data() as League;

  // Remove from both playerUids and draftOrder
  const updatedDraftOrder = league.draftOrder.filter((uid) => uid !== playerUid);

  await docRef.update({
    playerUids: FieldValue.arrayRemove(playerUid),
    draftOrder: updatedDraftOrder,
  });

  const updatedDoc = await docRef.get();
  return {
    id: updatedDoc.id,
    ...updatedDoc.data(),
  } as League;
}

/**
 * Sets the draft order for a league
 * All player UIDs must be in the league's playerUids array
 * @param leagueId - The document ID of the league
 * @param playerUids - Array of player UIDs in draft order
 * @returns The updated League, or null if not found
 * @throws Error if any player UID is not in the league
 */
export async function setDraftOrder(
  leagueId: string,
  playerUids: string[]
): Promise<League | null> {
  const db = getAdminFirestore();

  const docRef = db.collection(COLLECTIONS.LEAGUES).doc(leagueId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const league = doc.data() as League;

  // Validate all players are in the league
  const invalidPlayers = playerUids.filter(
    (uid) => !league.playerUids.includes(uid)
  );

  if (invalidPlayers.length > 0) {
    throw new Error(
      `The following player UIDs are not in the league: ${invalidPlayers.join(', ')}`
    );
  }

  await docRef.update({
    draftOrder: playerUids,
  });

  const updatedDoc = await docRef.get();
  return {
    id: updatedDoc.id,
    ...updatedDoc.data(),
  } as League;
}

/**
 * Starts the draft for a league
 * Changes status to 'in_progress' and sets currentPick to 1
 * @param leagueId - The document ID of the league
 * @returns The updated League, or null if not found
 * @throws Error if draft cannot be started (wrong status or empty draft order)
 */
export async function startDraft(leagueId: string): Promise<League | null> {
  const db = getAdminFirestore();

  const docRef = db.collection(COLLECTIONS.LEAGUES).doc(leagueId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const league = doc.data() as League;

  // Validate draft can be started
  if (league.draftStatus !== 'pending') {
    throw new Error(
      `Cannot start draft: current status is '${league.draftStatus}', expected 'pending'`
    );
  }

  if (league.draftOrder.length === 0) {
    throw new Error('Cannot start draft: draft order has not been set');
  }

  await docRef.update({
    draftStatus: 'in_progress',
    currentPick: 1,
  });

  const updatedDoc = await docRef.get();
  return {
    id: updatedDoc.id,
    ...updatedDoc.data(),
  } as League;
}

/**
 * Completes the draft for a league
 * Changes status to 'completed' and removes currentPick
 * @param leagueId - The document ID of the league
 * @returns The updated League, or null if not found
 * @throws Error if draft cannot be completed (wrong status)
 */
export async function completeDraft(leagueId: string): Promise<League | null> {
  const db = getAdminFirestore();

  const docRef = db.collection(COLLECTIONS.LEAGUES).doc(leagueId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const league = doc.data() as League;

  // Validate draft can be completed
  if (league.draftStatus !== 'in_progress') {
    throw new Error(
      `Cannot complete draft: current status is '${league.draftStatus}', expected 'in_progress'`
    );
  }

  await docRef.update({
    draftStatus: 'completed',
    currentPick: FieldValue.delete(),
  });

  const updatedDoc = await docRef.get();
  return {
    id: updatedDoc.id,
    ...updatedDoc.data(),
  } as League;
}

/**
 * Deletes a league by its document ID
 * Only the admin who created the league can delete it
 * @param leagueId - The document ID of the league
 * @param adminUid - UID of the admin requesting deletion
 * @returns true if deleted, false if not found or not authorized
 */
export async function deleteLeague(
  leagueId: string,
  adminUid: string
): Promise<boolean> {
  const db = getAdminFirestore();

  const docRef = db.collection(COLLECTIONS.LEAGUES).doc(leagueId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return false;
  }

  const league = doc.data() as League;
  if (league.adminUid !== adminUid) {
    return false;
  }

  await docRef.delete();
  return true;
}

/**
 * Checks if a user has access to a league
 * Access is granted if the user is the admin or a player in the league
 * @param leagueId - The document ID of the league
 * @param userUid - UID of the user to check
 * @returns Object with access info and the league if accessible
 */
export async function checkLeagueAccess(
  leagueId: string,
  userUid: string
): Promise<{
  hasAccess: boolean;
  isAdmin: boolean;
  isPlayer: boolean;
  league: League | null;
}> {
  const league = await getLeagueById(leagueId);

  if (!league) {
    return {
      hasAccess: false,
      isAdmin: false,
      isPlayer: false,
      league: null,
    };
  }

  const isAdmin = league.adminUid === userUid;
  const isPlayer = league.playerUids.includes(userUid);

  return {
    hasAccess: isAdmin || isPlayer,
    isAdmin,
    isPlayer,
    league,
  };
}
