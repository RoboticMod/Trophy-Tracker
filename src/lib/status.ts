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
  playing: 'border-accent-700/60 bg-accent-700/16 text-accent-900',
  backlog: 'border-gray-400 bg-gray-300 text-gray-1000',
  completed: 'border-positive-700/60 bg-positive-700/16 text-positive-900',
  mastered: 'border-trophy-700/60 bg-trophy-700/16 text-trophy-900',
  dropped: 'border-negative-700/60 bg-negative-700/16 text-negative-900',
};

/**
 * Text colour for a status chip sitting on cover art, where the scrim already
 * supplies the background and only the ink needs to carry the status.
 */
export const STATUS_OVERLAY_CLASS: Record<GameStatus, string> = {
  playing: 'text-accent-900',
  backlog: 'text-gray-800',
  completed: 'text-positive-900',
  mastered: 'text-trophy-900',
  dropped: 'text-negative-900',
};

/**
 * The raw colour a status carries, for the places that need a value rather than
 * a class — an SVG stroke, an inline gradient. Kept beside the tone map so the
 * chart and the badge can never drift to different colours for the same status.
 */
export const STATUS_COLOR: Record<GameStatus, string> = {
  playing: 'var(--color-accent-700)',
  backlog: 'var(--color-gray-500)',
  completed: 'var(--color-positive-700)',
  mastered: 'var(--color-trophy-700)',
  dropped: 'var(--color-negative-700)',
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
