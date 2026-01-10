'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import type { UserPermissions } from '@/lib/permissions';
import { createAdminPermissions } from '@/lib/permissions';
import type { SerializedEpisode, SerializedContestant } from './EpisodeList';

export interface ScoreSummaryProps {
  /** Episode data */
  episode: SerializedEpisode;
  /** List of contestants */
  contestants: SerializedContestant[];
  /** User permissions for controlling edit access (defaults to admin) */
  userPermissions?: UserPermissions;
  /** Callback to edit scores */
  onEdit: () => void;
  /** Callback to close summary */
  onClose: () => void;
}

/**
 * ScoreSummary - Display score breakdown for an episode
 * Shows each contestant's scores sorted by total points.
 * Edit button is only shown for users with edit permission.
 */
export function ScoreSummary({
  episode,
  contestants,
  userPermissions = createAdminPermissions(),
  onEdit,
  onClose,
}: ScoreSummaryProps) {
  // Determine if user can edit based on permissions
  const canEdit = userPermissions.canEdit;
  /**
   * Get contestant data with scores, sorted by score descending
   */
  const scoredContestants = useMemo(() => {
    return contestants
      .map((contestant) => ({
        ...contestant,
        score: episode.scores[contestant.id] || 0,
      }))
      .filter((c) => c.score !== 0) // Only show contestants with scores
      .sort((a, b) => b.score - a.score);
  }, [contestants, episode.scores]);

  /**
   * Calculate total points awarded
   */
  const totalPoints = useMemo(() => {
    return Object.values(episode.scores).reduce((sum, score) => sum + score, 0);
  }, [episode.scores]);

  /**
   * Get top scorer
   */
  const topScorer = scoredContestants[0];

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Episode info */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Air Date</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatDate(episode.airDate)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Total Points Awarded</p>
            <p className="font-medium text-gray-900 dark:text-white">{totalPoints}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Contestants Scored</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {scoredContestants.length}
            </p>
          </div>
          {topScorer && (
            <div>
              <p className="text-gray-500 dark:text-gray-400">Top Scorer</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {topScorer.name} (+{topScorer.score})
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scores breakdown */}
      {scoredContestants.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Score Breakdown
          </h3>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Rank
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Contestant
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {scoredContestants.map((contestant, index) => {
                  const isPositive = contestant.score > 0;
                  const isNegative = contestant.score < 0;
                  const isTopThree = index < 3 && contestant.score > 0;

                  return (
                    <tr
                      key={contestant.id}
                      className={cn(
                        'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                        isTopThree && 'bg-yellow-50/50 dark:bg-yellow-900/10'
                      )}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div
                          className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                            index === 0
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : index === 1
                              ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                              : index === 2
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          )}
                        >
                          {index + 1}
                        </div>
                      </td>

                      {/* Contestant */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                            {contestant.imageUrl ? (
                              <img
                                src={contestant.imageUrl}
                                alt=""
                                className={cn(
                                  'w-full h-full object-cover',
                                  contestant.status === 'eliminated' && 'grayscale'
                                )}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <span
                            className={cn(
                              'font-medium',
                              contestant.status === 'eliminated'
                                ? 'text-gray-400 dark:text-gray-500 line-through'
                                : 'text-gray-900 dark:text-white'
                            )}
                          >
                            {contestant.name}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            contestant.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : contestant.status === 'eliminated'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : contestant.status === 'winner'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          )}
                        >
                          {contestant.status === 'traitor_revealed'
                            ? 'Revealed'
                            : contestant.status.charAt(0).toUpperCase() + contestant.status.slice(1)}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span
                          className={cn(
                            'font-semibold',
                            isPositive && 'text-green-600 dark:text-green-400',
                            isNegative && 'text-red-600 dark:text-red-400',
                            !isPositive && !isNegative && 'text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {isPositive ? '+' : ''}
                          {contestant.score}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No scores recorded
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            No scores have been entered for this episode yet.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                     bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                     rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                     transition-colors"
        >
          Close
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white
                       bg-purple-600 border border-transparent rounded-lg
                       hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                       transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            Edit Scores
          </button>
        )}
      </div>
    </div>
  );
}

export default ScoreSummary;
