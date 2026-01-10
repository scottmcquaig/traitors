'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  RosterSummary,
  RosterContestantCard,
  ContestantPerformance,
  PlayerSelector,
  type ContestantScore,
  type PlayerOption,
} from '@/components/roster';

interface RosterContestant {
  contestantId: string;
  name: string;
  imageUrl?: string;
  status: 'active' | 'eliminated' | 'winner' | 'traitor_revealed';
  role?: 'faithful' | 'traitor' | 'unknown';
  eliminatedEpisode?: number;
  totalScore: number;
  episodeScores: Array<{
    episodeId: string;
    episodeNumber: number;
    score: number;
  }>;
  draftRound: number;
  draftPick: number;
}

interface SerializedEpisode {
  id: string;
  episodeNumber: number;
  airDate: string;
}

export interface RosterPageClientProps {
  leagueId: string;
  currentPlayerUid: string;
  playerName: string;
  isOwnRoster: boolean;
  totalScore: number;
  contestantScores: ContestantScore[];
  rosterData: RosterContestant[];
  episodeCount: number;
  episodes: SerializedEpisode[];
  players: PlayerOption[];
}

/**
 * Client component for roster page interactivity
 * Handles player selection and contestant detail modals
 */
export function RosterPageClient({
  leagueId,
  currentPlayerUid,
  playerName,
  isOwnRoster,
  totalScore,
  contestantScores,
  rosterData,
  episodeCount,
  episodes,
  players,
}: RosterPageClientProps) {
  const router = useRouter();
  const [selectedContestant, setSelectedContestant] = useState<RosterContestant | null>(null);

  /**
   * Handle player selection from dropdown
   */
  const handleSelectPlayer = useCallback(
    (playerUid: string) => {
      if (playerUid === currentPlayerUid && isOwnRoster) {
        // Already viewing own roster, do nothing
        return;
      }

      // Navigate to the selected player's roster page
      const player = players.find((p) => p.uid === playerUid);
      if (player?.isCurrentUser) {
        router.push(`/dashboard/league/${leagueId}/roster`);
      } else {
        router.push(`/dashboard/league/${leagueId}/roster/${playerUid}`);
      }
    },
    [currentPlayerUid, isOwnRoster, leagueId, players, router]
  );

  /**
   * Handle showing contestant details
   */
  const handleShowDetails = useCallback(
    (contestantId: string) => {
      const contestant = rosterData.find((r) => r.contestantId === contestantId);
      if (contestant) {
        setSelectedContestant(contestant);
      }
    },
    [rosterData]
  );

  /**
   * Handle closing contestant details modal
   */
  const handleCloseDetails = useCallback(() => {
    setSelectedContestant(null);
  }, []);

  /**
   * Get episode score details for the performance modal
   */
  const getEpisodeScoreDetails = useCallback(
    (contestant: RosterContestant) => {
      return contestant.episodeScores.map((score) => {
        const episode = episodes.find((e) => e.id === score.episodeId);
        return {
          episodeId: score.episodeId,
          episodeNumber: score.episodeNumber,
          airDate: episode?.airDate || new Date().toISOString(),
          totalScore: score.score,
          breakdown: {}, // We don't have category breakdown in current data
        };
      });
    },
    [episodes]
  );

  return (
    <>
      {/* Player Selector */}
      <div className="mb-6">
        <PlayerSelector
          players={players}
          selectedPlayerUid={currentPlayerUid}
          onSelectPlayer={handleSelectPlayer}
          label="View Player's Roster"
          className="max-w-md"
        />
      </div>

      {/* Roster Summary */}
      <RosterSummary
        totalScore={totalScore}
        contestantScores={contestantScores}
        playerName={playerName}
        isOwnRoster={isOwnRoster}
        episodeCount={episodeCount}
        className="mb-8"
      />

      {/* Roster Grid */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Drafted Contestants
        </h2>

        {rosterData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rosterData.map((contestant) => (
              <RosterContestantCard
                key={contestant.contestantId}
                contestantId={contestant.contestantId}
                name={contestant.name}
                imageUrl={contestant.imageUrl}
                status={contestant.status}
                totalScore={contestant.totalScore}
                episodeScores={contestant.episodeScores}
                draftRound={contestant.draftRound}
                draftPick={contestant.draftPick}
                onShowDetails={handleShowDetails}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg
              className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No contestants drafted
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {isOwnRoster
                ? "You haven't drafted any contestants yet."
                : "This player hasn't drafted any contestants yet."}
            </p>
          </div>
        )}
      </section>

      {/* Contestant Detail Modal */}
      {selectedContestant && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={handleCloseDetails}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl">
              <ContestantPerformance
                contestantId={selectedContestant.contestantId}
                name={selectedContestant.name}
                imageUrl={selectedContestant.imageUrl}
                status={selectedContestant.status}
                role={selectedContestant.role}
                totalScore={selectedContestant.totalScore}
                eliminatedEpisode={selectedContestant.eliminatedEpisode}
                episodeScores={getEpisodeScoreDetails(selectedContestant)}
                draftRound={selectedContestant.draftRound}
                draftPick={selectedContestant.draftPick}
                onClose={handleCloseDetails}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RosterPageClient;
