import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
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
import { PosterArt } from './PosterArt';
import { CollectionIcon } from './CollectionIcon';

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
  games: UserGame[];
  onClick: () => void;
}> = ({ name, icon, color, games, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full rounded-lg border border-gray-300/70 bg-gray-100/70 p-3 text-left transition-colors hover:border-gray-400"
  >
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

    {/* Posters only, no figures: this is a glance at what is inside, and a
        count or a meter under each one would turn it back into the list of
        rows the page is trying not to be. */}
    {games.length > 0 ? (
      <div className="mt-3 flex gap-2 overflow-hidden">
        {games.slice(0, PREVIEW_COUNT).map((game) => (
          <PosterArt
            key={game.id}
            game={game}
            className="aspect-[2/3] w-[4.25rem] shrink-0 rounded-sm border border-gray-300/60"
          />
        ))}
      </div>
    ) : null}
  </button>
);
