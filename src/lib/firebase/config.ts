import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase client-side configuration
 * All values are read from environment variables prefixed with NEXT_PUBLIC_
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Initialize Firebase app with lazy initialization pattern
 * Returns existing app instance if already initialized
 */
function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

/**
 * Lazy-initialized Firebase app instance
 */
let firebaseApp: FirebaseApp | null = null;

/**
 * Lazy-initialized Firebase Auth instance
 */
let firebaseAuth: Auth | null = null;

/**
 * Lazy-initialized Firestore instance
 */
let firebaseFirestore: Firestore | null = null;

/**
 * Get the Firebase app instance (lazy initialization)
 */
export function getFirebaseAppInstance(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = getFirebaseApp();
  }
  return firebaseApp;
}

/**
 * Get the Firebase Auth instance (lazy initialization)
 */
export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseAppInstance());
  }
  return firebaseAuth;
}

/**
 * Get the Firestore instance (lazy initialization)
 */
export function getFirebaseFirestore(): Firestore {
  if (!firebaseFirestore) {
    firebaseFirestore = getFirestore(getFirebaseAppInstance());
  }
  return firebaseFirestore;
}

// Export instances for convenience (will be initialized on first access)
export const app = getFirebaseAppInstance();
export const auth = getFirebaseAuth();
export const db = getFirebaseFirestore();

// Export the config for reference
export { firebaseConfig };
