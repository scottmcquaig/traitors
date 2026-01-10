import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = ['/dashboard', '/admin', '/leagues', '/profile'];

/**
 * Admin-only routes
 */
const ADMIN_ROUTES = ['/admin'];

/**
 * Auth cookie name
 * TODO: Update this to match your Firebase auth cookie name
 */
const AUTH_COOKIE_NAME = 'firebase-auth-token';

/**
 * Check if a path starts with any of the protected prefixes
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if a path is an admin route
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // TODO: Get auth token from cookie
  // The cookie should be set by Firebase Auth or your auth solution
  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // Check if route is protected
  if (isProtectedRoute(pathname)) {
    if (!authToken) {
      // TODO: Optionally verify the token is valid using Firebase Admin SDK
      // For now, just check if the cookie exists
      
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // TODO: For admin routes, verify user has admin role
    // This requires decoding the token and checking claims
    // Example with Firebase Admin:
    //
    // if (isAdminRoute(pathname)) {
    //   const decodedToken = await verifyIdToken(authToken);
    //   if (!decodedToken.admin) {
    //     return NextResponse.redirect(new URL('/unauthorized', request.url));
    //   }
    // }

    if (isAdminRoute(pathname)) {
      // TODO: Implement admin role check
      // For now, allow access if authenticated
      console.log('TODO: Implement admin role verification for', pathname);
    }
  }

  // Allow the request to continue
  return NextResponse.next();
}

/**
 * Configure which paths the middleware runs on
 * Excludes static files, API routes, and Next.js internals
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (public assets)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
  ],
};
