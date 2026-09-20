import { Collection } from '../types';

/**
 * Collections are the only model for where a game sits.
 *
 * This replaces a separate `status` field that said the same thing in a second,
 * conflicting vocabulary — a game could be filed into the "Backlog" collection
 * and still not be `status: 'backlog'`, and the Backlog page only ever read the
 * status, so one of the two was always a lie.
 *
 * Three collections are permanent: they cannot be deleted, they carry app-owned
 * colours, and a game may be on at most one of them at a time. Everything else
 * is an ordinary list a game can join as many of as it likes.
 */

/**
 * The `perm-` prefix is deliberate: it can never collide with the legacy
 * `col-*` ids, which is what lets the migration merge and delete those
 * unambiguously.
 */
export const BACKLOG_COLLECTION_ID = 'perm-backlog';
export const PLAYING_COLLECTION_ID = 'perm-playing';
export const COMPLETE_COLLECTION_ID = 'perm-complete';

export const PERMANENT_COLLECTION_IDS = [
  BACKLOG_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  COMPLETE_COLLECTION_ID,
] as const;

export type PermanentCollectionId = (typeof PERMANENT_COLLECTION_IDS)[number];

const PERMANENT_SET: ReadonlySet<string> = new Set(PERMANENT_COLLECTION_IDS);

/**
 * Permanence is derived from this fixed set, never stored.
 *
 * A stored boolean can be wrong — an old backup, a hand-edited row, a restore
 * from before these existed — and a wrong one makes a permanent shelf deletable
 * or an ordinary list undeletable. A set lookup cannot drift.
 */
export const isPermanentCollection = (id: string): id is PermanentCollectionId =>
  PERMANENT_SET.has(id);

/** The shelf a game is on, or null when it is only in the library. */
export const permanentOf = (collections?: string[]): PermanentCollectionId | null =>
  (collections?.find(isPermanentCollection) as PermanentCollectionId | undefined) ?? null;

/**
 * Exclusivity in one place: drops the other two shelves, keeps every custom
 * list. Passing null takes the game off its shelf without touching its lists.
 */
export function fileInPermanent(
  collections: string[] | undefined,
  target: PermanentCollectionId | null,
): string[] {
  const custom = (collections ?? []).filter((id) => !isPermanentCollection(id));
  return target ? [target, ...custom] : custom;
}

/**
 * What the picker does on a click: a shelf replaces whichever shelf was there
 * (and re-clicking the current one clears it), a list simply toggles.
 */
export const toggleCollection = (collections: string[], id: string): string[] => {
  if (isPermanentCollection(id)) {
    return fileInPermanent(collections, permanentOf(collections) === id ? null : id);
  }
  return collections.includes(id)
    ? collections.filter((c) => c !== id)
    : [...collections, id];
};

/**
 * Belt and braces — makes any array legal, keeping the first shelf it names and
 * dropping duplicates. Every write path runs through this, so no caller can
 * persist a game on two shelves at once.
 */
export const normalizeCollections = (collections?: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  let shelf: PermanentCollectionId | null = null;

  for (const id of collections ?? []) {
    if (!id || seen.has(id)) continue;
    if (isPermanentCollection(id)) {
      if (shelf) continue;
      shelf = id;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
};

/** Built-in names, used as the fallback when no row has loaded yet. */
export const DEFAULT_PERMANENT_NAMES: Record<PermanentCollectionId, string> = {
  [BACKLOG_COLLECTION_ID]: 'Backlog',
  [PLAYING_COLLECTION_ID]: 'Playing',
  [COMPLETE_COLLECTION_ID]: '100% Complete',
};

/** The live, renameable name; falls back to the built-in. */
export const collectionName = (id: string, collections: Collection[]): string =>
  collections.find((c) => c.id === id)?.name.trim() ||
  (isPermanentCollection(id) ? DEFAULT_PERMANENT_NAMES[id] : id);

export const MAX_COLLECTION_NAME_LENGTH = 32;

/** Validation shared by the collection name editors. Null when the name is fine. */
export function validateCollectionName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Name cannot be empty.';
  if (trimmed.length > MAX_COLLECTION_NAME_LENGTH) {
    return `Keep it under ${MAX_COLLECTION_NAME_LENGTH} characters.`;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Shelf colours                                                               */
/*                                                                             */
/* Moved verbatim from the status module these replace. The class strings must  */
/* stay literal: Tailwind v4 scans source text, so a class built by             */
/* concatenation is dropped at build time with no error.                       */
/* -------------------------------------------------------------------------- */

/**
 * Selected-state classes for a shelf control, so a picker uses the same colour
 * the shelf carries everywhere else instead of one accent for all of them.
 */
export const PERMANENT_SELECTED_CLASS: Record<PermanentCollectionId, string> = {
  [PLAYING_COLLECTION_ID]: 'border-accent-700/60 bg-accent-700/16 text-accent-900',
  [BACKLOG_COLLECTION_ID]: 'border-gray-400 bg-gray-300 text-gray-1000',
  [COMPLETE_COLLECTION_ID]: 'border-trophy-700/60 bg-trophy-700/16 text-trophy-900',
};

/**
 * Text colour for a shelf chip sitting on cover art, where the scrim already
 * supplies the background and only the ink needs to carry the shelf.
 */
export const PERMANENT_OVERLAY_CLASS: Record<PermanentCollectionId, string> = {
  [PLAYING_COLLECTION_ID]: 'text-accent-900',
  [BACKLOG_COLLECTION_ID]: 'text-gray-800',
  [COMPLETE_COLLECTION_ID]: 'text-trophy-900',
};

/**
 * The raw colour a shelf carries, for the places that need a value rather than
 * a class — an SVG stroke, an inline gradient. Kept beside the tone map so the
 * chart and the badge can never drift to different colours for the same shelf.
 */
export const PERMANENT_COLOR: Record<PermanentCollectionId, string> = {
  [PLAYING_COLLECTION_ID]: 'var(--color-accent-700)',
  [BACKLOG_COLLECTION_ID]: 'var(--color-gray-500)',
  [COMPLETE_COLLECTION_ID]: 'var(--color-trophy-700)',
};

/** Tone token used for a shelf wherever it is shown as a badge. */
export const PERMANENT_TONE: Record<
  PermanentCollectionId,
  'accent' | 'notice' | 'positive' | 'trophy' | 'neutral'
> = {
  [PLAYING_COLLECTION_ID]: 'accent',
  // Neutral, not notice: the backlog is a queue, and the amber read as a
  // warning and clashed with the gold used for completion.
  [BACKLOG_COLLECTION_ID]: 'neutral',
  [COMPLETE_COLLECTION_ID]: 'trophy',
};
