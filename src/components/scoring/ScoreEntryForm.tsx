'use client';

import { useState, useCallback, useMemo, FormEvent } from 'react';
import { SCORING_CATEGORIES, type ScoringCategory } from '@/constants';
import { cn } from '@/lib/utils/cn';
import type { SerializedContestant } from './EpisodeList';

export interface ScoreEntryFormProps {
  /** Episode number for context */
  episodeNumber: number;
  /** List of contestants */
  contestants: SerializedContestant[];
  /** Existing scores to edit (optional) */
  existingScores?: Record<string, number>;
  /** Callback when scores are submitted */
  onSubmit: (scores: Record<string, number>) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
}

/**
 * Format scoring category key for display
 */
function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Type for contestant score tracking
 */
interface ContestantScoreState {
  categories: Record<ScoringCategory, boolean>;
  customScore: number;
}

/**
 * ScoreEntryForm - Main scoring interface for entering contestant scores
 * Shows all contestants with scoring categories from SCORING_CATEGORIES
 */
export function ScoreEntryForm({
  episodeNumber,
  contestants,
  existingScores = {},
  onSubmit,
  onCancel,
}: ScoreEntryFormProps) {
  // Initialize scores state from existing scores or empty
  const initializeScores = useCallback((): Record<string, ContestantScoreState> => {
    const scores: Record<string, ContestantScoreState> = {};

    contestants.forEach((contestant) => {
      const existingTotal = existingScores[contestant.id] || 0;
      const categories: Record<ScoringCategory, boolean> = {} as Record<ScoringCategory, boolean>;

      // Initialize all categories as false
      Object.keys(SCORING_CATEGORIES).forEach((key) => {
        categories[key as ScoringCategory] = false;
      });

      scores[contestant.id] = {
        categories,
        customScore: existingTotal, // Start with existing score as custom
      };
    });

    return scores;
  }, [contestants, existingScores]);

  const [scores, setScores] = useState<Record<string, ContestantScoreState>>(initializeScores);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedContestant, setExpandedContestant] = useState<string | null>(null);

  /**
   * Calculate total score for a contestant
   */
  const calculateTotal = useCallback((contestantId: string): number => {
    const state = scores[contestantId];
    if (!state) return 0;

    // Sum up checked categories
    let categoryTotal = 0;
    Object.entries(state.categories).forEach(([key, checked]) => {
      if (checked) {
        categoryTotal += SCORING_CATEGORIES[key as ScoringCategory];
      }
    });

    // If no categories are checked, use custom score
    const hasCheckedCategories = Object.values(state.categories).some((v) => v);
    return hasCheckedCategories ? categoryTotal : state.customScore;
  }, [scores]);

  /**
   * Handle category checkbox change
   */
  const handleCategoryChange = useCallback(
    (contestantId: string, category: ScoringCategory, checked: boolean) => {
      setScores((prev) => ({
        ...prev,
        [contestantId]: {
          ...prev[contestantId],
          categories: {
            ...prev[contestantId].categories,
            [category]: checked,
          },
        },
      }));
    },
    []
  );

  /**
   * Handle custom score change
   */
  const handleCustomScoreChange = useCallback(
    (contestantId: string, value: number) => {
      setScores((prev) => ({
        ...prev,
        [contestantId]: {
          ...prev[contestantId],
          customScore: value,
        },
      }));
    },
    []
  );

  /**
   * Toggle contestant expansion
   */
  const toggleContestant = useCallback((contestantId: string) => {
    setExpandedContestant((prev) => (prev === contestantId ? null : contestantId));
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      try {
        setIsSubmitting(true);
        setError(null);

        // Build final scores object
        const finalScores: Record<string, number> = {};
        contestants.forEach((contestant) => {
          const total = calculateTotal(contestant.id);
          if (total !== 0) {
            finalScores[contestant.id] = total;
          }
        });

        await onSubmit(finalScores);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save scores');
      } finally {
        setIsSubmitting(false);
      }
    },
    [contestants, calculateTotal, onSubmit]
  );

  /**
   * Get total points being awarded
   */
  const totalPointsAwarded = useMemo(() => {
    return contestants.reduce((sum, contestant) => {
      return sum + calculateTotal(contestant.id);
    }, 0);
  }, [contestants, calculateTotal]);

  /**
   * Filter contestants by status for better organization
   */
  const activeContestants = useMemo(
    () => contestants.filter((c) => c.status === 'active'),
    [contestants]
  );

  const eliminatedContestants = useMemo(
    () => contestants.filter((c) => c.status === 'eliminated'),
    [contestants]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">
              Episode {episodeNumber} Scoring
            </h3>
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
              {activeContestants.length} active contestants
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-purple-600 dark:text-purple-400">Total Points</p>
            <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
              {totalPointsAwarded}
            </p>
          </div>
        </div>
      </div>

      {/* Active Contestants */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Active Contestants ({activeContestants.length})
        </h3>

        <div className="space-y-2">
          {activeContestants.map((contestant) => {
            const isExpanded = expandedContestant === contestant.id;
            const total = calculateTotal(contestant.id);
            const state = scores[contestant.id];
            const hasCheckedCategories = state && Object.values(state.categories).some((v) => v);

            return (
              <div
                key={contestant.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Contestant header */}
                <button
                  type="button"
                  onClick={() => toggleContestant(contestant.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                      {contestant.imageUrl ? (
                        <img
                          src={contestant.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {contestant.name}
                      </p>
                      {contestant.role && contestant.role !== 'unknown' && (
                        <span
                          className={cn(
                            'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                            contestant.role === 'traitor'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          )}
                        >
                          {contestant.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium',
                        total > 0
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : total < 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      )}
                    >
                      {total > 0 ? '+' : ''}
                      {total} pts
                    </div>

                    <svg
                      className={cn(
                        'w-5 h-5 text-gray-400 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded scoring section */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                    {/* Scoring categories */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Scoring Categories
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(SCORING_CATEGORIES).map(([key, points]) => {
                          const category = key as ScoringCategory;
                          const isChecked = state?.categories[category] || false;

                          return (
                            <label
                              key={key}
                              className={cn(
                                'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                                isChecked
                                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) =>
                                    handleCategoryChange(contestant.id, category, e.target.checked)
                                  }
                                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {formatCategoryLabel(key)}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  'text-sm font-medium',
                                  points > 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                )}
                              >
                                {points > 0 ? '+' : ''}
                                {points}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom score override */}
                    {!hasCheckedCategories && (
                      <div>
                        <label
                          htmlFor={`custom-${contestant.id}`}
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Manual Score Override
                        </label>
                        <input
                          type="number"
                          id={`custom-${contestant.id}`}
                          value={state?.customScore || 0}
                          onChange={(e) =>
                            handleCustomScoreChange(
                              contestant.id,
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                   focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Use this when categories do not apply. Disabled when categories are selected.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Eliminated Contestants (collapsed by default) */}
      {eliminatedContestants.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Eliminated Contestants ({eliminatedContestants.length})
          </h3>

          <div className="space-y-2 opacity-60">
            {eliminatedContestants.map((contestant) => {
              const total = calculateTotal(contestant.id);

              return (
                <div
                  key={contestant.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 relative">
                      {contestant.imageUrl ? (
                        <img
                          src={contestant.imageUrl}
                          alt=""
                          className="w-full h-full object-cover grayscale"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    </div>

                    <p className="font-medium text-gray-500 dark:text-gray-400 line-through">
                      {contestant.name}
                    </p>
                  </div>

                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Eliminated Ep. {contestant.eliminatedEpisode || '?'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                     bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                     rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white
                     bg-purple-600 border border-transparent rounded-lg
                     hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
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
              Saving Scores...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Scores
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default ScoreEntryForm;
