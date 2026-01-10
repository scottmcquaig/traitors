'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

export type ContestantStatus = 'active' | 'eliminated' | 'winner' | 'traitor_revealed';

export interface EpisodeScore {
  episodeId: string;
  episodeNumber: number;
  score: number;
}

export interface RosterContestantCardProps {
  /** Contestant ID */
  contestantId: string;
  /** Contestant name */
  name: string;
  /** Contestant image URL */
  imageUrl?: string;
  /** Current status of the contestant */
  status: ContestantStatus;
  /** Total points earned across all episodes */
  totalScore: number;
  /** Per-episode score breakdown */
  episodeScores: EpisodeScore[];
  /** Draft round number */
  draftRound: number;
  /** Overall pick number */
  draftPick: number;
  /** Callback when clicked to show detailed performance */
  onShowDetails?: (contestantId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get status badge configuration
 */
function getStatusBadge(status: ContestantStatus) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        bgClass: 'bg-green-100 dark:bg-green-900/40',
        textClass: 'text-green-800 dark:text-green-300',
        dotClass: 'bg-green-500',
      };
    case 'eliminated':
      return {
        label: 'Eliminated',
        bgClass: 'bg-red-100 dark:bg-red-900/40',
        textClass: 'text-red-800 dark:text-red-300',
        dotClass: 'bg-red-500',
      };
    case 'winner':
      return {
        label: 'Winner',
        bgClass: 'bg-yellow-100 dark:bg-yellow-900/40',
        textClass: 'text-yellow-800 dark:text-yellow-300',
        dotClass: 'bg-yellow-500',
      };
    case 'traitor_revealed':
      return {
        label: 'Revealed',
        bgClass: 'bg-purple-100 dark:bg-purple-900/40',
        textClass: 'text-purple-800 dark:text-purple-300',
        dotClass: 'bg-purple-500',
      };
    default:
      return {
        label: 'Unknown',
        bgClass: 'bg-gray-100 dark:bg-gray-700',
        textClass: 'text-gray-800 dark:text-gray-300',
        dotClass: 'bg-gray-500',
      };
  }
}

/**
 * RosterContestantCard - Display a drafted contestant with their score details
 * Shows contestant info, status, total score, and per-episode mini chart
 */
export function RosterContestantCard({
  contestantId,
  name,
  imageUrl,
  status,
  totalScore,
  episodeScores,
  draftRound,
  draftPick,
  onShowDetails,
  className,
}: RosterContestantCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusBadge = getStatusBadge(status);

  const isEliminated = status === 'eliminated' || status === 'traitor_revealed';

  /**
   * Calculate max score for chart scaling
   */
  const maxScore = Math.max(...episodeScores.map((e) => Math.abs(e.score)), 1);

  /**
   * Handle card click
   */
  const handleClick = () => {
    if (onShowDetails) {
      onShowDetails(contestantId);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border overflow-hidden transition-all duration-200',
        isEliminated
          ? 'border-gray-300 dark:border-gray-600 opacity-75'
          : 'border-gray-200 dark:border-gray-700',
        'hover:shadow-md dark:hover:shadow-gray-900/30',
        className
      )}
    >
      {/* Main Card Content */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  'w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700',
                  isEliminated && 'grayscale'
                )}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Eliminated overlay */}
              {isEliminated && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
              {status === 'winner' && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1.5 shadow-md">
                  <svg
                    className="w-4 h-4 text-yellow-900"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3
                    className={cn(
                      'font-semibold text-lg',
                      isEliminated
                        ? 'text-gray-500 dark:text-gray-400 line-through'
                        : 'text-gray-900 dark:text-white'
                    )}
                  >
                    {name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Round {draftRound}, Pick #{draftPick}
                  </p>
                </div>

                {/* Total Score */}
                <div className="text-right flex-shrink-0">
                  <p
                    className={cn(
                      'text-2xl font-bold',
                      totalScore > 0
                        ? 'text-green-600 dark:text-green-400'
                        : totalScore < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {totalScore > 0 ? '+' : ''}
                    {totalScore}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                    statusBadge.bgClass,
                    statusBadge.textClass
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', statusBadge.dotClass)} />
                  {statusBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Mini Episode Chart */}
          {episodeScores.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Episode Scores
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                >
                  {isExpanded ? 'Hide details' : 'Show details'}
                </button>
              </div>

              {/* Mini bar chart */}
              <div className="flex items-end gap-1 h-8">
                {episodeScores.map((episode) => {
                  const height = Math.max(
                    Math.abs(episode.score) / maxScore * 100,
                    10
                  );
                  const isPositive = episode.score >= 0;

                  return (
                    <div
                      key={episode.episodeId}
                      className="flex-1 relative group"
                      title={`Ep ${episode.episodeNumber}: ${episode.score > 0 ? '+' : ''}${episode.score}`}
                    >
                      <div
                        className={cn(
                          'w-full rounded-t transition-colors',
                          isPositive
                            ? 'bg-green-400 dark:bg-green-500 group-hover:bg-green-500 dark:group-hover:bg-green-400'
                            : 'bg-red-400 dark:bg-red-500 group-hover:bg-red-500 dark:group-hover:bg-red-400'
                        )}
                        style={{ height: `${height}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        Ep {episode.episodeNumber}: {episode.score > 0 ? '+' : ''}{episode.score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && episodeScores.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Episode Breakdown
          </h4>
          <div className="space-y-2">
            {episodeScores.map((episode) => (
              <div
                key={episode.episodeId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-600 dark:text-gray-400">
                  Episode {episode.episodeNumber}
                </span>
                <span
                  className={cn(
                    'font-medium',
                    episode.score > 0
                      ? 'text-green-600 dark:text-green-400'
                      : episode.score < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  {episode.score > 0 ? '+' : ''}
                  {episode.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No episodes message */}
      {episodeScores.length === 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center italic">
            No episode scores yet
          </p>
        </div>
      )}
    </div>
  );
}

export default RosterContestantCard;
