import { validateInvite, getInviterDisplayName } from '@/lib/firebase/invites';
import InviteRegistrationForm from '@/components/InviteRegistrationForm';

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

/**
 * Error messages mapped from validation error codes
 */
const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  NOT_FOUND: {
    title: 'Invite Not Found',
    message: 'This invite link is invalid or does not exist. Please check the link or contact the person who invited you.',
  },
  EXPIRED: {
    title: 'Invite Expired',
    message: 'This invite has expired. Please contact the person who invited you to request a new invite.',
  },
  ALREADY_USED: {
    title: 'Invite Already Used',
    message: 'This invite has already been used. If you already have an account, please sign in instead.',
  },
};

/**
 * Error component for invalid invites
 */
function InviteError({ errorCode }: { errorCode: string }) {
  const { title, message } = ERROR_MESSAGES[errorCode] || {
    title: 'Invalid Invite',
    message: 'This invite link is not valid. Please check the link and try again.',
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {message}
            </p>
            <a
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors"
            >
              Go to Home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Invite acceptance page
 * Validates the invite token and shows either an error or the registration form
 */
export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  // Validate the invite token
  const validationResult = await validateInvite(token);

  // Show error if invalid
  if (!validationResult.valid || !validationResult.invite) {
    return <InviteError errorCode={validationResult.error || 'UNKNOWN'} />;
  }

  const invite = validationResult.invite;

  // Get the inviter's display name
  const inviterName = await getInviterDisplayName(invite.createdBy);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              You have been invited!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{inviterName}</span>{' '}
              has invited you to join Traitors.
            </p>
          </div>

          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Invite for:</span>{' '}
              <span className="text-gray-900 dark:text-white">{invite.email}</span>
            </p>
          </div>

          <InviteRegistrationForm
            token={token}
            email={invite.email}
            invitedBy={invite.createdBy}
          />
        </div>
      </div>
    </main>
  );
}
