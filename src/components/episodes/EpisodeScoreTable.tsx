'use client';

import { ContestantScoreRow } from './ContestantScoreRow';
import type { ScoringCategory } from '@/constants';
import type { ContestantStatus } from '@/types/firebase';

/**
 * Contestant score data structure
 */
export interface ContestantScoreData {
  contestantId: string;
  contestantName: string;
  contestantImage: string | null;
  contestantStatus: ContestantStatus;
  total: number;
  breakdown: Partial<Record<ScoringCategory, number>>;
  draftedByUid: string | null;
  draftedByName: string | null;
}

export interface EpisodeScoreTableProps {
  /** Array of contestant scores */
  contestantScores: ContestantScoreData[];
  /** Current user's UID for highlighting their contestants */
  currentUserUid: string;
  /** Scoring categories configuration */
  scoringCategories: Record<ScoringCategory, number>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EpisodeScoreTable - Table showing all contestant scores for an episode
 * Columns: Rank, Contestant, Categories earned, Total, Drafted by
 * Visual indicators for scoring categories
 */
export function EpisodeScoreTable({
  contestantScores,
  currentUserUid,
  className,
}: EpisodeScoreTableProps) {
  // Separate contestants with scores and without
  const scoredContestants = contestantScores.filter((cs) => cs.total !== 0);
  const unscoredContestants = contestantScores.filter((cs) => cs.total === 0);

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-16">
                #
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contestant
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Categories
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right w-24">
                Total
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
                Drafted By
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {/* Scored contestants */}
            {scoredContestants.map((cs, index) => (
              <ContestantScoreRow
                key={cs.contestantId}
                contestantName={cs.contestantName}
                contestantImage={cs.contestantImage}
                contestantStatus={cs.contestantStatus}
                total={cs.total}
                breakdown={cs.breakdown}
                draftedByName={cs.draftedByName}
                draftedByUid={cs.draftedByUid}
                currentUserUid={currentUserUid}
                rank={index + 1}
              />
            ))}

            {/* Separator if there are both scored and unscored contestants */}
            {scoredContestants.length > 0 && unscoredContestants.length > 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-center"
                >
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Contestants with no points this episode
                  </span>
                </td>
              </tr>
            )}

            {/* Unscored contestants */}
            {unscoredContestants.map((cs, index) => (
              <ContestantScoreRow
                key={cs.contestantId}
                contestantName={cs.contestantName}
                contestantImage={cs.contestantImage}
                contestantStatus={cs.contestantStatus}
                total={cs.total}
                breakdown={cs.breakdown}
                draftedByName={cs.draftedByName}
                draftedByUid={cs.draftedByUid}
                currentUserUid={currentUserUid}
                rank={scoredContestants.length + index + 1}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total Contestants:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {contestantScores.length}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Scored:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {scoredContestants.length}
              </span>
            </div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Total Points:</span>
            <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
              {contestantScores.reduce((sum, cs) => sum + cs.total, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Category Legend:</p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Survived
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            Correct Vote
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            Won Challenge
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
            Shield
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
            Traitor Bonus
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            Caught Traitor
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Negative Points
          </span>
        </div>
      </div>
    </div>
  );
}

export default EpisodeScoreTable;
