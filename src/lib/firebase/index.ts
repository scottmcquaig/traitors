// Firebase client-side exports
export { firebaseConfig } from './config';

// Firebase Admin exports (server-side only)
export {
  getAdminApp,
  getAdminAuth,
  getAdminFirestore,
} from './admin';

// Invite token operations (server-side only)
export {
  createInvite,
  getInviteByToken,
  validateInvite,
  markInviteUsed,
  getInvitesByAdmin,
  getInviteById,
  deleteInvite,
  getInviterDisplayName,
} from './invites';
export type { InviteValidationResult } from './invites';

// Admin role operations (server-side only)
export {
  isAdmin,
  setAdmin,
  removeAdmin,
  getAdmins,
  hasAdmins,
  createFirstAdmin,
} from './roles';
export type { AdminInfo } from './roles';

// Firebase custom claims operations (server-side only)
export {
  setAdminClaim,
  verifyAdminClaim,
  verifyToken,
  getCustomClaims,
  setCustomClaims,
  clearCustomClaims,
  syncAdminClaim,
} from './claims';
export type { CustomClaims } from './claims';

// User operations (server-side only)
export { createUser, getUserByUid, getUserByEmail } from './users';
