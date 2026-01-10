import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

/**
 * Session cookie name (Firebase convention)
 */
const SESSION_COOKIE_NAME = '__session';

/**
 * Protected route prefixes that require authentication
 */
const PROTECTED_ROUTES = ['/dashboard', '/admin', '/leagues', '/profile'];

/**
 * Admin-only route prefixes
 */
const ADMIN_ROUTES = ['/admin'];

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ['/', '/login', '/invite', '/api/auth'];

/**
 * Interface for decoded Firebase ID token claims
 */
interface FirebaseTokenClaims {
  iss: string;
  aud: string;
  auth_time: number;
  user_id: string;
  sub: string;
  iat: number;
  exp: number;
  email?: string;
  email_verified?: boolean;
  admin?: boolean;
  role?: string;
  [key: string]: unknown;
}

/**
 * Check if a path starts with any of the given prefixes
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if the path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return matchesRoute(pathname, PUBLIC_ROUTES);
}

/**
 * Check if a path requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  return matchesRoute(pathname, PROTECTED_ROUTES);
}

/**
 * Check if a path is an admin route
 */
function isAdminRoute(pathname: string): boolean {
  return matchesRoute(pathname, ADMIN_ROUTES);
}

/**
 * Validate and decode the session token
 * Returns null if token is invalid or expired
 */
function validateToken(token: string): FirebaseTokenClaims | null {
  try {
    const decoded = jwtDecode<FirebaseTokenClaims>(token);

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      return null;
    }

    // Basic validation - ensure required fields exist
    if (!decoded.sub || !decoded.user_id) {
      return null;
    }

    return decoded;
  } catch (error) {
    // Token is malformed or invalid
    return null;
  }
}

/**
 * Check if user has admin role from token claims
 */
function isAdmin(claims: FirebaseTokenClaims): boolean {
  return claims.admin === true || claims.role === 'admin';
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

/**
 * Create redirect response to login page with return URL
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  const returnUrl = request.nextUrl.pathname + request.nextUrl.search;

  // Only add returnUrl if it's not the login page itself
  if (returnUrl !== '/login') {
    loginUrl.searchParams.set('returnUrl', returnUrl);
  }

  return addSecurityHeaders(NextResponse.redirect(loginUrl));
}

/**
 * Create redirect response to dashboard (for non-admin users accessing admin routes)
 */
function redirectToDashboard(request: NextRequest): NextResponse {
  const dashboardUrl = new URL('/dashboard', request.url);
  return addSecurityHeaders(NextResponse.redirect(dashboardUrl));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (isPublicRoute(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Get session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Check if route requires authentication
  if (isProtectedRoute(pathname)) {
    // No session cookie - redirect to login
    if (!sessionCookie) {
      return redirectToLogin(request);
    }

    // Validate the token
    const claims = validateToken(sessionCookie);

    if (!claims) {
      // Invalid or expired token - clear cookie and redirect to login
      const response = redirectToLogin(request);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // Check admin access for admin routes
    if (isAdminRoute(pathname)) {
      if (!isAdmin(claims)) {
        // User is authenticated but not an admin - redirect to dashboard
        return redirectToDashboard(request);
      }
    }

    // User is authenticated (and admin if required) - allow access
    const response = addSecurityHeaders(NextResponse.next());

    // Add user info to request headers for downstream use
    response.headers.set('x-user-id', claims.user_id);
    if (claims.email) {
      response.headers.set('x-user-email', claims.email);
    }
    if (isAdmin(claims)) {
      response.headers.set('x-user-admin', 'true');
    }

    return response;
  }

  // Non-protected route - allow access
  return addSecurityHeaders(NextResponse.next());
}

/**
 * Configure which paths the middleware runs on
 * Excludes static files, API routes (except auth), and Next.js internals
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (public assets)
     * - api routes except /api/auth (handled by middleware for auth routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
