import { GameStatus, UserProfile } from '../types';
import { DEFAULT_STATUS_NAMES } from './constants';

export const MAX_STATUS_NAME_LENGTH = 24;

/**
 * The display name for a status. Every label in the UI resolves through here,
 * so renaming a status in Settings takes effect everywhere at once.
 */
export function statusLabel(status: GameStatus, profile?: Pick<UserProfile, 'statusNames'>): string {
  const custom = profile?.statusNames?.[status]?.trim();
  return custom || DEFAULT_STATUS_NAMES[status];
}

/** Validation shared by the Settings editor. Returns an error message or null. */
export function validateStatusName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Name cannot be empty.';
  if (trimmed.length > MAX_STATUS_NAME_LENGTH) {
    return `Keep it under ${MAX_STATUS_NAME_LENGTH} characters.`;
  }
  return null;
}

/**
 * Selected-state classes for a status control, so a picker uses the same colour
 * the status carries everywhere else instead of one accent for all of them.
 */
export const STATUS_SELECTED_CLASS: Record<GameStatus, string> = {
  playing: 'border-accent-700 bg-accent-100 text-accent-900',
  backlog: 'border-gray-400 bg-gray-300 text-gray-1000',
  completed: 'border-positive-700 bg-positive-100 text-positive-900',
  mastered: 'border-trophy-700 bg-trophy-100 text-trophy-900',
  dropped: 'border-negative-700 bg-negative-100 text-negative-900',
};

/** Tone token used for a status wherever it is shown as a badge. */
export const STATUS_TONE: Record<GameStatus, 'accent' | 'notice' | 'positive' | 'trophy' | 'neutral'> = {
  playing: 'accent',
  // Neutral, not notice: backlog is a queue, and the amber read as a warning
  // and clashed with the gold used for completion.
  backlog: 'neutral',
  completed: 'positive',
  mastered: 'trophy',
  dropped: 'neutral',
};
