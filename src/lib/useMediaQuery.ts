import { useSyncExternalStore } from 'react';

/**
 * One `MediaQueryList` per query string, shared by everything that asks.
 *
 * Cards ask whether they are on a phone, and a library is 150 cards: with a
 * list and a listener each, one resize meant 150 callbacks and 150 state
 * updates. Here the list is made once, and every subscriber hears the one
 * change event.
 */
const lists = new Map<string, MediaQueryList>();

const listFor = (query: string): MediaQueryList | null => {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return null;
  let list = lists.get(query);
  if (!list) {
    list = window.matchMedia(query);
    lists.set(query, list);
  }
  return list;
};

/** Stable per query, so React does not resubscribe on every render. */
const subscribers = new Map<string, (notify: () => void) => () => void>();
const subscribeTo = (query: string) => {
  let subscribe = subscribers.get(query);
  if (!subscribe) {
    subscribe = (notify) => {
      const list = listFor(query);
      if (!list) return () => {};
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    };
    subscribers.set(query, subscribe);
  }
  return subscribe;
};

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
 * Read synchronously, so the first paint is already correct and a phone does
 * not flash the desktop layout.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeTo(query),
    () => listFor(query)?.matches ?? false,
    () => false,
  );
}

/**
 * Below Tailwind's `md`, which is where this app's layout switches from a top
 * bar and wide cards to a bottom bar and phone tiles.
 */
export const useIsPhone = () => useMediaQuery('(max-width: 767px)');
