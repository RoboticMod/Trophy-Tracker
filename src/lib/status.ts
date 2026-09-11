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
 * The colour a status carries everywhere — dot, chip ink, meter, distribution
 * numeral. Playing and mastered follow the live theme rather than a literal, so
 * a re-themed app keeps "in progress" on the accent and "100%" on the metal.
 */
export const STATUS_COLOR: Record<GameStatus, string> = {
  backlog: '#d98b3a',
  playing: 'var(--tt-accent, #45c8ea)',
  completed: '#4fc38a',
  mastered: 'var(--tt-gold-hi, #ffd36b)',
  dropped: '#9a9082',
};

/** Short form used on a card overlay, where the chip is only 24px tall. */
export const STATUS_SHORT_LABEL: Record<GameStatus, string> = {
  backlog: 'Backlog',
  playing: 'Playing',
  completed: 'Completed',
  mastered: '100%',
  dropped: 'Dropped',
};

/** Overlay chips use the short label unless the status has been renamed. */
export function statusOverlayLabel(
  status: GameStatus,
  profile?: Pick<UserProfile, 'statusNames'>,
): string {
  const custom = profile?.statusNames?.[status]?.trim();
  return custom || STATUS_SHORT_LABEL[status];
}
