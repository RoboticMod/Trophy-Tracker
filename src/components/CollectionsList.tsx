import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { UserGame } from '../types';
import { useGame } from '../context/GameContext';
import { DEFAULT_COLLECTION_COLOR } from '../lib/constants';
import { formatCount, formatHours, sumHours } from '../lib/format';
import {
  BACKLOG_COLLECTION_ID,
  BEATEN_COLLECTION_ID,
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

/** Finished, in progress, beaten, queued — then the lists you made yourself. */
const SHELF_ORDER = [
  COMPLETE_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  BEATEN_COLLECTION_ID,
  BACKLOG_COLLECTION_ID,
] as const;

/**
 * Covers in a row's preview. Three portrait previews fill a 390 phone's row
 * exactly; a fourth was cut off at the edge, which read as a mistake rather
 * than as "more". The third says how many more there are instead.
 */
const PREVIEW_COUNT = 3;

/**
 * What a row says under its name — the one figure each kind of list is read
 * for: how much a finished shelf earned, how long the one in progress has
 * taken, how long the queue is, and how big a list of your own is.
 */
const countLabel = (permanent: PermanentCollectionId | null, games: UserGame[]): string => {
  const n = `${games.length} ${games.length === 1 ? 'game' : 'games'}`;
  switch (permanent) {
    case COMPLETE_COLLECTION_ID:
      return `${n} · ${formatCount(games.reduce((t, g) => t + (g.achievementsUnlocked || 0), 0))} awards`;
    case PLAYING_COLLECTION_ID:
      return `${n} · ${formatHours(sumHours(games))}h`;
    case BACKLOG_COLLECTION_ID:
      return `${n} queued`;
    default:
      return n;
  }
};

/**
 * Every list as a row, the three shelves first, each showing a few of the games
 * inside it.
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
    <div className="space-y-3">
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

    <div className="flex min-h-11 items-center gap-3">
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
          color,
        }}
      >
        <CollectionIcon name={icon} size={19} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-150 font-bold tracking-tight text-gray-1000">
          {name}
        </span>
        <span className="block text-75 tabular-nums text-gray-700">
          {countLabel(permanent, games)}
        </span>
      </span>

      <ChevronRight size={20} className="shrink-0 text-gray-600" />
    </div>

    {/* Posters, each wearing the game's own lettering — and no figures: this
        is a glance at what is inside, and a count or a meter under each one
        would turn it back into the list of rows the page is trying not to be. */}
    {games.length > 0 ? (
      <div className="mt-3 grid grid-cols-3 gap-2">
        {games.slice(0, PREVIEW_COUNT).map((game, index) => {
          const more = games.length - PREVIEW_COUNT;
          return (
            <PreviewCover
              key={game.id}
              game={game}
              portrait
              className="w-full rounded-control border border-gray-300/70"
            >
              {index === PREVIEW_COUNT - 1 && more > 0 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-gray-25/72 text-90 font-bold tabular-nums text-gray-1000">
                  +{more}
                </span>
              ) : null}
            </PreviewCover>
          );
        })}
      </div>
    ) : null}
  </button>
);

/**
 * One cover in a row's preview strip, wearing the game's own lettering.
 *
 * Three states rather than two, because a logo that is *on its way* must not
 * look like one that arrived. An `<img>` with a source it has not fetched yet
 * draws the browser's own placeholder — a pale frame with a torn-page glyph —
 * and over a 96px cover that reads as damage rather than as loading. So the
 * mark and the shade under it stay hidden until the file is actually decoded,
 * and a source that never arrives leaves the artwork exactly as it was.
 *
 * That last part is not hypothetical: a stored URL is only ever checked when it
 * is resolved, and a logo can be withdrawn from its host long afterwards.
 */
export const PreviewCover: React.FC<{
  game: UserGame;
  /** The box's width and edge. The desktop mosaic fills its cell. */
  className?: string;
  /**
   * 2:3 rather than 16:9: a phone row's three previews. Drawn from the game's
   * portrait poster, which has its name painted in, so no logo is laid over
   * it: the stored poster first, Steam's own portrait capsule for a linked app
   * while the backfill has not reached it, and only then the landscape art,
   * cropped to its middle to fill the box.
   */
  portrait?: boolean;
  children?: React.ReactNode;
}> = ({
  game,
  className = 'w-24 shrink-0 rounded-sm border border-gray-300/60',
  portrait = false,
  children,
}) => {
  const [logo, setLogo] = useState<'loading' | 'ready' | 'failed'>('loading');

  return (
    <span
      className={cn(
        'relative block overflow-hidden',
        portrait ? 'aspect-[2/3]' : 'aspect-video',
        className,
      )}
    >
      <CoverArt
        src={
          portrait
            ? [
                game.posterImage,
                game.steamAppId
                  ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steamAppId}/library_600x900.jpg`
                  : undefined,
                game.coverImage,
              ]
            : game.coverImage
        }
        title={game.title}
        className="h-full w-full object-cover object-center"
      />

      {!portrait && game.logoImage && logo !== 'failed' ? (
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center p-1.5 transition-opacity',
            logo === 'ready' ? 'opacity-100' : 'opacity-0',
          )}
        >
          {/* A pool of shade under the mark, so it is not read against whatever
              the artwork has painted there — key art usually carries the title
              already, and without this the two sets of lettering fight. */}
          <span
            aria-hidden
            className="absolute inset-x-2 inset-y-1 rounded-full bg-gray-25/55 blur-md"
          />

          {/* Sized by height, not by box.
 
              Filling the box with `object-contain` looks like it equalises
              these and does the opposite: the box is 2.05 wide, so a logo
              taller than that fits to height and fills it, while a wider one
              fits to width and ends up short. Steam's own logo art runs from
              1.78 to 6.53 — Spider-Man against Elden Ring — so the same box
              drew one at 40px tall and the other at 13px.
 
              A fixed height gives every mark the same cap height, which is how
              a row of logos is normally set. `max-w-full` still catches the
              extreme wordmarks, which have nowhere else to go in 96px. */}
          <img
            src={game.logoImage}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setLogo('ready')}
            onError={() => setLogo('failed')}
            className="relative h-[65%] w-auto max-w-full object-contain drop-shadow-[0_1px_4px_rgb(3_5_10/0.9)]"
          />
        </span>
      ) : null}

      {children}
    </span>
  );
};
