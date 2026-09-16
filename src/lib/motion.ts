/**
 * The app's easing curves, so every animation decelerates the same way.
 *
 * EASE_OUT is a quint-style curve: quick off the mark and a long, soft landing.
 * It is what fills, draws and entrances use. EASE_IN_OUT is for motion that
 * both starts and stops on screen — a sweep round a ring, a text scroll.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** The same curves for CSS, where motion's arrays do not apply. */
export const CSS_EASE_IN_OUT = `cubic-bezier(${EASE_IN_OUT.join(', ')})`;
