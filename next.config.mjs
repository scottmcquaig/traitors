/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',

  images: {
    remotePatterns: [],
  },

  // Compiler options for production optimization
  compiler: {
    // Remove console.log in production builds
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Production logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV !== 'production',
    },
  },

  // Security headers for all routes
  async headers() {
    // Content Security Policy
    // Allow Firebase domains for authentication and API calls
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com https://*.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.googleapis.com https://*.google.com https://*.googleusercontent.com",
      "connect-src 'self' https://*.firebaseapp.com https://*.firebaseio.com https://*.googleapis.com https://*.google.com wss://*.firebaseio.com",
      "frame-src 'self' https://*.firebaseapp.com https://*.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ];

    const ContentSecurityPolicy = cspDirectives.join('; ');

    const securityHeaders = [
      // Prevent clickjacking attacks
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      // Prevent MIME type sniffing
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      // Control referrer information
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      // Prevent XSS attacks (legacy header for older browsers)
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      // DNS prefetch control
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      // Content Security Policy
      {
        key: 'Content-Security-Policy',
        value: ContentSecurityPolicy,
      },
      // Permissions Policy (formerly Feature-Policy)
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
    ];

    // Add HSTS header only in production
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
