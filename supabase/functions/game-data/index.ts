/**
 * Trophy Tracker — live game data.
 *
 * Everything this app wants to know about a game lives behind an API the
 * browser cannot call. SteamRaw, the Steam store and the Steam Web API all
 * answer a request perfectly happily and send no `Access-Control-Allow-Origin`
 * with it, so a fetch from the page is blocked before the response is read.
 * The Web API also needs a key, and a key shipped in a Vite bundle is a public
 * key. One function solves both: it holds the secret and it sends the header.
 *
 * Deploy:
 *   supabase secrets set STEAM_API_KEY=...
 *   supabase functions deploy game-data
 *
 * Every route requires the caller's Supabase session, so this is a proxy for
 * the people who are already signed in to this app and nobody else.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  exchangeRefreshTokenForAuthTokens,
  getProfileFromUserName,
  getTitleTrophies,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
} from 'npm:psn-api@2';

const STEAM_API_KEY = Deno.env.get('STEAM_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

/** SteamRaw asks callers to identify themselves, and it is fair to do so. */
const USER_AGENT = 'TrophyTracker/1.0 (+https://github.com/RoboticMod/Trophy-Tracker)';

const STEAMRAW = 'https://steamraw.com/api';
const STORE = 'https://store.steampowered.com/api';
const WEB_API = 'https://api.steampowered.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/** How long each kind of answer may be reused, in seconds. */
const CACHE = {
  /** Store copy, genres, reviews — changes on the scale of a patch. */
  app: 60 * 60 * 6,
  /** A player series whose newest sample is an hour old at most. */
  players: 60 * 15,
  search: 60 * 60,
  /** Your own progress. Short, because seeing it update is the point. */
  me: 60,
};

const json = (body: unknown, status = 200, maxAge = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      'Cache-Control': maxAge > 0 ? `public, max-age=${maxAge}, s-maxage=${maxAge}` : 'no-store',
    },
  });

const fail = (status: number, error: string) => json({ error }, status);

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Upstream shapes — only the fields this app actually reads                    */
/* -------------------------------------------------------------------------- */

interface RawApp {
  appid: number;
  name: string;
  type: string;
  developer?: string | null;
  publisher?: string | null;
  release_date?: number | null;
  coming_soon?: number;
  is_free?: number;
  price_cents?: number;
  initial_cents?: number;
  discount_pct?: number;
  currency?: string;
  header_image?: string | null;
  short_description?: string | null;
  genres?: string[];
  tag_names?: string[];
  metacritic?: number | null;
  review_score?: number | null;
  review_pct?: number | null;
  review_positive?: number | null;
  review_negative?: number | null;
  review_total?: number | null;
  review_label?: string | null;
  achievements?: number | null;
  players_now?: number | null;
  players_peak_24h?: number | null;
  players_peak_all?: number | null;
  players_rank?: number | null;
  last_change_at?: number | null;
}

interface StoreDetails {
  screenshots?: { id: number; path_thumbnail: string; path_full: string }[];
  movies?: {
    id: number;
    name: string;
    thumbnail: string;
    webm?: { max?: string; '480'?: string };
    mp4?: { max?: string; '480'?: string };
  }[];
  developers?: string[];
  publishers?: string[];
  website?: string | null;
  release_date?: { coming_soon: boolean; date: string };
  genres?: { id: string; description: string }[];
  short_description?: string;
  header_image?: string;
}

/* -------------------------------------------------------------------------- */
/* Steam: catalog and store                                                    */
/* -------------------------------------------------------------------------- */

async function appInfo(appid: number) {
  // Both upstreams at once: neither depends on the other, and the store is the
  // slower of the two.
  const [raw, store] = await Promise.all([
    getJson<RawApp>(`${STEAMRAW}/app/${appid}`),
    getJson<Record<string, { success: boolean; data?: StoreDetails }>>(
      `${STORE}/appdetails?appids=${appid}&cc=us&l=english`,
    ),
  ]);

  if (!raw) return null;
  const details = store?.[String(appid)]?.success ? store[String(appid)].data : undefined;

  return {
    appid: raw.appid,
    name: raw.name,
    type: raw.type,
    // SteamRaw dates are unix seconds; the store's is a display string that
    // varies by locale, so the numeric one wins where there is one.
    releaseDate: raw.release_date ? new Date(raw.release_date * 1000).toISOString() : null,
    releaseDateLabel: details?.release_date?.date ?? null,
    comingSoon: Boolean(raw.coming_soon) || Boolean(details?.release_date?.coming_soon),
    developer: details?.developers?.join(', ') || raw.developer || null,
    publisher: details?.publishers?.join(', ') || raw.publisher || null,
    headerImage: raw.header_image ?? details?.header_image ?? null,
    description: raw.short_description ?? details?.short_description ?? null,
    website: details?.website ?? null,
    genres: raw.genres ?? details?.genres?.map((g) => g.description) ?? [],
    // Ordered by how many people applied them, so the first handful are the
    // ones that actually describe the game.
    tags: (raw.tag_names ?? []).slice(0, 12),
    achievements: raw.achievements ?? 0,

    reviews: raw.review_total
      ? {
          label: raw.review_label ?? null,
          score: raw.review_score ?? null,
          positivePercent: raw.review_pct ?? null,
          positive: raw.review_positive ?? 0,
          negative: raw.review_negative ?? 0,
          total: raw.review_total ?? 0,
        }
      : null,
    metacritic: raw.metacritic ?? null,

    players: {
      now: raw.players_now ?? null,
      peak24h: raw.players_peak_24h ?? null,
      peakAllTime: raw.players_peak_all ?? null,
      rank: raw.players_rank ?? null,
    },

    price: {
      isFree: Boolean(raw.is_free),
      cents: raw.price_cents ?? null,
      initialCents: raw.initial_cents ?? null,
      discountPercent: raw.discount_pct ?? 0,
      currency: raw.currency ?? 'USD',
    },

    /** When Steam last changed anything about this app — its last update. */
    lastUpdatedAt: raw.last_change_at ? new Date(raw.last_change_at * 1000).toISOString() : null,

    screenshots: (details?.screenshots ?? []).slice(0, 12).map((shot) => ({
      id: shot.id,
      thumbnail: shot.path_thumbnail,
      full: shot.path_full,
    })),
    videos: (details?.movies ?? []).slice(0, 4).map((movie) => ({
      id: movie.id,
      name: movie.name,
      thumbnail: movie.thumbnail,
      // webm first, mp4 as the fallback — between them every browser is served.
      webm: movie.webm?.max ?? movie.webm?.['480'] ?? null,
      mp4: movie.mp4?.max ?? movie.mp4?.['480'] ?? null,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Steam: this user                                                            */
/* -------------------------------------------------------------------------- */

/** Accepts a SteamID64, a vanity name, or any profile URL containing either. */
async function resolveSteamId(input: string): Promise<{ steamId: string; persona?: string } | null> {
  const trimmed = input.trim();
  const id64 = trimmed.match(/\b(7656119\d{10})\b/);
  let steamId = id64?.[1];

  if (!steamId) {
    const vanity = trimmed.replace(/\/+$/, '').split('/').pop() ?? trimmed;
    const resolved = await getJson<{ response: { success: number; steamid?: string } }>(
      `${WEB_API}/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(vanity)}`,
    );
    if (resolved?.response?.success !== 1 || !resolved.response.steamid) return null;
    steamId = resolved.response.steamid;
  }

  const summary = await getJson<{ response: { players: { personaname?: string }[] } }>(
    `${WEB_API}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`,
  );

  return { steamId, persona: summary?.response?.players?.[0]?.personaname };
}

/**
 * A game's achievement state for one player.
 *
 * The schema is fetched alongside the player's own list because the player list
 * is empty for a game never launched, and "no achievements earned" and "this
 * game has no achievements" are very different answers.
 */
async function playerAchievements(steamId: string, appid: number) {
  const [player, schema] = await Promise.all([
    getJson<{
      playerstats?: {
        success?: boolean;
        error?: string;
        achievements?: { apiname: string; achieved: number; unlocktime: number }[];
      };
    }>(
      `${WEB_API}/ISteamUserStats/GetPlayerAchievements/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&appid=${appid}`,
    ),
    getJson<{
      game?: { availableGameStats?: { achievements?: { name: string }[] } };
    }>(`${WEB_API}/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${appid}`),
  ]);

  const total = schema?.game?.availableGameStats?.achievements?.length ?? 0;
  const list = player?.playerstats?.achievements ?? [];
  const earned = list.filter((a) => a.achieved === 1);

  // Unlock times are unix seconds, and 0 on an achievement Steam has no time
  // for — a pre-2009 unlock, or one earned offline.
  const unlockTimes = earned.map((a) => a.unlocktime).filter((t) => t > 0);

  return {
    appid,
    unlocked: earned.length,
    total,
    // Absent when the profile is private, which is the single most common
    // reason a sync comes back with nothing.
    visible: Boolean(player?.playerstats?.success ?? player?.playerstats?.achievements),
    error: player?.playerstats?.error ?? null,
    lastUnlockedAt:
      unlockTimes.length > 0 ? new Date(Math.max(...unlockTimes) * 1000).toISOString() : null,
  };
}

/**
 * Playtime and last-played for a single app.
 *
 * Asks for just this one game through `appids_filter`, which needs the
 * input_json form. That filter is quietly unreliable on some profiles, so a
 * miss falls back to the whole owned list once rather than reporting a game
 * you have played for two hundred hours as having no playtime at all.
 */
async function playtimeFor(steamId: string, appid: number) {
  const query = encodeURIComponent(
    JSON.stringify({
      steamid: steamId,
      appids_filter: [appid],
      include_appinfo: false,
      include_played_free_games: true,
    }),
  );

  const filtered = await getJson<{
    response?: { games?: { appid: number; playtime_forever?: number; rtime_last_played?: number }[] };
  }>(`${WEB_API}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&input_json=${query}`);

  const match = filtered?.response?.games?.find((game) => game.appid === appid);
  if (match) {
    return {
      hoursPlayed: Math.round(((match.playtime_forever ?? 0) / 60) * 10) / 10,
      lastPlayedAt: match.rtime_last_played
        ? new Date(match.rtime_last_played * 1000).toISOString()
        : null,
    };
  }

  const all = await ownedGames(steamId);
  const found = all.find((game) => game.appid === appid);
  return {
    hoursPlayed: found?.hoursPlayed ?? null,
    lastPlayedAt: found?.lastPlayedAt ?? null,
  };
}

async function ownedGames(steamId: string) {
  const owned = await getJson<{
    response?: {
      games?: {
        appid: number;
        name?: string;
        playtime_forever?: number;
        rtime_last_played?: number;
        img_icon_url?: string;
      }[];
    };
  }>(
    `${WEB_API}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`,
  );

  return (owned?.response?.games ?? []).map((game) => ({
    appid: game.appid,
    name: game.name ?? '',
    // Steam counts minutes; this app counts hours, to a tenth.
    hoursPlayed: Math.round(((game.playtime_forever ?? 0) / 60) * 10) / 10,
    lastPlayedAt: game.rtime_last_played
      ? new Date(game.rtime_last_played * 1000).toISOString()
      : null,
  }));
}

/* -------------------------------------------------------------------------- */
/* PlayStation                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * PSN has no official public API. The route everything uses is the NPSSO
 * cookie from a signed-in playstation.com session, exchanged for an OAuth pair:
 * an access token good for about an hour, and a refresh token good for about
 * two months.
 *
 * The NPSSO itself is never stored — it is as good as the account password.
 * It is exchanged once, here, and only the resulting tokens are kept. The row
 * they are kept in is the caller's own, written through their session, so RLS
 * is what keeps one user's tokens away from every other user.
 */

interface PsnRow {
  psn_account_id: string | null;
  psn_online_id: string | null;
  psn_refresh_token: string | null;
  psn_access_token: string | null;
  psn_token_expires_at: string | null;
}

/** A minute of slack, so a token cannot expire mid-request. */
const TOKEN_SKEW_MS = 60_000;

async function readPsnRow(supabase: SupabaseClient, userId: string): Promise<PsnRow | null> {
  const { data } = await supabase
    .from('platform_accounts')
    .select('psn_account_id, psn_online_id, psn_refresh_token, psn_access_token, psn_token_expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as PsnRow) ?? null;
}

/**
 * A usable access token, refreshing it when the stored one has expired.
 *
 * Returns null when there is no link, or when the refresh token has itself
 * expired — at which point the only cure is a fresh NPSSO, which the app asks
 * for rather than failing silently on every sync.
 */
async function psnAccessToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ accessToken: string; accountId: string } | null> {
  const row = await readPsnRow(supabase, userId);
  if (!row?.psn_refresh_token || !row.psn_account_id) return null;

  const expiresAt = row.psn_token_expires_at ? new Date(row.psn_token_expires_at).getTime() : 0;
  if (row.psn_access_token && expiresAt - TOKEN_SKEW_MS > Date.now()) {
    return { accessToken: row.psn_access_token, accountId: row.psn_account_id };
  }

  try {
    const tokens = await exchangeRefreshTokenForAuthTokens(row.psn_refresh_token);
    await supabase.from('platform_accounts').upsert({
      user_id: userId,
      psn_refresh_token: tokens.refreshToken,
      psn_access_token: tokens.accessToken,
      psn_token_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
    });
    return { accessToken: tokens.accessToken, accountId: row.psn_account_id };
  } catch {
    return null;
  }
}

/** Trophy counts across all four tiers, which is what this app tracks. */
const countTrophies = (trophies?: {
  bronze?: number;
  silver?: number;
  gold?: number;
  platinum?: number;
}) =>
  (trophies?.bronze ?? 0) +
  (trophies?.silver ?? 0) +
  (trophies?.gold ?? 0) +
  (trophies?.platinum ?? 0);

/* -------------------------------------------------------------------------- */
/* Router                                                                      */
/* -------------------------------------------------------------------------- */

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Signed in, or nothing. Without this the function is an open proxy wearing
  // this project's Steam key.
  const authorization = request.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return fail(401, 'not-signed-in');

  if (!STEAM_API_KEY) {
    // Only the routes that speak to the Web API need it, but saying so once
    // here is clearer than three identical failures further down.
    console.warn('STEAM_API_KEY is not set — /me routes will fail.');
  }

  const url = new URL(request.url);
  // Everything after the function name, so it works under /functions/v1/…
  const path = url.pathname.replace(/^.*\/game-data/, '').replace(/\/+$/, '');
  const segments = path.split('/').filter(Boolean);

  try {
    /* Catalog search: appid, name, header art, players. */
    if (segments[0] === 'search') {
      const query = url.searchParams.get('q')?.trim();
      if (!query) return json({ results: [] }, 200, CACHE.search);

      const results = await getJson<unknown[]>(`${STEAMRAW}/search?q=${encodeURIComponent(query)}`);
      return json({ results: results ?? [] }, 200, CACHE.search);
    }

    if (segments[0] === 'app') {
      const appid = Number(segments[1]);
      if (!Number.isFinite(appid) || appid <= 0) return fail(400, 'bad-appid');

      /* Concurrent players over time. */
      if (segments[2] === 'players') {
        const range = url.searchParams.get('range') ?? '30d';
        if (!['24h', '7d', '30d', '1y', 'all'].includes(range)) return fail(400, 'bad-range');

        const series = await getJson<{ range: string; points: { ts: number; players: number }[] }>(
          `${STEAMRAW}/app/${appid}/players?range=${range}`,
        );
        if (!series) return fail(404, 'not-found');
        return json(series, 200, CACHE.players);
      }

      if (segments.length === 2) {
        const info = await appInfo(appid);
        if (!info) return fail(404, 'not-found');
        return json(info, 200, CACHE.app);
      }
    }

    /* Your own account. */
    if (segments[0] === 'me' && segments[1] === 'steam') {
      if (!STEAM_API_KEY) return fail(503, 'no-steam-key');

      const steamId = url.searchParams.get('steamId')?.trim();

      if (segments[2] === 'resolve') {
        const input = url.searchParams.get('q')?.trim();
        if (!input) return fail(400, 'missing-query');

        const resolved = await resolveSteamId(input);
        if (!resolved) return fail(404, 'not-found');
        return json(resolved);
      }

      if (!steamId) return fail(400, 'missing-steam-id');

      if (segments[2] === 'library') {
        return json({ games: await ownedGames(steamId) }, 200, CACHE.me);
      }

      if (segments[2] === 'achievements') {
        const appid = Number(url.searchParams.get('appid'));
        if (!Number.isFinite(appid) || appid <= 0) return fail(400, 'bad-appid');

        // Playtime comes back with the achievements rather than from a separate
        // call, so syncing one game is one request from the app's side.
        const [achievements, playtime] = await Promise.all([
          playerAchievements(steamId, appid),
          playtimeFor(steamId, appid),
        ]);

        return json({ ...achievements, ...playtime }, 200, CACHE.me);
      }
    }

    /* PlayStation. */
    if (segments[0] === 'me' && segments[1] === 'psn') {
      const userId = auth.user.id;

      /* Exchange an NPSSO for tokens. The NPSSO is not stored. */
      if (segments[2] === 'link' && request.method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as { npsso?: string };
        const npsso = body.npsso?.trim();
        if (!npsso) return fail(400, 'missing-npsso');

        try {
          const code = await exchangeNpssoForAccessCode(npsso);
          const tokens = await exchangeAccessCodeForAuthTokens(code);
          const profile = await getProfileFromUserName({ accessToken: tokens.accessToken }, 'me');

          const accountId = profile.profile?.accountId ?? 'me';
          const onlineId = profile.profile?.onlineId ?? null;

          const { error } = await supabase.from('platform_accounts').upsert({
            user_id: userId,
            psn_account_id: accountId,
            psn_online_id: onlineId,
            psn_refresh_token: tokens.refreshToken,
            psn_access_token: tokens.accessToken,
            psn_token_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
          });
          if (error) return fail(500, 'could-not-save');

          return json({ accountId, onlineId });
        } catch {
          // Almost always an NPSSO that has expired or was copied short.
          return fail(401, 'bad-npsso');
        }
      }

      if (segments[2] === 'unlink' && request.method === 'POST') {
        await supabase.from('platform_accounts').upsert({
          user_id: userId,
          psn_account_id: null,
          psn_online_id: null,
          psn_refresh_token: null,
          psn_access_token: null,
          psn_token_expires_at: null,
        });
        return json({ ok: true });
      }

      const session = await psnAccessToken(supabase, userId);
      if (!session) return fail(401, 'psn-not-linked');
      const psnAuth = { accessToken: session.accessToken };

      /* Every title with a trophy list, and how far through it you are. */
      if (segments[2] === 'titles') {
        const titles = await getUserTitles(psnAuth, session.accountId);

        return json(
          {
            titles: (titles.trophyTitles ?? []).map((title) => ({
              npCommunicationId: title.npCommunicationId,
              npServiceName: title.npServiceName,
              name: title.trophyTitleName,
              icon: title.trophyTitleIconUrl ?? null,
              platform: title.trophyTitlePlatform ?? null,
              progress: title.progress ?? 0,
              total: countTrophies(title.definedTrophies),
              earned: countTrophies(title.earnedTrophies),
              platinumEarned: (title.earnedTrophies?.platinum ?? 0) > 0,
              lastUpdatedAt: title.lastUpdatedDateTime ?? null,
            })),
          },
          200,
          CACHE.me,
        );
      }

      /**
       * One title in detail, including when each trophy was earned — which is
       * what dates a platinum, rather than the moment a sync noticed it.
       */
      if (segments[2] === 'title' && segments[3]) {
        const npCommunicationId = segments[3];
        const npServiceName = url.searchParams.get('service') === 'trophy' ? 'trophy' : 'trophy2';

        const [defined, earned] = await Promise.all([
          getTitleTrophies(psnAuth, npCommunicationId, 'all', { npServiceName }),
          getUserTrophiesEarnedForTitle(psnAuth, session.accountId, npCommunicationId, 'all', {
            npServiceName,
          }),
        ]);

        const earnedList = (earned.trophies ?? []).filter((trophy) => trophy.earned);
        const earnedTimes = earnedList
          .map((trophy) => (trophy.earnedDateTime ? new Date(trophy.earnedDateTime).getTime() : 0))
          .filter((time) => time > 0);

        return json(
          {
            npCommunicationId,
            total: (defined.trophies ?? []).length,
            earned: earnedList.length,
            platinumEarned: earnedList.some((trophy) => trophy.trophyType === 'platinum'),
            lastEarnedAt:
              earnedTimes.length > 0 ? new Date(Math.max(...earnedTimes)).toISOString() : null,
          },
          200,
          CACHE.me,
        );
      }
    }

    return fail(404, 'unknown-route');
  } catch (error) {
    console.error('game-data failed', error);
    return fail(502, 'upstream-failed');
  }
});
