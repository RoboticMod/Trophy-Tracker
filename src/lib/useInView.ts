import { useEffect, useRef, useState } from 'react';

/**
 * Whether an element has been on screen yet.
 *
 * Latching, not live: this answers "has this been looked at", which is what an
 * animation that should play for someone rather than to an empty scroll
 * position needs. Once it is true it stays true, so scrolling a card back out
 * of view never rewinds what it has already shown.
 *
 * Without IntersectionObserver — and in any environment without a layout — it
 * reports true immediately, so a missing API costs the animation its timing
 * rather than costing it its existence.
 */
export function useInView<T extends Element>(threshold = 0.5) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (seen) return;

    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      // Against the viewport, but clipped by every scrolling ancestor on the
      // way up — so a card scrolled out of the app's own <main> counts as out
      // of sight even though the window itself never moves.
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [seen, threshold]);

  return [ref, seen] as const;
}
