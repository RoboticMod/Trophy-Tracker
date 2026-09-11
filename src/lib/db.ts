import { supabase } from './supabase';
import { normalizePlatform } from './constants';
import { clampRating, normalizeRating } from './rating';
import { DEFAULT_ACCENT, DEFAULT_GOLD, isSurfaceKey, normalizeHex } from './theme';
import {
  Collection,
  GameStatus,
  Platform,
  SidebarConfig,
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
  };
}

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
  card_layout: string | null;
  accent: string | null;
  gold: string | null;
  surface: string | null;
  ui_app_name: string | null;
  ui_dash_title: string | null;
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
  cardLayout: row.card_layout === 'poster' ? 'poster' : 'wide',
  // A malformed or hand-edited colour falls back to the default rather than
  // reaching the theme, where an unparseable hex would break the derived ink.
  accent: row.accent ? normalizeHex(row.accent, DEFAULT_ACCENT) : undefined,
  gold: row.gold ? normalizeHex(row.gold, DEFAULT_GOLD) : undefined,
  surface: isSurfaceKey(row.surface) ? row.surface : undefined,
  uiAppName: row.ui_app_name ?? undefined,
  uiDashTitle: row.ui_dash_title ?? undefined,
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
  card_layout: profile.cardLayout ?? 'wide',
  accent: profile.accent ?? null,
  gold: profile.gold ?? null,
  surface: profile.surface ?? null,
  ui_app_name: profile.uiAppName ?? null,
  ui_dash_title: profile.uiDashTitle ?? null,
});

/* -------------------------------------------------------------------------- */
/* Queries — every one scoped to the signed-in user                            */
/* -------------------------------------------------------------------------- */

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
  const { error } = await supabase.from('games').upsert(fromGame(game, userId));
  if (error) throw error;
}

export async function upsertGames(games: UserGame[], userId: string): Promise<void> {
  if (games.length === 0) return;
  const { error } = await supabase
    .from('games')
    .upsert(games.map((g) => fromGame(g, userId)));
  if (error) throw error;
}

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
