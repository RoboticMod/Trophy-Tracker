import { supabase, isSupabaseConfigured } from './supabase';
import { SteamError } from './steam';

/**
 * PlayStation trophies, by way of the game-data edge function.
 *
 * PSN has no official public API and no CORS, and the flow it does have needs a
 * credential that must never reach a browser bundle — so, like Steam, every
 * call here goes through the function. The difference is the link step: Steam
 * takes a public profile id, PSN takes a session cookie that is exchanged for
 * tokens server-side and then thrown away.
 */

export type PsnError = SteamError | 'bad-npsso' | 'psn-not-linked';

export interface PsnResult<T> {
  data?: T;
  error?: PsnError;
}

export interface PsnTitle {
  npCommunicationId: string;
  npServiceName: 'trophy' | 'trophy2';
  name: string;
  icon: string | null;
  platform: string | null;
  /** PSN's own percentage, which counts trophy weight rather than trophy count. */
  progress: number;
  total: number;
  earned: number;
  platinumEarned: boolean;
  lastUpdatedAt: string | null;
}

/**
 * A PS4 or PS5 game from the console's own played-games list — the only place
 * PSN reports playtime. Trophy lists carry none.
 */
export interface PsnPlayedGame {
  name: string;
  titleId: string;
  hoursPlayed: number;
  lastPlayedAt: string | null;
}

export interface PsnTitleProgress {
  npCommunicationId: string;
  total: number;
  earned: number;
  platinumEarned: boolean;
  lastEarnedAt: string | null;
}

export interface PsnAccount {
  accountId: string;
  onlineId: string | null;
}

const functionUrl = (path: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-data${path}`;

async function call<T>(path: string, init?: RequestInit): Promise<PsnResult<T>> {
  if (!isSupabaseConfigured) return { error: 'not-configured' };

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { error: 'not-signed-in' };

    const response = await fetch(functionUrl(path), {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // The function names why it refused, and each reason is a different thing
      // to tell the user — an expired NPSSO is not a network failure.
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (body.error === 'bad-npsso') return { error: 'bad-npsso' };
      if (body.error === 'psn-not-linked') return { error: 'psn-not-linked' };
      return { error: response.status === 404 ? 'not-found' : 'request-failed' };
    }

    return { data: (await response.json()) as T };
  } catch {
    return { error: 'request-failed' };
  }
}

/**
 * Exchanges an NPSSO for the stored token pair.
 *
 * The NPSSO goes straight to the function and is never written down anywhere —
 * not in state that outlives the request, not in localStorage, and not in the
 * database. Only the tokens it produces are kept.
 */
export const linkPsnAccount = (npsso: string): Promise<PsnResult<PsnAccount>> =>
  call<PsnAccount>('/me/psn/link', { method: 'POST', body: JSON.stringify({ npsso }) });

export const unlinkPsnAccount = (): Promise<PsnResult<{ ok: boolean }>> =>
  call<{ ok: boolean }>('/me/psn/unlink', { method: 'POST' });

export interface PsnLibrary {
  titles: PsnTitle[];
  /** Absent from a function deployed before playtime was added. */
  played: PsnPlayedGame[];
}

export const getPsnTitles = async (): Promise<PsnResult<PsnLibrary>> => {
  const result = await call<{ titles: PsnTitle[]; played?: PsnPlayedGame[] }>('/me/psn/titles');
  return result.data
    ? { data: { titles: result.data.titles, played: result.data.played ?? [] } }
    : { error: result.error };
};

export const getPsnTitleProgress = (
  npCommunicationId: string,
  npServiceName: 'trophy' | 'trophy2' = 'trophy2',
): Promise<PsnResult<PsnTitleProgress>> =>
  call<PsnTitleProgress>(
    `/me/psn/title/${encodeURIComponent(npCommunicationId)}?service=${npServiceName}`,
  );

/**
 * Matches a PSN title to a tracked game by name.
 *
 * Trophy lists carry the title as PlayStation spells it, which is rarely how a
 * library entry spells it — trademark symbols, edition suffixes, a colon that
 * one of them uses. Comparing on letters and digits alone matches far more of
 * them than an exact comparison, and a wrong match is corrected by linking the
 * game by hand.
 */
export const normalizeTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9]+/g, '');
