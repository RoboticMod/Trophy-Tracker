/**
 * Ratings are stored 0-100. Anything at or below 5 is a leftover from the old
 * five-star scale and is scaled up on read, once — a genuine 0-5 rating on the
 * new scale cannot exist because the star control never wrote one.
 */
export const MAX_RATING = 100;

export function normalizeRating(value: number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === 0) return undefined;
  if (value <= 5) return Math.round(value * 20);
  return Math.round(Math.max(0, Math.min(MAX_RATING, value)));
}

/**
 * Clamp for scores that never existed on the old five-star scale, so a genuine
 * low rating is kept as-is instead of being scaled up like a legacy value.
 */
export function clampRating(value: number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === 0) return undefined;
  return Math.round(Math.max(0, Math.min(MAX_RATING, value)));
}

/**
 * A score climbs from the neutral text ramp into the trophy metal, so a high
 * rating reads as the same kind of achievement the completion states do. A
 * free hue sweep would have put arbitrary reds and greens next to the gold and
 * broken that reading.
 */
export function ratingColor(value: number): string {
  const v = Math.max(0, Math.min(MAX_RATING, value));
  if (v >= 90) return 'var(--tt-gold-hi, #ffd36b)';
  if (v >= 75) return 'var(--tt-gold, #e5a83c)';
  if (v >= 60) return '#c9b487';
  if (v >= 40) return '#b8ae9f';
  return '#9a9082';
}

/** Coarse label used in tooltips and filter chips. */
export function ratingLabel(value: number): string {
  if (value >= 90) return 'Outstanding';
  if (value >= 75) return 'Great';
  if (value >= 60) return 'Good';
  if (value >= 40) return 'Mixed';
  if (value >= 20) return 'Poor';
  return 'Bad';
}
