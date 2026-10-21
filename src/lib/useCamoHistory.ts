import { useCallback, useSyncExternalStore } from 'react';
import { CamoGame } from './camo';

/**
 * The camo tracker's Undo: the last 25 changes, for this session only.
 *
 * Each step holds the whole game as it was before — the tracker writes a game
 * whole, so putting it back is one more write of the same kind, and needs no
 * per-action inverse. A step for a game that did not exist yet (just added)
 * holds null, and undoing it deletes the game; a deleted game comes back.
 *
 * Kept in the module, not the page, so it outlives leaving the tracker and
 * coming back — but not a reload, which the spec allows. It belongs to one
 * account: a different user signing in starts it empty, so an undo can never
 * write one account's game into another's.
 */
const LIMIT = 25;

interface Step {
  label: string;
  gameId: string;
  before: CamoGame | null;
}

let owner: string | null = null;
let steps: Step[] = [];
let lastAction: string | null = null;
let version = 0;
const listeners = new Set<() => void>();

const emit = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const claim = (userId: string | null) => {
  if (owner === userId) return;
  owner = userId;
  steps = [];
  lastAction = null;
};

export interface CamoHistory {
  canUndo: boolean;
  /** What the last change was, or what was just undone. */
  lastAction: string | null;
  /** Before writing: what the game was (null if new), and what is being done. */
  record: (label: string, gameId: string, before: CamoGame | null) => void;
  /** Takes the newest step off; the caller writes it back. */
  undo: () => Step | null;
}

export function useCamoHistory(userId: string | null): CamoHistory {
  claim(userId);
  useSyncExternalStore(subscribe, () => version);

  const record = useCallback(
    (label: string, gameId: string, before: CamoGame | null) => {
      claim(userId);
      steps = [...steps, { label, gameId, before }].slice(-LIMIT);
      lastAction = label;
      emit();
    },
    [userId],
  );

  const undo = useCallback(() => {
    claim(userId);
    const step = steps[steps.length - 1];
    if (!step) return null;
    steps = steps.slice(0, -1);
    lastAction = `Undid: ${step.label}`;
    emit();
    return step;
  }, [userId]);

  return { canUndo: steps.length > 0, lastAction, record, undo };
}

/**
 * Empties Undo. A restored backup replaces the tracker wholesale, and an undo
 * step from before it would write a game the backup did not have back in.
 */
export function clearCamoHistory(): void {
  steps = [];
  lastAction = null;
  emit();
}
