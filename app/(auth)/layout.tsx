'use client';

import { AuthProvider } from '@/context/AuthContext';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Auth layout - simple centered layout for authentication pages
 * No sidebar or navigation, just centered content
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {children}
        </div>
      </div>
    </AuthProvider>
  );
}
