import { Platform, PlatformConfig, Collection, isPlatform } from '../types';
import {
  BACKLOG_COLLECTION_ID,
  BEATEN_COLLECTION_ID,
  COMPLETE_COLLECTION_ID,
  DEFAULT_PERMANENT_NAMES,
  PLAYING_COLLECTION_ID,
  isPermanentCollection,
} from './collections';

export const APP_NAME = 'Trophy Tracker';

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  steam: {
    id: 'steam',
    name: 'Steam',
    shortName: 'Steam',
    color: '#2d5fb4',
    tint: 'rgb(45 95 180 / 0.42)',
    surfaceClass: 'bg-steam-700/15 text-steam-900',
  },
  ps5: {
    id: 'ps5',
    name: 'PlayStation',
    shortName: 'PS',
    color: '#14b4ff',
    tint: 'rgb(20 180 255 / 0.32)',
    surfaceClass: 'bg-playstation-700/15 text-playstation-900',
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

/** Human-readable summary of an order, e.g. "Steam → PS". */
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

/**
 * The collections every account has, seeded on first load and re-asserted on
 * every load after it.
 *
 * The first four are the permanent shelves — a game sits on at most one of
 * them, and none of them can be deleted, so the app can always answer "where is
 * this game" without a lazy re-creation dance. The rest are ordinary starter
 * lists, deletable like any other.
 */
export const DEFAULT_COLLECTIONS: Collection[] = [
  {
    id: BACKLOG_COLLECTION_ID,
    name: DEFAULT_PERMANENT_NAMES[BACKLOG_COLLECTION_ID],
    description: 'Games queued to play',
    icon: 'Clock',
    // Neutral, matching the backlog everywhere else in the app.
    color: '#a5a5ad',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: PLAYING_COLLECTION_ID,
    name: DEFAULT_PERMANENT_NAMES[PLAYING_COLLECTION_ID],
    description: 'Games on the go',
    icon: 'Gamepad2',
    color: '#4d9bf0',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: BEATEN_COLLECTION_ID,
    name: DEFAULT_PERMANENT_NAMES[BEATEN_COLLECTION_ID],
    description: 'Finished, awards still to earn',
    icon: 'Flag',
    color: '#52c294',
    createdAt: '2026-01-02T12:00:00.000Z',
  },
  {
    id: COMPLETE_COLLECTION_ID,
    name: DEFAULT_PERMANENT_NAMES[COMPLETE_COLLECTION_ID],
    description: 'Every award earned',
    icon: 'Trophy',
    color: '#f2c14e',
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'col-favorites',
    name: 'All-Time Favorites',
    description: 'Favorite games',
    icon: 'Heart',
    color: '#ec5b62',
    createdAt: '2026-01-04T00:00:00.000Z',
  },
];

/**
 * Restores the app-owned colour on the permanent collections. Their colour is
 * identity rather than user data, so a row saved under an older palette must not
 * keep showing the old one — re-running the schema cannot repair saved rows.
 */
export const withPermanentColors = (collections: Collection[]): Collection[] =>
  collections.map((collection) => {
    if (!isPermanentCollection(collection.id)) return collection;
    const preset = DEFAULT_COLLECTIONS.find((d) => d.id === collection.id);
    return preset ? { ...collection, color: preset.color } : collection;
  });

/**
 * Adds any permanent collection this account is missing, in the canonical
 * order. Run on every load rather than only on an empty account, so a row
 * deleted out of band — an old backup, a hand-run delete — comes back instead
 * of leaving a shelf that games can be on but nothing can show.
 *
 * Returns the same array when nothing was missing, so a caller can tell whether
 * there is anything to write back.
 */
export const withPermanentCollections = (collections: Collection[]): Collection[] => {
  const missing = DEFAULT_COLLECTIONS.filter(
    (preset) => isPermanentCollection(preset.id) && !collections.some((c) => c.id === preset.id),
  );
  return missing.length ? [...missing, ...collections] : collections;
};

/**
 * Accent colours offered when creating a collection. These are stored as data on
 * the collection row (users pick one), which is why they are literal values
 * rather than token classes — but the palette itself lives here, once.
 */
export const COLLECTION_COLORS = [
  '#4d9bf0',
  '#66c0f4',
  '#52c294',
  '#f2c14e',
  '#edaa30',
  '#ec5b62',
  '#c8c8cf',
];

export const DEFAULT_COLLECTION_COLOR = COLLECTION_COLORS[0];
