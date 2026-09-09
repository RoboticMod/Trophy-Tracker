import { RawgGameResult, Platform } from '../types';

/** Matches every cache generation, so stale ones can be counted and cleared. */
const CACHE_ROOT = 'gametracker_rawg_cache_';
/** v2 — v1 could hold results from the removed built-in catalog. */
const CACHE_PREFIX = `${CACHE_ROOT}v2_`;
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

async function fetchRawg(path: string): Promise<RawgGameResult[] | null> {
  try {
    const response = await fetch(`https://api.rawg.io/api/${path}`);
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data.results) ? (data.results as RawgGameResult[]) : null;
  } catch (err) {
    console.warn('RAWG request failed:', err);
    return null;
  }
}

/**
 * Catalog lookup against RAWG. An empty query lists what RAWG currently ranks
 * as popular; everything comes from the API, so a missing key or a failed
 * request returns nothing rather than invented titles.
 */
export async function searchGames(query: string, apiKey?: string): Promise<CatalogResponse> {
  const trimmed = query.trim().toLowerCase();
  const cacheKey = trimmed || POPULAR_CACHE_KEY;

  const cached = getFromCache(cacheKey);
  if (cached && cached.length > 0) {
    return { results: cached };
  }

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

export function detectPlatformFromRawg(result: RawgGameResult): Platform {
  const slugs = (result.platforms || []).map((p) => p.platform.slug.toLowerCase());
  if (slugs.some((s) => s.includes('playstation') || s.startsWith('ps'))) {
    return 'ps5';
  }
  return 'steam';
}
