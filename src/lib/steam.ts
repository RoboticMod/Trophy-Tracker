import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Live Steam data, by way of the game-data edge function.
 *
 * Nothing here talks to Steam directly: SteamRaw, the store and the Web API all
 * refuse a browser (no CORS headers), and the Web API needs a key that must not
 * be in a bundle. The function holds both problems, and this module is the
 * client for it — a cache in front, the same shape of result the catalog search
 * already returns, and never a throw at the call site.
 */

/* -------------------------------------------------------------------------- */
/* Shapes                                                                      */
/* -------------------------------------------------------------------------- */

export interface SteamSearchResult {
  appid: number;
  name: string;
  type: string;
  players_now: number | null;
  image: string | null;
}

export interface SteamReviews {
  label: string | null;
  score: number | null;
  positivePercent: number | null;
  positive: number;
  negative: number;
  total: number;
}

export interface SteamScreenshot {
  id: number;
  thumbnail: string;
  full: string;
}

export interface SteamVideo {
  id: number;
  name: string;
  thumbnail: string;
  webm: string | null;
  mp4: string | null;
}

export interface SteamAppInfo {
  appid: number;
  name: string;
  type: string;
  releaseDate: string | null;
  releaseDateLabel: string | null;
  comingSoon: boolean;
  developer: string | null;
  publisher: string | null;
  headerImage: string | null;
  description: string | null;
  website: string | null;
  genres: string[];
  tags: string[];
  achievements: number;
  reviews: SteamReviews | null;
  metacritic: number | null;
  players: {
    now: number | null;
    peak24h: number | null;
    peakAllTime: number | null;
    rank: number | null;
  };
  price: {
    isFree: boolean;
    cents: number | null;
    initialCents: number | null;
    discountPercent: number;
    currency: string;
  };
  lastUpdatedAt: string | null;
  screenshots: SteamScreenshot[];
  videos: SteamVideo[];
}

export type PlayerRange = '24h' | '7d' | '30d' | '1y' | 'all';

export const PLAYER_RANGES: PlayerRange[] = ['24h', '7d', '30d', '1y'];

/** Short labels for the range chips. */
export const PLAYER_RANGE_LABELS: Record<PlayerRange, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
  '1y': '1 year',
  all: 'All time',
};

export interface PlayerSeries {
  range: string;
  points: { ts: number; players: number }[];
}

export interface SteamAccount {
  steamId: string;
  persona?: string;
}

export interface SteamAchievementState {
  appid: number;
  unlocked: number;
  total: number;
  /** False when the profile's game details are private. */
  visible: boolean;
  error: string | null;
  lastUnlockedAt: string | null;
  /** Steam's own playtime for this app, to a tenth of an hour. */
  hoursPlayed: number | null;
  lastPlayedAt: string | null;
}

export interface SteamLibraryGame {
  appid: number;
  name: string;
  hoursPlayed: number;
  lastPlayedAt: string | null;
}

/* -------------------------------------------------------------------------- */
/* Result type                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Why a lookup came back with nothing. The UI renders each of these as its own
 * state, so a private Steam profile never reads as "this game does not exist".
 */
export type SteamError =
  | 'not-configured'
  | 'not-signed-in'
  | 'not-linked'
  | 'not-found'
  | 'private-profile'
  | 'request-failed';

export interface SteamResult<T> {
  data?: T;
  error?: SteamError;
}

/* -------------------------------------------------------------------------- */
/* Cache — the same generation-versioned localStorage pattern rawg.ts uses     */
/* -------------------------------------------------------------------------- */

const CACHE_ROOT = 'trophytracker_steam_';
const CACHE_PREFIX = `${CACHE_ROOT}v1_`;

/** Per-kind lifetimes, matching what the function itself allows. */
const TTL = {
  app: 6 * 60 * 60 * 1000,
  players: 15 * 60 * 1000,
  search: 60 * 60 * 1000,
};

interface CacheEntry<T> {
  at: number;
  value: T;
}

function readCache<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.at > ttl) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // Quota, or private browsing. A cache that cannot be written is only slow.
  }
}

function cacheKeys(predicate: (key: string) => boolean = () => true): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_ROOT) && predicate(key)) keys.push(key);
    }
  } catch {
    // Private browsing.
  }
  return keys;
}

const drop = (keys: string[]) =>
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });

export const getSteamCacheCount = (): number => cacheKeys().length;
export const clearSteamCache = (): void => drop(cacheKeys());

// Retire any older generation on load, the way the catalog cache does.
drop(cacheKeys((key) => !key.startsWith(CACHE_PREFIX)));

/* -------------------------------------------------------------------------- */
/* Transport                                                                   */
/* -------------------------------------------------------------------------- */

const functionUrl = (path: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-data${path}`;

/**
 * Calls the function with the caller's session.
 *
 * Errors are values, not exceptions: a games list must keep working when Steam
 * is unreachable, and every caller here renders a state rather than a stack.
 */
async function call<T>(path: string): Promise<SteamResult<T>> {
  if (!isSupabaseConfigured) return { error: 'not-configured' };

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { error: 'not-signed-in' };

    const response = await fetch(functionUrl(path), {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      },
    });

    if (response.status === 404) return { error: 'not-found' };
    if (!response.ok) return { error: 'request-failed' };

    return { data: (await response.json()) as T };
  } catch {
    return { error: 'request-failed' };
  }
}

/* -------------------------------------------------------------------------- */
/* Catalog                                                                     */
/* -------------------------------------------------------------------------- */

/** Steam's own catalog, for matching a tracked game to a store entry. */
export async function searchSteam(query: string): Promise<SteamResult<SteamSearchResult[]>> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return { data: [] };

  const cached = readCache<SteamSearchResult[]>(`search:${trimmed}`, TTL.search);
  if (cached) return { data: cached };

  const result = await call<{ results: SteamSearchResult[] }>(
    `/search?q=${encodeURIComponent(trimmed)}`,
  );
  if (!result.data) return { error: result.error };

  writeCache(`search:${trimmed}`, result.data.results);
  return { data: result.data.results };
}

export async function getSteamApp(appid: number): Promise<SteamResult<SteamAppInfo>> {
  const cached = readCache<SteamAppInfo>(`app:${appid}`, TTL.app);
  if (cached) return { data: cached };

  const result = await call<SteamAppInfo>(`/app/${appid}`);
  if (result.data) writeCache(`app:${appid}`, result.data);
  return result;
}

/**
 * The game's own lettering, for the middle of a card.
 *
 * `null` is an answer, not a failure: plenty of games have no logo anywhere,
 * and a caller that treated "none" as an error would ask again every sync.
 * Only an unreachable function comes back as an error.
 */
export async function getGameLogo(
  title: string,
  appid?: number,
): Promise<SteamResult<{ logo: string | null }>> {
  const params = new URLSearchParams({ title });
  if (appid) params.set('appid', String(appid));
  return call<{ logo: string | null }>(`/logo?${params.toString()}`);
}

/**
 * A portrait poster for a list preview. Like the logo, `null` is an answer —
 * most PlayStation games without an upload have none — and only an
 * unreachable function is an error.
 */
export async function getGamePoster(
  title: string,
  appid?: number,
): Promise<SteamResult<{ poster: string | null }>> {
  const params = new URLSearchParams({ title });
  if (appid) params.set('appid', String(appid));
  return call<{ poster: string | null }>(`/poster?${params.toString()}`);
}

export async function getPlayerSeries(
  appid: number,
  range: PlayerRange,
): Promise<SteamResult<PlayerSeries>> {
  const cached = readCache<PlayerSeries>(`players:${appid}:${range}`, TTL.players);
  if (cached) return { data: cached };

  const result = await call<PlayerSeries>(`/app/${appid}/players?range=${range}`);
  if (result.data) writeCache(`players:${appid}:${range}`, result.data);
  return result;
}

/* -------------------------------------------------------------------------- */
/* This user's account                                                         */
/* -------------------------------------------------------------------------- */

/** Accepts a SteamID64, a vanity name, or a profile URL. Never cached. */
export const resolveSteamAccount = (input: string): Promise<SteamResult<SteamAccount>> =>
  call<SteamAccount>(`/me/steam/resolve?q=${encodeURIComponent(input.trim())}`);

export const getSteamLibrary = async (
  steamId: string,
): Promise<SteamResult<SteamLibraryGame[]>> => {
  const result = await call<{ games: SteamLibraryGame[] }>(`/me/steam/library?steamId=${steamId}`);
  return result.data ? { data: result.data.games } : { error: result.error };
};

export async function getSteamAchievements(
  steamId: string,
  appid: number,
): Promise<SteamResult<SteamAchievementState>> {
  const result = await call<SteamAchievementState>(
    `/me/steam/achievements?steamId=${steamId}&appid=${appid}`,
  );

  // A profile that hides its game details answers successfully with nothing in
  // it, which would otherwise be read as a game with no achievements at all.
  if (result.data && !result.data.visible && result.data.total > 0) {
    return { error: 'private-profile' };
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* Links out                                                                   */
/* -------------------------------------------------------------------------- */

export const steamStoreUrl = (appid: number) => `https://store.steampowered.com/app/${appid}/`;
export const steamDbUrl = (appid: number) => `https://steamdb.info/app/${appid}/`;
export const steamCommunityUrl = (appid: number) =>
  `https://steamcommunity.com/app/${appid}/discussions/`;

/** PlayStation has no per-title API to link to, so the store search stands in. */
export const playstationStoreSearchUrl = (title: string) =>
  `https://store.playstation.com/search/${encodeURIComponent(title)}`;
