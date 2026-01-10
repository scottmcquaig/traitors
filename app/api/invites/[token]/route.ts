import { NextRequest, NextResponse } from 'next/server';
import { validateInvite } from '@/lib/firebase/invites';

/**
 * Route params type for dynamic [token] route
 */
interface RouteParams {
  params: Promise<{
    token: string;
  }>;
}

/**
 * GET /api/invites/[token]
 * Validates an invite token (public endpoint)
 *
 * This endpoint is intentionally public to allow users to check if their
 * invite token is valid before attempting to sign up.
 *
 * Response:
 * - 200: Token is valid
 * - 400: Missing token parameter
 * - 404: Token not found
 * - 410: Token expired or already used
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Token parameter is required' },
        { status: 400 }
      );
    }

    // Validate the invite token
    const validation = await validateInvite(token);

    if (!validation.valid) {
      switch (validation.error) {
        case 'NOT_FOUND':
          return NextResponse.json(
            {
              valid: false,
              error: 'Not Found',
              message: 'Invite token not found',
            },
            { status: 404 }
          );

        case 'EXPIRED':
          return NextResponse.json(
            {
              valid: false,
              error: 'Gone',
              message: 'Invite token has expired',
              expiredAt: validation.invite?.expiresAt.toDate().toISOString(),
            },
            { status: 410 }
          );

        case 'ALREADY_USED':
          return NextResponse.json(
            {
              valid: false,
              error: 'Gone',
              message: 'Invite token has already been used',
              usedAt: validation.invite?.usedAt?.toDate().toISOString(),
            },
            { status: 410 }
          );

        default:
          return NextResponse.json(
            {
              valid: false,
              error: 'Bad Request',
              message: 'Invalid invite token',
            },
            { status: 400 }
          );
      }
    }

    // Token is valid - return invite details (without sensitive info)
    const invite = validation.invite!;

    return NextResponse.json({
      valid: true,
      invite: {
        email: invite.email,
        expiresAt: invite.expiresAt.toDate().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error validating invite token:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to validate invite token' },
      { status: 500 }
    );
  }
}
