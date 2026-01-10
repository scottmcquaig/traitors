'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import type { UserPermissions } from '@/lib/permissions';
import { createAdminPermissions } from '@/lib/permissions';
import { ReadOnlyBanner } from '@/components/guards';
import { EpisodeForm } from './EpisodeForm';
import { ScoreEntryForm } from './ScoreEntryForm';
import { ScoreSummary } from './ScoreSummary';

/**
 * Serialized episode data for client component
 */
export interface SerializedEpisode {
  id: string;
  leagueId: string;
  episodeNumber: number;
  airDate: string;
  notes: string;
  scores: Record<string, number>;
}

/**
 * Serialized contestant data for client component
 */
export interface SerializedContestant {
  id: string;
  leagueId: string;
  name: string;
  status: 'active' | 'eliminated' | 'winner' | 'traitor_revealed';
  imageUrl: string | null;
  role: 'faithful' | 'traitor' | 'unknown' | null;
  eliminatedEpisode: number | null;
}

export interface EpisodeListProps {
  /** League ID */
  leagueId: string;
  /** List of episodes */
  episodes: SerializedEpisode[];
  /** List of contestants */
  contestants: SerializedContestant[];
  /** User permissions for controlling edit access (defaults to admin) */
  userPermissions?: UserPermissions;
}

type ViewMode = 'list' | 'create' | 'edit' | 'scores' | 'summary';

/**
 * EpisodeList - Client component for managing episodes in a league
 * Shows list of episodes with options to add, edit, delete, and manage scores.
 * Edit controls are hidden for users without edit permission.
 */
export function EpisodeList({
  leagueId,
  episodes: initialEpisodes,
  contestants,
  userPermissions = createAdminPermissions(),
}: EpisodeListProps) {
  const [episodes, setEpisodes] = useState<SerializedEpisode[]>(initialEpisodes);

  // Determine if user can edit based on permissions
  const canEdit = userPermissions.canEdit;
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEpisode, setSelectedEpisode] = useState<SerializedEpisode | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle creating a new episode
   */
  const handleCreateEpisode = useCallback(
    async (data: { episodeNumber: number; notes: string; airDate: string }) => {
      try {
        setError(null);
        const response = await fetch(`/api/leagues/${leagueId}/episodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create episode');
        }

        const result = await response.json();
        const newEpisode: SerializedEpisode = {
          id: result.episode.id,
          leagueId: result.episode.leagueId,
          episodeNumber: result.episode.episodeNumber,
          notes: result.episode.notes || '',
          airDate: result.episode.airDate,
          scores: result.episode.scores || {},
        };

        setEpisodes((prev) => [...prev, newEpisode].sort((a, b) => a.episodeNumber - b.episodeNumber));
        setViewMode('list');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create episode');
        throw err;
      }
    },
    [leagueId]
  );

  /**
   * Handle updating an episode
   */
  const handleUpdateEpisode = useCallback(
    async (data: { episodeNumber: number; notes: string; airDate: string }) => {
      if (!selectedEpisode) return;

      try {
        setError(null);
        const response = await fetch(`/api/leagues/${leagueId}/episodes/${selectedEpisode.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update episode');
        }

        const result = await response.json();
        const updatedEpisode: SerializedEpisode = {
          id: result.episode.id,
          leagueId: result.episode.leagueId,
          episodeNumber: result.episode.episodeNumber,
          notes: result.episode.notes || '',
          airDate: result.episode.airDate,
          scores: result.episode.scores || selectedEpisode.scores,
        };

        setEpisodes((prev) =>
          prev
            .map((ep) => (ep.id === updatedEpisode.id ? updatedEpisode : ep))
            .sort((a, b) => a.episodeNumber - b.episodeNumber)
        );
        setViewMode('list');
        setSelectedEpisode(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update episode');
        throw err;
      }
    },
    [leagueId, selectedEpisode]
  );

  /**
   * Handle deleting an episode
   */
  const handleDeleteEpisode = useCallback(
    async (episodeId: string) => {
      if (!confirm('Are you sure you want to delete this episode? This action cannot be undone.')) {
        return;
      }

      try {
        setIsDeleting(episodeId);
        setError(null);

        const response = await fetch(`/api/leagues/${leagueId}/episodes/${episodeId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete episode');
        }

        setEpisodes((prev) => prev.filter((ep) => ep.id !== episodeId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete episode');
      } finally {
        setIsDeleting(null);
      }
    },
    [leagueId]
  );

  /**
   * Handle saving scores for an episode
   * Converts simple score numbers to EpisodeContestantScore format for API
   */
  const handleSaveScores = useCallback(
    async (scores: Record<string, number>) => {
      if (!selectedEpisode) return;

      try {
        setError(null);

        // Convert simple scores to EpisodeContestantScore format for API
        const formattedScores: Record<string, { total: number; breakdown: Record<string, number> }> = {};
        Object.entries(scores).forEach(([contestantId, total]) => {
          formattedScores[contestantId] = {
            total,
            breakdown: {}, // Categories tracked separately if needed
          };
        });

        const response = await fetch(`/api/leagues/${leagueId}/episodes/${selectedEpisode.id}/scores`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ scores: formattedScores }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save scores');
        }

        setEpisodes((prev) =>
          prev.map((ep) => (ep.id === selectedEpisode.id ? { ...ep, scores } : ep))
        );
        setSelectedEpisode((prev) => (prev ? { ...prev, scores } : null));
        setViewMode('summary');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save scores');
        throw err;
      }
    },
    [leagueId, selectedEpisode]
  );

  /**
   * Calculate total scores for an episode
   */
  const getTotalScores = (scores: Record<string, number>): number => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render based on view mode
  if (viewMode === 'create') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Episode</h2>
          <button
            onClick={() => setViewMode('list')}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <EpisodeForm
          nextEpisodeNumber={episodes.length + 1}
          onSubmit={handleCreateEpisode}
          onCancel={() => setViewMode('list')}
        />
      </div>
    );
  }

  if (viewMode === 'edit' && selectedEpisode) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Episode {selectedEpisode.episodeNumber}
          </h2>
          <button
            onClick={() => {
              setViewMode('list');
              setSelectedEpisode(null);
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <EpisodeForm
          episode={selectedEpisode}
          onSubmit={handleUpdateEpisode}
          onCancel={() => {
            setViewMode('list');
            setSelectedEpisode(null);
          }}
        />
      </div>
    );
  }

  if (viewMode === 'scores' && selectedEpisode) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Enter Scores - Episode {selectedEpisode.episodeNumber}
            </h2>
            {selectedEpisode.notes && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedEpisode.notes}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setViewMode('list');
              setSelectedEpisode(null);
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ScoreEntryForm
          episodeNumber={selectedEpisode.episodeNumber}
          contestants={contestants}
          existingScores={selectedEpisode.scores}
          onSubmit={handleSaveScores}
          onCancel={() => {
            setViewMode('list');
            setSelectedEpisode(null);
          }}
        />
      </div>
    );
  }

  if (viewMode === 'summary' && selectedEpisode) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Score Summary - Episode {selectedEpisode.episodeNumber}
            </h2>
            {selectedEpisode.notes && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedEpisode.notes}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setViewMode('list');
              setSelectedEpisode(null);
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ScoreSummary
          episode={selectedEpisode}
          contestants={contestants}
          userPermissions={userPermissions}
          onEdit={() => setViewMode('scores')}
          onClose={() => {
            setViewMode('list');
            setSelectedEpisode(null);
          }}
        />
      </div>
    );
  }

  // Default list view
  return (
    <div className="space-y-4">
      {/* Read-only banner for non-edit users */}
      <ReadOnlyBanner show={!canEdit} />

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
            <div className="flex-1">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header with Add button (only for users with edit permission) */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Episodes</h2>
        {canEdit && (
          <button
            onClick={() => setViewMode('create')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Episode
          </button>
        )}
      </div>

      {/* Episodes list */}
      {episodes.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {episodes.map((episode) => {
              const totalScore = getTotalScores(episode.scores);
              const hasScores = Object.keys(episode.scores).length > 0;

              return (
                <li
                  key={episode.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center gap-4">
                    {/* Episode number badge */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                        {episode.episodeNumber}
                      </span>
                    </div>

                    {/* Episode info */}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Episode {episode.episodeNumber}
                        {episode.notes && <span className="text-gray-500 dark:text-gray-400"> - {episode.notes}</span>}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(episode.airDate)}
                        {hasScores && (
                          <span className="ml-3">
                            Total Points: <span className="font-medium">{totalScore}</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* View Scores (always visible) / Enter Scores (edit permission only) */}
                    {hasScores ? (
                      <button
                        onClick={() => {
                          setSelectedEpisode(episode);
                          setViewMode('summary');
                        }}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        View Scores
                      </button>
                    ) : canEdit ? (
                      <button
                        onClick={() => {
                          setSelectedEpisode(episode);
                          setViewMode('scores');
                        }}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Enter Scores
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-700">
                        No scores
                      </span>
                    )}

                    {/* Edit Episode - only for users with edit permission */}
                    {canEdit && (
                      <button
                        onClick={() => {
                          setSelectedEpisode(episode);
                          setViewMode('edit');
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Edit episode"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                    )}

                    {/* Delete Episode - only for users with edit permission */}
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteEpisode(episode.id)}
                        disabled={isDeleting === episode.id}
                        className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Delete episode"
                      >
                        {isDeleting === episode.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
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
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No episodes yet
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {canEdit
              ? 'Get started by adding the first episode.'
              : 'No episodes have been added to this league yet.'}
          </p>
          {canEdit && (
            <button
              onClick={() => setViewMode('create')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Episode
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EpisodeList;
