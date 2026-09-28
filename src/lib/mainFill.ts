import { createContext, useContext, useEffect } from 'react';

/**
 * Lets a page trade the scrolling page for a layout that fills the window.
 *
 * With two platform columns side by side, each scrolls on its own — and a
 * page that scrolled as well made three scrollers, with the columns riding up
 * and down inside the one around them. While something holds a claim, <main>
 * stops being a long page from md up: the page is sized to the window, the
 * columns take whatever height is left under the page's header, and the two
 * of them are the only things that scroll.
 *
 * A count of claims rather than a flag, so two holders — or one unmounting as
 * the next mounts on a route change — never switch it off under each other.
 */
export const MainFillContext = createContext<(() => () => void) | null>(null);

/** Holds the claim for as long as the caller is mounted and `active`. */
export function useMainFill(active = true): void {
  const claim = useContext(MainFillContext);
  useEffect(() => {
    if (!active || !claim) return;
    return claim();
  }, [active, claim]);
}
