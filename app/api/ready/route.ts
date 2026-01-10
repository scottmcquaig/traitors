import { NextResponse } from 'next/server';

/**
 * Readiness Check Endpoint
 * Used for Kubernetes-style readiness probes
 *
 * GET /api/ready
 *
 * This is a simple endpoint that returns 200 OK if the server is running.
 * Unlike /api/health, this does not check external dependencies.
 * Use this for load balancer health checks that only need to know
 * if the server process is accepting requests.
 *
 * Response codes:
 * - 200: Server is ready to accept requests
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

// Ensure this endpoint is always dynamic (not cached)
export const dynamic = 'force-dynamic';
