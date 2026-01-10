import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';

/**
 * Health status types
 */
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

interface FirebaseCheck {
  status: HealthStatus;
  latency_ms: number;
  error?: string;
}

interface MemoryCheck {
  used_mb: number;
  total_mb: number;
  percentage: number;
}

interface HealthChecks {
  firebase: FirebaseCheck;
  memory: MemoryCheck;
}

interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  build: string;
  checks: HealthChecks;
}

/**
 * Check Firebase connectivity by attempting to get server timestamp
 */
async function checkFirebase(): Promise<FirebaseCheck> {
  const startTime = Date.now();

  try {
    const db = getAdminFirestore();

    // Attempt to read a document - this validates connectivity
    // We use a lightweight operation that doesn't require specific documents
    const testRef = db.collection('_health_check').doc('ping');

    // Try to get the document (it doesn't need to exist)
    // This validates the connection to Firestore
    await testRef.get();

    const latency = Date.now() - startTime;

    return {
      status: latency < 1000 ? 'healthy' : 'degraded',
      latency_ms: latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      status: 'unhealthy',
      latency_ms: latency,
      error: errorMessage,
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): MemoryCheck {
  const memoryUsage = process.memoryUsage();

  // heapUsed is the actual memory used by the application
  const usedMb = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;

  // heapTotal is the total heap allocated
  const totalMb = Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100;

  // Calculate percentage
  const percentage = Math.round((usedMb / totalMb) * 100 * 100) / 100;

  return {
    used_mb: usedMb,
    total_mb: totalMb,
    percentage,
  };
}

/**
 * Determine overall health status based on individual checks
 */
function determineOverallStatus(checks: HealthChecks): HealthStatus {
  // If Firebase is unhealthy, the whole service is unhealthy
  if (checks.firebase.status === 'unhealthy') {
    return 'unhealthy';
  }

  // If memory usage is above 90%, consider it degraded
  if (checks.memory.percentage > 90) {
    return 'degraded';
  }

  // If Firebase is degraded or memory is above 80%, return degraded
  if (checks.firebase.status === 'degraded' || checks.memory.percentage > 80) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Health Check Endpoint
 * Used by monitoring systems and container orchestrators
 *
 * GET /api/health
 * Returns comprehensive health status including:
 * - Overall status (healthy/degraded/unhealthy)
 * - Timestamp
 * - Version and build information
 * - Individual component checks (Firebase, memory)
 *
 * Response codes:
 * - 200: healthy or degraded
 * - 503: unhealthy
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const version = process.env.APP_VERSION || 'unknown';
  const build = process.env.BUILD_ID || 'unknown';

  // Run health checks
  const [firebaseCheck, memoryCheck] = await Promise.all([
    checkFirebase(),
    Promise.resolve(checkMemory()),
  ]);

  const checks: HealthChecks = {
    firebase: firebaseCheck,
    memory: memoryCheck,
  };

  const status = determineOverallStatus(checks);

  const response: HealthResponse = {
    status,
    timestamp,
    version,
    build,
    checks,
  };

  // Determine HTTP status code
  const httpStatus = status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

// Ensure this endpoint is always dynamic (not cached)
export const dynamic = 'force-dynamic';
