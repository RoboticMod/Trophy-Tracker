import { useEffect, useState } from 'react';

/**
 * Whether a CSS media query currently matches.
 *
 * Most responsive work in this app is Tailwind's job and belongs in classes.
 * This is for the cases where the two layouts are different *components*
 * rather than the same one restyled — a phone's portrait tile and a desktop's
 * wide card share almost no markup, and rendering both with one hidden would
 * put two elements carrying the same `data-game-id` in the document, which is
 * precisely what the follow lookup searches for.
 *
 * Initialised from the real value rather than from false, so the first paint is
 * already correct and a phone does not flash the desktop layout.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && 'matchMedia' in window
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;

    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * Below Tailwind's `md`, which is where this app's layout switches from a
 * sidebar and wide cards to a bottom bar and portrait tiles.
 */
export const useIsPhone = () => useMediaQuery('(max-width: 767px)');
