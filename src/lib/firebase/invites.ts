import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from './admin';
import { InviteToken, COLLECTIONS } from '@/types/firebase';
import { randomUUID } from 'crypto';

/**
 * Default invite expiration time in milliseconds (7 days)
 */
const DEFAULT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Creates a new invite token for a given email address
 * @param adminUid - UID of the admin creating the invite
 * @param email - Email address to invite
 * @param expirationMs - Optional custom expiration time in milliseconds (default: 7 days)
 * @returns The created InviteToken
 */
export async function createInvite(
  adminUid: string,
  email: string,
  expirationMs: number = DEFAULT_EXPIRATION_MS
): Promise<InviteToken> {
  const db = getAdminFirestore();
  const now = Date.now();
  const token = randomUUID();

  const inviteData = {
    email: email.toLowerCase().trim(),
    token,
    createdBy: adminUid,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + expirationMs),
  };

  const docRef = await db.collection(COLLECTIONS.INVITE_TOKENS).add(inviteData);

  return {
    id: docRef.id,
    ...inviteData,
  } as unknown as InviteToken;
}

/**
 * Fetches an invite by its token
 * @param token - The unique invite token
 * @returns The InviteToken if found, null otherwise
 */
export async function getInviteByToken(token: string): Promise<InviteToken | null> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.INVITE_TOKENS)
    .where('token', '==', token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as InviteToken;
}

/**
 * Result of invite validation
 */
export interface InviteValidationResult {
  valid: boolean;
  invite: InviteToken | null;
  error?: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_USED';
}

/**
 * Validates an invite token
 * Checks if the token exists, is not expired, and has not been used
 * @param token - The unique invite token
 * @returns Validation result with the invite and any error
 */
export async function validateInvite(token: string): Promise<InviteValidationResult> {
  const invite = await getInviteByToken(token);

  if (!invite) {
    return {
      valid: false,
      invite: null,
      error: 'NOT_FOUND',
    };
  }

  // Check if already used
  if (invite.usedAt || invite.usedBy) {
    return {
      valid: false,
      invite,
      error: 'ALREADY_USED',
    };
  }

  // Check if expired
  const now = Timestamp.now();
  if (invite.expiresAt.toMillis() < now.toMillis()) {
    return {
      valid: false,
      invite,
      error: 'EXPIRED',
    };
  }

  return {
    valid: true,
    invite,
  };
}

/**
 * Marks an invite as used by a specific user
 * @param token - The unique invite token
 * @param userId - UID of the user who used the invite
 * @returns The updated InviteToken, or null if not found
 */
export async function markInviteUsed(
  token: string,
  userId: string
): Promise<InviteToken | null> {
  const db = getAdminFirestore();

  const snapshot = await db
    .collection(COLLECTIONS.INVITE_TOKENS)
    .where('token', '==', token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const now = Timestamp.now();

  await doc.ref.update({
    usedAt: now,
    usedBy: userId,
  });

  const updatedDoc = await doc.ref.get();
  return {
    id: updatedDoc.id,
    ...updatedDoc.data(),
  } as InviteToken;
}

/**
 * Gets all invites created by a specific admin
 * @param adminUid - UID of the admin
 * @param includeUsed - Whether to include used invites (default: true)
 * @returns Array of InviteTokens created by the admin
 */
export async function getInvitesByAdmin(
  adminUid: string,
  includeUsed: boolean = true
): Promise<InviteToken[]> {
  const db = getAdminFirestore();

  let query = db
    .collection(COLLECTIONS.INVITE_TOKENS)
    .where('createdBy', '==', adminUid)
    .orderBy('createdAt', 'desc');

  const snapshot = await query.get();

  const invites = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as InviteToken[];

  if (!includeUsed) {
    return invites.filter((invite) => !invite.usedAt);
  }

  return invites;
}

/**
 * Gets an invite by its document ID
 * @param inviteId - The document ID of the invite
 * @returns The InviteToken if found, null otherwise
 */
export async function getInviteById(inviteId: string): Promise<InviteToken | null> {
  const db = getAdminFirestore();

  const doc = await db.collection(COLLECTIONS.INVITE_TOKENS).doc(inviteId).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as InviteToken;
}

/**
 * Deletes an invite by its document ID
 * Only the admin who created the invite can delete it
 * @param inviteId - The document ID of the invite
 * @param adminUid - UID of the admin requesting deletion
 * @returns true if deleted, false if not found or not authorized
 */
export async function deleteInvite(
  inviteId: string,
  adminUid: string
): Promise<boolean> {
  const db = getAdminFirestore();

  const doc = await db.collection(COLLECTIONS.INVITE_TOKENS).doc(inviteId).get();

  if (!doc.exists) {
    return false;
  }

  const invite = doc.data() as InviteToken;
  if (invite.createdBy !== adminUid) {
    return false;
  }

  await doc.ref.delete();
  return true;
}

/**
 * Gets the display name of the user who created an invite
 * @param createdBy - UID of the user who created the invite
 * @returns The display name or 'A team member' if not found
 */
export async function getInviterDisplayName(createdBy: string): Promise<string> {
  const db = getAdminFirestore();
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(createdBy).get();

  if (!userDoc.exists) {
    return 'A team member';
  }

  const userData = userDoc.data();
  return userData?.displayName || 'A team member';
}
