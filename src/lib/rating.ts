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
 * Red at 0 through amber to gold at 100, so the colour alone reads as a score.
 * Hue 0-45 keeps the whole ramp inside the warm range used by the token layer.
 */
export function ratingColor(value: number): string {
  const v = Math.max(0, Math.min(MAX_RATING, value));
  const hue = (v / MAX_RATING) * 45;
  const saturation = 78 + (v / MAX_RATING) * 12;
  const lightness = 47 + (v / MAX_RATING) * 11;
  return `hsl(${hue.toFixed(0)} ${saturation.toFixed(0)}% ${lightness.toFixed(0)}%)`;
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
