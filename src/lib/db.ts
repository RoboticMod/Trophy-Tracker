import { supabase } from './supabase';
import { normalizePlatform } from './constants';
import { clampRating, normalizeRating } from './rating';
import {
  Collection,
  GameStatus,
  Platform,
  PlatformAccounts,
  SidebarConfig,
  SyncSource,
  UserGame,
  UserProfile,
} from '../types';

export { SUPABASE_SCHEMA_SQL } from './schema';

/* -------------------------------------------------------------------------- */
/* Row mapping                                                                 */
/* -------------------------------------------------------------------------- */

interface GameRow {
  id: string;
  rawg_id: number | null;
  title: string;
  platform: string;
  status: GameStatus;
  cover_image: string | null;
  release_date: string | null;
  genres: string[] | null;
  hours_played: number | string | null;
  rating: number | string | null;
  achievement_rating: number | string | null;
  achievements_unlocked: number | null;
  achievements_total: number | null;
  collections: string[] | null;
  notes: string | null;
  last_played_at: string | null;
  added_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
  steam_appid: number | null;
  psn_communication_id: string | null;
  psn_title_id: string | null;
  sync_source: string | null;
  auto_sync: boolean | null;
  last_synced_at: string | null;
  last_unlocked_at: string | null;
}

/**
 * Maps a row to a game, or null when the row is on a platform this app no
 * longer supports — so a stale cloud row cannot resurrect a removed platform.
 */
function toGame(row: GameRow): UserGame | null {
  const platform = normalizePlatform(row.platform);
  if (!platform) return null;

  return {
    id: row.id,
    rawgId: row.rawg_id ?? undefined,
    title: row.title,
    platform,
    status: row.status,
    coverImage: row.cover_image ?? undefined,
    releaseDate: row.release_date ?? undefined,
    genres: row.genres ?? [],
    hoursPlayed: Number(row.hours_played) || 0,
    rating: normalizeRating(Number(row.rating)),
    achievementRating: clampRating(Number(row.achievement_rating)),
    achievementsUnlocked: row.achievements_unlocked ?? 0,
    achievementsTotal: row.achievements_total ?? 0,
    collections: row.collections ?? [],
    notes: row.notes ?? undefined,
    lastPlayedAt: row.last_played_at ?? undefined,
    addedAt: row.added_at ?? new Date().toISOString(),
    completedAt: row.completed_at ?? undefined,
    updatedAt: row.updated_at ?? row.added_at ?? new Date().toISOString(),
    steamAppId: row.steam_appid ?? undefined,
    psnCommunicationId: row.psn_communication_id ?? undefined,
    psnTitleId: row.psn_title_id ?? undefined,
    syncSource: normalizeSyncSource(row.sync_source),
    autoSync: row.auto_sync ?? false,
    lastSyncedAt: row.last_synced_at ?? undefined,
    lastUnlockedAt: row.last_unlocked_at ?? undefined,
  };
}

/** Anything the database does not recognise falls back to a manual game. */
const normalizeSyncSource = (value: unknown): SyncSource =>
  value === 'steam' || value === 'psn' ? value : 'manual';

function fromGame(game: UserGame, userId: string) {
  return {
    id: game.id,
    user_id: userId,
    rawg_id: game.rawgId ?? null,
    title: game.title,
    platform: game.platform,
    status: game.status,
    cover_image: game.coverImage ?? null,
    release_date: game.releaseDate ?? null,
    genres: game.genres ?? [],
    hours_played: game.hoursPlayed ?? 0,
    rating: game.rating ?? 0,
    achievement_rating: game.achievementRating ?? 0,
    achievements_unlocked: game.achievementsUnlocked ?? 0,
    achievements_total: game.achievementsTotal ?? 0,
    collections: game.collections ?? [],
    notes: game.notes ?? null,
    last_played_at: game.lastPlayedAt ?? null,
    added_at: game.addedAt,
    completed_at: game.completedAt ?? null,
    updated_at: game.updatedAt,
    steam_appid: game.steamAppId ?? null,
    psn_communication_id: game.psnCommunicationId ?? null,
    psn_title_id: game.psnTitleId ?? null,
    sync_source: game.syncSource ?? 'manual',
    auto_sync: game.autoSync ?? false,
    last_synced_at: game.lastSyncedAt ?? null,
    last_unlocked_at: game.lastUnlockedAt ?? null,
  };
}

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_system: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

const toCollection = (row: CollectionRow): Collection => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  color: row.color ?? undefined,
  icon: row.icon ?? undefined,
  isSystem: row.is_system ?? false,
  createdAt: row.created_at ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? undefined,
});

const fromCollection = (collection: Collection, userId: string) => ({
  id: collection.id,
  user_id: userId,
  name: collection.name,
  description: collection.description ?? null,
  color: collection.color ?? null,
  icon: collection.icon ?? null,
  is_system: collection.isSystem ?? false,
  created_at: collection.createdAt,
});

interface ProfileRow {
  user_id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  sidebar_config: SidebarConfig | null;
  status_names: Partial<Record<GameStatus, string>> | null;
  platform_order: string[] | null;
  highlight_style: string | null;
  rating_mode: string | null;
}

const toProfile = (row: ProfileRow): UserProfile => ({
  id: row.user_id,
  username: row.username,
  email: row.email ?? undefined,
  avatarUrl: row.avatar_url ?? undefined,
  sidebarConfig: row.sidebar_config ?? undefined,
  statusNames: row.status_names ?? undefined,
  platformOrder:
    (row.platform_order
      ?.map(normalizePlatform)
      .filter((p): p is Platform => p !== null)) ?? undefined,
  highlightStyle: row.highlight_style === 'fill' ? 'fill' : 'stroke',
  ratingMode: row.rating_mode === 'guided' ? 'guided' : 'manual',
});

const fromProfile = (profile: UserProfile, userId: string) => ({
  user_id: userId,
  username: profile.username,
  email: profile.email ?? null,
  avatar_url: profile.avatarUrl ?? null,
  sidebar_config: profile.sidebarConfig ?? null,
  status_names: profile.statusNames ?? null,
  platform_order: profile.platformOrder ?? null,
  highlight_style: profile.highlightStyle ?? 'stroke',
  rating_mode: profile.ratingMode ?? 'manual',
});

/* -------------------------------------------------------------------------- */
/* Queries — every one scoped to the signed-in user                            */
/* -------------------------------------------------------------------------- */

/**
 * The columns added for platform linking, which a project that has not re-run
 * the schema SQL does not have yet.
 *
 * Postgres answers a write naming a column it does not have with 42703, and
 * that would make every save fail — a library becomes read-only because of a
 * feature its owner has not switched on. So the first such failure drops these
 * columns and retries, and every later write skips them until the page is
 * reloaded. Linking is lost, saving is not.
 */
const LINK_COLUMNS = [
  'steam_appid',
  'psn_communication_id',
  'psn_title_id',
  'sync_source',
  'auto_sync',
  'last_synced_at',
  'last_unlocked_at',
] as const;

let schemaHasLinkColumns = true;

/** True for "column does not exist", the one error worth retrying differently. */
const isUnknownColumn = (error: { code?: string } | null): boolean => error?.code === '42703';

type GameInsert = ReturnType<typeof fromGame>;

const withoutLinkColumns = (row: GameInsert): Partial<GameInsert> => {
  const stripped: Partial<GameInsert> = { ...row };
  LINK_COLUMNS.forEach((column) => delete stripped[column]);
  return stripped;
};

const gameRows = (games: UserGame[], userId: string) => {
  const rows = games.map((game) => fromGame(game, userId));
  return schemaHasLinkColumns ? rows : rows.map(withoutLinkColumns);
};

export async function listGames(userId: string): Promise<UserGame[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as GameRow[])
    .map(toGame)
    .filter((g): g is UserGame => g !== null);
}

export async function upsertGame(game: UserGame, userId: string): Promise<void> {
  const { error } = await supabase.from('games').upsert(gameRows([game], userId));
  if (!error) return;

  if (!isUnknownColumn(error)) throw error;
  schemaHasLinkColumns = false;

  const retry = await supabase.from('games').upsert(gameRows([game], userId));
  if (retry.error) throw retry.error;
}

export async function upsertGames(games: UserGame[], userId: string): Promise<void> {
  if (games.length === 0) return;

  const { error } = await supabase.from('games').upsert(gameRows(games, userId));
  if (!error) return;

  if (!isUnknownColumn(error)) throw error;
  schemaHasLinkColumns = false;

  const retry = await supabase.from('games').upsert(gameRows(games, userId));
  if (retry.error) throw retry.error;
}

/**
 * Whether the database has the platform-link columns.
 *
 * False only after a write has actually been refused for want of them, which is
 * what Settings uses to say the schema needs re-running rather than leaving the
 * linking controls looking broken.
 */
export const hasLinkColumns = (): boolean => schemaHasLinkColumns;

export async function deleteGame(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('games').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function listCollections(userId: string): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as CollectionRow[]).map(toCollection);
}

export async function upsertCollections(
  collections: Collection[],
  userId: string,
): Promise<void> {
  if (collections.length === 0) return;
  const { error } = await supabase
    .from('collections')
    .upsert(collections.map((c) => fromCollection(c, userId)));
  if (error) throw error;
}

export async function deleteCollection(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data as ProfileRow) : null;
}

export async function saveProfile(profile: UserProfile, userId: string): Promise<void> {
  const { error } = await supabase.from('user_profile').upsert(fromProfile(profile, userId));
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/* Linked platform accounts                                                    */
/* -------------------------------------------------------------------------- */

interface PlatformAccountsRow {
  steam_id: string | null;
  steam_persona: string | null;
  psn_account_id: string | null;
  psn_online_id: string | null;
  psn_token_expires_at: string | null;
  updated_at: string | null;
}

/**
 * The link state for the signed-in user.
 *
 * The PSN refresh token column is deliberately never selected: it is the edge
 * function's business, and a value the client never holds is a value it cannot
 * leak. Returns null when nothing has been linked yet.
 */
export async function getPlatformAccounts(userId: string): Promise<PlatformAccounts | null> {
  const { data, error } = await supabase
    .from('platform_accounts')
    .select('steam_id, steam_persona, psn_account_id, psn_online_id, psn_token_expires_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as PlatformAccountsRow;
  return {
    steamId: row.steam_id ?? undefined,
    steamPersona: row.steam_persona ?? undefined,
    psnAccountId: row.psn_account_id ?? undefined,
    psnOnlineId: row.psn_online_id ?? undefined,
    psnTokenExpiresAt: row.psn_token_expires_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/** Writes only the Steam half — the PSN link is established server-side. */
export async function saveSteamAccount(
  account: { steamId: string | null; steamPersona?: string | null },
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('platform_accounts').upsert({
    user_id: userId,
    steam_id: account.steamId,
    steam_persona: account.steamPersona ?? null,
  });
  if (error) throw error;
}
