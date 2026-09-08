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

/** Tone token used for a status wherever it is shown as a badge. */
export const STATUS_TONE: Record<GameStatus, 'accent' | 'notice' | 'positive' | 'trophy' | 'neutral'> = {
  playing: 'accent',
  backlog: 'notice',
  completed: 'positive',
  mastered: 'trophy',
  dropped: 'neutral',
};
