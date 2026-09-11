/**
 * Ratings are scored out of 10 in half-point steps.
 *
 * Rows written while the app scored out of 100 come back above 10, so a value
 * over the maximum is read as the old scale and divided down once. A genuine
 * 0-10 score is never stored above 10, which is what makes that safe.
 */
export const MAX_RATING = 10;

/** The granularity of every rating control: whole and half points. */
export const RATING_STEP = 0.5;

const toHalfPoint = (value: number) => Math.round(value * 2) / 2;

const fromLegacyScale = (value: number) => (value > MAX_RATING ? value / 10 : value);

const clamp = (value: number) => Math.max(0, Math.min(MAX_RATING, value));

export function normalizeRating(value: number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === 0) return undefined;
  return toHalfPoint(clamp(fromLegacyScale(value)));
}

/** Alias kept for the achievement score, which shares the same scale. */
export const clampRating = normalizeRating;

/** Snaps a control's raw input onto the half-point grid. */
export const snapRating = (value: number) => toHalfPoint(clamp(value));

/** "8" and "7.5" — a trailing ".0" reads as false precision. */
export const formatRating = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

/**
 * Red at 0, yellow at half marks, green at the top — the familiar scoring ramp,
 * so the colour alone reads as a verdict. Hue 0-120 is exactly that sweep.
 */
export function ratingColor(value: number): string {
  const v = clamp(value);
  const hue = (v / MAX_RATING) * 120;
  const saturation = 78 + (v / MAX_RATING) * 12;
  const lightness = 47 + (v / MAX_RATING) * 11;
  return `hsl(${hue.toFixed(0)} ${saturation.toFixed(0)}% ${lightness.toFixed(0)}%)`;
}

/** Coarse label used in tooltips and filter chips. */
export function ratingLabel(value: number): string {
  if (value >= 9) return 'Outstanding';
  if (value >= 7.5) return 'Great';
  if (value >= 6) return 'Good';
  if (value >= 4) return 'Mixed';
  if (value >= 2) return 'Poor';
  return 'Bad';
}
