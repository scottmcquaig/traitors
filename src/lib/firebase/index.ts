// Firebase client-side exports
export {
  app,
  auth,
  db,
  firebaseConfig,
  getFirebaseAppInstance,
  getFirebaseAuth,
  getFirebaseFirestore,
} from './config';

// Firebase Admin exports (server-side only)
export {
  getAdminApp,
  getAdminAuth,
  getAdminFirestore,
} from './admin';
