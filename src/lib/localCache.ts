import { Collection, UserGame, UserProfile } from '../types';

/**
 * Offline cache and pending-write queue.
 *
 * Storage keys are namespaced per user id. The previous build used three global
 * keys, which meant a second account signing in on the same browser would see
 * the first account's library.
 */
const NS = 'trophytracker';

const cacheKey = (userId: string) => `${NS}:cache:${userId}`;
const queueKey = (userId: string) => `${NS}:queue:${userId}`;

export interface CachedSnapshot {
  games: UserGame[];
  collections: Collection[];
  profile: UserProfile | null;
  cachedAt: string;
}

export type PendingWrite =
  | { kind: 'game'; op: 'upsert'; game: UserGame }
  | { kind: 'game'; op: 'delete'; id: string }
  | { kind: 'collections'; op: 'upsert'; collections: Collection[] }
  | { kind: 'collection'; op: 'delete'; id: string }
  | { kind: 'profile'; op: 'upsert'; profile: UserProfile };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private browsing — the cloud copy remains the truth.
  }
}

export const readSnapshot = (userId: string): CachedSnapshot | null =>
  read<CachedSnapshot>(cacheKey(userId));

export const writeSnapshot = (
  userId: string,
  snapshot: Omit<CachedSnapshot, 'cachedAt'>,
): void => write(cacheKey(userId), { ...snapshot, cachedAt: new Date().toISOString() });

export const readQueue = (userId: string): PendingWrite[] =>
  read<PendingWrite[]>(queueKey(userId)) ?? [];

export const writeQueue = (userId: string, queue: PendingWrite[]): void =>
  write(queueKey(userId), queue);

export const enqueue = (userId: string, entry: PendingWrite): void =>
  writeQueue(userId, [...readQueue(userId), entry]);

/** Clears everything held for a user. Called on sign-out. */
export function clearUserCache(userId: string): void {
  try {
    localStorage.removeItem(cacheKey(userId));
    localStorage.removeItem(queueKey(userId));
  } catch {
    // ignore
  }
}

/** Removes the pre-auth, unscoped keys left behind by earlier builds. */
export function purgeLegacyStorage(): void {
  try {
    [
      'gametracker_pro_games_v1',
      'gametracker_pro_collections_v1',
      'gametracker_pro_profile_v2',
      'gametracker_pro_sync_meta_v1',
    ].forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}
