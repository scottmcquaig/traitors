/**
 * Runtime Environment Configuration
 *
 * This module provides typed, validated access to environment variables.
 * It separates configuration into client-safe and server-only sections.
 *
 * STARTUP VALIDATION USAGE:
 * -------------------------
 * Import and call validateConfig() early in your application startup:
 *
 * // In src/app/layout.tsx or a server component:
 * import { validateConfig } from '@/lib/config';
 *
 * // This will throw descriptive errors if required variables are missing
 * const config = validateConfig();
 *
 * // For API routes or server actions:
 * import { getServerConfig } from '@/lib/config';
 *
 * export async function POST(request: Request) {
 *   const { firebaseAdminServiceAccount } = getServerConfig();
 *   // Use server-only secrets safely
 * }
 *
 * // For client components:
 * import { getFirebaseConfig } from '@/lib/config';
 *
 * const firebaseConfig = getFirebaseConfig();
 * // Only NEXT_PUBLIC_* variables are accessible
 */

// =============================================================================
// Type Definitions
// =============================================================================

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type NodeEnv = 'development' | 'production' | 'test';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface ServerConfig {
  firebaseAdminServiceAccount: string | null;
  googleApplicationCredentials: string | null;
  nextAuthSecret: string;
  nextAuthUrl: string;
  databaseUrl: string | null;
  redisUrl: string | null;
  smtp: {
    host: string | null;
    port: number | null;
    user: string | null;
    password: string | null;
  };
}

export interface AppConfig {
  version: string;
  buildId: string;
  nodeEnv: NodeEnv;
  logLevel: LogLevel;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

export interface Config {
  firebase: FirebaseConfig;
  server: ServerConfig;
  app: AppConfig;
}

// =============================================================================
// Validation Helpers
// =============================================================================

class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly missingVariables: string[] = []
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Validates that a required environment variable is set and non-empty
 */
function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === '' || value.startsWith('your_')) {
    throw new ConfigurationError(
      `Required environment variable ${name} is not set or has a placeholder value`,
      [name]
    );
  }
  return value.trim();
}

/**
 * Gets an optional environment variable with a default value
 */
function optionalEnv(name: string, value: string | undefined, defaultValue: string): string {
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  return value.trim();
}

/**
 * Validates that a value is one of the allowed values
 */
function validateEnum<T extends string>(
  name: string,
  value: string,
  allowedValues: readonly T[]
): T {
  if (!allowedValues.includes(value as T)) {
    throw new ConfigurationError(
      `Invalid value for ${name}: "${value}". Allowed values: ${allowedValues.join(', ')}`,
      [name]
    );
  }
  return value as T;
}

// =============================================================================
// Configuration Builders
// =============================================================================

/**
 * Builds Firebase client configuration from NEXT_PUBLIC_* variables
 * These variables are safe to expose to the browser
 */
function buildFirebaseConfig(): FirebaseConfig {
  const missingVars: string[] = [];

  const checkRequired = (name: string, value: string | undefined): string => {
    if (!value || value.trim() === '' || value.startsWith('your_')) {
      missingVars.push(name);
      return '';
    }
    return value.trim();
  };

  const config: FirebaseConfig = {
    apiKey: checkRequired('NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: checkRequired('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: checkRequired('NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: checkRequired('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: checkRequired('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: checkRequired('NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
  };

  if (missingVars.length > 0) {
    throw new ConfigurationError(
      `Missing required Firebase configuration:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\nSee .env.example for required variables.`,
      missingVars
    );
  }

  return config;
}

/**
 * Builds server-side configuration with secrets
 * WARNING: Never expose these values to the client
 */
function buildServerConfig(): ServerConfig {
  const missingVars: string[] = [];

  // Required server variables
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;

  if (!nextAuthSecret || nextAuthSecret.trim() === '' || nextAuthSecret.startsWith('your_')) {
    missingVars.push('NEXTAUTH_SECRET');
  }
  if (!nextAuthUrl || nextAuthUrl.trim() === '') {
    missingVars.push('NEXTAUTH_URL');
  }

  // Firebase Admin - at least one method should be configured
  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  const googleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  const hasValidServiceAccount = serviceAccount &&
    !serviceAccount.startsWith('{"type":"service_account","project_id":"..."');
  const hasGoogleCredentials = !!googleCredentials;

  if (!hasValidServiceAccount && !hasGoogleCredentials) {
    missingVars.push('FIREBASE_ADMIN_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS');
  }

  if (missingVars.length > 0) {
    throw new ConfigurationError(
      `Missing required server configuration:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\nSee .env.example for required variables.`,
      missingVars
    );
  }

  // Parse SMTP port if provided
  const smtpPort = process.env.SMTP_PORT;
  const parsedSmtpPort = smtpPort ? parseInt(smtpPort, 10) : null;

  return {
    firebaseAdminServiceAccount: hasValidServiceAccount ? serviceAccount! : null,
    googleApplicationCredentials: googleCredentials || null,
    nextAuthSecret: nextAuthSecret!.trim(),
    nextAuthUrl: nextAuthUrl!.trim(),
    databaseUrl: process.env.DATABASE_URL || null,
    redisUrl: process.env.REDIS_URL || null,
    smtp: {
      host: process.env.SMTP_HOST || null,
      port: parsedSmtpPort && !isNaN(parsedSmtpPort) ? parsedSmtpPort : null,
      user: process.env.SMTP_USER || null,
      password: process.env.SMTP_PASSWORD || null,
    },
  };
}

/**
 * Builds application metadata configuration
 */
function buildAppConfig(): AppConfig {
  const nodeEnv = optionalEnv('NODE_ENV', process.env.NODE_ENV, 'production');
  const validatedNodeEnv = validateEnum('NODE_ENV', nodeEnv, ['development', 'production', 'test'] as const);

  const defaultLogLevel = validatedNodeEnv === 'development' ? 'debug' : 'info';
  const logLevel = optionalEnv('LOG_LEVEL', process.env.LOG_LEVEL, defaultLogLevel);
  const validatedLogLevel = validateEnum('LOG_LEVEL', logLevel, ['error', 'warn', 'info', 'debug'] as const);

  return {
    version: optionalEnv('APP_VERSION', process.env.APP_VERSION, '0.0.0-dev'),
    buildId: optionalEnv('BUILD_ID', process.env.BUILD_ID, 'local'),
    nodeEnv: validatedNodeEnv,
    logLevel: validatedLogLevel,
    isProduction: validatedNodeEnv === 'production',
    isDevelopment: validatedNodeEnv === 'development',
    isTest: validatedNodeEnv === 'test',
  };
}

// =============================================================================
// Cached Configuration
// =============================================================================

let cachedFirebaseConfig: FirebaseConfig | null = null;
let cachedServerConfig: ServerConfig | null = null;
let cachedAppConfig: AppConfig | null = null;

// =============================================================================
// Public API
// =============================================================================

/**
 * Gets Firebase client configuration
 * Safe to use in both client and server components
 *
 * @throws ConfigurationError if required Firebase variables are missing
 */
export function getFirebaseConfig(): FirebaseConfig {
  if (!cachedFirebaseConfig) {
    cachedFirebaseConfig = buildFirebaseConfig();
  }
  return cachedFirebaseConfig;
}

/**
 * Gets server-side configuration with secrets
 * Only use in server components, API routes, or server actions
 *
 * @throws ConfigurationError if required server variables are missing
 */
export function getServerConfig(): ServerConfig {
  if (typeof window !== 'undefined') {
    throw new ConfigurationError(
      'getServerConfig() cannot be called on the client side. Server secrets must only be accessed server-side.'
    );
  }
  if (!cachedServerConfig) {
    cachedServerConfig = buildServerConfig();
  }
  return cachedServerConfig;
}

/**
 * Gets application metadata configuration
 * Safe to use in both client and server components
 */
export function getAppConfig(): AppConfig {
  if (!cachedAppConfig) {
    cachedAppConfig = buildAppConfig();
  }
  return cachedAppConfig;
}

/**
 * Validates and returns the complete configuration
 * Call this early in application startup to catch configuration errors
 *
 * @throws ConfigurationError if any required variables are missing
 *
 * @example
 * // In your root layout or server startup:
 * import { validateConfig } from '@/lib/config';
 *
 * // Will throw with descriptive error if config is invalid
 * const config = validateConfig();
 * console.log(`Starting ${config.app.version} in ${config.app.nodeEnv} mode`);
 */
export function validateConfig(): Config {
  // Build all configs - this will throw if any required vars are missing
  const firebase = getFirebaseConfig();
  const app = getAppConfig();

  // Only validate server config on the server
  let server: ServerConfig;
  if (typeof window === 'undefined') {
    server = getServerConfig();
  } else {
    // Return a placeholder for client-side
    server = {
      firebaseAdminServiceAccount: null,
      googleApplicationCredentials: null,
      nextAuthSecret: '[SERVER_ONLY]',
      nextAuthUrl: '[SERVER_ONLY]',
      databaseUrl: null,
      redisUrl: null,
      smtp: {
        host: null,
        port: null,
        user: null,
        password: null,
      },
    };
  }

  return { firebase, server, app };
}

/**
 * Helper to check if running in production environment
 */
export function isProduction(): boolean {
  return getAppConfig().isProduction;
}

/**
 * Helper to check if running in development environment
 */
export function isDevelopment(): boolean {
  return getAppConfig().isDevelopment;
}

/**
 * Helper to check if running in test environment
 */
export function isTest(): boolean {
  return getAppConfig().isTest;
}

/**
 * Clears cached configuration (useful for testing)
 */
export function clearConfigCache(): void {
  cachedFirebaseConfig = null;
  cachedServerConfig = null;
  cachedAppConfig = null;
}

// =============================================================================
// Type Exports
// =============================================================================

export type { ConfigurationError };
