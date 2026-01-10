'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import type { ScoringCategory } from '@/constants';

export type ContestantStatus = 'active' | 'eliminated' | 'winner' | 'traitor_revealed';

export interface EpisodeScoreDetail {
  episodeId: string;
  episodeNumber: number;
  airDate: string;
  totalScore: number;
  breakdown: Partial<Record<ScoringCategory, number>>;
}

export interface ContestantPerformanceProps {
  /** Contestant ID */
  contestantId: string;
  /** Contestant name */
  name: string;
  /** Contestant image URL */
  imageUrl?: string;
  /** Current status */
  status: ContestantStatus;
  /** Role if known */
  role?: 'faithful' | 'traitor' | 'unknown';
  /** Total points earned */
  totalScore: number;
  /** Episode when eliminated (if applicable) */
  eliminatedEpisode?: number;
  /** Detailed episode scores */
  episodeScores: EpisodeScoreDetail[];
  /** Draft info */
  draftRound: number;
  draftPick: number;
  /** Callback to close the modal/view */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Category display names
 */
const CATEGORY_LABELS: Record<ScoringCategory, string> = {
  SURVIVED_EPISODE: 'Survived Episode',
  WON_SEASON: 'Won Season',
  CORRECT_VOTE: 'Correct Vote',
  RECEIVED_VOTES: 'Received Votes',
  TRAITOR_SURVIVED_ROUND: 'Traitor Survived',
  TRAITOR_SUCCESSFUL_MURDER: 'Successful Murder',
  FAITHFUL_CAUGHT_TRAITOR: 'Caught Traitor',
  WON_CHALLENGE: 'Won Challenge',
  SHIELD_EARNED: 'Shield Earned',
  FAN_FAVORITE: 'Fan Favorite',
  STRATEGIC_PLAY: 'Strategic Play',
};

/**
 * Get status badge configuration
 */
function getStatusConfig(status: ContestantStatus) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        bgClass: 'bg-green-100 dark:bg-green-900/40',
        textClass: 'text-green-800 dark:text-green-300',
      };
    case 'eliminated':
      return {
        label: 'Eliminated',
        bgClass: 'bg-red-100 dark:bg-red-900/40',
        textClass: 'text-red-800 dark:text-red-300',
      };
    case 'winner':
      return {
        label: 'Winner',
        bgClass: 'bg-yellow-100 dark:bg-yellow-900/40',
        textClass: 'text-yellow-800 dark:text-yellow-300',
      };
    case 'traitor_revealed':
      return {
        label: 'Traitor Revealed',
        bgClass: 'bg-purple-100 dark:bg-purple-900/40',
        textClass: 'text-purple-800 dark:text-purple-300',
      };
    default:
      return {
        label: 'Unknown',
        bgClass: 'bg-gray-100 dark:bg-gray-700',
        textClass: 'text-gray-800 dark:text-gray-300',
      };
  }
}

/**
 * ContestantPerformance - Detailed performance view for a contestant
 * Shows episode-by-episode scores with category breakdowns
 */
export function ContestantPerformance({
  contestantId,
  name,
  imageUrl,
  status,
  role,
  totalScore,
  eliminatedEpisode,
  episodeScores,
  draftRound,
  draftPick,
  onClose,
  className,
}: ContestantPerformanceProps) {
  const statusConfig = getStatusConfig(status);
  const isEliminated = status === 'eliminated' || status === 'traitor_revealed';

  /**
   * Get all unique categories used across episodes
   */
  const usedCategories = useMemo(() => {
    const categories = new Set<ScoringCategory>();
    episodeScores.forEach((episode) => {
      Object.keys(episode.breakdown).forEach((cat) => {
        categories.add(cat as ScoringCategory);
      });
    });
    return Array.from(categories);
  }, [episodeScores]);

  /**
   * Calculate category totals
   */
  const categoryTotals = useMemo(() => {
    const totals: Partial<Record<ScoringCategory, number>> = {};
    episodeScores.forEach((episode) => {
      Object.entries(episode.breakdown).forEach(([cat, score]) => {
        const category = cat as ScoringCategory;
        totals[category] = (totals[category] || 0) + (score || 0);
      });
    });
    return totals;
  }, [episodeScores]);

  /**
   * Calculate best and worst episodes
   */
  const episodeStats = useMemo(() => {
    if (episodeScores.length === 0) return null;

    const sorted = [...episodeScores].sort((a, b) => b.totalScore - a.totalScore);
    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      average: Math.round((totalScore / episodeScores.length) * 10) / 10,
    };
  }, [episodeScores, totalScore]);

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden max-h-[90vh] flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div
                className={cn(
                  'w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700',
                  isEliminated && 'grayscale'
                )}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>
              {status === 'winner' && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-2 shadow-md">
                  <svg className="w-4 h-4 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <h2
                className={cn(
                  'text-xl font-bold',
                  isEliminated
                    ? 'text-gray-500 dark:text-gray-400 line-through'
                    : 'text-gray-900 dark:text-white'
                )}
              >
                {name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    statusConfig.bgClass,
                    statusConfig.textClass
                  )}
                >
                  {statusConfig.label}
                </span>
                {role && role !== 'unknown' && (
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      role === 'traitor'
                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300'
                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                    )}
                  >
                    {role === 'traitor' ? 'Traitor' : 'Faithful'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Drafted Round {draftRound}, Pick #{draftPick}
                {eliminatedEpisode && ` | Eliminated Ep ${eliminatedEpisode}`}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p
              className={cn(
                'text-3xl font-bold',
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
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {episodeScores.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Episodes</p>
          </div>

          {episodeStats && (
            <>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  +{episodeStats.best.totalScore}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Best (Ep {episodeStats.best.episodeNumber})</p>
              </div>

              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {episodeStats.average}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg/Episode</p>
              </div>
            </>
          )}
        </div>

        {/* Category Breakdown */}
        {usedCategories.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Category Breakdown
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {usedCategories.map((category) => {
                  const total = categoryTotals[category] || 0;
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {CATEGORY_LABELS[category] || category}
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          total > 0
                            ? 'text-green-600 dark:text-green-400'
                            : total < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        )}
                      >
                        {total > 0 ? '+' : ''}
                        {total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Episode-by-Episode Breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Episode-by-Episode Performance
          </h3>

          {episodeScores.length > 0 ? (
            <div className="space-y-3">
              {episodeScores.map((episode) => (
                <div
                  key={episode.episodeId}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        Episode {episode.episodeNumber}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {formatDate(episode.airDate)}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-lg font-bold',
                        episode.totalScore > 0
                          ? 'text-green-600 dark:text-green-400'
                          : episode.totalScore < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      )}
                    >
                      {episode.totalScore > 0 ? '+' : ''}
                      {episode.totalScore}
                    </span>
                  </div>

                  {/* Breakdown */}
                  {Object.keys(episode.breakdown).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(episode.breakdown).map(([cat, score]) => {
                        if (!score) return null;
                        return (
                          <span
                            key={cat}
                            className={cn(
                              'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                              score > 0
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            )}
                          >
                            {CATEGORY_LABELS[cat as ScoringCategory] || cat}: {score > 0 ? '+' : ''}
                            {score}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
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
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                No episode scores recorded yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContestantPerformance;
