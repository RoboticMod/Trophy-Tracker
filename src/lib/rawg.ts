import { RawgGameResult, Platform } from '../types';
import { coverUrl } from './image';

/** Matches every cache generation, so stale ones can be counted and cleared. */
const CACHE_ROOT = 'gametracker_rawg_cache_';
/**
 * v3 — v1 could hold results from the removed built-in catalog, and v2 stored
 * RAWG's replies whole: screenshots, tags, stores, rating breakdowns, tens of
 * kilobytes per search. Reading a handful of those back cost more time than the
 * request that filled them. This generation keeps only the fields the app
 * reads, so an entry is about a kilobyte.
 */
const CACHE_PREFIX = `${CACHE_ROOT}v3_`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Cache key for the no-query listing of popular titles. */
const POPULAR_CACHE_KEY = '__popular__';

interface CacheEntry {
  timestamp: number;
  results: RawgGameResult[];
}

/** Why a catalog lookup came back with nothing to show. */
export type CatalogError = 'missing-key' | 'request-failed';

export interface CatalogResponse {
  results: RawgGameResult[];
  error?: CatalogError;
}

function getFromCache(key: string): RawgGameResult[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.results;
  } catch (e) {
    return null;
  }
}

function setInCache(key: string, results: RawgGameResult[]) {
  try {
    const entry: CacheEntry = {
      timestamp: Date.now(),
      results,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // quota exceeded or private browsing
  }
}

/** Every cache key currently in localStorage, optionally filtered. */
function cacheKeys(predicate: (key: string) => boolean = () => true): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_ROOT) && predicate(key)) {
        keys.push(key);
      }
    }
  } catch (e) {
    // private browsing
  }
  return keys;
}

export function getRawgCacheCount(): number {
  return cacheKeys().length;
}

export function clearRawgCache(): void {
  cacheKeys().forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch (e) {
      // ignore
    }
  });
}

// Drop caches written by an older generation — v1 entries could contain
// results from the built-in catalog that no longer exists.
cacheKeys((key) => !key.startsWith(CACHE_PREFIX)).forEach((k) => {
  try {
    localStorage.removeItem(k);
  } catch (e) {
    // ignore
  }
});

/** The configured RAWG key, or undefined when the app has none. */
export function rawgApiKey(apiKey?: string): string | undefined {
  const key = (apiKey || import.meta.env.VITE_RAWG_API_KEY || '').trim();
  if (!key || key === 'YOUR_RAWG_API_KEY') return undefined;
  return key;
}

export const hasRawgKey = (): boolean => Boolean(rawgApiKey());

/**
 * Only the fields this app reads.
 *
 * RAWG answers a search with everything it knows — screenshots, tags, stores,
 * rating breakdowns — and a page of sixteen of those is the better part of a
 * megabyte. Keeping the whole reply meant every cached search had to be
 * stringified on the way in and parsed on the way out, which is work done on
 * the main thread while someone is typing.
 */
const slim = (game: RawgGameResult): RawgGameResult => ({
  id: game.id,
  name: game.name,
  // Stored at the size it will be shown at, so the cache is what everything
  // downstream — search rows, cards, the cover a game keeps — reads from.
  background_image: coverUrl(game.background_image),
  released: game.released,
  rating: game.rating,
  genres: game.genres?.map((genre) => ({ id: genre.id, name: genre.name })),
  platforms: game.platforms
    ?.filter((entry) => entry?.platform)
    .map((entry) => ({
      platform: {
        id: entry.platform.id,
        name: entry.platform.name,
        slug: entry.platform.slug,
      },
    })),
});

async function fetchRawg(path: string): Promise<RawgGameResult[] | null> {
  try {
    const response = await fetch(`https://api.rawg.io/api/${path}`);
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data.results) ? (data.results as RawgGameResult[]).map(slim) : null;
  } catch (err) {
    console.warn('RAWG request failed:', err);
    return null;
  }
}

/** What the cache already knows about a query, without asking RAWG. */
export const cachedGames = (query: string): RawgGameResult[] | null =>
  getFromCache(query.trim().toLowerCase() || POPULAR_CACHE_KEY);

/**
 * Searches already on their way out.
 *
 * Searching both catalogs asks RAWG for the same query twice — once for its own
 * results and once for the artwork the Steam results borrow — and the recent
 * list asks about a shelf of titles at once. Without this, each of those is a
 * separate request for an answer already in flight.
 */
const inFlight = new Map<string, Promise<CatalogResponse>>();

/**
 * Catalog lookup against RAWG. An empty query lists what RAWG currently ranks
 * as popular; everything comes from the API, so a missing key or a failed
 * request returns nothing rather than invented titles.
 */
export function searchGames(query: string, apiKey?: string): Promise<CatalogResponse> {
  const trimmed = query.trim().toLowerCase();
  const cacheKey = trimmed || POPULAR_CACHE_KEY;

  const cached = getFromCache(cacheKey);
  if (cached && cached.length > 0) return Promise.resolve({ results: cached });

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const request = requestGames(trimmed, cacheKey, apiKey);
  inFlight.set(cacheKey, request);
  void request.finally(() => inFlight.delete(cacheKey));
  return request;
}

async function requestGames(
  trimmed: string,
  cacheKey: string,
  apiKey?: string,
): Promise<CatalogResponse> {
  const key = rawgApiKey(apiKey);
  if (!key) {
    return { results: [], error: 'missing-key' };
  }

  const results = await fetchRawg(
    trimmed
      ? `games?key=${key}&search=${encodeURIComponent(trimmed)}&page_size=16`
      : `games?key=${key}&ordering=-added&page_size=16`,
  );

  if (!results) {
    return { results: [], error: 'request-failed' };
  }

  if (results.length > 0) {
    setInCache(cacheKey, results);
  }

  return { results };
}

/** RAWG's slugs for the desktop platforms, which this app calls Steam. */
const PC_SLUGS = new Set(['pc', 'macos', 'linux']);

/**
 * PlayStation generations this app can actually track.
 *
 * Trophies begin with the PS3, so those are the consoles a game here can have a
 * trophy list on. Matching anything starting "playstation" instead put a PS5
 * mark on Spider-Man (2000) — a PlayStation 1 game with no trophies to sync and
 * no shelf in this app to sit on.
 */
const PLAYSTATION_SLUGS = new Set([
  'playstation5',
  'playstation4',
  'playstation3',
  'ps-vita',
  'playstation-vita',
]);

/**
 * Every platform this app tracks that RAWG lists for a game.
 *
 * RAWG knows a game is on the PC *and* the PlayStation; collapsing that to one
 * answer was what left a result showing a single mark when it belongs on both
 * shelves.
 */
export function platformsFromRawg(result: RawgGameResult): Platform[] {
  const slugs = (result.platforms || []).map((entry) => entry.platform.slug.toLowerCase());
  const platforms: Platform[] = [];

  if (slugs.some((slug) => PC_SLUGS.has(slug))) platforms.push('steam');
  if (slugs.some((slug) => PLAYSTATION_SLUGS.has(slug))) platforms.push('ps5');
  return platforms;
}

/**
 * The one platform a RAWG result is added on.
 *
 * PlayStation wins where a game is on both: Steam's own catalog is the other
 * half of this search, so a game that turns up here and is on a console is
 * nearly always the console copy you came looking for.
 */
export function detectPlatformFromRawg(result: RawgGameResult): Platform {
  return platformsFromRawg(result).includes('ps5') ? 'ps5' : 'steam';
}
