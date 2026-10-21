import { UserGame } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * A game's full achievement or trophy list, for the Trophies section of game
 * details. One shape for both platforms; the edge function maps each into it.
 */
export interface AwardItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  earned: boolean;
  earnedAt?: string;
  /** Percent of players who have it. Absent when the platform did not say. */
  rate?: number;
  /** PlayStation's bronze / silver / gold / platinum. */
  type?: string;
  hidden?: boolean;
}

/** A cached list, with the game's counts at the moment it was fetched. */
export interface GameAwards {
  items: AwardItem[];
  unlocked: number;
  total: number;
  fetchedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Rarity                                                                     */
/* -------------------------------------------------------------------------- */

export type RarityTier = 'ultra' | 'very' | 'rare' | 'common';

/**
 * The tier from the earn rate, on both platforms. Under 5% Ultra rare, under
 * 15% Very rare, otherwise Rare below 50% and Common above — the bands
 * PlayStation's own classes follow (5.9% very rare, 34.1% rare, 64.2% common
 * in a real response), applied to Steam's percentages too.
 */
export const rarityTier = (rate: number): RarityTier =>
  rate < 5 ? 'ultra' : rate < 15 ? 'very' : rate < 50 ? 'rare' : 'common';

export const RARITY_LABEL: Record<RarityTier, string> = {
  ultra: 'Ultra rare',
  very: 'Very rare',
  rare: 'Rare',
  common: 'Common',
};

/** Violet, blue, grey, grey. Never gold: gold means 100% and nothing else. */
export const RARITY_TEXT: Record<RarityTier, string> = {
  ultra: 'text-violet-900',
  very: 'text-accent-900',
  rare: 'text-gray-700',
  common: 'text-gray-700',
};

/** "12.3%", one decimal place under 10, whole numbers above. */
export const formatRate = (rate: number): string =>
  `${rate < 10 ? rate.toFixed(1) : Math.round(rate)}%`;

/**
 * Rarest first. An item with no rate goes after every item with one — no rarity
 * is shown for it, so it cannot claim a place among the rare — then by name.
 */
export const byRarity = (a: AwardItem, b: AwardItem): number => {
  if (a.rate !== undefined && b.rate !== undefined && a.rate !== b.rate) return a.rate - b.rate;
  if (a.rate === undefined && b.rate !== undefined) return 1;
  if (b.rate === undefined && a.rate !== undefined) return -1;
  return a.name.localeCompare(b.name);
};

/** The earned award with the lowest rate, if any earned award has one. */
export const rarestEarned = (items: AwardItem[]): AwardItem | undefined =>
  items.filter((i) => i.earned && i.rate !== undefined).sort(byRarity)[0];

/* -------------------------------------------------------------------------- */
/* Fetching                                                                   */
/* -------------------------------------------------------------------------- */

export type AwardsError = 'not-linked' | 'private-profile' | 'not-deployed' | 'request-failed';

export type AwardsResult = { items: AwardItem[] } | { error: AwardsError };

/** Whether a game is linked to a list the function can read. */
export const canFetchAwards = (
  game: UserGame,
  accounts: { steamId?: string; psnAccountId?: string } | null,
): boolean =>
  game.platform === 'steam'
    ? Boolean(game.steamAppId && accounts?.steamId)
    : Boolean(game.psnCommunicationId && accounts?.psnAccountId);

const functionUrl = (path: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-data${path}`;

/**
 * A game's list, live from Steam or PlayStation through the edge function.
 * PlayStation follows the trophy-scope setting, so the list agrees with the
 * counts above it.
 */
export async function fetchAwards(
  game: UserGame,
  accounts: { steamId?: string; psnAccountId?: string } | null,
  includeDlc: boolean,
): Promise<AwardsResult> {
  if (!isSupabaseConfigured || !canFetchAwards(game, accounts)) return { error: 'not-linked' };

  const path =
    game.platform === 'steam'
      ? `/me/steam/awards?steamId=${encodeURIComponent(accounts?.steamId ?? '')}&appid=${game.steamAppId}`
      : `/me/psn/awards/${encodeURIComponent(game.psnCommunicationId ?? '')}${includeDlc ? '?groups=all' : ''}`;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { error: 'request-failed' };

    const response = await fetch(functionUrl(path), {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      // The function answers unknown routes with this, so an older deploy
      // without these routes says so instead of failing vaguely.
      if (body.error === 'unknown-route') return { error: 'not-deployed' };
      if (body.error === 'psn-not-linked') return { error: 'not-linked' };
      return { error: 'request-failed' };
    }

    const body = (await response.json()) as { items?: AwardItem[]; visible?: boolean };
    const items = Array.isArray(body.items) ? body.items : [];
    if (body.visible === false && items.length > 0) return { error: 'private-profile' };
    return { items };
  } catch {
    return { error: 'request-failed' };
  }
}

/**
 * Whether a cached list still describes the game: it does until the game's
 * counts move. Rarity drifts slowly, and a list is only worth a refetch once
 * something was earned (or the list itself grew).
 */
export const isCurrent = (cached: GameAwards | null, game: UserGame): cached is GameAwards =>
  !!cached &&
  cached.unlocked === game.achievementsUnlocked &&
  cached.total === game.achievementsTotal;
