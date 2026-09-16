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

/**
 * One word for where a library or a game stands on completion, shown under the
 * gauge that states the number.
 */
export function completionLabel(percent: number): string {
  if (percent >= 100) return 'Perfect';
  if (percent >= 75) return 'Nearly there';
  if (percent >= 50) return 'On track';
  if (percent >= 25) return 'Underway';
  if (percent > 0) return 'Just started';
  return 'Untouched';
}

/**
 * Completion runs the same red-through-green sweep a rating does, so it reuses
 * that ramp on a 0-100 input rather than defining a second one that would drift
 * out of step with it.
 */
export const completionColor = (percent: number): string =>
  ratingColor((percent / 100) * MAX_RATING);

/**
 * The verdict for how much of a backlog has been worked through. Separate
 * wording from completionLabel because clearing a queue is a different thing
 * from finishing a game — "Perfect" would be the wrong word for an empty one.
 */
export function backlogLabel(percentCleared: number): string {
  if (percentCleared >= 100) return 'All clear';
  if (percentCleared >= 75) return 'Almost clear';
  if (percentCleared >= 50) return 'Getting there';
  if (percentCleared >= 25) return 'Chipping away';
  if (percentCleared > 0) return 'Just started';
  return 'Untouched';
}
