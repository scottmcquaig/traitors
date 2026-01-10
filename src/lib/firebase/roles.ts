import { getAdminFirestore, getAdminAuth } from './admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Collection name for storing admin UIDs
 */
const ADMINS_COLLECTION = 'admins';

/**
 * Check if a user is an admin
 * @param uid - The user's Firebase Auth UID
 * @returns Promise resolving to true if user is admin, false otherwise
 */
export async function isAdmin(uid: string): Promise<boolean> {
  if (!uid) {
    return false;
  }

  try {
    const db = getAdminFirestore();
    const adminDoc = await db.collection(ADMINS_COLLECTION).doc(uid).get();
    return adminDoc.exists;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Set a user as admin (admin-only operation)
 * @param uid - The user's Firebase Auth UID to make admin
 * @param callerUid - The UID of the user making the request (must be admin)
 * @throws Error if caller is not admin or operation fails
 */
export async function setAdmin(uid: string, callerUid: string): Promise<void> {
  if (!uid) {
    throw new Error('User UID is required');
  }

  if (!callerUid) {
    throw new Error('Caller UID is required');
  }

  // Verify caller is an admin
  const callerIsAdmin = await isAdmin(callerUid);
  if (!callerIsAdmin) {
    throw new Error('Unauthorized: Only admins can set other admins');
  }

  // Verify the target user exists in Firebase Auth
  const auth = getAdminAuth();
  try {
    await auth.getUser(uid);
  } catch {
    throw new Error('User not found in Firebase Auth');
  }

  const db = getAdminFirestore();

  // Add user to admins collection
  await db.collection(ADMINS_COLLECTION).doc(uid).set({
    uid,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: callerUid,
  });

  // Update user document role if users collection exists
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists) {
    await db.collection('users').doc(uid).update({
      role: 'admin',
    });
  }
}

/**
 * Remove admin status from a user (admin-only operation)
 * @param uid - The user's Firebase Auth UID to remove admin from
 * @param callerUid - The UID of the user making the request (must be admin)
 * @throws Error if caller is not admin, trying to remove self, or operation fails
 */
export async function removeAdmin(uid: string, callerUid: string): Promise<void> {
  if (!uid) {
    throw new Error('User UID is required');
  }

  if (!callerUid) {
    throw new Error('Caller UID is required');
  }

  // Prevent self-removal
  if (uid === callerUid) {
    throw new Error('Cannot remove your own admin status');
  }

  // Verify caller is an admin
  const callerIsAdmin = await isAdmin(callerUid);
  if (!callerIsAdmin) {
    throw new Error('Unauthorized: Only admins can remove other admins');
  }

  const db = getAdminFirestore();

  // Check if target is actually an admin
  const adminDoc = await db.collection(ADMINS_COLLECTION).doc(uid).get();
  if (!adminDoc.exists) {
    throw new Error('User is not an admin');
  }

  // Remove from admins collection
  await db.collection(ADMINS_COLLECTION).doc(uid).delete();

  // Update user document role if users collection exists
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists) {
    await db.collection('users').doc(uid).update({
      role: 'player',
    });
  }
}

/**
 * Admin info returned from getAdmins
 */
export interface AdminInfo {
  uid: string;
  createdAt: Date | null;
  createdBy: string | null;
  email: string | null;
  displayName: string | null;
}

/**
 * Get a list of all admins
 * @returns Promise resolving to array of admin information
 */
export async function getAdmins(): Promise<AdminInfo[]> {
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  const adminsSnapshot = await db.collection(ADMINS_COLLECTION).get();

  const admins: AdminInfo[] = [];

  for (const doc of adminsSnapshot.docs) {
    const data = doc.data();
    let email: string | null = null;
    let displayName: string | null = null;

    // Try to fetch user info from Firebase Auth
    try {
      const userRecord = await auth.getUser(doc.id);
      email = userRecord.email || null;
      displayName = userRecord.displayName || null;
    } catch {
      // User might have been deleted from Auth
      console.warn(`Admin user ${doc.id} not found in Firebase Auth`);
    }

    admins.push({
      uid: doc.id,
      createdAt: data.createdAt?.toDate() || null,
      createdBy: data.createdBy || null,
      email,
      displayName,
    });
  }

  return admins;
}

/**
 * Check if any admins exist in the system
 * Used for initial setup flow
 * @returns Promise resolving to true if at least one admin exists
 */
export async function hasAdmins(): Promise<boolean> {
  const db = getAdminFirestore();
  const adminsSnapshot = await db.collection(ADMINS_COLLECTION).limit(1).get();
  return !adminsSnapshot.empty;
}

/**
 * Create the first admin (only works when no admins exist)
 * @param uid - The user's Firebase Auth UID to make the first admin
 * @throws Error if admins already exist or user doesn't exist
 */
export async function createFirstAdmin(uid: string): Promise<void> {
  if (!uid) {
    throw new Error('User UID is required');
  }

  // Check if admins already exist
  const adminsExist = await hasAdmins();
  if (adminsExist) {
    throw new Error('Admins already exist. Use setAdmin to add more admins.');
  }

  // Verify the user exists in Firebase Auth
  const auth = getAdminAuth();
  try {
    await auth.getUser(uid);
  } catch {
    throw new Error('User not found in Firebase Auth');
  }

  const db = getAdminFirestore();

  // Add user to admins collection
  await db.collection(ADMINS_COLLECTION).doc(uid).set({
    uid,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: null, // First admin has no creator
  });

  // Update user document role if users collection exists
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists) {
    await db.collection('users').doc(uid).update({
      role: 'admin',
    });
  }
}
