'use client';

import { cn } from '@/lib/utils/cn';

export interface ReadOnlyBannerProps {
  /** Optional custom message to display */
  message?: string;
  /** Size variant */
  variant?: 'compact' | 'default';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the banner */
  show?: boolean;
}

/**
 * ReadOnlyBanner - Informs users they are viewing content in read-only mode
 *
 * A subtle, non-intrusive banner that indicates the user can view
 * but not modify the current content. Typically shown to players
 * on pages where only admins can make changes.
 *
 * @example
 * ```tsx
 * // Basic usage
 * {!permissions.canEdit && <ReadOnlyBanner />}
 *
 * // With custom message
 * <ReadOnlyBanner message="Only league admins can modify scores" />
 *
 * // Compact variant for tighter spaces
 * <ReadOnlyBanner variant="compact" />
 *
 * // Conditional display using show prop
 * <ReadOnlyBanner show={!permissions.canEdit} />
 * ```
 */
export function ReadOnlyBanner({
  message = 'You are viewing this page in read-only mode',
  variant = 'default',
  className,
  show = true,
}: ReadOnlyBannerProps) {
  // Don't render if show is false
  if (!show) {
    return null;
  }

  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 border-b',
        'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50',
        'text-blue-700 dark:text-blue-300',
        isCompact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Read-only icon */}
      <svg
        className={cn(
          'flex-shrink-0',
          isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>

      {/* Message */}
      <span className={cn(isCompact ? 'font-medium' : 'font-normal')}>
        {message}
      </span>
    </div>
  );
}

/**
 * ReadOnlyIndicator - An inline indicator for read-only fields/sections
 *
 * A smaller, inline version of the banner for use within forms
 * or sections to indicate specific elements are read-only.
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <h3>Score History</h3>
 *   <ReadOnlyIndicator />
 * </div>
 * ```
 */
export function ReadOnlyIndicator({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
        'text-xs font-medium',
        className
      )}
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
      View only
    </span>
  );
}

export default ReadOnlyBanner;
