'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  StandingsHeader,
  LeaderboardTable,
  PlayerRankCard,
  type ViewMode,
  type LeaderboardEntry,
} from '@/components/standings';

interface LeaderboardData {
  entries: LeaderboardEntry[];
  episodeCount: number;
  lastUpdated: string;
}

export interface StandingsClientProps {
  /** League ID */
  leagueId: string;
  /** League name */
  leagueName: string;
  /** Season identifier */
  season?: string;
  /** Current user's UID */
  currentUserUid: string;
  /** Initial leaderboard data from server */
  initialData: LeaderboardData;
  /** Initial episode number if viewing specific episode */
  initialEpisode?: number;
}

/**
 * StandingsClient - Client component for interactive standings features
 * Handles view mode switching and episode selection
 */
export function StandingsClient({
  leagueId,
  leagueName,
  season,
  currentUserUid,
  initialData,
  initialEpisode,
}: StandingsClientProps) {
  const router = useRouter();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>(initialEpisode ? 'episode' : 'cumulative');
  const [selectedEpisode, setSelectedEpisode] = useState<number | undefined>(initialEpisode);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch leaderboard data from API using cookie-based auth
   */
  const fetchLeaderboard = useCallback(
    async (episodeNumber?: number) => {
      setIsLoading(true);
      setError(null);

      try {
        let url = `/api/leagues/${leagueId}/leaderboard`;

        if (episodeNumber) {
          url += `?episodeNumber=${episodeNumber}`;
        }

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }

        const data = await response.json();

        setLeaderboardData({
          entries: data.leaderboard.entries,
          episodeCount: data.leaderboard.episodeCount || data.leaderboard.upToEpisodeNumber || initialData.episodeCount,
          lastUpdated: data.leaderboard.lastUpdated,
        });
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load standings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [leagueId, initialData.episodeCount]
  );

  /**
   * Handle view mode change
   */
  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);

      if (mode === 'cumulative') {
        setSelectedEpisode(undefined);
        // Update URL
        router.push(`/dashboard/league/${leagueId}/standings`);
        // Fetch cumulative data
        fetchLeaderboard();
      } else if (mode === 'episode') {
        // Default to latest episode
        const latestEpisode = initialData.episodeCount;
        if (latestEpisode > 0) {
          setSelectedEpisode(latestEpisode);
          router.push(`/dashboard/league/${leagueId}/standings?episode=${latestEpisode}`);
          fetchLeaderboard(latestEpisode);
        }
      }
    },
    [leagueId, router, fetchLeaderboard, initialData.episodeCount]
  );

  /**
   * Handle episode selection change
   */
  const handleEpisodeChange = useCallback(
    (episodeNumber: number) => {
      setSelectedEpisode(episodeNumber);
      router.push(`/dashboard/league/${leagueId}/standings?episode=${episodeNumber}`);
      fetchLeaderboard(episodeNumber);
    },
    [leagueId, router, fetchLeaderboard]
  );

  /**
   * Find current user's entry in leaderboard
   */
  const currentUserEntry = leaderboardData.entries.find(
    (entry) => entry.playerUid === currentUserUid
  );

  /**
   * Get top 3 entries for highlight cards
   */
  const topThree = leaderboardData.entries.filter((entry) => entry.rank <= 3).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <StandingsHeader
        leagueName={leagueName}
        season={season}
        episodeCount={initialData.episodeCount}
        lastUpdated={leaderboardData.lastUpdated}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        selectedEpisode={selectedEpisode}
        onEpisodeChange={handleEpisodeChange}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Content (when not loading) */}
      {!isLoading && !error && (
        <>
          {/* Your Rank Summary (if user has entry) */}
          {currentUserEntry && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Position
              </h2>
              <PlayerRankCard
                rank={currentUserEntry.rank}
                playerName={currentUserEntry.playerName}
                playerUid={currentUserEntry.playerUid}
                totalScore={currentUserEntry.totalScore}
                contestantCount={currentUserEntry.contestantCount}
                isCurrentUser={true}
                leagueId={leagueId}
                className="max-w-md"
              />
            </section>
          )}

          {/* Top 3 Highlight (only in cumulative view with enough entries) */}
          {viewMode === 'cumulative' && topThree.length >= 3 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Players
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Reorder to show 2nd, 1st, 3rd for visual effect */}
                {[topThree[1], topThree[0], topThree[2]].map((entry, index) => {
                  if (!entry) return null;
                  return (
                    <div
                      key={entry.playerUid}
                      className={index === 1 ? 'md:-mt-4' : 'md:mt-4'}
                    >
                      <PlayerRankCard
                        rank={entry.rank}
                        playerName={entry.playerName}
                        playerUid={entry.playerUid}
                        totalScore={entry.totalScore}
                        contestantCount={entry.contestantCount}
                        isCurrentUser={entry.playerUid === currentUserUid}
                        leagueId={leagueId}
                        showBreakdownLink={false}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Full Leaderboard Table */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Full Standings
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {leaderboardData.entries.length} player{leaderboardData.entries.length !== 1 ? 's' : ''}
              </span>
            </div>
            <LeaderboardTable
              entries={leaderboardData.entries}
              currentUserUid={currentUserUid}
              leagueId={leagueId}
              showBreakdownLink={true}
            />
          </section>

          {/* No Data State */}
          {leaderboardData.entries.length === 0 && initialData.episodeCount === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <svg
                className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No episodes scored yet
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Standings will appear once the league admin has scored at least one episode.
                Check back after the first episode airs!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StandingsClient;
