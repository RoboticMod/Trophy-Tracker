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
 * filled in, and starts syncing straight away. RAWG is an opt-in for anyone who
 * prefers its metadata and has a key of their own — and searching both at once
 * finds the console games Steam does not sell, while a game both know about is
 * shown once, with the choice of whose details to use.
 */

export type CatalogSource = 'steam' | 'rawg' | 'both';
export const CATALOG_SOURCES: CatalogSource[] = ['steam', 'rawg', 'both'];

/** A catalog a single result can actually come from. */
export type ResultSource = Exclude<CatalogSource, 'both'>;

export const CATALOG_SOURCE_LABELS: Record<CatalogSource, string> = {
  steam: 'Steam',
  rawg: 'RAWG',
  both: 'Steam + RAWG',
};

/** Whether a source needs a RAWG key to search. */
export const usesRawg = (source: CatalogSource) => source !== 'steam';

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
  source: ResultSource;
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
  /**
   * The same game from the other catalog, when searching both found it twice.
   * The pair is shown as one result, and adding it asks which version to use.
   */
  twin?: CatalogResult;
}

/**
 * The version of a result to add.
 *
 * Choosing RAWG's details for a game Steam also sells keeps the Steam link, so
 * the game still gets its store media and — on Steam — its synced progress.
 */
export function pickVersion(result: CatalogResult, source: ResultSource): CatalogResult {
  if (result.source === source || !result.twin) return { ...result, twin: undefined };
  const other = result.twin;
  return {
    ...other,
    steamAppId: other.steamAppId ?? result.steamAppId,
    rawgId: other.rawgId ?? result.rawgId,
    twin: undefined,
  };
}

export type CatalogError = 'missing-key' | 'request-failed' | 'not-signed-in';

export interface CatalogResponse {
  results: CatalogResult[];
  error?: CatalogError;
  /**
   * Searching both catalogs, but RAWG could not be asked — only Steam's results
   * are here.
   */
  rawgSkipped?: CatalogError;
  /**
   * The results are your own recently played Steam games rather than matches
   * for a query — what an empty Steam search shows, since Steam has no
   * "popular" listing to fall back on.
   */
  recent?: boolean;
}

const steamError = (error?: SteamError): CatalogError =>
  error === 'not-signed-in' || error === 'not-configured' ? 'not-signed-in' : 'request-failed';

const yearOf = (date?: string | null) => date?.slice(0, 4);

async function searchSteamCatalog(
  query: string,
  options: { steamId?: string; rawgKey?: string },
): Promise<CatalogResponse> {
  const { steamId, rawgKey } = options;

  if (!query.trim()) {
    if (!steamId) return { results: [] };

    const library = await getSteamLibrary(steamId);
    if (!library.data) return { results: [], error: steamError(library.error) };

    const recent = library.data
      .filter((game) => game.lastPlayedAt)
      .sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime())
      .slice(0, 16);

    // No query to look these up under, so each is asked for by name — and
    // every one of them is cached for a day afterwards.
    const art = await rawgCovers(
      recent.map((game) => game.name),
      rawgKey,
    );

    return {
      results: recent.map<CatalogResult>((game, index) => ({
        key: `steam-${game.appid}`,
        source: 'steam',
        title: game.name,
        image: art[index],
        platform: 'steam',
        genres: [],
        subtitle: `${game.hoursPlayed}h played`,
        steamAppId: game.appid,
      })),
      recent: true,
    };
  }

  const [found, art] = await Promise.all([searchSteam(query), rawgArtwork(query, rawgKey)]);
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
        image: art.get(matchKey(app.name)),
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

/** Letters and digits only, so "DOOM: The Dark Ages™" and "Doom The Dark Ages" meet. */
const matchKey = (title: string) =>
  title
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9]+/g, '');

/* -------------------------------------------------------------------------- */
/* Cover art                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every cover in the app comes from RAWG, whichever catalog found the game.
 *
 * Steam's own art is a 460×215 store banner with the game's logo burned into
 * it, sized for a shop listing; RAWG's is key art. A grid mixing the two reads
 * as two applications stuck together, and the banners lose half their height to
 * a 16:9 tile. So Steam results borrow RAWG's artwork, and a title RAWG does
 * not know keeps the plain lettered tile rather than falling back to a banner —
 * the same rule CoverArt already follows for a game with no art at all.
 */

/**
 * RAWG's artwork for everything one search turns up, keyed for matching.
 *
 * One request covers a whole page of Steam results, which is the difference
 * between a search costing one call and costing sixteen.
 */
async function rawgArtwork(query: string, key?: string): Promise<Map<string, string>> {
  const art = new Map<string, string>();
  if (!query.trim() || !canSearchRawg(key)) return art;

  const { results } = await searchGames(query, key);
  results.forEach((game) => {
    const image = game.background_image;
    const found = matchKey(game.name);
    if (image && !art.has(found)) art.set(found, image);
  });
  return art;
}

/**
 * RAWG's artwork for one title, or nothing.
 *
 * Only an exact match — punctuation and trademarks aside — is accepted. RAWG
 * answers a search for a game it has never heard of with the nearest thing it
 * does have, and dressing a game in another game's key art misrepresents it far
 * more than a lettered tile does.
 */
export async function rawgCover(title: string, key?: string): Promise<string | undefined> {
  const art = await rawgArtwork(title, key);
  return art.get(matchKey(title));
}

/** How many titles are asked about at once when there is no query to share. */
const COVER_BATCH = 4;

/**
 * Artwork for a list of titles, a few at a time.
 *
 * Sixteen simultaneous requests is a burst RAWG is entitled to refuse, and a
 * refused lookup costs the game its cover for the session. Four at a time is
 * four quick rounds instead, and only ever on a cold cache.
 */
async function rawgCovers(titles: string[], key?: string): Promise<(string | undefined)[]> {
  const covers: (string | undefined)[] = [];

  for (let i = 0; i < titles.length; i += COVER_BATCH) {
    const batch = titles.slice(i, i + COVER_BATCH);
    covers.push(...(await Promise.all(batch.map((title) => rawgCover(title, key)))));
  }
  return covers;
}

/** Whether a game still needs its cover fetching from RAWG. */
export const needsCover = (coverImage?: string): boolean =>
  !coverImage?.trim() || /(^|\.)steamstatic\.com|steamcdn|steampowered\.com/i.test(coverImage);

/**
 * Both catalogs at once, with a game both know about shown once.
 *
 * Results are ordered by their best rank in either list, so a strong match on
 * one side is not buried under the other's whole page. A game only RAWG has —
 * a PlayStation exclusive, usually — takes its place in the same order.
 */
async function searchBothCatalogs(
  query: string,
  rawgKey?: string,
  steamId?: string,
): Promise<CatalogResponse> {
  const rawgReady = canSearchRawg(rawgKey);

  // An empty box has no query to match on: your recent Steam games if there
  // are any, RAWG's popular list otherwise.
  if (!query.trim()) {
    if (steamId || !rawgReady) return searchSteamCatalog(query, { steamId, rawgKey });
    return searchRawgCatalog(query, rawgKey);
  }

  const [steam, rawg] = await Promise.all([
    searchSteamCatalog(query, { steamId, rawgKey }),
    rawgReady
      ? searchRawgCatalog(query, rawgKey)
      : Promise.resolve<CatalogResponse>({ results: [], error: 'missing-key' }),
  ]);

  if (steam.error && rawg.error) return { results: [], error: steam.error };

  const ranked = new Map<string, { result: CatalogResult; rank: number }>();
  steam.results.forEach((result, rank) => {
    const key = matchKey(result.title);
    if (!ranked.has(key)) ranked.set(key, { result, rank });
  });
  rawg.results.forEach((result, rank) => {
    const key = matchKey(result.title);
    const existing = ranked.get(key);
    if (!existing) {
      ranked.set(key, { result, rank });
    } else if (existing.result.source === 'steam' && !existing.result.twin) {
      existing.result = { ...existing.result, twin: result };
      existing.rank = Math.min(existing.rank, rank);
    }
  });

  return {
    results: [...ranked.values()]
      .sort((a, b) => a.rank - b.rank)
      .map((entry) => entry.result),
    rawgSkipped: rawg.error,
  };
}

export function searchCatalog(
  query: string,
  options: { source: CatalogSource; rawgKey?: string; steamId?: string },
): Promise<CatalogResponse> {
  if (options.source === 'both') {
    return searchBothCatalogs(query, options.rawgKey, options.steamId);
  }
  return options.source === 'rawg'
    ? searchRawgCatalog(query, options.rawgKey)
    : searchSteamCatalog(query, { steamId: options.steamId, rawgKey: options.rawgKey });
}

/** Whether RAWG can be searched at all, with the saved key or the build's own. */
export const canSearchRawg = (key?: string) => Boolean(rawgApiKey(key));

/** What a Steam pick adds once its store page has been read. */
export interface SteamDetails {
  releaseDate?: string;
  genres: string[];
  achievementsTotal: number;
}

/**
 * The store details a search result does not carry.
 *
 * Search returns a name and an id; the store page has the genres, the release
 * date, and — the one that matters most here — how many achievements there are,
 * so a game added from search is not a 0 / 0 until its first sync. Not the
 * cover: that comes from RAWG, whatever catalog the game was found in.
 */
export async function steamDetails(appid: number): Promise<SteamDetails | null> {
  const app = await getSteamApp(appid);
  if (!app.data) return null;
  return {
    releaseDate: app.data.releaseDate ?? undefined,
    genres: app.data.genres,
    achievementsTotal: app.data.achievements,
  };
}
