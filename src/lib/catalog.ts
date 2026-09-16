import { Platform } from '../types';
import { detectPlatformFromRawg, rawgApiKey, searchGames } from './rawg';
import { getSteamApp, getSteamLibrary, searchSteam, SteamError } from './steam';
import { snapRating } from './rating';
import { formatCount } from './format';
import { oneOf } from './usePersistentState';
import { useSyncedPreference } from './useSyncedPreference';

/**
 * Finding a game to add, from whichever catalog is in use.
 *
 * Steam is the default: the app already talks to it for linking and sync, so a
 * game picked from its store arrives already linked, with its achievement count
 * filled in, and starts syncing straight away. RAWG remains as an opt-in for
 * anyone who prefers its metadata and has a key of their own.
 */

export type CatalogSource = 'steam' | 'rawg';
export const CATALOG_SOURCES: CatalogSource[] = ['steam', 'rawg'];

export const CATALOG_SOURCE_LABELS: Record<CatalogSource, string> = {
  steam: 'Steam',
  rawg: 'RAWG',
};

const isString = (value: unknown): value is string => typeof value === 'string';

/** Which catalog search uses, and the RAWG key if that one is chosen. */
export function useCatalogSettings() {
  const [source, setSource] = useSyncedPreference<CatalogSource>(
    'catalog-source',
    'steam',
    oneOf(CATALOG_SOURCES),
  );
  const [rawgKey, setRawgKey] = useSyncedPreference<string>('rawg-key', '', isString);

  return { source, setSource, rawgKey, setRawgKey };
}

/** One search result, the same shape whichever catalog it came from. */
export interface CatalogResult {
  key: string;
  source: CatalogSource;
  title: string;
  image?: string;
  /** The platform a result suggests. Steam results are Steam games. */
  platform: Platform;
  releaseDate?: string;
  genres: string[];
  /** A short second line: year and genre, or hours for your own games. */
  subtitle: string;
  steamAppId?: number;
  rawgId?: number;
  /** Already on this app's 0-10 scale. */
  rating?: number;
}

export type CatalogError = 'missing-key' | 'request-failed' | 'not-signed-in';

export interface CatalogResponse {
  results: CatalogResult[];
  error?: CatalogError;
  /**
   * The results are your own recently played Steam games rather than matches
   * for a query — what an empty Steam search shows, since Steam has no
   * "popular" listing to fall back on.
   */
  recent?: boolean;
}

/** Steam's header art, which every app has at a predictable address. */
const steamHeader = (appid: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;

const steamError = (error?: SteamError): CatalogError =>
  error === 'not-signed-in' || error === 'not-configured' ? 'not-signed-in' : 'request-failed';

const yearOf = (date?: string | null) => date?.slice(0, 4);

async function searchSteamCatalog(query: string, steamId?: string): Promise<CatalogResponse> {
  if (!query.trim()) {
    if (!steamId) return { results: [] };

    const library = await getSteamLibrary(steamId);
    if (!library.data) return { results: [], error: steamError(library.error) };

    const recent = library.data
      .filter((game) => game.lastPlayedAt)
      .sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime())
      .slice(0, 16)
      .map<CatalogResult>((game) => ({
        key: `steam-${game.appid}`,
        source: 'steam',
        title: game.name,
        image: steamHeader(game.appid),
        platform: 'steam',
        genres: [],
        subtitle: `${game.hoursPlayed}h played`,
        steamAppId: game.appid,
      }));

    return { results: recent, recent: true };
  }

  const found = await searchSteam(query);
  if (!found.data) return { results: [], error: steamError(found.error) };

  return {
    results: found.data
      // DLC, soundtracks and tools share the catalog. A missing type is kept
      // rather than guessed at.
      .filter((app) => !app.type || app.type === 'game')
      .map<CatalogResult>((app) => ({
        key: `steam-${app.appid}`,
        source: 'steam',
        title: app.name,
        image: app.image ?? steamHeader(app.appid),
        platform: 'steam',
        genres: [],
        subtitle:
          app.players_now !== null && app.players_now > 0
            ? `${formatCount(app.players_now)} playing now`
            : 'Steam',
        steamAppId: app.appid,
      })),
  };
}

async function searchRawgCatalog(query: string, key?: string): Promise<CatalogResponse> {
  const response = await searchGames(query, key);
  return {
    error: response.error,
    results: response.results.map((game) => ({
      key: `rawg-${game.id}`,
      source: 'rawg',
      title: game.name,
      image: game.background_image,
      platform: detectPlatformFromRawg(game),
      releaseDate: game.released,
      genres: game.genres?.map((g) => g.name) ?? [],
      subtitle: `${yearOf(game.released) || 'TBA'} • ${game.genres?.[0]?.name || 'Video game'}`,
      rawgId: game.id,
      // RAWG scores out of 5; this app scores out of 10.
      rating: game.rating ? snapRating(Math.min(5, Math.max(0, game.rating)) * 2) : undefined,
    })),
  };
}

export function searchCatalog(
  query: string,
  options: { source: CatalogSource; rawgKey?: string; steamId?: string },
): Promise<CatalogResponse> {
  return options.source === 'rawg'
    ? searchRawgCatalog(query, options.rawgKey)
    : searchSteamCatalog(query, options.steamId);
}

/** Whether RAWG can be searched at all, with the saved key or the build's own. */
export const canSearchRawg = (key?: string) => Boolean(rawgApiKey(key));

/** What a Steam pick adds once its store page has been read. */
export interface SteamDetails {
  image?: string;
  releaseDate?: string;
  genres: string[];
  achievementsTotal: number;
}

/**
 * The store details a search result does not carry.
 *
 * Search returns a name and an id; the store page has the genres, the release
 * date, and — the one that matters most here — how many achievements there are,
 * so a game added from search is not a 0 / 0 until its first sync.
 */
export async function steamDetails(appid: number): Promise<SteamDetails | null> {
  const app = await getSteamApp(appid);
  if (!app.data) return null;
  return {
    image: app.data.headerImage ?? undefined,
    releaseDate: app.data.releaseDate ?? undefined,
    genres: app.data.genres,
    achievementsTotal: app.data.achievements,
  };
}
