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
const progressKey = (userId: string) => `${NS}:progress:${userId}`;

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

/** Collapsed on the way out too, so a queue stacked up before this existed
 *  shrinks on the next read rather than waiting for another edit. */
export const readQueue = (userId: string): PendingWrite[] =>
  collapseQueue(read<PendingWrite[]>(queueKey(userId)) ?? []);

export const writeQueue = (userId: string, queue: PendingWrite[]): void =>
  write(queueKey(userId), queue);

/**
 * Identifies the row a write lands on. Two writes sharing a key target the same
 * row, so only the later one can matter.
 *
 * Collection batches key on the exact set they carry: a repeat of that set is a
 * newer copy of those rows, while a different set is its own work.
 */
const rowKey = (entry: PendingWrite): string => {
  switch (entry.kind) {
    case 'profile':
      return 'profile';
    case 'game':
      return `game:${entry.op === 'upsert' ? entry.game.id : entry.id}`;
    case 'collection':
      return `collection:${entry.id}`;
    case 'collections':
      return `collections:${entry.collections.map((c) => c.id).sort().join(',')}`;
  }
};

/**
 * Drops queued writes that a later one already covers.
 *
 * Every write here replaces a whole row, so a queue holding fifty edits of one
 * row still only needs the last. Without this, a queue that cannot drain — an
 * offline spell, or a column the database does not have yet — grows another
 * copy of the same row on every single edit, and reports a pending count that
 * says far more is outstanding than really is.
 */
export function collapseQueue(queue: PendingWrite[]): PendingWrite[] {
  const kept: PendingWrite[] = [];
  const seen = new Set<string>();

  // Walked backwards, so the newest write for each row is the one that lives.
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    const key = rowKey(queue[i]);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(queue[i]);
  }

  return kept.reverse();
}

export const enqueue = (userId: string, entry: PendingWrite): void =>
  writeQueue(userId, collapseQueue([...readQueue(userId), entry]));

/**
 * Award counts as of the last time this device showed you what was new.
 *
 * The marker for "since you were last here", and deliberately per device: what
 * is new to the phone is whatever has happened since the phone last looked,
 * whatever the desktop was told in the meantime. Counts alone — a few bytes per
 * game — because the only question asked of it is how far each game had got.
 */
export type ProgressMarks = Record<string, number>;

export const readProgressMarks = (userId: string): ProgressMarks | null =>
  read<ProgressMarks>(progressKey(userId));

export const writeProgressMarks = (userId: string, marks: ProgressMarks): void =>
  write(progressKey(userId), marks);

/** Clears everything held for a user. Called on sign-out. */
export function clearUserCache(userId: string): void {
  try {
    localStorage.removeItem(cacheKey(userId));
    localStorage.removeItem(queueKey(userId));
    localStorage.removeItem(progressKey(userId));
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
