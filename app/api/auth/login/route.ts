import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, mode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const adminAuth = getAdminAuth();

    if (mode === 'register') {
      // Create a new user
      const userRecord = await adminAuth.createUser({
        email,
        password,
        emailVerified: false,
      });

      // Generate a custom token for the new user
      const customToken = await adminAuth.createCustomToken(userRecord.uid);

      return NextResponse.json({
        success: true,
        uid: userRecord.uid,
        customToken,
        message: 'User created successfully',
      });
    } else {
      // For login, we need to verify credentials
      // Firebase Admin SDK doesn't support password verification directly
      // So we return an instruction for the client to use Firebase Auth REST API
      return NextResponse.json({
        success: true,
        useFirebaseRest: true,
        message: 'Use Firebase Auth REST API for login',
      });
    }
  } catch (error) {
    console.error('Auth error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

    // Parse Firebase error codes
    if (errorMessage.includes('email-already-exists')) {
      return NextResponse.json(
        { error: 'An account already exists with this email' },
        { status: 400 }
      );
    }
    if (errorMessage.includes('invalid-email')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    if (errorMessage.includes('weak-password')) {
      return NextResponse.json(
        { error: 'Password is too weak. Use at least 6 characters.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
