import { SidebarConfig } from '../types';

/**
 * The eight destinations, in their default order.
 *
 * One list, read by the sidebar, the mobile tab bar, the "More" sheet, the
 * command palette and the Settings reorder panel — so renaming or hiding a
 * destination in Settings reaches every one of them without a second source of
 * truth to keep in step.
 */
export type NavGroup = 'library' | 'discover';

export const NAV_GROUP_LABEL: Record<NavGroup, string> = {
  library: 'Library',
  discover: 'Discover',
};

export interface NavDestination {
  path: string;
  /** Full label, used in the sidebar, the More sheet and the palette. */
  name: string;
  /** Short form for the mobile tab bar, which has room for one word. */
  short: string;
  description: string;
  /** Which sidebar heading it sits under. */
  group: NavGroup;
  /** The SidebarConfig flag that hides it, or null when it cannot be hidden. */
  configKey: keyof SidebarConfig | null;
}

export const NAV_DESTINATIONS: NavDestination[] = [
  {
    path: '/',
    name: 'Dashboard',
    short: 'Library',
    description: 'Overview, filters and the whole library',
    group: 'library',
    configKey: null,
  },
  {
    path: '/playing',
    name: 'Playing',
    short: 'Playing',
    description: 'Active titles in progress',
    group: 'library',
    configKey: 'showCurrentlyPlaying',
  },
  {
    path: '/achievements',
    name: 'Trophy room',
    short: 'Trophies',
    description: 'Perfect games and platinums',
    group: 'library',
    configKey: 'showAchievements',
  },
  {
    path: '/backlog',
    name: 'Backlog',
    short: 'Backlog',
    description: 'Queue of unplayed games',
    group: 'library',
    configKey: 'showBacklog',
  },
  {
    path: '/collections',
    name: 'Collections',
    short: 'Lists',
    description: 'Your custom shelves',
    group: 'library',
    configKey: 'showCollections',
  },
  {
    path: '/search',
    name: 'Search & add',
    short: 'Search',
    description: 'RAWG catalog search',
    group: 'discover',
    configKey: 'showSearch',
  },
  {
    path: '/stats',
    name: 'Statistics',
    short: 'Stats',
    description: 'Playtime and completion metrics',
    group: 'discover',
    configKey: 'showStats',
  },
];

export const DEFAULT_NAV_ORDER = NAV_DESTINATIONS.map((d) => d.path);

export const MAX_NAV_NAME_LENGTH = 24;

/** A destination's label, with the user's rename applied. */
export function navLabel(destination: NavDestination, config?: SidebarConfig): string {
  return config?.navNames?.[destination.path]?.trim() || destination.name;
}

/**
 * The tab bar keeps its short defaults unless the destination was actually
 * renamed — "Trophy room" does not fit a fifth of a phone's width, but a name
 * the user chose themselves is theirs to fit.
 */
export function navShortLabel(destination: NavDestination, config?: SidebarConfig): string {
  return config?.navNames?.[destination.path]?.trim() || destination.short;
}

export const isNavVisible = (destination: NavDestination, config?: SidebarConfig): boolean =>
  destination.configKey === null || config?.[destination.configKey] !== false;

/** Destinations in the user's order, hidden ones removed. */
export function orderedNavDestinations(config?: SidebarConfig): NavDestination[] {
  const order = config?.navOrder?.length ? config.navOrder : DEFAULT_NAV_ORDER;
  const rank = (path: string) => {
    const i = order.indexOf(path);
    return i === -1 ? order.length : i;
  };
  return [...NAV_DESTINATIONS]
    .sort((a, b) => rank(a.path) - rank(b.path))
    .filter((d) => isNavVisible(d, config));
}

/** Every destination in the user's order, including hidden ones, for Settings. */
export function allNavDestinationsInOrder(config?: SidebarConfig): NavDestination[] {
  const order = config?.navOrder?.length ? config.navOrder : DEFAULT_NAV_ORDER;
  const rank = (path: string) => {
    const i = order.indexOf(path);
    return i === -1 ? order.length : i;
  };
  return [...NAV_DESTINATIONS].sort((a, b) => rank(a.path) - rank(b.path));
}
