'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

export interface PlayerOption {
  /** Player's UID */
  uid: string;
  /** Player's display name */
  displayName: string;
  /** Player's total score */
  totalScore: number;
  /** Whether this is the current user */
  isCurrentUser?: boolean;
}

export interface PlayerSelectorProps {
  /** Array of players to select from */
  players: PlayerOption[];
  /** Currently selected player UID */
  selectedPlayerUid: string;
  /** Callback when a player is selected */
  onSelectPlayer: (playerUid: string) => void;
  /** Label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PlayerSelector - Dropdown to switch between viewing different players' rosters
 * Shows player name and total score for each option
 */
export function PlayerSelector({
  players,
  selectedPlayerUid,
  onSelectPlayer,
  label = 'View Roster',
  className,
}: PlayerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find the currently selected player
  const selectedPlayer = players.find((p) => p.uid === selectedPlayerUid);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'ArrowDown' && !isOpen) {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  // Handle option selection
  const handleSelect = (playerUid: string) => {
    onSelectPlayer(playerUid);
    setIsOpen(false);
  };

  // Sort players: current user first, then by score descending
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isCurrentUser) return -1;
    if (b.isCurrentUser) return 1;
    return b.totalScore - a.totalScore;
  });

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="player-selector-label"
        className={cn(
          'relative w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg',
          'pl-4 pr-10 py-3 text-left cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'transition-colors hover:border-gray-400 dark:hover:border-gray-500'
        )}
      >
        {selectedPlayer ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-gray-900 dark:text-white truncate">
                {selectedPlayer.displayName}
              </span>
              {selectedPlayer.isCurrentUser && (
                <span className="flex-shrink-0 text-xs text-blue-600 dark:text-blue-400">
                  (You)
                </span>
              )}
            </div>
            <span
              className={cn(
                'flex-shrink-0 text-sm font-semibold ml-3',
                selectedPlayer.totalScore > 0
                  ? 'text-green-600 dark:text-green-400'
                  : selectedPlayer.totalScore < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              {selectedPlayer.totalScore > 0 ? '+' : ''}
              {selectedPlayer.totalScore} pts
            </span>
          </div>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Select a player...</span>
        )}

        {/* Dropdown Icon */}
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className={cn(
              'w-5 h-5 text-gray-400 transition-transform duration-200',
              isOpen && 'transform rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <ul
          role="listbox"
          aria-label="Select player"
          className={cn(
            'absolute z-10 mt-1 w-full bg-white dark:bg-gray-800',
            'border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg',
            'max-h-60 overflow-auto py-1',
            'focus:outline-none'
          )}
        >
          {sortedPlayers.map((player, index) => {
            const isSelected = player.uid === selectedPlayerUid;

            return (
              <li
                key={player.uid}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(player.uid)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(player.uid);
                  }
                }}
                tabIndex={0}
                className={cn(
                  'relative px-4 py-3 cursor-pointer select-none',
                  'focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30',
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700',
                  index > 0 && 'border-t border-gray-100 dark:border-gray-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Rank indicator */}
                    <span
                      className={cn(
                        'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                        player.isCurrentUser
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      )}
                    >
                      {player.isCurrentUser ? (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </span>

                    <span className="font-medium truncate">{player.displayName}</span>

                    {player.isCurrentUser && (
                      <span className="flex-shrink-0 text-xs text-blue-600 dark:text-blue-400">
                        (You)
                      </span>
                    )}
                  </div>

                  <span
                    className={cn(
                      'flex-shrink-0 text-sm font-semibold ml-3',
                      player.totalScore > 0
                        ? 'text-green-600 dark:text-green-400'
                        : player.totalScore < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {player.totalScore > 0 ? '+' : ''}
                    {player.totalScore} pts
                  </span>
                </div>

                {/* Selected checkmark */}
                {isSelected && (
                  <span className="absolute inset-y-0 right-4 flex items-center">
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </li>
            );
          })}

          {players.length === 0 && (
            <li className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
              No players available
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default PlayerSelector;
