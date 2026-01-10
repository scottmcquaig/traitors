'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';

export type ViewMode = 'cumulative' | 'episode';

export interface StandingsHeaderProps {
  /** League name */
  leagueName: string;
  /** Season identifier */
  season?: string;
  /** Number of episodes scored */
  episodeCount: number;
  /** When the leaderboard was last updated */
  lastUpdated: string;
  /** Currently selected view mode */
  viewMode: ViewMode;
  /** Callback when view mode changes */
  onViewModeChange: (mode: ViewMode) => void;
  /** Currently selected episode number (for episode view) */
  selectedEpisode?: number;
  /** Callback when episode selection changes */
  onEpisodeChange?: (episodeNumber: number) => void;
  /** Optional className */
  className?: string;
}

/**
 * Format a date string for display
 */
function formatLastUpdated(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * StandingsHeader - Header component for standings page
 * Shows league info, episode count, last updated, and view mode toggle
 */
export function StandingsHeader({
  leagueName,
  season,
  episodeCount,
  lastUpdated,
  viewMode,
  onViewModeChange,
  selectedEpisode,
  onEpisodeChange,
  className,
}: StandingsHeaderProps) {
  const [isEpisodeDropdownOpen, setIsEpisodeDropdownOpen] = useState(false);

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      onViewModeChange(mode);
      if (mode === 'episode' && !selectedEpisode && episodeCount > 0) {
        onEpisodeChange?.(episodeCount);
      }
    },
    [onViewModeChange, selectedEpisode, episodeCount, onEpisodeChange]
  );

  const handleEpisodeSelect = useCallback(
    (episodeNumber: number) => {
      onEpisodeChange?.(episodeNumber);
      setIsEpisodeDropdownOpen(false);
    },
    [onEpisodeChange]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Standings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {leagueName}
            {season && <span className="text-gray-400 dark:text-gray-500"> - {season}</span>}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            type="button"
            onClick={() => handleViewModeChange('cumulative')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'cumulative'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            Cumulative
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('episode')}
            disabled={episodeCount === 0}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'episode'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
              episodeCount === 0 && 'opacity-50 cursor-not-allowed'
            )}
          >
            Per Episode
          </button>
        </div>
      </div>

      {/* Stats and Episode Selector */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Episode Count */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
          <span>
            {episodeCount} episode{episodeCount !== 1 ? 's' : ''} scored
          </span>
        </div>

        {/* Last Updated */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Updated {formatLastUpdated(lastUpdated)}</span>
        </div>

        {/* Episode Selector (when in episode mode) */}
        {viewMode === 'episode' && episodeCount > 0 && (
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setIsEpisodeDropdownOpen(!isEpisodeDropdownOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Episode {selectedEpisode || episodeCount}
              <svg
                className={cn(
                  'w-4 h-4 transition-transform',
                  isEpisodeDropdownOpen && 'rotate-180'
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
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isEpisodeDropdownOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsEpisodeDropdownOpen(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-64 overflow-y-auto">
                  {Array.from({ length: episodeCount }, (_, i) => i + 1).map((ep) => (
                    <button
                      key={ep}
                      type="button"
                      onClick={() => handleEpisodeSelect(ep)}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                        (selectedEpisode || episodeCount) === ep
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-200'
                      )}
                    >
                      Episode {ep}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* View Mode Description */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {viewMode === 'cumulative' ? (
          <>Showing total scores across all {episodeCount} episode{episodeCount !== 1 ? 's' : ''}.</>
        ) : (
          <>Showing scores for Episode {selectedEpisode || episodeCount} only.</>
        )}
      </p>
    </div>
  );
}

export default StandingsHeader;
