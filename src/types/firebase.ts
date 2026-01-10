import { Timestamp } from 'firebase/firestore';

/**
 * User document stored in the 'users' collection
 */
export interface User {
  /** Firebase Auth UID */
  uid: string;
  /** User's email address */
  email: string;
  /** User's display name */
  displayName: string;
  /** User's role in the application */
  role: 'admin' | 'player';
  /** UID of the user who invited this user (optional) */
  invitedBy?: string;
  /** Timestamp when the user was created */
  createdAt: Timestamp;
}

/**
 * Draft status for a league
 */
export type DraftStatus = 'pending' | 'in_progress' | 'completed';

/**
 * League document stored in the 'leagues' collection
 */
export interface League {
  /** Unique identifier for the league */
  id: string;
  /** Name of the league */
  name: string;
  /** Season identifier (e.g., "Season 3", "2024") */
  season: string;
  /** UID of the admin who created/manages this league */
  adminUid: string;
  /** Timestamp when the league was created */
  createdAt: Timestamp;
  /** Current status of the draft */
  draftStatus: DraftStatus;
  /** Array of player UIDs in draft order */
  draftOrder: string[];
  /** Maximum number of contestants each player can draft */
  rosterSize: number;
  /** Current pick number during an active draft (1-indexed) */
  currentPick?: number;
  /** Array of player UIDs who have been invited/joined the league */
  playerUids: string[];
}

/**
 * Status of a contestant in the show
 */
export type ContestantStatus = 'active' | 'eliminated' | 'winner' | 'traitor_revealed';

/**
 * Role of a contestant in the show
 */
export type ContestantRole = 'faithful' | 'traitor' | 'unknown';

/**
 * Contestant document stored in the 'contestants' collection
 * Represents a participant in the TV show
 */
export interface Contestant {
  /** Unique identifier for the contestant */
  id: string;
  /** ID of the league this contestant belongs to */
  leagueId: string;
  /** Contestant's full name */
  name: string;
  /** Current status of the contestant in the show */
  status: ContestantStatus;
  /** URL to the contestant's profile image (optional) */
  imageUrl?: string;
  /** Role of the contestant in the show (optional, may be revealed later) */
  role?: ContestantRole;
  /** Episode number when the contestant was eliminated (optional) */
  eliminatedEpisode?: number;
  /** Timestamp when the contestant was created */
  createdAt: Timestamp;
  /** Timestamp when the contestant was last updated */
  updatedAt: Timestamp;
}

/**
 * DraftPick document stored in the 'draftPicks' collection
 * Represents a player's selection of a contestant in a league draft
 */
export interface DraftPick {
  /** Unique identifier for the draft pick */
  id: string;
  /** ID of the league this pick belongs to */
  leagueId: string;
  /** ID of the contestant that was picked */
  contestantId: string;
  /** UID of the player who made this pick */
  playerUid: string;
  /** Order in which this pick was made (1-based) */
  pickOrder: number;
  /** Round number of the draft (1-based) */
  round: number;
  /** Timestamp when the pick was made */
  createdAt: Timestamp;
}

/**
 * Episode document stored in the 'episodes' collection
 * Represents a single episode with scoring information
 */
export interface Episode {
  /** Unique identifier for the episode */
  id: string;
  /** ID of the league this episode belongs to */
  leagueId: string;
  /** Episode number in the season (1-based) */
  number: number;
  /** Title of the episode */
  title: string;
  /** Air date of the episode */
  airDate: Timestamp;
  /** Scores for each contestant in this episode, keyed by contestant ID */
  scores: Record<string, number>;
}

/**
 * Type for creating a new User (without auto-generated fields)
 */
export type CreateUserData = Omit<User, 'createdAt'> & {
  createdAt?: Timestamp;
};

/**
 * Type for creating a new League (without auto-generated fields)
 * Provides sensible defaults for optional fields
 */
export type CreateLeagueData = Omit<League, 'id' | 'createdAt' | 'draftStatus' | 'draftOrder' | 'playerUids' | 'currentPick'> & {
  createdAt?: Timestamp;
  draftStatus?: DraftStatus;
  draftOrder?: string[];
  playerUids?: string[];
  currentPick?: number;
};

/**
 * Type for creating a new Contestant (without auto-generated fields)
 * leagueId is required and passed separately in the create function
 */
export type CreateContestantData = Omit<Contestant, 'id' | 'leagueId' | 'createdAt' | 'updatedAt'> & {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

/**
 * Type for creating a new DraftPick (without auto-generated fields)
 * leagueId is required and passed separately in the create function
 */
export type CreateDraftPickData = Omit<DraftPick, 'id' | 'leagueId' | 'createdAt'> & {
  createdAt?: Timestamp;
};

/**
 * Type for creating a new Episode
 */
export type CreateEpisodeData = Omit<Episode, 'id'>;

/**
 * Type for updating a User (all fields optional except uid)
 */
export type UpdateUserData = Partial<Omit<User, 'uid' | 'createdAt'>>;

/**
 * Type for updating a League (all fields optional except id)
 */
export type UpdateLeagueData = Partial<Omit<League, 'id' | 'createdAt' | 'adminUid'>>;

/**
 * Type for updating a Contestant (all fields optional except id, leagueId, timestamps)
 */
export type UpdateContestantData = Partial<Omit<Contestant, 'id' | 'leagueId' | 'createdAt' | 'updatedAt'>>;

/**
 * Type for updating a DraftPick (all fields optional except id)
 */
export type UpdateDraftPickData = Partial<Omit<DraftPick, 'id'>>;

/**
 * Type for updating an Episode (all fields optional except id)
 */
export type UpdateEpisodeData = Partial<Omit<Episode, 'id'>>;

/**
 * Collection names as constants for type-safe collection references
 */
export const COLLECTIONS = {
  USERS: 'users',
  LEAGUES: 'leagues',
  CONTESTANTS: 'contestants',
  DRAFT_PICKS: 'draftPicks',
  EPISODES: 'episodes',
  INVITE_TOKENS: 'inviteTokens',
} as const;

/**
 * Type for collection names
 */
export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/**
 * InviteToken document stored in the 'inviteTokens' collection
 * Used to invite new users to the application
 */
export interface InviteToken {
  /** Unique identifier for the invite token document */
  id: string;
  /** Email address the invite was sent to */
  email: string;
  /** Unique UUID token for the invite link */
  token: string;
  /** UID of the admin who created this invite */
  createdBy: string;
  /** Timestamp when the invite was created */
  createdAt: Timestamp;
  /** Timestamp when the invite expires */
  expiresAt: Timestamp;
  /** Timestamp when the invite was used (optional) */
  usedAt?: Timestamp;
  /** UID of the user who used this invite (optional) */
  usedBy?: string;
}

/**
 * Type for creating a new InviteToken (without auto-generated fields)
 */
export type CreateInviteTokenData = Omit<InviteToken, 'id' | 'createdAt'> & {
  createdAt?: Timestamp;
};

/**
 * Type for updating an InviteToken (all fields optional except id)
 */
export type UpdateInviteTokenData = Partial<Omit<InviteToken, 'id' | 'token' | 'createdAt' | 'createdBy'>>;
