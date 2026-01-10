'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import type { User } from '@/types/firebase';

export interface DraftOrderDisplayProps {
  /** Array of player UIDs in draft order (first round order) */
  draftOrder: string[];
  /** Map of player UIDs to player data */
  players: Map<string, Pick<User, 'uid' | 'displayName'>>;
  /** Current pick number (1-indexed) */
  currentPick: number;
  /** Total number of picks completed */
  completedPicks: number;
  /** Maximum roster size (number of rounds) */
  rosterSize: number;
  /** Current user's UID */
  currentUserUid?: string;
  /** Whether to show all rounds or just current */
  showAllRounds?: boolean;
  /** Orientation of the display */
  orientation?: 'horizontal' | 'vertical';
}

interface PickSlot {
  pickNumber: number;
  round: number;
  playerUid: string;
  isComplete: boolean;
  isCurrent: boolean;
  isCurrentUser: boolean;
}

/**
 * DraftOrderDisplay shows the snake draft order visually.
 * Highlights the current pick and shows which picks are complete.
 * Snake draft reverses order on even rounds.
 */
export function DraftOrderDisplay({
  draftOrder,
  players,
  currentPick,
  completedPicks,
  rosterSize,
  currentUserUid,
  showAllRounds = true,
  orientation = 'horizontal',
}: DraftOrderDisplayProps) {
  // Calculate all pick slots with snake draft logic
  const pickSlots = useMemo(() => {
    const slots: PickSlot[] = [];
    const numPlayers = draftOrder.length;

    for (let round = 1; round <= rosterSize; round++) {
      // Snake draft: reverse order on even rounds
      const roundOrder = round % 2 === 0 ? [...draftOrder].reverse() : draftOrder;

      roundOrder.forEach((playerUid, index) => {
        const pickNumber = (round - 1) * numPlayers + index + 1;
        slots.push({
          pickNumber,
          round,
          playerUid,
          isComplete: pickNumber <= completedPicks,
          isCurrent: pickNumber === currentPick,
          isCurrentUser: playerUid === currentUserUid,
        });
      });
    }

    return slots;
  }, [draftOrder, rosterSize, completedPicks, currentPick, currentUserUid]);

  // Group slots by round for display
  const roundGroups = useMemo(() => {
    const groups: PickSlot[][] = [];
    for (let i = 0; i < rosterSize; i++) {
      const start = i * draftOrder.length;
      const end = start + draftOrder.length;
      groups.push(pickSlots.slice(start, end));
    }
    return groups;
  }, [pickSlots, rosterSize, draftOrder.length]);

  // Find current round for focused view
  const currentRound = Math.ceil(currentPick / draftOrder.length);

  if (orientation === 'vertical') {
    return (
      <div className="space-y-4" role="region" aria-label="Draft order">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Draft Order
        </h3>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <LegendItem color="bg-green-500" label="Complete" />
          <LegendItem color="bg-yellow-500" label="Current" />
          <LegendItem color="bg-blue-500" label="Your Pick" />
          <LegendItem color="bg-gray-300 dark:bg-gray-600" label="Pending" />
        </div>

        {/* Rounds */}
        <div className="space-y-3">
          {roundGroups.map((roundSlots, roundIndex) => {
            const round = roundIndex + 1;
            const isCurrentRound = round === currentRound;

            if (!showAllRounds && round !== currentRound) {
              return null;
            }

            return (
              <div
                key={round}
                className={cn(
                  'rounded-lg p-2 transition-all',
                  isCurrentRound
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-300 dark:ring-yellow-700'
                    : 'bg-gray-50 dark:bg-gray-800/50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Round {round}
                  </span>
                  {round % 2 === 0 && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                      Reversed
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {roundSlots.map((slot) => (
                    <PickSlotBadge
                      key={slot.pickNumber}
                      slot={slot}
                      playerName={players.get(slot.playerUid)?.displayName || 'Unknown'}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className="space-y-3" role="region" aria-label="Draft order">
      {/* Header and Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Draft Order - Pick {currentPick} of {draftOrder.length * rosterSize}
        </h3>
        <div className="flex gap-3 text-xs">
          <LegendItem color="bg-green-500" label="Done" />
          <LegendItem color="bg-yellow-500" label="Now" />
          <LegendItem color="bg-blue-500" label="You" />
        </div>
      </div>

      {/* Scrollable pick timeline */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1 min-w-max">
          {pickSlots.map((slot, index) => {
            // Add round separator
            const isRoundStart = index > 0 && slot.round !== pickSlots[index - 1].round;

            return (
              <div key={slot.pickNumber} className="flex items-center gap-1">
                {isRoundStart && (
                  <div className="flex flex-col items-center px-1">
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      R{slot.round}
                    </span>
                  </div>
                )}
                <PickSlotBadge
                  slot={slot}
                  playerName={players.get(slot.playerUid)?.displayName || 'Unknown'}
                  size="md"
                  showName
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface PickSlotBadgeProps {
  slot: PickSlot;
  playerName: string;
  size: 'sm' | 'md';
  showName?: boolean;
}

function PickSlotBadge({ slot, playerName, size, showName = false }: PickSlotBadgeProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'min-w-[48px] h-10 text-xs px-2',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-md transition-all',
        sizeClasses[size],
        slot.isComplete && 'bg-green-500 text-white',
        slot.isCurrent && 'bg-yellow-500 text-yellow-900 ring-2 ring-yellow-300 animate-pulse',
        !slot.isComplete && !slot.isCurrent && slot.isCurrentUser && 'bg-blue-500 text-white',
        !slot.isComplete && !slot.isCurrent && !slot.isCurrentUser && 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
      )}
      title={`Pick ${slot.pickNumber}: ${playerName}`}
      aria-label={`Pick ${slot.pickNumber}, ${playerName}${slot.isComplete ? ', completed' : ''}${slot.isCurrent ? ', current pick' : ''}`}
    >
      <span className="font-medium">{slot.pickNumber}</span>
      {showName && size === 'md' && (
        <span className="text-[10px] truncate max-w-[44px] opacity-80">
          {getInitials(playerName)}
        </span>
      )}
    </div>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-3 h-3 rounded', color)} />
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default DraftOrderDisplay;
