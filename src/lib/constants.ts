import { Platform, PlatformConfig, Collection, GameStatus, isPlatform } from '../types';

export const APP_NAME = 'Trophy Tracker';

export const DEFAULT_STATUS_NAMES: Record<GameStatus, string> = {
  backlog: 'Backlog',
  playing: 'Playing',
  completed: 'Completed',
  mastered: '100% Mastered',
  dropped: 'Dropped',
};

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  steam: {
    id: 'steam',
    name: 'Steam',
    shortName: 'Steam',
    mark: 'STEAM',
    color: '#66c0f4',
    line: 'rgb(102 192 244 / .4)',
  },
  ps5: {
    id: 'ps5',
    name: 'PlayStation 5',
    shortName: 'PS5',
    mark: 'PS5',
    color: '#4d9bf0',
    line: 'rgb(77 155 240 / .4)',
  },
};

/** Default platform display order, overridable per user in Settings. */
export const DEFAULT_PLATFORM_SORT_ORDER: Platform[] = ['steam', 'ps5'];

export const comparePlatformOrder = (
  platformA: string,
  platformB: string,
  customOrder?: Platform[],
): number => {
  const order = customOrder && customOrder.length > 0 ? customOrder : DEFAULT_PLATFORM_SORT_ORDER;
  const indexOf = (value: string) => {
    const idx = order.indexOf(value.toLowerCase() as Platform);
    return idx === -1 ? order.length : idx;
  };
  return indexOf(platformA) - indexOf(platformB);
};

/** Human-readable summary of an order, e.g. "Steam → PS5". */
export const describePlatformOrder = (order?: Platform[]): string =>
  (order && order.length > 0 ? order : DEFAULT_PLATFORM_SORT_ORDER)
    .map((p) => PLATFORMS[p]?.shortName ?? p)
    .join(' → ');

/**
 * Coerces a stored or remote platform value onto the supported set. Legacy
 * PlayStation spellings map to ps5; anything else is not supported and returns
 * null so the caller can drop the record.
 */
export const normalizePlatform = (value: unknown): Platform | null => {
  if (typeof value !== 'string') return null;
  const v = value.toLowerCase().trim();
  if (isPlatform(v)) return v;
  if (v === 'playstation' || v === 'ps4' || v === 'ps3' || v === 'playstation5') return 'ps5';
  return null;
};

export const DEFAULT_COLLECTIONS: Collection[] = [
  {
    id: 'col-backlog',
    name: 'Backlog',
    description: 'Games queued to play',
    icon: 'Clock',
    // The queued hue, matching backlog everywhere else in the app.
    color: '#d98b3a',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'col-favorites',
    name: 'All-Time Favorites',
    description: 'Favorite games',
    icon: 'Heart',
    color: '#f2686f',
    isSystem: false,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'col-masterpieces',
    name: '100% Platinum Club',
    description: 'Games finished to 100%',
    icon: 'Trophy',
    color: '#ffd36b',
    isSystem: false,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
];

/**
 * Restores the app-owned colour on system collections. Their colour is identity
 * rather than user data, so a row saved under an older palette must not keep
 * showing the old one — re-running the schema cannot repair saved rows.
 */
export const withSystemColors = (collections: Collection[]): Collection[] =>
  collections.map((collection) => {
    const preset = DEFAULT_COLLECTIONS.find((d) => d.id === collection.id && d.isSystem);
    return preset ? { ...collection, color: preset.color } : collection;
  });

/**
 * Accent colours offered when creating a collection. These are stored as data on
 * the collection row (users pick one), which is why they are literal values
 * rather than token classes — but the palette itself lives here, once.
 */
export const COLLECTION_COLORS = [
  '#4d9bf0',
  '#66c0f4',
  '#4fc38a',
  '#ffd36b',
  '#d98b3a',
  '#f2686f',
  '#b8ae9f',
];

export const DEFAULT_COLLECTION_COLOR = COLLECTION_COLORS[0];
