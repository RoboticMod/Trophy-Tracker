import { SidebarConfig } from '../types';

/**
 * The navigation's defaults, in one place for the bar that draws it and the
 * Settings card that edits it — two copies of this list had already drifted
 * once.
 *
 * Home first and always shown: the app opens on it. The 100% page is not a
 * tab — it is opened from Lists and from Home. Library is second but off by
 * default: Home's "Open library" is the way to it unless you switch it on.
 */
export const DEFAULT_NAV_ORDER: string[] = [
  '/',
  '/library',
  '/playing',
  '/collections',
  '/call-of-duty',
  '/stats',
  '/search',
  '/backlog',
];

/** How many tabs the phone's bottom bar holds before "More". */
export const PHONE_BAR_SLOTS = 4;

/**
 * Whether each switchable tab is shown when nothing is stored for it.
 *
 * Stored configs predate some keys, so every read goes through `isShown`:
 * a missing key means this default, never "off".
 */
export const DEFAULT_TAB_VISIBILITY = {
  showLibrary: false,
  showCurrentlyPlaying: true,
  showCollections: true,
  showCallOfDuty: true,
  showStats: true,
  showSearch: false,
  showBacklog: false,
} as const satisfies Partial<Record<keyof SidebarConfig, boolean>>;

export type TabVisibilityKey = keyof typeof DEFAULT_TAB_VISIBILITY;

export const isShown = (config: SidebarConfig | undefined, key: TabVisibilityKey): boolean => {
  const stored = config?.[key];
  return typeof stored === 'boolean' ? stored : DEFAULT_TAB_VISIBILITY[key];
};

/**
 * A stored order, with any tab it has never heard of put back where the
 * default order has it — after the nearest tab that precedes it there — rather
 * than at the end. Paths that are no longer tabs (the old 100% tab) drop out.
 */
export const resolveNavOrder = (stored: string[] | undefined): string[] => {
  if (!Array.isArray(stored) || stored.length === 0) return DEFAULT_NAV_ORDER;

  const known = new Set(DEFAULT_NAV_ORDER);
  const order = stored.filter((path, i) => known.has(path) && stored.indexOf(path) === i);

  DEFAULT_NAV_ORDER.forEach((path, index) => {
    if (order.includes(path)) return;
    let at = 0;
    for (let k = index - 1; k >= 0; k--) {
      const before = order.indexOf(DEFAULT_NAV_ORDER[k]);
      if (before !== -1) {
        at = before + 1;
        break;
      }
    }
    order.splice(at, 0, path);
  });

  return order;
};

/** Position of a path in a resolved order, for sorting. */
export const navRank = (order: string[], path: string): number => {
  const index = order.indexOf(path);
  return index === -1 ? order.length : index;
};
