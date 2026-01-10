'use client';

import { useState, useCallback } from 'react';
import { DraftState } from '@/hooks/useDraft';

interface DraftControlsProps {
  /** Draft state from useDraft hook */
  draftState: DraftState | null;
  /** Whether a mutation is in progress */
  isMutating?: boolean;
  /** Whether the draft state is loading */
  isLoading?: boolean;
  /** Callback to start the draft */
  onStartDraft: () => Promise<boolean>;
  /** Callback to undo the last pick */
  onUndoPick: () => Promise<boolean>;
  /** Callback to complete the draft */
  onCompleteDraft: () => Promise<boolean>;
  /** Custom class name */
  className?: string;
}

/**
 * Confirmation dialog component
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onCancel}
        />

        {/* Dialog */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${variantClasses[confirmVariant]}`}
            >
              {isLoading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * DraftControls component
 *
 * Admin controls for managing the draft:
 * - "Start Draft" button when pending
 * - "Undo Last Pick" button when in progress
 * - "Complete Draft" button when all picks are made
 *
 * All destructive actions have confirmation dialogs.
 *
 * @example
 * ```tsx
 * function DraftPage({ leagueId }) {
 *   const { draftState, isMutating, isLoading, startDraft, undoPick, completeDraft } = useDraft(leagueId);
 *
 *   return (
 *     <DraftControls
 *       draftState={draftState}
 *       isMutating={isMutating}
 *       isLoading={isLoading}
 *       onStartDraft={startDraft}
 *       onUndoPick={undoPick}
 *       onCompleteDraft={completeDraft}
 *     />
 *   );
 * }
 * ```
 */
export function DraftControls({
  draftState,
  isMutating = false,
  isLoading = false,
  onStartDraft,
  onUndoPick,
  onCompleteDraft,
  className = '',
}: DraftControlsProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'start' | 'undo' | 'complete' | null;
  }>({ type: null });

  const closeDialog = useCallback(() => {
    setConfirmDialog({ type: null });
  }, []);

  const handleStartDraft = useCallback(async () => {
    const success = await onStartDraft();
    if (success) {
      closeDialog();
    }
  }, [onStartDraft, closeDialog]);

  const handleUndoPick = useCallback(async () => {
    const success = await onUndoPick();
    if (success) {
      closeDialog();
    }
  }, [onUndoPick, closeDialog]);

  const handleCompleteDraft = useCallback(async () => {
    const success = await onCompleteDraft();
    if (success) {
      closeDialog();
    }
  }, [onCompleteDraft, closeDialog]);

  // Don't show controls if not admin
  if (!draftState?.isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <div className="animate-pulse">
          <div className="h-10 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const { status, currentPick, totalPicks, picks } = draftState;
  const allPicksMade = picks.length >= totalPicks;

  return (
    <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Admin Controls</h4>

      <div className="flex flex-wrap gap-3">
        {/* Start Draft Button - Only when pending */}
        {status === 'pending' && (
          <button
            type="button"
            onClick={() => setConfirmDialog({ type: 'start' })}
            disabled={isMutating}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Draft
          </button>
        )}

        {/* Undo Last Pick Button - Only when in progress and picks exist */}
        {status === 'in_progress' && picks.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmDialog({ type: 'undo' })}
            disabled={isMutating}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Undo Last Pick
          </button>
        )}

        {/* Complete Draft Button - Only when in progress and all picks made */}
        {status === 'in_progress' && allPicksMade && (
          <button
            type="button"
            onClick={() => setConfirmDialog({ type: 'complete' })}
            disabled={isMutating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Draft
          </button>
        )}

        {/* Draft Completed Message */}
        {status === 'completed' && (
          <p className="text-sm text-gray-600">
            The draft has been completed and locked. No further changes can be made.
          </p>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmDialog.type === 'start'}
        title="Start Draft"
        message={`Are you sure you want to start the draft? This will begin with ${draftState.draftOrder.length} players drafting ${draftState.rosterSize} contestants each (${totalPicks} total picks).`}
        confirmLabel="Start Draft"
        confirmVariant="primary"
        onConfirm={handleStartDraft}
        onCancel={closeDialog}
        isLoading={isMutating}
      />

      <ConfirmDialog
        isOpen={confirmDialog.type === 'undo'}
        title="Undo Last Pick"
        message={
          picks.length > 0
            ? `Are you sure you want to undo pick #${picks[picks.length - 1]?.pickOrder}? This will remove the contestant from ${picks[picks.length - 1]?.playerName}'s roster.`
            : 'Are you sure you want to undo the last pick?'
        }
        confirmLabel="Undo Pick"
        confirmVariant="warning"
        onConfirm={handleUndoPick}
        onCancel={closeDialog}
        isLoading={isMutating}
      />

      <ConfirmDialog
        isOpen={confirmDialog.type === 'complete'}
        title="Complete Draft"
        message="Are you sure you want to complete and lock the draft? This action cannot be undone. No further picks or changes will be allowed."
        confirmLabel="Complete Draft"
        confirmVariant="danger"
        onConfirm={handleCompleteDraft}
        onCancel={closeDialog}
        isLoading={isMutating}
      />
    </div>
  );
}
