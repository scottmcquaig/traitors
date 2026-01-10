import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from './admin';
import { COLLECTIONS, User } from '@/types/firebase';

/**
 * Data required to create a new user
 */
export interface CreateUser {
  email: string;
  displayName: string;
  role?: 'admin' | 'player';
  invitedBy?: string;
}

/**
 * Create a new user document in Firestore
 * @param uid - The Firebase Auth UID
 * @param data - The user data to create
 * @returns The created user document
 */
export async function createUser(uid: string, data: CreateUser): Promise<User> {
  const db = getAdminFirestore();
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

  const userData = {
    uid,
    email: data.email,
    displayName: data.displayName,
    role: data.role || 'player',
    invitedBy: data.invitedBy,
    createdAt: Timestamp.now(),
  };

  await userRef.set(userData);

  return {
    ...userData,
    createdAt: userData.createdAt,
  } as unknown as User;
}

/**
 * Get a user by their UID
 * @param uid - The Firebase Auth UID
 * @returns The user document or null if not found
 */
export async function getUserByUid(uid: string): Promise<User | null> {
  const db = getAdminFirestore();
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

  const doc = await userRef.get();

  if (!doc.exists) {
    return null;
  }

  return {
    uid: doc.id,
    ...doc.data(),
  } as User;
}

/**
 * Get a user by their email address
 * @param email - The user's email address
 * @returns The user document or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getAdminFirestore();
  const usersRef = db.collection(COLLECTIONS.USERS);

  const snapshot = await usersRef.where('email', '==', email).limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    uid: doc.id,
    ...doc.data(),
  } as User;
}
