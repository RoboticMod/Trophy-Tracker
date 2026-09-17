import { Platform, PLATFORM_IDS, RawgGameResult } from '../types';
import {
  cachedGames,
  detectPlatformFromRawg,
  platformsFromRawg,
  rawgApiKey,
  searchGames,
} from './rawg';
import { getSteamApp, getSteamLibrary, searchSteam, SteamError } from './steam';
import { snapRating } from './rating';
import { formatCount, formatHours } from './format';
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
  /** The platform this result would be added on. Steam results are Steam games. */
  platform: Platform;
  /**
   * Every platform the catalog says the game is on, which is usually more than
   * the one it would be added on. Absent where only the one is known.
   */
  platforms?: Platform[];
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
 * The platforms a result says the game is on.
 *
 * Which database answered is not what anyone wants to know from a result — it
 * is which machines the game runs on. A game Steam sells is on Steam; a game
 * RAWG lists against a PlayStation is on PS5; a game found in both is usually
 * both, and shows both marks. It is the same fact the card will carry once the
 * game is added, since the platform a result is added on is this one.
 */
export const resultPlatforms = (result: CatalogResult): Platform[] => {
  const found = [
    result.platform,
    ...(result.platforms ?? []),
    ...(result.twin ? [result.twin.platform, ...(result.twin.platforms ?? [])] : []),
  ];
  return PLATFORM_IDS.filter((platform) => found.includes(platform));
};

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

    // There is no query to look these up under, so it is one lookup per title.
    // The list is not made to wait on sixteen of them: whatever the cache
    // already has is used now, and the rest are fetched in the background so
    // the next look has them. A dialog that opens at once matters more than a
    // thumbnail that is there the first time.
    const names = recent.map((game) => game.name);
    void rawgCovers(names, rawgKey);

    return {
      results: recent.map<CatalogResult>((game) => {
        const facts = cachedFacts(game.name);
        return {
          key: `steam-${game.appid}`,
          source: 'steam',
          title: game.name,
          image: facts?.image,
          platform: 'steam',
          platforms: steamAnd(facts),
          genres: [],
          subtitle: `${formatHours(game.hoursPlayed)}h played`,
          steamAppId: game.appid,
        };
      }),
      recent: true,
    };
  }

  const [found, matches] = await Promise.all([searchSteam(query), rawgMatches(query, rawgKey)]);
  if (!found.data) return { results: [], error: steamError(found.error) };

  return {
    results: found.data
      // DLC, soundtracks and tools share the catalog. A missing type is kept
      // rather than guessed at.
      .filter((app) => !app.type || app.type === 'game')
      .map<CatalogResult>((app) => {
        const facts = matches.get(matchKey(app.name));
        return {
          key: `steam-${app.appid}`,
          source: 'steam',
          title: app.name,
          image: facts?.image,
          platform: 'steam',
          platforms: steamAnd(facts),
          genres: [],
          subtitle:
            app.players_now !== null && app.players_now > 0
              ? `${formatCount(app.players_now)} playing now`
              : 'Steam',
          steamAppId: app.appid,
        };
      }),
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
      platforms: platformsFromRawg(game),
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

/** What RAWG knows about a title that a Steam result does not carry. */
interface RawgFacts {
  image?: string;
  /** Every platform RAWG lists, which is how a Steam result learns it is on PS5. */
  platforms: Platform[];
}

const factsOf = (game: RawgGameResult): RawgFacts => ({
  image: game.background_image,
  platforms: platformsFromRawg(game),
});

/**
 * Steam, plus whatever else RAWG says the game is on.
 *
 * A Steam result knows one thing about itself for certain. RAWG is what tells
 * it the same game is on the PlayStation as well — which is the whole point of
 * the marks on a result, and was the half that was missing whenever the two
 * catalogs failed to pair the title up.
 */
const steamAnd = (facts?: RawgFacts): Platform[] => [
  'steam',
  ...(facts?.platforms ?? []).filter((platform) => platform !== 'steam'),
];

/**
 * What RAWG has for everything one search turns up, keyed for matching.
 *
 * One request covers a whole page of Steam results, which is the difference
 * between a search costing one call and costing sixteen.
 */
async function rawgMatches(query: string, key?: string): Promise<Map<string, RawgFacts>> {
  const found = new Map<string, RawgFacts>();
  if (!query.trim() || !canSearchRawg(key)) return found;

  const { results } = await searchGames(query, key);
  results.forEach((game) => {
    const title = matchKey(game.name);
    if (!found.has(title)) found.set(title, factsOf(game));
  });
  return found;
}

/**
 * What RAWG has for one title, or nothing.
 *
 * Only an exact match — punctuation and trademarks aside — is accepted. RAWG
 * answers a search for a game it has never heard of with the nearest thing it
 * does have, and dressing a game in another game's key art misrepresents it far
 * more than a lettered tile does.
 */
export async function rawgFacts(title: string, key?: string): Promise<RawgFacts | undefined> {
  const matches = await rawgMatches(title, key);
  return matches.get(matchKey(title));
}

/** Just the artwork, for the callers that only want a cover. */
export const rawgCover = async (title: string, key?: string): Promise<string | undefined> =>
  (await rawgFacts(title, key))?.image;

/** The same lookup against what has already been fetched, with no request. */
const cachedFacts = (title: string): RawgFacts | undefined => {
  const wanted = matchKey(title);
  const game = cachedGames(title)?.find((entry) => matchKey(entry.name) === wanted);
  return game ? factsOf(game) : undefined;
};

/** How many titles are asked about at once when there is no query to share. */
const COVER_BATCH = 4;

/**
 * Artwork for a list of titles, a few at a time.
 *
 * Sixteen simultaneous requests is a burst RAWG is entitled to refuse, and a
 * refused lookup costs the game its cover for the session. Four at a time is
 * four quick rounds instead, and only ever on a cold cache.
 */
async function rawgCovers(titles: string[], key?: string): Promise<void> {
  for (let i = 0; i < titles.length; i += COVER_BATCH) {
    const batch = titles.slice(i, i + COVER_BATCH);
    await Promise.all(batch.map((title) => rawgFacts(title, key)));
  }
}

/* -------------------------------------------------------------------------- */
/* Games you already have                                                      */
/* -------------------------------------------------------------------------- */

/** The fields that identify a game, whether it is a result or a library entry. */
export interface GameIdentity {
  platform: Platform;
  title: string;
  steamAppId?: number;
  rawgId?: number;
}

/**
 * The library entry a result already is, if there is one.
 *
 * Matched on the platform as well as the game, deliberately: owning Doom on
 * Steam and on the PlayStation is two entries here, with two sets of unlocks
 * and two different counts, and refusing the second would be refusing something
 * the app is built to track. The same game on the same platform is a duplicate,
 * and is one whether it was matched by store id or only by name — a game added
 * by hand years ago has no id to match on.
 */
export function findInLibrary<T extends GameIdentity>(
  games: T[],
  result: GameIdentity,
): T | undefined {
  const title = matchKey(result.title);

  return games.find(
    (game) =>
      game.platform === result.platform &&
      ((result.steamAppId !== undefined && game.steamAppId === result.steamAppId) ||
        (result.rawgId !== undefined && game.rawgId === result.rawgId) ||
        matchKey(game.title) === title),
  );
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
