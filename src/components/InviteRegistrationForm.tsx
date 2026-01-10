'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface InviteRegistrationFormProps {
  token: string;
  email: string;
  invitedBy: string;
}

/**
 * Registration form for invited users
 * Handles account creation and invite acceptance
 */
export default function InviteRegistrationForm({
  token,
  email,
  invitedBy,
}: InviteRegistrationFormProps) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation states
  const [touched, setTouched] = useState({
    displayName: false,
    password: false,
    confirmPassword: false,
  });

  // Validation checks
  const isDisplayNameValid = displayName.trim().length >= 2;
  const isPasswordValid = password.length >= 8;
  const doPasswordsMatch = password === confirmPassword;

  const isFormValid = isDisplayNameValid && isPasswordValid && doPasswordsMatch;

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      displayName: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register-with-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password,
          displayName: displayName.trim(),
          invitedBy,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Redirect to success page
      router.push('/invite/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Email field (pre-filled, disabled) */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          disabled
          aria-describedby="email-description"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
        />
        <p id="email-description" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          This email is associated with your invite.
        </p>
      </div>

      {/* Display name field */}
      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Display Name
        </label>
        <input
          type="text"
          id="displayName"
          name="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={() => handleBlur('displayName')}
          disabled={isLoading}
          required
          minLength={2}
          aria-invalid={touched.displayName && !isDisplayNameValid}
          aria-describedby="displayName-error"
          className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            touched.displayName && !isDisplayNameValid
              ? 'border-red-500 dark:border-red-400'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Enter your display name"
        />
        {touched.displayName && !isDisplayNameValid && (
          <p id="displayName-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            Display name must be at least 2 characters.
          </p>
        )}
      </div>

      {/* Password field */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => handleBlur('password')}
          disabled={isLoading}
          required
          minLength={8}
          aria-invalid={touched.password && !isPasswordValid}
          aria-describedby="password-requirements password-error"
          className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            touched.password && !isPasswordValid
              ? 'border-red-500 dark:border-red-400'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Enter your password"
        />
        <p id="password-requirements" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Must be at least 8 characters.
        </p>
        {touched.password && !isPasswordValid && (
          <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            Password must be at least 8 characters.
          </p>
        )}
      </div>

      {/* Confirm password field */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => handleBlur('confirmPassword')}
          disabled={isLoading}
          required
          aria-invalid={touched.confirmPassword && !doPasswordsMatch}
          aria-describedby="confirmPassword-error"
          className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            touched.confirmPassword && !doPasswordsMatch
              ? 'border-red-500 dark:border-red-400'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Confirm your password"
        />
        {touched.confirmPassword && !doPasswordsMatch && (
          <p id="confirmPassword-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            Passwords do not match.
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md"
          role="alert"
        >
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Creating account...
          </span>
        ) : (
          'Create Account'
        )}
      </button>

      {/* Sign in link */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <a
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Sign in
        </a>
      </p>
    </form>
  );
}
