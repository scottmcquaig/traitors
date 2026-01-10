'use client';

import { cn } from '@/lib/utils/cn';

export interface EpisodeCardProps {
  /** Episode number */
  episodeNumber: number;
  /** Air date as ISO string */
  airDate: string;
  /** Optional notes about the episode */
  notes?: string;
  /** Total points distributed in this episode */
  totalPoints: number;
  /** Number of contestants with scores */
  contestantCount: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EpisodeCard - Card component for displaying episode in list view
 * Shows episode number, date, and summary stats
 */
export function EpisodeCard({
  episodeNumber,
  airDate,
  notes,
  totalPoints,
  contestantCount,
  className,
}: EpisodeCardProps) {
  // Format date for display
  const formattedDate = new Date(airDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const hasScores = totalPoints > 0;

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
        'p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
        'cursor-pointer',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Episode number badge */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <span className="text-lg font-bold text-purple-700 dark:text-purple-300">
            {episodeNumber}
          </span>
        </div>

        {/* Episode info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Episode {episodeNumber}
            </h3>
            {hasScores ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Scored
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                Pending
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {formattedDate}
            {notes && <span className="ml-2">- {notes}</span>}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Points</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {totalPoints}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Contestants</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {contestantCount}
            </p>
          </div>

          {/* Arrow indicator */}
          <svg
            className="w-5 h-5 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default EpisodeCard;
