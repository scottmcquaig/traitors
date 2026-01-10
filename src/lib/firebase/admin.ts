import {
  initializeApp,
  getApps,
  cert,
  App,
  ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK singleton instance
 */
let adminApp: App | null = null;

/**
 * Firebase Admin Auth singleton instance
 */
let adminAuth: Auth | null = null;

/**
 * Firebase Admin Firestore singleton instance
 */
let adminFirestore: Firestore | null = null;

/**
 * Parse the service account from environment variable
 * Expects FIREBASE_SERVICE_ACCOUNT to be a JSON string
 */
function getServiceAccount(): ServiceAccount {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountJson) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT environment variable is not set. ' +
        'Please set it to a JSON string containing your Firebase service account credentials.'
    );
  }

  try {
    return JSON.parse(serviceAccountJson) as ServiceAccount;
  } catch (error) {
    throw new Error(
      'Failed to parse FIREBASE_SERVICE_ACCOUNT. ' +
        'Ensure it is a valid JSON string.'
    );
  }
}

/**
 * Initialize the Firebase Admin SDK (singleton pattern)
 * Returns existing instance if already initialized
 */
function initializeAdminApp(): App {
  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  // Initialize with service account credentials
  const serviceAccount = getServiceAccount();

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

/**
 * Get the Firebase Admin app instance (lazy initialization)
 */
export function getAdminApp(): App {
  if (!adminApp) {
    adminApp = initializeAdminApp();
  }
  return adminApp;
}

/**
 * Get the Firebase Admin Auth instance (lazy initialization)
 */
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

/**
 * Get the Firebase Admin Firestore instance (lazy initialization)
 */
export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    adminFirestore = getFirestore(getAdminApp());
  }
  return adminFirestore;
}

// Export convenience accessors
export { getAdminApp as adminApp };
export { getAdminAuth as adminAuthInstance };
export { getAdminFirestore as adminDb };
