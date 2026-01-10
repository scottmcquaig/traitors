'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ContestantScore {
  contestantId: string;
  contestantName: string;
  totalScore: number;
  status: 'active' | 'eliminated' | 'winner' | 'traitor_revealed';
}

export interface RosterSummaryProps {
  /** Total score across all contestants */
  totalScore: number;
  /** Array of contestant scores */
  contestantScores: ContestantScore[];
  /** Player's display name */
  playerName: string;
  /** Whether this is the current user's roster */
  isOwnRoster: boolean;
  /** Number of episodes scored */
  episodeCount: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * RosterSummary - Display summary stats for a player's roster
 * Shows total score, active/eliminated count, and best performer
 */
export function RosterSummary({
  totalScore,
  contestantScores,
  playerName,
  isOwnRoster,
  episodeCount,
  className,
}: RosterSummaryProps) {
  /**
   * Calculate active vs eliminated count
   */
  const statusCounts = useMemo(() => {
    const active = contestantScores.filter(
      (c) => c.status === 'active' || c.status === 'winner'
    ).length;
    const eliminated = contestantScores.filter(
      (c) => c.status === 'eliminated' || c.status === 'traitor_revealed'
    ).length;
    return { active, eliminated };
  }, [contestantScores]);

  /**
   * Find best performing contestant
   */
  const bestPerformer = useMemo(() => {
    if (contestantScores.length === 0) return null;
    return contestantScores.reduce((best, current) =>
      current.totalScore > best.totalScore ? current : best
    );
  }, [contestantScores]);

  /**
   * Calculate average score per episode
   */
  const averagePerEpisode = useMemo(() => {
    if (episodeCount === 0) return 0;
    return Math.round((totalScore / episodeCount) * 10) / 10;
  }, [totalScore, episodeCount]);

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isOwnRoster ? 'Your Roster' : `${playerName}'s Roster`}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {contestantScores.length} contestant{contestantScores.length !== 1 ? 's' : ''} drafted
            </p>
          </div>
          {/* Total Score Badge */}
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Score</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {totalScore}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
        {/* Active Contestants */}
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full mb-2">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {statusCounts.active}
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">Active</p>
        </div>

        {/* Eliminated Contestants */}
        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full mb-2">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400"
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
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
            {statusCounts.eliminated}
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">Eliminated</p>
        </div>

        {/* Episodes Scored */}
        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-full mb-2">
            <svg
              className="w-5 h-5 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {episodeCount}
          </p>
          <p className="text-sm text-purple-600 dark:text-purple-400">Episodes</p>
        </div>

        {/* Avg Per Episode */}
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full mb-2">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {averagePerEpisode}
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400">Avg/Episode</p>
        </div>
      </div>

      {/* Best Performer */}
      {bestPerformer && bestPerformer.totalScore > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Best Performer
                </p>
                <p className="text-lg font-bold text-yellow-900 dark:text-yellow-100 truncate">
                  {bestPerformer.contestantName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  +{bestPerformer.totalScore}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">points</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RosterSummary;
