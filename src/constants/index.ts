/**
 * Application constants for FantaCTV
 */

/**
 * Application name
 */
export const APP_NAME = 'FantaCTV';

/**
 * Default roster size for fantasy leagues
 * Configurable per league, but this is the default
 */
export const ROSTER_SIZE = 4;

/**
 * Minimum and maximum roster sizes allowed
 */
export const MIN_ROSTER_SIZE = 2;
export const MAX_ROSTER_SIZE = 8;

/**
 * Scoring categories for fantasy points
 * TODO: Finalize scoring system based on game mechanics
 */
export const SCORING_CATEGORIES = {
  // Survival scoring
  SURVIVED_EPISODE: 10,
  WON_SEASON: 50,
  
  // Social game scoring
  CORRECT_VOTE: 5,
  RECEIVED_VOTES: -2,
  
  // Role-specific scoring
  TRAITOR_SURVIVED_ROUND: 15,
  TRAITOR_SUCCESSFUL_MURDER: 10,
  FAITHFUL_CAUGHT_TRAITOR: 20,
  
  // Challenge scoring
  WON_CHALLENGE: 5,
  SHIELD_EARNED: 10,
  
  // Bonus categories
  FAN_FAVORITE: 25,
  STRATEGIC_PLAY: 10,
} as const;

/**
 * Type for scoring category keys
 */
export type ScoringCategory = keyof typeof SCORING_CATEGORIES;

/**
 * Default league settings
 */
export const DEFAULT_LEAGUE_SETTINGS = {
  maxTeams: 10,
  rosterSize: ROSTER_SIZE,
  draftType: 'snake' as const,
  scoringMultiplier: 1,
  isPublic: false,
};

/**
 * Route paths
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  LEAGUES: '/leagues',
  ADMIN: '/admin',
  PROFILE: '/profile',
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  LEAGUES: '/api/leagues',
  PLAYERS: '/api/players',
  SCORING: '/api/scoring',
} as const;
