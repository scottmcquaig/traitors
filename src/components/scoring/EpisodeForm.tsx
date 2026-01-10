'use client';

import { useState, useCallback, FormEvent } from 'react';
import type { SerializedEpisode } from './EpisodeList';

export interface EpisodeFormProps {
  /** Existing episode data for editing (optional) */
  episode?: SerializedEpisode;
  /** Next episode number for new episodes */
  nextEpisodeNumber?: number;
  /** Callback when form is submitted */
  onSubmit: (data: { episodeNumber: number; notes: string; airDate: string }) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
}

/**
 * EpisodeForm - Form component for creating/editing episodes
 * Fields: episodeNumber, notes, airDate
 */
export function EpisodeForm({
  episode,
  nextEpisodeNumber = 1,
  onSubmit,
  onCancel,
}: EpisodeFormProps) {
  const isEditing = !!episode;

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString?: string): string => {
    if (!dateString) {
      return new Date().toISOString().split('T')[0];
    }
    return new Date(dateString).toISOString().split('T')[0];
  };

  const [episodeNumber, setEpisodeNumber] = useState<number>(
    episode?.episodeNumber ?? nextEpisodeNumber
  );
  const [notes, setNotes] = useState<string>(episode?.notes ?? '');
  const [airDate, setAirDate] = useState<string>(formatDateForInput(episode?.airDate));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate
      if (episodeNumber < 1) {
        setError('Episode number must be at least 1');
        return;
      }

      if (!airDate) {
        setError('Air date is required');
        return;
      }

      try {
        setIsSubmitting(true);
        setError(null);

        await onSubmit({
          episodeNumber,
          notes: notes.trim(),
          airDate: new Date(airDate).toISOString(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save episode');
      } finally {
        setIsSubmitting(false);
      }
    },
    [episodeNumber, notes, airDate, onSubmit]
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

      {/* Episode Number */}
      <div>
        <label
          htmlFor="episodeNumber"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Episode Number
        </label>
        <input
          type="number"
          id="episodeNumber"
          min={1}
          value={episodeNumber}
          onChange={(e) => setEpisodeNumber(parseInt(e.target.value, 10) || 1)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The sequential number of this episode in the season.
        </p>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Episode Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter episode notes..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder:text-gray-400 dark:placeholder:text-gray-500
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Optional notes or description for the episode.
        </p>
      </div>

      {/* Air Date */}
      <div>
        <label
          htmlFor="airDate"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Air Date
        </label>
        <input
          type="date"
          id="airDate"
          value={airDate}
          onChange={(e) => setAirDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The date this episode aired or will air.
        </p>
      </div>

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
              <svg
                className="w-4 h-4 mr-2 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
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
              Saving...
            </>
          ) : isEditing ? (
            'Update Episode'
          ) : (
            'Create Episode'
          )}
        </button>
      </div>
    </form>
  );
}

export default EpisodeForm;
