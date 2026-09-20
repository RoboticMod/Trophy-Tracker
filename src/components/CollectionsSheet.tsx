import React, { useMemo } from 'react';
import { Check, FolderKanban } from 'lucide-react';
import { UserGame } from '../types';
import { useGame } from '../context/GameContext';
import { DEFAULT_COLLECTION_COLOR } from '../lib/constants';
import {
  BACKLOG_COLLECTION_ID,
  COMPLETE_COLLECTION_ID,
  PERMANENT_COLOR,
  PLAYING_COLLECTION_ID,
  collectionName,
  isPermanentCollection,
} from '../lib/collections';
import { portraitCoverUrl } from '../lib/image';
import { CoverArt } from './CoverArt';
import { Button, Dialog } from './ui';
import { cn } from '../lib/cn';

/**
 * The order the shelves are offered in.
 *
 * Finished first, then in progress, then queued — the arc a game travels
 * backwards, so the top of the list is what you have to show for yourself
 * rather than what you have not started. Custom lists follow in their own
 * order.
 */
const SHELF_ORDER = [
  COMPLETE_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  BACKLOG_COLLECTION_ID,
] as const;

/** How many covers a row previews before it would start to wrap. */
const PREVIEW_COUNT = 5;

/**
 * Every collection, as one control instead of a wrapped row of chips.
 *
 * On a phone the chip row was the tallest thing on the library page: a dozen
 * collections wrapped to four or five lines of small targets, and you had to
 * read all of them to find the one you wanted. This is one button that opens
 * the list, where each collection gets a line of its own — and a strip of the
 * covers it holds, which is a far quicker way to recognise a list you made
 * than its name is.
 */
export const CollectionsSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { collections, games, activeCollectionFilter, setActiveCollectionFilter } = useGame();

  const rows = useMemo(() => {
    const byId = new Map(collections.map((c) => [c.id, c]));

    const ordered = [
      ...SHELF_ORDER.filter((id) => byId.has(id)),
      ...collections.filter((c) => !isPermanentCollection(c.id)).map((c) => c.id),
    ];

    return ordered.map((id) => {
      const members = games.filter((g) => g.collections?.includes(id));
      return {
        id,
        name: collectionName(id, collections),
        description: byId.get(id)?.description,
        color: isPermanentCollection(id)
          ? PERMANENT_COLOR[id]
          : (byId.get(id)?.color ?? DEFAULT_COLLECTION_COLOR),
        count: members.length,
        // Whatever the library is currently sorted by is already the order
        // these arrive in, so the preview is genuinely the top of the list
        // rather than an arbitrary five.
        preview: members.slice(0, PREVIEW_COUNT),
      };
    });
  }, [collections, games]);

  const choose = (id: string) => {
    setActiveCollectionFilter(id);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Collections"
      description="Show one collection, or the whole library"
      icon={<FolderKanban size={18} />}
      footer={
        <Button variant="accent" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-2">
        <CollectionRow
          name="All collections"
          count={games.length}
          color="var(--color-gray-500)"
          preview={games.slice(0, PREVIEW_COUNT)}
          selected={activeCollectionFilter === 'all'}
          onClick={() => choose('all')}
        />

        {rows.map((row) => (
          <CollectionRow
            key={row.id}
            name={row.name}
            description={row.description}
            count={row.count}
            color={row.color}
            preview={row.preview}
            selected={activeCollectionFilter === row.id}
            onClick={() => choose(row.id)}
          />
        ))}
      </div>
    </Dialog>
  );
};

const CollectionRow: React.FC<{
  name: string;
  description?: string;
  count: number;
  color: string;
  preview: UserGame[];
  selected: boolean;
  onClick: () => void;
}> = ({ name, description, count, color, preview, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    title={description || name}
    className={cn(
      'flex w-full flex-col gap-2 rounded-md border p-3 text-left transition-colors',
      selected
        ? 'border-accent-700/60 bg-accent-700/16'
        : 'border-gray-300 bg-black/25 hover:border-gray-400 hover:bg-black/40',
    )}
  >
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px -1px ${color}` }}
      />
      <span className="min-w-0 flex-1 truncate text-100 font-semibold text-gray-1000">{name}</span>
      <span className="shrink-0 text-75 tabular-nums text-gray-600">{count}</span>
      {selected ? <Check size={14} className="shrink-0 text-accent-900" /> : null}
    </div>

    {/* The covers, not the names: recognising a list you made yourself from
        five pictures is quicker than reading its label, and an empty strip
        says "nothing in here" without needing a sentence to do it. */}
    {preview.length > 0 ? (
      <div className="flex gap-1.5">
        {preview.map((game) => (
          <CoverArt
            key={game.id}
            src={[portraitCoverUrl(game), game.coverImage]}
            title={game.title}
            className="h-16 w-[2.6rem] shrink-0 rounded-sm object-cover object-center"
          />
        ))}
      </div>
    ) : (
      <p className="text-50 text-gray-600">Nothing in here yet.</p>
    )}
  </button>
);
