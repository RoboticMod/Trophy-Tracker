import { supabase } from './supabase';
import { normalizePlatform } from './constants';
import { clampRating, normalizeRating } from './rating';
import {
  Collection,
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
  cover_image: string | null;
  cover_portrait: string | null;
  logo_image: string | null;
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
    coverImage: row.cover_image ?? undefined,
    coverPortrait: row.cover_portrait ?? undefined,
    logoImage: row.logo_image ?? undefined,
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
    cover_image: game.coverImage ?? null,
    cover_portrait: game.coverPortrait ?? null,
    logo_image: game.logoImage ?? null,
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
  created_at: string | null;
  updated_at: string | null;
}

const toCollection = (row: CollectionRow): Collection => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  color: row.color ?? undefined,
  icon: row.icon ?? undefined,
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
  created_at: collection.createdAt,
});

interface ProfileRow {
  user_id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  sidebar_config: SidebarConfig | null;
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
  // Not only the link columns any more: this is every column added after the
  // original schema, and dropping the lot on a 42703 is what keeps a library
  // writable on a project whose owner has not re-run the SQL.
  'cover_portrait',
  'logo_image',
  'steam_appid',
  'psn_communication_id',
  'psn_title_id',
  'sync_source',
  'auto_sync',
  'last_synced_at',
  'last_unlocked_at',
] as const;

let schemaHasLinkColumns = true;

/**
 * Whether this project still has the dropped `status` column, left `not null`.
 *
 * `status` was replaced by collection membership, so writes no longer name it.
 * A project whose owner has not re-run the schema SQL still has the column and
 * still requires a value, and answers every game write with 23502 — which would
 * make the library read-only. So the first such failure sets this flag and every
 * write from then on carries a filler, and Settings says the SQL needs running.
 */
let schemaHasLegacyStatus = false;

/** The one value the old CHECK constraint accepted that means nothing here. */
const LEGACY_STATUS_FILLER = 'playing';

/** True for "null value in column violates not-null", i.e. the SQL never ran. */
const isMissingNotNull = (error: { code?: string } | null): boolean => error?.code === '23502';

/**
 * True for "column does not exist".
 *
 * PostgREST answers with its own PGRST204 when the column is missing from its
 * cached schema rather than from the table, which is the same problem wearing a
 * different number.
 */
const isUnknownColumn = (error: { code?: string } | null): boolean =>
  error?.code === '42703' || error?.code === 'PGRST204';

/** True for "no unique constraint matching the ON CONFLICT specification". */
const isMissingConstraint = (error: { code?: string } | null): boolean =>
  error?.code === '42P10';

/**
 * Whether this project's tables are behind the schema the app writes against.
 *
 * Set by the retries below, from a real refusal rather than a probe. Every one
 * of them recovers, so writes keep working — but quietly, and the recovery
 * costs something each time (artwork dropped, a slower upsert path). Saying so
 * out loud is how someone learns to re-run the SQL.
 */
let schemaOutOfDate = false;

export const isSchemaOutOfDate = (): boolean => schemaOutOfDate;

/** What to tell someone whose database is behind. */
export const SCHEMA_OUT_OF_DATE_MESSAGE =
  'Your database is missing columns this version writes. Open Settings → Cloud storage, copy the schema SQL and run it in Supabase.';

type GameInsert = ReturnType<typeof fromGame>;

/** A row on the way out: link columns optional, plus the legacy status filler. */
type GameWriteRow = Partial<GameInsert> & { status?: string };

const withoutLinkColumns = (row: GameWriteRow): GameWriteRow => {
  const stripped: GameWriteRow = { ...row };
  LINK_COLUMNS.forEach((column) => delete stripped[column]);
  return stripped;
};

const gameRows = (games: UserGame[], userId: string) => {
  let rows: GameWriteRow[] = games.map((game) => fromGame(game, userId));
  if (!schemaHasLinkColumns) rows = rows.map(withoutLinkColumns);
  if (schemaHasLegacyStatus) rows = rows.map((row) => ({ ...row, status: LEGACY_STATUS_FILLER }));
  return rows;
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

/**
 * Writes games, repairing the two ways this project's schema can be behind.
 *
 * Each failure mode is diagnosed once, from a real refusal rather than a probe,
 * and remembered for the rest of the page: a missing link column (42703) drops
 * those columns, and a `status` column still left not-null (23502) means the
 * collections migration never ran, so the write carries a filler. One retry per
 * mode, because a second failure is a different problem and belongs to the
 * caller.
 */
async function upsertGameRows(games: UserGame[], userId: string): Promise<void> {
  const write = () => supabase.from('games').upsert(gameRows(games, userId));

  let { error } = await write();
  if (!error) return;

  if (isUnknownColumn(error) && schemaHasLinkColumns) {
    schemaHasLinkColumns = false;
    schemaOutOfDate = true;
    ({ error } = await write());
    if (!error) return;
  }

  if (isMissingNotNull(error) && !schemaHasLegacyStatus) {
    schemaHasLegacyStatus = true;
    schemaOutOfDate = true;
    ({ error } = await write());
    if (!error) return;
  }

  throw error;
}

export async function upsertGame(game: UserGame, userId: string): Promise<void> {
  await upsertGameRows([game], userId);
}

export async function upsertGames(games: UserGame[], userId: string): Promise<void> {
  if (games.length === 0) return;
  await upsertGameRows(games, userId);
}

/**
 * Whether the database has the platform-link columns.
 *
 * False only after a write has actually been refused for want of them, which is
 * what Settings uses to say the schema needs re-running rather than leaving the
 * linking controls looking broken.
 */
export const hasLinkColumns = (): boolean => schemaHasLinkColumns;

/**
 * Whether this project is still carrying the retired `status` column.
 *
 * True only after a write has actually been refused for want of it, which is
 * what Settings uses to say the schema SQL needs re-running — saves are going
 * through on a filler value, so nothing looks broken until it is said out loud.
 */
export const hasLegacyStatusColumn = (): boolean => schemaHasLegacyStatus;

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
  const rows = collections.map((c) => fromCollection(c, userId));

  // Keyed on both columns, because the primary key is (user_id, id): with the
  // default single-column guess an id another account already holds would
  // conflict against a row this user cannot see, and the write would fail.
  const { error } = await supabase.from('collections').upsert(rows, { onConflict: 'user_id,id' });
  if (!error) return;

  // A project still on the old single-column key has no constraint to name, and
  // Postgres refuses the statement outright rather than ignoring the hint. That
  // made every collection write fail — including the seeding one on load — and
  // report itself as a library that could not reach the cloud.
  if (!isMissingConstraint(error)) throw error;
  schemaOutOfDate = true;

  const retry = await supabase.from('collections').upsert(rows);
  if (retry.error) throw retry.error;
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
