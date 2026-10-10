import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, Gamepad2, Plus, Search, ListFilter, Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid, GameList } from '../components/GameGrid';
import { PlatformIcon } from '../components/PlatformIcon';
import { TrophyBadge } from '../components/TrophyBadge';
import { DEFAULT_COLLECTION_COLOR, PLATFORMS } from '../lib/constants';
import { aggregateCompletion, isPerfect } from '../lib/completion';
import { GameSortOption, compareGames } from '../lib/sortGames';
import {
  BACKLOG_COLLECTION_ID,
  BEATEN_COLLECTION_ID,
  COMPLETE_COLLECTION_ID,
  PERMANENT_COLOR,
  PLAYING_COLLECTION_ID,
  PermanentCollectionId,
  UNSHELVED_FILTER,
  collectionName,
  isPermanentCollection,
  permanentOf,
} from '../lib/collections';
import { PLATFORM_IDS, UserGame } from '../types';
import { SHELF_ICONS } from '../components/CollectionIcon';
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  Gauge,
  PageHeader,
  SectionRule,
  Select,
  TextInput,
} from '../components/ui';
import { SortControl } from '../components/SortControl';
import { completionColor, completionLabel } from '../lib/rating';
import { formatCount, formatHours, sumHours } from '../lib/format';
import { oneOf } from '../lib/usePersistentState';
import { useSyncedPreference } from '../lib/useSyncedPreference';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { cn } from '../lib/cn';

const PlayingIcon = SHELF_ICONS[PLAYING_COLLECTION_ID];

type RatingFilterOption = 'all' | '9+' | '7.5+' | '6+' | '4+' | 'unrated';

const SORT_OPTIONS = [
  'title-asc',
  'recent',
  'achievement-rating-desc',
  'hours-desc',
  'completion-desc',
] as const satisfies readonly GameSortOption[];

const RATING_FILTER_OPTIONS = [
  { value: 'all', label: 'Any rating' },
  { value: '9+', label: 'Rated 9 or more' },
  { value: '7.5+', label: 'Rated 7.5 or more' },
  { value: '6+', label: 'Rated 6 or more' },
  { value: '4+', label: 'Rated 4 or more' },
  { value: 'unrated', label: 'Unrated only' },
] as const satisfies readonly { value: RatingFilterOption; label: string }[];

const RATING_FILTERS = RATING_FILTER_OPTIONS.map((option) => option.value);

/** Each platform with games in the set, and how many. */
const platformSplit = (subset: UserGame[]) =>
  PLATFORM_IDS.map((platform) => ({
    platform,
    count: subset.filter((g) => g.platform === platform).length,
  })).filter((entry) => entry.count > 0);

/**
 * One of the three counts beside the gauge on a wide screen: an eyebrow, the
 * figure, and a line breaking it down. At 44 in a row of four from 1280, where
 * the row is as tall as the gauge and the figure can fill it; at 24 below that,
 * where the three share a row under the gauge instead.
 */
const SummaryTile: React.FC<{
  label: string;
  value: number;
  valueClassName?: string;
  detail: React.ReactNode;
}> = ({ label, value, valueClassName = 'text-gray-1000', detail }) => (
  <div className="panel flex min-w-0 flex-col gap-2 rounded-tile px-2.5 py-3 md:gap-2.25 md:p-3.5 xl:justify-between xl:gap-2.5 xl:rounded-lg xl:px-4.5 xl:py-4">
    <div className="eyebrow truncate text-gray-600">{label}</div>
    <div
      className={cn(
        'text-400 font-bold leading-none tabular-nums md:text-550 xl:text-1000',
        valueClassName,
      )}
    >
      {value}
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-75 tabular-nums text-gray-700 md:gap-x-3">
      {detail}
    </div>
  </div>
);

/**
 * A phone's summary: the three shelves as rows of one panel, each the way to
 * its page.
 *
 * Three tiles a third of a phone wide each were cramped and empty at once —
 * an eyebrow, a numeral and two tiny marks with nothing to fill the box. A row
 * has the width to lay the same facts out side by side, and these shelves
 * have no tab of their own on a phone, so a row you can tap earns its height.
 */
const ShelfRows: React.FC<{
  rows: {
    shelf: PermanentCollectionId;
    label: string;
    to: string;
    games: UserGame[];
    gold?: boolean;
  }[];
}> = ({ rows }) => (
  <div className="panel col-span-3 divide-y divide-gray-200 overflow-hidden rounded-lg">
    {rows.map(({ shelf, label, to, games, gold }) => {
      const Icon = SHELF_ICONS[shelf];
      const color = PERMANENT_COLOR[shelf];
      return (
        <NavLink
          key={shelf}
          to={to}
          className="flex min-h-15 items-center gap-3 px-3.5 py-2.5 transition-colors active:bg-white/5"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          >
            <Icon size={18} />
          </span>
          <span className="min-w-0 flex-1">
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
              'text-400 font-bold leading-none tabular-nums',
              gold ? 'text-trophy-900' : 'text-gray-1000',
            )}
          >
            {games.length}
          </span>
          <ChevronRight size={18} className="shrink-0 text-gray-600" />
        </NavLink>
      );
    })}
  </div>
);

export const DashboardView: React.FC = () => {
  const {
    games,
    collections,
    profile,
    loading,
    activePlatformFilter,
    setActivePlatformFilter,
    activeCollectionFilter,
    setActiveCollectionFilter,
    setIsQuickAddOpen,
  } = useGame();

  const [localSearch, setLocalSearch] = useState('');

  // The collection filter is a wrapped chip row on a wide screen and nothing at
  // all on a phone, where Collections is its own page — so this is a question of
  // whether the control exists, not of how it is drawn.
  const phone = useIsPhone();
  // Where the summary becomes one row of four, and the control row has the
  // width for lists and the rating filter.
  const wide = useMediaQuery('(min-width: 80rem)');
  // Sort and rating filter persist: they describe how you like the library laid
  // out, and re-picking them after every reload was busywork.
  const [sortBy, setSortBy] = useSyncedPreference<GameSortOption>(
    'library-sort',
    'title-asc',
    oneOf(SORT_OPTIONS),
  );
  const [ratingFilter, setRatingFilter] = useSyncedPreference<RatingFilterOption>(
    'library-rating',
    'all',
    oneOf(RATING_FILTERS),
  );

  const backlogGames = games.filter((g) => g.collections?.includes(BACKLOG_COLLECTION_ID));
  const currentlyPlaying = games.filter((g) => g.collections?.includes(PLAYING_COLLECTION_ID));
  const perfectGames = games.filter(isPerfect);

  const platformOrder = profile.platformOrder;

  // Permanent shelves first: they are the ones people filter by most, and the
  // chip row is now the only status control on the page.
  const orderedCollections = useMemo(
    () => [
      ...collections.filter((c) => isPermanentCollection(c.id)),
      ...collections.filter((c) => !isPermanentCollection(c.id)),
    ],
    [collections],
  );

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
  const unshelvedCount = games.filter((g) => permanentOf(g.collections) === null).length;
  const gaugeTotals = aggregateCompletion(gaugeGames);
  const completion = gaugeTotals.percent;
  const libraryTotals = aggregateCompletion(games);

  const processedGames = useMemo(() => {
    const result = games.filter((g) => {
      if (activePlatformFilter !== 'all' && g.platform !== activePlatformFilter) return false;
      if (activeCollectionFilter === UNSHELVED_FILTER) {
        if (permanentOf(g.collections) !== null) return false;
      } else if (
        activeCollectionFilter !== 'all' &&
        !g.collections?.includes(activeCollectionFilter)
      ) {
        return false;
      }

      if (ratingFilter !== 'all') {
        const r = g.rating || 0;
        if (ratingFilter === '9+' && r < 9) return false;
        if (ratingFilter === '7.5+' && r < 7.5) return false;
        if (ratingFilter === '6+' && r < 6) return false;
        if (ratingFilter === '4+' && r < 4) return false;
        if (ratingFilter === 'unrated' && r > 0) return false;
      }

      if (localSearch.trim()) {
        const q = localSearch.toLowerCase();
        const matchTitle = g.title.toLowerCase().includes(q);
        const matchGenre = g.genres.some((genre) => genre.toLowerCase().includes(q));
        if (!matchTitle && !matchGenre) return false;
      }
      return true;
    });

    result.sort((a, b) => compareGames(a, b, sortBy));

    return result;
  }, [games, activePlatformFilter, activeCollectionFilter, ratingFilter, localSearch, sortBy]);

  const sort = (
    <SortControl id="library-sort" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
  );

  return (
    <div className="mx-auto max-w-[1760px] space-y-6 md:space-y-7 md:pb-10">
      <PageHeader
        title="Home"
        subtitle={`${formatCount(games.length)} games tracked · ${formatCount(libraryTotals.unlocked)} of ${formatCount(libraryTotals.unlockable)} awards · ${formatHours(sumHours(games))}h played`}
        action={phone ? undefined : sort}
      />

      {phone ? sort : null}

      {/* Summary -------------------------------------------------------------
          The completion gauge, then the three counts the library breaks into.
          One row of four from 1280; below that the gauge takes a row of its
          own and the counts share the next — on a phone as one panel of
          three rows, each the way to its shelf. */}
      <section className="grid grid-cols-3 gap-2 md:gap-3 xl:grid-cols-[1.7fr_1fr_1fr_1fr] xl:gap-4">
        <Card bare className="col-span-3 flex items-center p-4 md:p-4.5 xl:col-span-1 xl:px-5 xl:py-4">
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
            size={wide ? 96 : 104}
          />
        </Card>

        {phone ? (
          <ShelfRows
            rows={[
              {
                shelf: COMPLETE_COLLECTION_ID,
                label: '100%',
                to: '/achievements',
                games: perfectGames,
                gold: true,
              },
              {
                shelf: PLAYING_COLLECTION_ID,
                label: collectionName(PLAYING_COLLECTION_ID, collections),
                to: '/playing',
                games: currentlyPlaying,
              },
              {
                shelf: BACKLOG_COLLECTION_ID,
                label: collectionName(BACKLOG_COLLECTION_ID, collections),
                to: '/backlog',
                games: backlogGames,
              },
            ]}
          />
        ) : (
          <>
            <SummaryTile
              label="100%"
              value={perfectGames.length}
              valueClassName="text-trophy-900"
              detail={platformSplit(perfectGames).map(({ platform, count }) => (
                <span key={platform} className="flex items-center gap-1.25">
                  <TrophyBadge platform={platform} size={16} />
                  {count} {PLATFORMS[platform].name}
                </span>
              ))}
            />
            <SummaryTile
              label={collectionName(PLAYING_COLLECTION_ID, collections)}
              value={currentlyPlaying.length}
              detail={[
                `${formatHours(sumHours(currentlyPlaying))}h played`,
                ...platformSplit(currentlyPlaying).map(
                  ({ platform, count }) => `${count} ${PLATFORMS[platform].name}`,
                ),
              ].join(' · ')}
            />
            <SummaryTile
              label={collectionName(BACKLOG_COLLECTION_ID, collections)}
              value={backlogGames.length}
              detail={platformSplit(backlogGames)
                .map(({ platform, count }) => `${count} ${PLATFORMS[platform].name}`)
                .join(' · ')}
            />
          </>
        )}
      </section>

      {/* Controls ------------------------------------------------------------
          On a phone: the field, then the filters as one row of pills that
          scrolls sideways under the thumb, then sort and rating side by side,
          each opening a sheet. On a wide screen all of it is one line: the
          field, the pills, the two selects. Either way the chips scroll rather
          than wrap, so the grid under them always starts at the same height.

          Your lists join the chips on a phone and from 1280 — not the shelves,
          which are destinations of their own. Between 768 and 1280 lists and
          the rating filter stay in the row only while they are filtering. */}
      <section className="flex flex-col gap-2.5 md:flex-row md:items-center xl:gap-3">
        <div className="relative min-w-0 md:flex-1 xl:w-90 xl:flex-none">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600"
            size={18}
          />
          <TextInput
            type="search"
            placeholder="Title or genre"
            aria-label="Filter library"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10.5"
          />
        </div>

        {/* Bleeds to the screen edge on a phone, so a pill cut by the edge
            reads as "there is more this way" rather than as a clipped box. */}
        <div className="scroll-row -mx-4 flex min-w-0 items-center gap-2 px-4 md:mx-0 md:px-0 xl:flex-1">
          <FilterChip
            selected={activePlatformFilter === 'all' && activeCollectionFilter === 'all'}
            onClick={() => {
              setActivePlatformFilter('all');
              setActiveCollectionFilter('all');
            }}
          >
            All <span className="tabular-nums">{games.length}</span>
          </FilterChip>

          {PLATFORM_IDS.map((p) => (
            <FilterChip
              key={p}
              selected={activePlatformFilter === p}
              onClick={() => setActivePlatformFilter(activePlatformFilter === p ? 'all' : p)}
              title={PLATFORMS[p].name}
            >
              <PlatformIcon platform={p} size={15} />
              {PLATFORMS[p].shortName}{' '}
              <span className="tabular-nums">{games.filter((g) => g.platform === p).length}</span>
            </FilterChip>
          ))}

          {/* Games on no shelf: counted by Statistics as Unshelved, and
              otherwise only findable by scanning the whole library. Shown
              whenever there are any. */}
          {unshelvedCount > 0 || activeCollectionFilter === UNSHELVED_FILTER ? (
            <FilterChip
              tone="neutral"
              selected={activeCollectionFilter === UNSHELVED_FILTER}
              onClick={() =>
                setActiveCollectionFilter(
                  activeCollectionFilter === UNSHELVED_FILTER ? 'all' : UNSHELVED_FILTER,
                )
              }
              title="Games on none of Backlog, Playing, Beaten or 100%"
            >
              <span aria-hidden className="h-2 w-2 rounded-full bg-gray-500" />
              Unshelved <span className="tabular-nums">{unshelvedCount}</span>
            </FilterChip>
          ) : null}

          {orderedCollections
            .filter(
              (c) =>
                activeCollectionFilter === c.id ||
                ((wide || phone) && !isPermanentCollection(c.id)),
            )
            .map((collection) => {
              const count = games.filter((g) => g.collections?.includes(collection.id)).length;
              const color = collection.color || DEFAULT_COLLECTION_COLOR;
              return (
                <FilterChip
                  key={collection.id}
                  selected={activeCollectionFilter === collection.id}
                  color={color}
                  onClick={() =>
                    setActiveCollectionFilter(
                      activeCollectionFilter === collection.id ? 'all' : collection.id,
                    )
                  }
                  title={collection.description || collection.name}
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {collection.name} <span className="tabular-nums">{count}</span>
                </FilterChip>
              );
            })}
        </div>

        {/* The sort is in the header, where every page keeps it. */}
        {phone || wide || ratingFilter !== 'all' ? (
          <Select
            id="library-rating"
            aria-label="Rating"
            value={ratingFilter}
            onChange={setRatingFilter}
            leading={<ListFilter size={15} className="text-trophy-900" />}
            className="min-w-0 md:w-40 md:flex-none md:shrink-0"
            options={RATING_FILTER_OPTIONS}
          />
        ) : null}
      </section>

      {/* Spotlight ------------------------------------------------------------
          Not while a list or Unshelved is being filtered to: the page is then
          answering "which games are in this", and a Playing row above the
          answer read as part of it. */}
      {currentlyPlaying.length > 0 && activeCollectionFilter === 'all' && (
        <section className="space-y-3 md:space-y-4">
          <SectionRule
            icon={<PlayingIcon className="text-accent-900" size={phone ? 15 : 17} />}
            title={collectionName(PLAYING_COLLECTION_ID, collections)}
            count={currentlyPlaying.length}
          />
          <GameList games={currentlyPlaying.slice(0, 4)} hidePlatform />
        </section>
      )}

      {loading && games.length === 0 ? (
        <div className="flex justify-center py-16 text-gray-600">
          <Loader2 size={24} className="animate-spin" aria-label="Loading library" />
        </div>
      ) : (
        <GameGrid
          games={processedGames}
          grouped={activePlatformFilter === 'all'}
          platformOrder={platformOrder}
        />
      )}

      {!loading && processedGames.length === 0 && (
        <EmptyState
          icon={<Gamepad2 size={24} />}
          title={games.length === 0 ? 'Your library is empty' : 'No games match these filters'}
          action={
            <Button variant="accent" onClick={() => setIsQuickAddOpen(true)}>
              <Plus size={14} />
              Add game
            </Button>
          }
        />
      )}
    </div>
  );
};

