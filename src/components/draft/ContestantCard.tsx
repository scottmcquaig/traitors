'use client';

import { cn } from '@/lib/utils/cn';

export type ContestantStatus = 'available' | 'drafted' | 'eliminated';

/**
 * Simplified contestant data for draft components
 * Does not include Firestore-specific fields like timestamps
 */
export interface ContestantData {
  id: string;
  name: string;
  status: 'active' | 'eliminated' | 'winner';
  imageUrl?: string;
}

export interface ContestantCardProps {
  /** The contestant data */
  contestant: ContestantData;
  /** Current draft status of this contestant */
  draftStatus: ContestantStatus;
  /** Name of the player who drafted this contestant (if drafted) */
  draftedByName?: string;
  /** Whether this card is clickable for drafting */
  canDraft: boolean;
  /** Callback when the card is clicked to draft */
  onDraft?: (contestantId: string) => void;
  /** Whether a draft action is currently in progress */
  isLoading?: boolean;
  /** Size variant of the card */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ContestantCard displays a contestant with their current status.
 * Supports available, drafted, and eliminated visual states.
 * Accessible and supports keyboard navigation.
 */
export function ContestantCard({
  contestant,
  draftStatus,
  draftedByName,
  canDraft,
  onDraft,
  isLoading = false,
  size = 'md',
}: ContestantCardProps) {
  const isClickable = canDraft && draftStatus === 'available' && !isLoading;

  const handleClick = () => {
    if (isClickable && onDraft) {
      onDraft(contestant.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isClickable) {
      e.preventDefault();
      handleClick();
    }
  };

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const imageSizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      role={isClickable ? 'button' : 'article'}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={getAriaLabel(contestant, draftStatus, draftedByName, canDraft)}
      aria-disabled={!isClickable}
      className={cn(
        'relative rounded-lg border transition-all duration-200',
        sizeClasses[size],
        // Base styles
        'bg-white dark:bg-gray-800',
        // Status-based styles
        draftStatus === 'available' && [
          'border-gray-200 dark:border-gray-700',
          isClickable && [
            'cursor-pointer',
            'hover:border-blue-400 dark:hover:border-blue-500',
            'hover:shadow-md dark:hover:shadow-blue-900/20',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'dark:focus:ring-offset-gray-900',
          ],
        ],
        draftStatus === 'drafted' && [
          'border-green-300 dark:border-green-700',
          'bg-green-50 dark:bg-green-900/20',
          'opacity-75',
        ],
        draftStatus === 'eliminated' && [
          'border-gray-300 dark:border-gray-600',
          'bg-gray-100 dark:bg-gray-800/50',
          'opacity-50',
        ],
        // Loading state
        isLoading && 'pointer-events-none opacity-50'
      )}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        {/* Contestant image */}
        <div
          className={cn(
            'relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0',
            imageSizeClasses[size]
          )}
        >
          {contestant.imageUrl ? (
            <img
              src={contestant.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
              <svg
                className="w-1/2 h-1/2"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}

          {/* Eliminated badge */}
          {contestant.status === 'eliminated' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}

          {/* Winner badge */}
          {contestant.status === 'winner' && (
            <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1">
              <svg
                className="w-3 h-3 text-yellow-900"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          )}
        </div>

        {/* Contestant name */}
        <p
          className={cn(
            'font-medium text-center text-gray-900 dark:text-white',
            textSizeClasses[size],
            draftStatus === 'eliminated' && 'line-through text-gray-500 dark:text-gray-400'
          )}
        >
          {contestant.name}
        </p>

        {/* Status badge */}
        <StatusBadge
          draftStatus={draftStatus}
          draftedByName={draftedByName}
          contestantStatus={contestant.status}
          size={size}
        />
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  draftStatus: ContestantStatus;
  draftedByName?: string;
  contestantStatus: ContestantData['status'];
  size: 'sm' | 'md' | 'lg';
}

function StatusBadge({
  draftStatus,
  draftedByName,
  contestantStatus,
  size,
}: StatusBadgeProps) {
  const badgeSizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  if (draftStatus === 'drafted' && draftedByName) {
    return (
      <span
        className={cn(
          'rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-medium truncate max-w-full',
          badgeSizeClasses[size]
        )}
      >
        {draftedByName}
      </span>
    );
  }

  if (contestantStatus === 'eliminated') {
    return (
      <span
        className={cn(
          'rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 font-medium',
          badgeSizeClasses[size]
        )}
      >
        Eliminated
      </span>
    );
  }

  if (contestantStatus === 'winner') {
    return (
      <span
        className={cn(
          'rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 font-medium',
          badgeSizeClasses[size]
        )}
      >
        Winner
      </span>
    );
  }

  if (draftStatus === 'available') {
    return (
      <span
        className={cn(
          'rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium',
          badgeSizeClasses[size]
        )}
      >
        Available
      </span>
    );
  }

  return null;
}

function getAriaLabel(
  contestant: ContestantData,
  draftStatus: ContestantStatus,
  draftedByName?: string,
  canDraft?: boolean
): string {
  let label = contestant.name;

  if (contestant.status === 'eliminated') {
    label += ', eliminated from the show';
  } else if (contestant.status === 'winner') {
    label += ', winner of the show';
  }

  if (draftStatus === 'drafted' && draftedByName) {
    label += `, drafted by ${draftedByName}`;
  } else if (draftStatus === 'available' && canDraft) {
    label += ', available. Click to draft';
  } else if (draftStatus === 'available') {
    label += ', available';
  }

  return label;
}

export default ContestantCard;
