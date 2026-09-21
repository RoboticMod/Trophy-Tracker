import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { UserGame } from '../types';
import { useGame } from '../context/GameContext';
import { DEFAULT_COLLECTION_COLOR } from '../lib/constants';
import {
  BACKLOG_COLLECTION_ID,
  COMPLETE_COLLECTION_ID,
  PERMANENT_COLOR,
  PERMANENT_ROW_CLASS,
  PLAYING_COLLECTION_ID,
  PermanentCollectionId,
  collectionName,
  isPermanentCollection,
} from '../lib/collections';
import { CoverArt } from './CoverArt';
import { CollectionIcon } from './CollectionIcon';
import { cn } from '../lib/cn';

/**
 * Where each permanent shelf already has a page of its own.
 *
 * On a phone those three lost their place in the bottom bar, which has room
 * for five destinations and had seven competing for it. This list is how they
 * are reached instead, so tapping one goes to the page that was already there
 * rather than to a lesser copy of it inside this one.
 */
const SHELF_ROUTES: Record<string, string> = {
  [COMPLETE_COLLECTION_ID]: '/achievements',
  [PLAYING_COLLECTION_ID]: '/playing',
  [BACKLOG_COLLECTION_ID]: '/backlog',
};

/** Finished, in progress, queued — then the lists you made yourself. */
const SHELF_ORDER = [
  COMPLETE_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  BACKLOG_COLLECTION_ID,
] as const;

const PREVIEW_COUNT = 4;

/**
 * Every collection as a row, each showing a few of the games inside it.
 *
 * The covers are the point. A list of names and counts tells you what you
 * called things; a strip of posters tells you what is actually in there, which
 * is the question being asked when someone opens this page.
 */
export const CollectionsList: React.FC<{
  /** Called for a collection that has no page of its own. */
  onOpen: (collectionId: string) => void;
}> = ({ onOpen }) => {
  const { collections, games } = useGame();

  const rows = useMemo(() => {
    const byId = new Map(collections.map((c) => [c.id, c]));
    const ids = [
      ...SHELF_ORDER.filter((id) => byId.has(id)),
      ...collections.filter((c) => !isPermanentCollection(c.id)).map((c) => c.id),
    ];

    return ids.map((id) => ({
      id,
      name: collectionName(id, collections),
      icon: byId.get(id)?.icon,
      // Which of the three shelves this is, or null for a list of your own.
      // Worked out here, so the row itself never has to know which ids are
      // special — it is handed the answer.
      permanent: isPermanentCollection(id) ? id : null,
      color: isPermanentCollection(id)
        ? PERMANENT_COLOR[id]
        : (byId.get(id)?.color ?? DEFAULT_COLLECTION_COLOR),
      games: games.filter((g) => g.collections?.includes(id)),
      route: SHELF_ROUTES[id],
    }));
  }, [collections, games]);

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <CollectionListRow
          key={row.id}
          name={row.name}
          icon={row.icon}
          color={row.color}
          permanent={row.permanent}
          games={row.games}
          onClick={() => onOpen(row.route ?? row.id)}
        />
      ))}
    </div>
  );
};

const CollectionListRow: React.FC<{
  name: string;
  icon?: string;
  color: string;
  /** Which shelf this row is, or null for an ordinary list. */
  permanent: PermanentCollectionId | null;
  games: UserGame[];
  onClick: () => void;
}> = ({ name, icon, color, permanent, games, onClick }) => (
  // The three shelves wear their own colour here. On a phone this page is the
  // only way to reach them, and in a plain list they were three rows among
  // however many lists you have made, told apart only by their names.
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative w-full rounded-lg border p-3 text-left transition-colors',
      permanent
        ? PERMANENT_ROW_CLASS[permanent]
        : 'border-gray-300/70 bg-gray-100/70 hover:border-gray-400',
    )}
  >
    {/* The same band of gold light that turns around a finished game's card.
        The utility is self-contained — it insets itself by a pixel, inherits
        this button's radius, masks itself down to that rim, and carries its own
        reduced-motion guard — so it needs nothing here but a positioned
        parent, which is what `relative` above is for. */}
    {permanent === COMPLETE_COLLECTION_ID ? (
      <span aria-hidden className="gold-ring rounded-lg" />
    ) : null}

    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
          color,
        }}
      >
        <CollectionIcon name={icon} size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-200 font-bold tracking-tight text-gray-1000">
          {name}
        </span>
        <span className="block text-75 text-gray-600">
          {games.length} {games.length === 1 ? 'game' : 'games'}
        </span>
      </span>

      <ChevronRight size={18} className="shrink-0 text-gray-600" />
    </div>

    {/* Posters only, no names and no figures: this is a glance at what is
        inside, and anything written across them turns it back into the list of
        rows the page is trying not to be. */}
    {games.length > 0 ? (
      <div className="mt-3 flex gap-2 overflow-hidden">
        {games.slice(0, PREVIEW_COUNT).map((game) => (
          <CoverArt
            key={game.id}
            src={game.coverImage}
            title={game.title}
            className="aspect-video w-24 shrink-0 rounded-sm border border-gray-300/60 object-cover object-center"
          />
        ))}
      </div>
    ) : null}
  </button>
);
