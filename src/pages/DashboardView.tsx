import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, Crosshair, Gamepad2, Plus, Target, Bell } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useNotifications } from '../context/NotificationsContext';
import { GameList } from '../components/GameGrid';
import { CoverArt } from '../components/CoverArt';
import { PlatformIcon } from '../components/PlatformIcon';
import { TrophyBadge } from '../components/TrophyBadge';
import { NotificationEntry, NotificationRow } from '../components/NotificationsPanel';
import { aggregateCompletion, completionPercent, isPerfect } from '../lib/completion';
import {
  BACKLOG_COLLECTION_ID,
  BEATEN_COLLECTION_ID,
  COMPLETE_COLLECTION_ID,
  PERMANENT_COLOR,
  PLAYING_COLLECTION_ID,
  PermanentCollectionId,
  collectionName,
} from '../lib/collections';
import {
  BACKLOG_SORT_DEFAULT,
  BACKLOG_SORT_KEY,
  BACKLOG_SORT_OPTIONS,
  GameSortOption,
  PLAYING_SORT_DEFAULT,
  PLAYING_SORT_KEY,
  PLAYING_SORT_OPTIONS,
  compareGames,
} from '../lib/sortGames';
import { PLATFORM_IDS, UserGame } from '../types';
import { SHELF_ICONS } from '../components/CollectionIcon';
import { Button, EmptyState, Gauge, Meter, PageHeader, SectionRule } from '../components/ui';
import { completionColor, completionLabel } from '../lib/rating';
import { formatCount, formatHours, sumHours } from '../lib/format';
import { oneOf, readPreference, writePreference } from '../lib/usePersistentState';
import {
  CAMO_VIEW_KEY,
  CamoGlance,
  EMPTY_CAMO_VIEW,
  TIER_COLOR,
  camoGlance,
  isCamoView,
} from '../lib/camo';
import { TierSwatch } from '../components/camo/CamoBits';
import { useSyncedPreference } from '../lib/useSyncedPreference';
import { useIsPhone } from '../lib/useMediaQuery';
import { cn } from '../lib/cn';

/** Cards in Now playing; the rest are a tap away on Playing. */
const NOW_PLAYING_COUNT = 3;
/** Cards in Up next. */
const UP_NEXT_COUNT = 5;
/** Rows in Closest to 100% and in Recent unlocks. */
const PANEL_ROWS = 5;
/** Awards left at which a game's meter turns gold in Closest to 100%. */
const NEARLY_DONE = 2;

const PlayingIcon = SHELF_ICONS[PLAYING_COLLECTION_ID];
const BacklogIcon = SHELF_ICONS[BACKLOG_COLLECTION_ID];

/** Each platform with games in the set, and how many. */
const platformSplit = (subset: UserGame[]) =>
  PLATFORM_IDS.map((platform) => ({
    platform,
    count: subset.filter((g) => g.platform === platform).length,
  })).filter((entry) => entry.count > 0);

const awardsLeft = (game: UserGame) =>
  Math.max(0, game.achievementsTotal - game.achievementsUnlocked);

/** The page a section previews, at the end of its rule. */
const SectionLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <NavLink
    to={to}
    className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-control pl-1 text-75 font-bold text-accent-900 transition-colors hover:text-accent-1000"
  >
    {children}
    <ChevronRight size={14} />
  </NavLink>
);

/** A titled panel: the rule, then its rows. */
const Panel: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <section className="panel flex min-w-0 flex-col gap-3 rounded-lg p-4 md:p-4.5">
    <SectionRule tone="panel" icon={icon} title={title} />
    {children}
  </section>
);

/** A section with nothing in it yet: one line, no more. */
const SectionEmpty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="py-2 text-75 text-gray-600">{children}</p>
);

/**
 * The four shelves as rows, each the way to its page — 100% first and in gold,
 * then Beaten, Playing and Backlog. Beaten has no page of its own and opens as
 * a list.
 *
 * The rows draw no box of their own: a phone puts them in a panel under the
 * gauge, a wide screen inside the completion panel beside it.
 */
const ShelfRows: React.FC<{
  rows: {
    shelf: PermanentCollectionId;
    label: string;
    to: string;
    games: UserGame[];
    gold?: boolean;
  }[];
  className?: string;
}> = ({ rows, className }) => (
  <div className={cn('divide-y divide-gray-200 overflow-hidden', className)}>
    {rows.map(({ shelf, label, to, games, gold }) => {
      const Icon = SHELF_ICONS[shelf];
      const color = PERMANENT_COLOR[shelf];
      return (
        <NavLink
          key={shelf}
          to={to}
          className={cn(
            'relative flex min-h-15 items-center gap-3 px-3.5 py-2.5 transition-colors active:bg-white/5',
            // The 100% row is gold the way a finished card is. An inset ring,
            // not a border, so it sits inside the dividers without making this
            // row a pixel taller than its neighbours.
            gold
              ? 'overflow-hidden bg-trophy-100/40 ring-1 ring-inset ring-trophy-700/55'
              : 'hover:bg-white/3',
          )}
        >
          {gold ? (
            <>
              <span aria-hidden className="trophy-spot" />
              <span aria-hidden className="trophy-sweep" />
            </>
          ) : null}
          <span
            aria-hidden
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          >
            <Icon size={18} />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block truncate text-150 font-bold tracking-tight text-gray-1000">
              {label}
            </span>
            <span className="mt-0.5 flex items-center gap-3 text-75 tabular-nums text-gray-700">
              {platformSplit(games).map(({ platform, count }) => (
                <span key={platform} className="flex items-center gap-1.25">
                  {gold ? (
                    <TrophyBadge platform={platform} size={14} />
                  ) : (
                    <PlatformIcon platform={platform} size={13} className="text-gray-600" />
                  )}
                  {count}
                </span>
              ))}
            </span>
          </span>
          <span
            className={cn(
              'relative text-400 font-bold leading-none tabular-nums',
              gold ? 'text-trophy-900' : 'text-gray-1000',
            )}
          >
            {games.length}
          </span>
          <ChevronRight size={18} className="relative shrink-0 text-gray-600" />
        </NavLink>
      );
    })}
  </div>
);

/**
 * One game in Closest to 100%: its art, its name and meter, and how many
 * awards it has left. The meter turns gold with two or fewer to go.
 */
const ClosestRow: React.FC<{ game: UserGame; onOpen: () => void }> = ({ game, onOpen }) => {
  const left = awardsLeft(game);
  const near = left <= NEARLY_DONE;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-md border border-gray-200 bg-black/25 p-2.5 text-left transition-colors hover:border-gray-300 hover:bg-gray-200"
    >
      <CoverArt
        src={game.coverImage}
        title={game.title}
        className="h-11 w-[4.9rem] shrink-0 rounded-sm object-cover"
      />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="flex min-w-0 items-center gap-2">
          <PlatformIcon platform={game.platform} size={13} className="shrink-0 text-gray-600" />
          <span className="truncate text-90 font-bold text-gray-900 group-hover:text-accent-900">
            {game.title}
          </span>
        </span>
        <Meter
          value={completionPercent(game)}
          tone={near ? 'trophy' : 'accent'}
          label={`${game.title} progress`}
        />
      </span>
      <span className="shrink-0 text-right">
        <span
          className={cn(
            'block text-300 font-bold leading-none tabular-nums',
            near ? 'text-trophy-900' : 'text-gray-1000',
          )}
        >
          {left}
        </span>
        <span className="mt-1 block text-50 text-gray-600">left</span>
      </span>
    </button>
  );
};

/**
 * One tracked game in Home's Call of Duty panel: the mode in view, the tier
 * being worked on, x / y and a meter in that tier's colour. Opens the tracker
 * on that game.
 */
const CamoRow: React.FC<{ glance: CamoGlance }> = ({ glance: { game, mode, tile } }) => (
  <NavLink
    to="/call-of-duty"
    onClick={() => {
      const stored = readPreference(CAMO_VIEW_KEY);
      const view = isCamoView(stored) ? stored : EMPTY_CAMO_VIEW;
      writePreference(CAMO_VIEW_KEY, { ...view, gameId: game.id });
    }}
    className="group flex w-full items-center gap-3 rounded-md border border-gray-200 bg-black/25 p-2.5 transition-colors hover:border-gray-300 hover:bg-gray-200"
  >
    {tile ? (
      <TierSwatch tier={tile.tier} className="h-11 w-11 shrink-0 rounded-sm" />
    ) : (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-gray-200 text-gray-600">
        <Crosshair size={18} />
      </span>
    )}
    <span className="min-w-0 flex-1 space-y-1.5">
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate text-90 font-bold text-gray-900 group-hover:text-accent-900">{game.name}</span>
        <span className="shrink-0 text-50 text-gray-600">{mode.name}</span>
      </span>
      {tile ? (
        <Meter
          value={tile.total > 0 ? (tile.done / tile.total) * 100 : 0}
          color={TIER_COLOR[tile.tier.kind]}
          label={`${game.name} ${tile.tier.name} progress`}
        />
      ) : null}
    </span>
    <span className="shrink-0 text-right">
      {tile ? (
        <>
          <span className="block text-75 font-bold tabular-nums text-gray-1000">
            {tile.done} / {tile.total}
          </span>
          <span className="mt-1 block max-w-24 truncate text-50 text-gray-600">{tile.tier.name}</span>
        </>
      ) : (
        <span className="text-50 text-gray-600">No tiers</span>
      )}
    </span>
  </NavLink>
);

/**
 * Home: a summary of the library. The full grid is Library's.
 *
 * Top to bottom on a wide screen: what you are playing beside how complete the
 * library is, then the games closest to 100% beside what was unlocked lately,
 * then what is next in the backlog. A phone stacks the same sections, gauge
 * first. The Call of Duty panel joins the middle row once a game is tracked;
 * before that it would only be an empty box.
 */
export const DashboardView: React.FC = () => {
  const { games, collections, loading, goToGame, setIsQuickAddOpen, camoGames } = useGame();
  const { notifications } = useNotifications();
  const phone = useIsPhone();

  // The Playing and Backlog pages' own order, so "the first three" and "the
  // first five" are the ones those pages show first.
  const [playingSort] = useSyncedPreference<GameSortOption>(
    PLAYING_SORT_KEY,
    PLAYING_SORT_DEFAULT,
    oneOf(PLAYING_SORT_OPTIONS),
  );
  const [backlogSort] = useSyncedPreference<GameSortOption>(
    BACKLOG_SORT_KEY,
    BACKLOG_SORT_DEFAULT,
    oneOf(BACKLOG_SORT_OPTIONS),
  );

  const shelved = useMemo(() => {
    const on = (id: string) => games.filter((g) => g.collections?.includes(id));
    return {
      playing: on(PLAYING_COLLECTION_ID),
      backlog: on(BACKLOG_COLLECTION_ID),
      beaten: on(BEATEN_COLLECTION_ID),
      perfect: games.filter(isPerfect),
    };
  }, [games]);

  const nowPlaying = useMemo(
    () =>
      [...shelved.playing]
        .sort((a, b) => compareGames(a, b, playingSort) || a.title.localeCompare(b.title))
        .slice(0, NOW_PLAYING_COUNT),
    [shelved.playing, playingSort],
  );

  const upNext = useMemo(
    () =>
      [...shelved.backlog]
        .sort((a, b) => compareGames(a, b, backlogSort) || a.title.localeCompare(b.title))
        .slice(0, UP_NEXT_COUNT),
    [shelved.backlog, backlogSort],
  );

  /** Fewest awards left first; 100% games and games with no list left out. */
  const closest = useMemo(
    () =>
      games
        .filter((g) => g.achievementsTotal > 0 && !isPerfect(g))
        .sort(
          (a, b) =>
            awardsLeft(a) - awardsLeft(b) ||
            completionPercent(b) - completionPercent(a) ||
            a.title.localeCompare(b.title),
        )
        .slice(0, PANEL_ROWS),
    [games],
  );

  /** Newest first, for games still in the library. */
  const recent = useMemo(() => {
    const byId = new Map(games.map((g) => [g.id, g]));
    return [...notifications]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .flatMap<NotificationEntry>((note) => {
        const game = byId.get(note.gameId);
        return game ? [{ note, game, gained: note.to - note.from }] : [];
      })
      .slice(0, PANEL_ROWS);
  }, [notifications, games]);

  /**
   * The gauge measures what you are actually working through: the queue, the
   * games in progress, and the ones already finished.
   *
   * What it leaves out is everything you have walked away from — a game on no
   * shelf, or on a list of your own for something you stopped playing. Those
   * are not progress waiting to be made, and averaging them in only ever drags
   * the arc down.
   */
  const gaugeGames = useMemo(
    () =>
      games.filter(
        (g) =>
          g.collections?.includes(BACKLOG_COLLECTION_ID) ||
          g.collections?.includes(PLAYING_COLLECTION_ID) ||
          g.collections?.includes(BEATEN_COLLECTION_ID) ||
          isPerfect(g),
      ),
    [games],
  );
  const completion = aggregateCompletion(gaugeGames).percent;
  const libraryTotals = aggregateCompletion(games);

  const shelfRows: React.ComponentProps<typeof ShelfRows>['rows'] = [
    {
      shelf: COMPLETE_COLLECTION_ID,
      label: '100%',
      to: '/achievements',
      games: shelved.perfect,
      gold: true,
    },
    {
      shelf: BEATEN_COLLECTION_ID,
      label: collectionName(BEATEN_COLLECTION_ID, collections),
      to: `/collections?list=${BEATEN_COLLECTION_ID}`,
      games: shelved.beaten,
    },
    {
      shelf: PLAYING_COLLECTION_ID,
      label: collectionName(PLAYING_COLLECTION_ID, collections),
      to: '/playing',
      games: shelved.playing,
    },
    {
      shelf: BACKLOG_COLLECTION_ID,
      label: collectionName(BACKLOG_COLLECTION_ID, collections),
      to: '/backlog',
      games: shelved.backlog,
    },
  ];

  const gauge = (
    <Gauge
      layout="inline"
      hero
      label="Library completion"
      fraction={completion / 100}
      value={String(completion)}
      suffix="%"
      verdict={completionLabel(completion)}
      color={completionColor(completion)}
      caption={`${formatCount(gaugeGames.length)} games`}
      size={phone ? 104 : 96}
    />
  );

  const nowPlayingSection = (
    <section className="flex min-w-0 flex-col gap-3 md:gap-4">
      <SectionRule
        icon={<PlayingIcon className="text-accent-900" size={phone ? 15 : 17} />}
        title="Now playing"
        count={shelved.playing.length > 0 ? shelved.playing.length : undefined}
        action={
          shelved.playing.length > 0 ? (
            <SectionLink to="/playing">
              {collectionName(PLAYING_COLLECTION_ID, collections)}
            </SectionLink>
          ) : undefined
        }
      />
      {nowPlaying.length > 0 ? (
        <GameList games={nowPlaying} hidePlatform={phone} columns={phone ? 'strip' : 'three'} />
      ) : (
        <SectionEmpty>Nothing in progress</SectionEmpty>
      )}
    </section>
  );

  const closestPanel = (
    <Panel
      icon={<Target size={phone ? 15 : 16} className="text-accent-900" />}
      title="Closest to 100%"
    >
      {closest.length > 0 ? (
        <div className="space-y-2">
          {closest.map((game) => (
            <ClosestRow key={game.id} game={game} onOpen={() => goToGame(game.id)} />
          ))}
        </div>
      ) : (
        <SectionEmpty>Nothing left to chase</SectionEmpty>
      )}
    </Panel>
  );

  // From the bell's notifications, so per device and kept 30 days, as they are.
  const recentPanel = (
    <Panel icon={<Bell size={phone ? 15 : 16} className="text-accent-900" />} title="Recent unlocks">
      {recent.length > 0 ? (
        <div className="space-y-2">
          {recent.map((entry) => (
            <NotificationRow
              key={entry.note.id}
              entry={entry}
              unread={!entry.note.read}
              onOpen={() => goToGame(entry.game.id)}
            />
          ))}
        </div>
      ) : (
        <SectionEmpty>Nothing unlocked lately</SectionEmpty>
      )}
    </Panel>
  );

  // The mode each game was last viewed in, per device; read once per render.
  const camoView = (() => {
    const stored = readPreference(CAMO_VIEW_KEY);
    return isCamoView(stored) ? stored : EMPTY_CAMO_VIEW;
  })();
  const camoPanel =
    camoGames.length > 0 ? (
      <Panel icon={<Crosshair size={phone ? 15 : 16} className="text-accent-900" />} title="Call of Duty camos">
        <div className="space-y-2">
          {camoGames.map((game) => (
            <CamoRow key={game.id} glance={camoGlance(game, camoView)} />
          ))}
        </div>
      </Panel>
    ) : null;

  // Backlog cards keep their greyscale: the card does that from the shelf.
  const upNextSection =
    upNext.length > 0 ? (
      <section className="flex flex-col gap-3 md:gap-4">
        <SectionRule
          icon={<BacklogIcon className="text-gray-700" size={phone ? 15 : 17} />}
          title="Up next from backlog"
          count={shelved.backlog.length}
          action={
            <SectionLink to="/backlog">
              {collectionName(BACKLOG_COLLECTION_ID, collections)}
            </SectionLink>
          }
        />
        <GameList games={upNext} hidePlatform={phone} />
      </section>
    ) : null;

  const empty = !loading && games.length === 0;

  return (
    <div className="mx-auto max-w-[1760px] space-y-6 md:space-y-7 md:pb-10">
      {/* The link is a page action, so a phone shows it too (PageHeader drops
          only the title there). */}
      <PageHeader
        title="Home"
        subtitle={`${formatCount(games.length)} games · ${formatCount(libraryTotals.unlocked)} of ${formatCount(libraryTotals.unlockable)} awards · ${formatHours(sumHours(games))}h played`}
        action={
          <NavLink
            to="/library"
            className="inline-flex h-9 items-center gap-1 rounded-control px-1 text-90 font-bold text-accent-900 transition-colors hover:text-accent-1000"
          >
            Open library
            <ChevronRight size={16} />
          </NavLink>
        }
      />

      {empty ? (
        <EmptyState
          icon={<Gamepad2 size={24} />}
          title="Your library is empty"
          action={
            <Button variant="accent" onClick={() => setIsQuickAddOpen(true)}>
              <Plus size={14} />
              Add game
            </Button>
          }
        />
      ) : phone ? (
        <>
          <section className="panel rounded-lg p-4">{gauge}</section>
          <ShelfRows rows={shelfRows} className="panel rounded-lg" />
          {nowPlayingSection}
          {recentPanel}
          {closestPanel}
          {camoPanel}
          {upNextSection}
        </>
      ) : (
        <>
          {/* Now playing | Library completion, side by side from 1280. Below
              that Now playing takes the width, and the completion panel under
              it lays its gauge beside its shelf rows from 1024. */}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-6">
            {nowPlayingSection}
            <section className="panel grid gap-4 rounded-lg p-4.5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center xl:grid-cols-1 xl:items-stretch">
              {gauge}
              <ShelfRows rows={shelfRows} className="rounded-md border border-gray-200" />
            </section>
          </div>

          {/* Three across from 1280 once Call of Duty joins; two below that,
              where it wraps under the other two. */}
          <div
            className={cn(
              'grid gap-5 lg:grid-cols-2 xl:gap-6',
              camoPanel && 'xl:grid-cols-3',
            )}
          >
            {closestPanel}
            {recentPanel}
            {camoPanel}
          </div>

          {upNextSection}
        </>
      )}
    </div>
  );
};
