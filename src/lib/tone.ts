import React from 'react';

/**
 * The filter chip.
 *
 * Every chip row in the app — platform, status, rating, collection, add-target —
 * uses one shape and one colour rule: an inactive chip is neutral, and an active
 * one wears its own tone as a 16% wash with a 55% hairline.
 *
 * The active label is deliberately NOT the tone itself. A saturated hue on its
 * own low-alpha wash lands around 2:1; the lightened step below measures ~10:1
 * on the same wash, so an active chip stays readable without losing its
 * identity. Tones that follow the live theme resolve to their derived ink
 * variable, which is computed under the same rule in lib/theme.ts.
 */
const LIGHTENED_INK: Record<string, string> = {
  'var(--tt-accent, #45c8ea)': 'var(--tt-accent-ink, #a9ecfb)',
  'var(--tt-gold, #e5a83c)': '#f6d494',
  'var(--tt-gold-hi, #ffd36b)': '#ffe7b3',
  '#66c0f4': '#b3ddf9',
  '#4d9bf0': '#a9cbf8',
  '#d98b3a': '#f0c191',
  '#4fc38a': '#a6e2c4',
  '#f2686f': '#f8b0b4',
  '#9a9082': '#d3ccc2',
};

export const ACCENT_TONE = 'var(--tt-accent, #45c8ea)';
export const GOLD_TONE = 'var(--tt-gold, #e5a83c)';
export const GOLD_HI_TONE = 'var(--tt-gold-hi, #ffd36b)';

/** Ink for a tone shown against its own wash. */
export const toneInk = (tone: string): string => LIGHTENED_INK[tone] ?? '#f7f3ec';

/**
 * Inline style for a chip in either state. Returned as a style object rather
 * than classes because the tone is data — a collection's colour, a platform's
 * hue — and `color-mix` has to resolve against whichever value arrives.
 */
export function chipStyle(active: boolean, tone: string = ACCENT_TONE): React.CSSProperties {
  if (!active) {
    return {
      background: 'var(--tt-surface, #1a1714)',
      color: '#b8ae9f',
      boxShadow: 'inset 0 0 0 1px var(--tt-line, #35302a)',
    };
  }
  return {
    background: `color-mix(in srgb, ${tone} 16%, var(--tt-bg, #100e0c))`,
    color: toneInk(tone),
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone} 55%, transparent)`,
  };
}

/** A tone mixed into transparency, for hairlines and glows around a hue. */
export const softEdge = (tone: string, percent: number): string =>
  `color-mix(in srgb, ${tone} ${percent}%, transparent)`;
