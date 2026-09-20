import { Collection, UserGame } from '../types';
import {
  BACKLOG_COLLECTION_ID,
  COMPLETE_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  PermanentCollectionId,
  isPermanentCollection,
  normalizeCollections,
} from './collections';
import { DEFAULT_COLLECTIONS } from './constants';
import { isPerfect } from './completion';

/**
 * Restoring a backup written before collections became the only shelf model.
 *
 * A 3.x export carries a `status` on every game and no permanent collection
 * rows at all. Imported as-is it would unshelve the entire library in one
 * click — every game in the library, none of them anywhere — so the import
 * path translates it on the way in.
 *
 * Pure and self-contained on purpose: this is the one piece of the old model
 * still worth keeping, and keeping it in its own file means nothing else has to
 * know the old vocabulary.
 */

/** The legacy shape: a game as an older export wrote it. */
type LegacyGame = Partial<UserGame> & {
  status?: string;
  collections?: string[];
};

/** The legacy ids of the two shelves that became permanent collections. */
const LEGACY_BACKLOG = 'col-backlog';
const LEGACY_MASTERPIECES = 'col-masterpieces';

/**
 * The shelf a legacy game belongs on.
 *
 * Precedence matches the SQL backfill: actually being at 100% wins over
 * whatever the game happened to be filed as, because the counts are the only
 * thing that ever really answered the question.
 */
function legacyShelf(game: LegacyGame): PermanentCollectionId | null {
  const counts = {
    achievementsUnlocked: game.achievementsUnlocked ?? 0,
    achievementsTotal: game.achievementsTotal ?? 0,
  };
  if (game.status === 'mastered' || isPerfect(counts)) return COMPLETE_COLLECTION_ID;
  if (game.status === 'playing') return PLAYING_COLLECTION_ID;
  if (game.status === 'backlog' || game.collections?.includes(LEGACY_BACKLOG)) {
    return BACKLOG_COLLECTION_ID;
  }
  // 'completed' and 'dropped' become ordinary lists rather than shelves, which
  // the caller adds; and a game with no status at all stays unshelved.
  return null;
}

/** The ordinary list a legacy status becomes, where it becomes one. */
const LEGACY_LISTS: Record<string, Collection> = {
  completed: {
    id: 'col-completed',
    name: 'Completed',
    description: 'Games you finished',
    icon: 'Flag',
    color: '#52c294',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  dropped: {
    id: 'col-dropped',
    name: 'Dropped',
    description: 'Games you stopped playing',
    icon: 'CircleSlash',
    color: '#c8c8cf',
    createdAt: '2026-01-06T00:00:00.000Z',
  },
};

export interface MigratedSnapshot {
  games: UserGame[];
  collections: Collection[];
}

/**
 * Translates a restored snapshot onto the current model.
 *
 * A snapshot that already uses permanent collections passes through untouched
 * apart from normalisation, so re-importing a current backup is a no-op rather
 * than a second migration.
 */
export function migrateLegacySnapshot(
  games: LegacyGame[],
  collections: Collection[],
): MigratedSnapshot {
  const needed = new Set<string>();

  const migrated = games.map((game) => {
    const existing = game.collections ?? [];

    // Already on the current model: leave the filing alone.
    if (existing.some(isPermanentCollection)) {
      return { ...game, collections: normalizeCollections(existing) } as UserGame;
    }

    // The two legacy ids duplicated shelves that are now permanent, so their
    // members are merged rather than carried over as lists of their own.
    const carried = existing.filter((id) => id !== LEGACY_BACKLOG && id !== LEGACY_MASTERPIECES);
    const shelf = legacyShelf(game);
    const list = game.status ? LEGACY_LISTS[game.status] : undefined;
    if (list) {
      needed.add(list.id);
      if (!carried.includes(list.id)) carried.push(list.id);
    }

    return {
      ...game,
      collections: normalizeCollections(shelf ? [shelf, ...carried] : carried),
    } as UserGame;
  });

  // Permanent shelves always; the legacy lists only where a game actually
  // landed in one, so restoring a backup grows no empty tabs.
  const byId = new Map(collections.map((c) => [c.id, c]));
  for (const preset of DEFAULT_COLLECTIONS) {
    if (isPermanentCollection(preset.id) && !byId.has(preset.id)) byId.set(preset.id, preset);
  }
  for (const id of needed) {
    const preset = Object.values(LEGACY_LISTS).find((c) => c.id === id);
    if (preset && !byId.has(id)) byId.set(id, preset);
  }

  return {
    games: migrated,
    // The legacy duplicates go with the games that were in them.
    collections: [...byId.values()].filter(
      (c) => c.id !== LEGACY_BACKLOG && c.id !== LEGACY_MASTERPIECES,
    ),
  };
}
