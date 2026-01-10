import Link from 'next/link';

/**
 * Success page shown after successful registration via invite
 */
export default function InviteSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            {/* Success icon */}
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* Welcome message */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Traitors!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Your account has been created successfully. You can now start playing and join leagues.
            </p>

            {/* Action buttons */}
            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="block w-full px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium text-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/"
                className="block w-full px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md font-medium text-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900 transition-colors"
              >
                Go to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
