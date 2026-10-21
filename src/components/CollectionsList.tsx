import React, { useMemo } from 'react';
import { ChevronRight, Crosshair } from 'lucide-react';
import { PLATFORM_IDS, UserGame } from '../types';
import { useGame } from '../context/GameContext';
import { DEFAULT_COLLECTION_COLOR, PLATFORMS } from '../lib/constants';
import { isPerfect } from '../lib/completion';
import { byRating } from '../lib/sortGames';
import { formatHours, sumHours } from '../lib/format';
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
import { TrophyBadge } from './TrophyBadge';
import { TierSwatch } from './camo/CamoBits';
import { Badge, Meter } from './ui';
import {
  CAMO_VIEW_KEY,
  EMPTY_CAMO_VIEW,
  TIER_COLOR,
  camoFocus,
  camoListLine,
  camoSwatchTiers,
  isCamoView,
  libraryMatch,
} from '../lib/camo';
import { readPreference } from '../lib/usePersistentState';
import { cn } from '../lib/cn';

/**
 * The 100% entry's line: how many, split by platform, and what they share —
 * "3 games · 2 Steam · 1 PS · every award earned". A platform with none is
 * left out rather than counted as zero.
 */
export const perfectLabel = (games: UserGame[]): string =>
  [
    `${games.length} ${games.length === 1 ? 'game' : 'games'}`,
    ...PLATFORM_IDS.flatMap((p) => {
      const n = games.filter((g) => g.platform === p).length;
      return n > 0 ? [`${n} ${PLATFORMS[p].shortName}`] : [];
    }),
    'every award earned',
  ].join(' · ');

/**
 * Where each permanent shelf already has a page of its own.
 *
 * A phone's bar holds four tabs, and 100% is never one of them (nor Backlog
 * by default), so this list is a way to them: tapping one goes to the page
 * that was already there rather than to a lesser copy of it inside this one.
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
      return perfectLabel(games);
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
    // 100% is always first and always there: it is not the stored shelf but
    // every game where isPerfect holds — the one definition of 100%.
    const ids = [
      ...SHELF_ORDER.filter((id) => id === COMPLETE_COLLECTION_ID || byId.has(id)),
      ...collections.filter((c) => !isPermanentCollection(c.id)).map((c) => c.id),
    ];
    const perfect = games.filter(isPerfect).sort(byRating);

    return ids.map((id) => ({
      id,
      name: id === COMPLETE_COLLECTION_ID ? '100%' : collectionName(id, collections),
      icon: byId.get(id)?.icon,
      // Which of the three shelves this is, or null for a list of your own.
      // Worked out here, so the row itself never has to know which ids are
      // special — it is handed the answer.
      permanent: isPermanentCollection(id) ? id : null,
      color: isPermanentCollection(id)
        ? PERMANENT_COLOR[id]
        : (byId.get(id)?.color ?? DEFAULT_COLLECTION_COLOR),
      // Best rated first, so the previews lead with the games worth showing.
      games:
        id === COMPLETE_COLLECTION_ID
          ? perfect
          : games.filter((g) => g.collections?.includes(id)).sort(byRating),
      route: SHELF_ROUTES[id],
    }));
  }, [collections, games]);

  return (
    <div className="space-y-3">
      <CamoListRow onClick={() => onOpen('/call-of-duty')} />
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

/**
 * The Call of Duty tracker, first among a phone's lists: a door to the
 * tracker, outlined in blue so it does not read as a list. Two tracked games'
 * posters (the library game of the same name, else the name on a tile), then
 * the tier swatches.
 */
const CamoListRow: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { camoGames, games } = useGame();
  const stored = readPreference(CAMO_VIEW_KEY);
  const view = isCamoView(stored) ? stored : EMPTY_CAMO_VIEW;
  const focus = camoFocus(camoGames, view);

  return (
    <button
      type="button"
      onClick={onClick}
      className="glow-ring w-full rounded-lg border border-accent-700/50 bg-accent-700/8 p-3 text-left transition-colors"
    >
      <div className="flex min-h-11 items-center gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-700/16 text-accent-900"
        >
          <Crosshair size={19} />
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-150 font-bold tracking-tight text-gray-1000">Call of Duty</span>
            <Badge tone="accent">Tracker</Badge>
          </span>
          <span className="block text-75 tabular-nums text-gray-700">{camoListLine(camoGames, view)}</span>
          {focus?.tile ? (
            <Meter
              value={focus.tile.total > 0 ? (focus.tile.done / focus.tile.total) * 100 : 0}
              color={TIER_COLOR[focus.tile.tier.kind]}
              label="Camo progress"
            />
          ) : null}
        </span>
        <ChevronRight size={20} className="shrink-0 text-gray-600" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {camoGames.slice(0, PREVIEW_COUNT - 1).map((game) => {
          const match = libraryMatch(game.name, games);
          return match ? (
            <PreviewCover
              key={game.id}
              game={match}
              portrait
              className="w-full rounded-control border border-gray-300/70"
            />
          ) : (
            <span
              key={game.id}
              className="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-control border border-gray-300/70 bg-gray-100 p-2 text-center"
            >
              <Crosshair size={16} className="text-gray-600" />
              <span className="line-clamp-3 text-75 font-bold text-gray-800">{game.name}</span>
            </span>
          );
        })}
        <span className="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-control border border-gray-300/70 bg-gray-100">
          <span className="grid grid-cols-2 gap-1">
            {camoSwatchTiers(focus)
              .slice(0, 4)
              .map((tier) => (
                <TierSwatch key={tier.id} tier={tier} className="h-6 w-6 rounded-sm" />
              ))}
          </span>
          <span className="eyebrow text-center text-gray-700">Camo tracker</span>
        </span>
      </div>
    </button>
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
      permanent === COMPLETE_COLLECTION_ID && 'overflow-hidden',
      permanent
        ? PERMANENT_ROW_CLASS[permanent]
        : 'border-gray-300/70 bg-gray-100/70 hover:border-gray-400',
    )}
  >
    {/* The same gold a finished game's card wears: the still border and halo
        come from PERMANENT_ROW_CLASS, the warm spot and the foil sweep from
        these two. The content below is `relative` so it paints above them. */}
    {permanent === COMPLETE_COLLECTION_ID ? (
      <>
        <span aria-hidden className="trophy-spot rounded-lg" />
        <span aria-hidden className="trophy-sweep" />
      </>
    ) : null}

    <div className="relative flex min-h-11 items-center gap-3">
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
          color,
        }}
      >
        <CollectionIcon name={icon} shelf={permanent} size={19} />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-150 font-bold tracking-tight',
            permanent === COMPLETE_COLLECTION_ID ? 'text-trophy-900' : 'text-gray-1000',
          )}
        >
          {name}
        </span>
        {/* Wraps rather than truncates: 100%'s line is the long one, and
            "every award earned" is what it says. */}
        <span className="block text-75 tabular-nums text-gray-700">
          {countLabel(permanent, games)}
        </span>
      </span>

      {permanent === COMPLETE_COLLECTION_ID ? (
        <span className="shrink-0 text-400 font-bold leading-none tabular-nums text-trophy-900">
          {games.length}
        </span>
      ) : null}
      <ChevronRight size={20} className="shrink-0 text-gray-600" />
    </div>

    {/* Posters, each wearing the game's own lettering — and no figures: this
        is a glance at what is inside, and a count or a meter under each one
        would turn it back into the list of rows the page is trying not to be. */}
    {games.length > 0 ? (
      <div className="relative mt-3 grid grid-cols-3 gap-2">
        {games.slice(0, PREVIEW_COUNT).map((game, index) => {
          const more = games.length - PREVIEW_COUNT;
          return (
            <PreviewCover
              key={game.id}
              game={game}
              portrait
              className="w-full rounded-control border border-gray-300/70"
            >
              {permanent === COMPLETE_COLLECTION_ID ? (
                <span className="absolute right-1 top-1 flex drop-shadow-[0_1px_3px_rgb(0_0_0/0.8)]">
                  <TrophyBadge platform={game.platform} size={16} />
                </span>
              ) : null}
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
 * One cover in a list's preview: the same art a game card shows.
 *
 * No logo over it. The desktop mosaic used to set each game's own lettering in
 * the middle of its art, which made the Lists page the one place a game looked
 * different from its card — and most key art already carries the title.
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
}) => (
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

    {children}
  </span>
);
