import React, { useState, useMemo } from 'react';
import {
  Gamepad2,
  Hourglass,
  Play,
  Plus,
  Search,
  Flame,
  ListFilter,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { GameGrid, GameList } from '../components/GameGrid';
import { PlatformIcon } from '../components/PlatformIcon';
import { TrophyBadge, TrophyPair } from '../components/TrophyBadge';
import { DEFAULT_COLLECTION_COLOR, PLATFORMS } from '../lib/constants';
import { aggregateCompletion, isPerfect } from '../lib/completion';
import { GameSortOption, SORT_LABELS, compareGames } from '../lib/sortGames';
import {
  BACKLOG_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  collectionName,
  isPermanentCollection,
} from '../lib/collections';
import { Platform, PLATFORM_IDS, UserGame } from '../types';
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  Gauge,
  MetricCard,
  PageHeader,
  SectionRule,
  SectionTitle,
  Select,
  TextInput,
} from '../components/ui';
import { IntroNotice } from '../components/IntroNotice';
import { completionColor, completionLabel } from '../lib/rating';
import { formatCount, formatHours, sumHours } from '../lib/format';
import { oneOf } from '../lib/usePersistentState';
import { useSyncedPreference } from '../lib/useSyncedPreference';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { cn } from '../lib/cn';

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
  <div className="panel flex flex-col gap-2.25 rounded-tile p-3.5 xl:justify-between xl:gap-2.5 xl:rounded-lg xl:px-4.5 xl:py-4">
    <div className="eyebrow truncate text-gray-600">{label}</div>
    <div className={cn('text-550 font-bold leading-none tabular-nums xl:text-1000', valueClassName)}>
      {value}
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-75 tabular-nums text-gray-700">
      {detail}
    </div>
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

  /** Per-platform counts shown beside each headline number. */
  const splitByPlatform = (subset: typeof games, icon: (p: Platform) => React.ReactNode) =>
    PLATFORM_IDS.map((p) => ({
      key: p,
      icon: icon(p),
      count: subset.filter((g) => g.platform === p).length,
      title: PLATFORMS[p].name,
    }));

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
          isPerfect(g),
      ),
    [games],
  );
  const gaugeTotals = aggregateCompletion(gaugeGames);
  const completion = gaugeTotals.percent;
  const libraryTotals = aggregateCompletion(games);

  const processedGames = useMemo(() => {
    const result = games.filter((g) => {
      if (activePlatformFilter !== 'all' && g.platform !== activePlatformFilter) return false;
      if (activeCollectionFilter !== 'all' && !g.collections?.includes(activeCollectionFilter)) {
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

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <PageHeader
        title="Home"
        subtitle={`${formatCount(games.length)} games tracked · ${formatCount(libraryTotals.unlocked)} of ${formatCount(libraryTotals.unlockable)} awards · ${formatHours(sumHours(games))}h played`}
      />

      <IntroNotice id="library">
        Progress and achievement unlocks across Steam and PlayStation.
      </IntroNotice>

      {phone ? (
        <>
        {/* Metrics -----------------------------------------------------------
            The gauge for what is queued against what is finished, beside the
            three counts the library breaks down into. */}
        <div className="grid gap-3 lg:grid-cols-[minmax(17rem,1.1fr)_2.4fr]">
          <Card className="flex items-center p-4">
            <Gauge
              layout="inline"
              label="Library completion"
              fraction={completion / 100}
              value={String(completion)}
              suffix="%"
              verdict={completionLabel(completion)}
              color={completionColor(completion)}
              // Games, not unlocks: the arc measures how far through the awards
              // you are, and the caption says how much of the library that arc
              // is speaking for.
              caption={`${formatCount(gaugeGames.length)} games across playing, backlog and 100%`}
              size={88}
            />
          </Card>

          <div className="grid-metrics">
          <MetricCard
            icon={<TrophyPair size={16} />}
            tone="bg-trophy-700/16"
            value={String(perfectGames.length)}
            label="100% completed"
            breakdown={splitByPlatform(perfectGames, (p) => (
              <TrophyBadge platform={p} size={20} />
            ))}
          />
          <MetricCard
            icon={<Play size={16} />}
            tone="bg-accent-700/16 text-accent-900"
            value={String(currentlyPlaying.length)}
            label={collectionName(PLAYING_COLLECTION_ID, collections)}
            breakdown={splitByPlatform(currentlyPlaying, (p) => (
              <PlatformIcon platform={p} size={15} className="text-gray-700" />
            ))}
          />
          <MetricCard
            icon={<Hourglass size={16} />}
            tone="bg-gray-300 text-gray-800"
            value={String(backlogGames.length)}
            label={collectionName(BACKLOG_COLLECTION_ID, collections)}
            breakdown={splitByPlatform(backlogGames, (p) => (
              <PlatformIcon platform={p} size={15} className="text-gray-700" />
            ))}
          />
          </div>
        </div>

        {/* Spotlight --------------------------------------------------------- */}
        {currentlyPlaying.length > 0 && (
          <section className="space-y-3">
            <SectionTitle
              action={
                <span className="eyebrow shrink-0 text-gray-600">
                  {currentlyPlaying.length} active
                </span>
              }
            >
              <span className="flex items-center gap-2">
                <Flame className="text-trophy-900" size={13} />
                {collectionName(PLAYING_COLLECTION_ID, collections)}
              </span>
            </SectionTitle>

            <div className="grid-cards">
              {currentlyPlaying.slice(0, 4).map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </section>
        )}

        {/* Filters ----------------------------------------------------------- */}
        <section className="space-y-3 pt-2">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <SectionTitle className="md:w-56">All games</SectionTitle>

            <div className="relative w-full md:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                size={15}
              />
              <TextInput
                type="search"
                placeholder="Filter by title or genre..."
                aria-label="Filter library"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              selected={activePlatformFilter === 'all'}
              onClick={() => setActivePlatformFilter('all')}
            >
              All platforms ({games.length})
            </FilterChip>

            {PLATFORM_IDS.map((p) => {
              const cfg = PLATFORMS[p];
              const count = games.filter((g) => g.platform === p).length;
              return (
                <FilterChip
                  key={p}
                  selected={activePlatformFilter === p}
                  onClick={() => setActivePlatformFilter(p)}
                  title={cfg.name}
                >
                  <PlatformIcon platform={p} size={15} />
                  <span>{cfg.shortName}</span>
                  <span className="opacity-70">({count})</span>
                </FilterChip>
              );
            })}
          </div>

          {/* The whole row from md up, and nothing at all on a phone.

              The chip row wrapped to four or five lines of small targets there,
              so it became a single button opening a sheet — and that was still a
              control for filtering a page you reach by scrolling. Collections has
              a page of its own, which on a phone is where this is done. */}
          {phone ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              selected={activeCollectionFilter === 'all'}
              onClick={() => setActiveCollectionFilter('all')}
            >
              All collections ({games.length})
            </FilterChip>

            {orderedCollections.map((collection) => {
              const count = games.filter((g) => g.collections?.includes(collection.id)).length;
              const color = collection.color || DEFAULT_COLLECTION_COLOR;
              return (
                <FilterChip
                  key={collection.id}
                  selected={activeCollectionFilter === collection.id}
                  color={color}
                  onClick={() => setActiveCollectionFilter(collection.id)}
                  title={collection.description || collection.name}
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px -1px ${color}` }}
                  />
                  <span>{collection.name}</span>
                  <span className="opacity-70">({count})</span>
                </FilterChip>
              );
            })}
          </div>
          )}

          {/* Left-aligned on a phone, matching the platform and collection chip
              rows directly above it; pushed right once there is room to spare. */}
          <div className="flex flex-wrap items-center justify-start gap-3 border-t border-gray-200 pt-3 md:justify-end">
            <div className="flex items-center gap-2">
              <label htmlFor="library-rating" className="eyebrow flex items-center gap-1 text-gray-600">
                <ListFilter size={12} className="text-trophy-900" />
                Rating
              </label>
              <Select
                id="library-rating"
                value={ratingFilter}
                onChange={setRatingFilter}
                options={RATING_FILTER_OPTIONS}
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="library-sort" className="eyebrow flex items-center gap-1 text-gray-600">
                <ArrowUpDown size={12} className="text-accent-900" />
                Sort
              </label>
              <Select
                id="library-sort"
                value={sortBy}
                onChange={setSortBy}
                options={SORT_OPTIONS.map((option) => ({
                  value: option,
                  label: SORT_LABELS[option],
                }))}
              />
            </div>
          </div>
        </section>
        </>
      ) : (
        <>
          {/* Summary ---------------------------------------------------------
              The completion gauge, then the three counts the library breaks
              into. One row of four from 1280; below that the gauge takes a
              row of its own and the counts share the next. */}
          <section className="grid grid-cols-3 gap-3 xl:grid-cols-[1.7fr_1fr_1fr_1fr] xl:gap-4">
            <Card bare className="col-span-3 flex items-center p-4.5 xl:col-span-1 xl:px-5 xl:py-4">
              <Gauge
                layout="inline"
                hero
                label="Library completion"
                fraction={completion / 100}
                value={String(completion)}
                suffix="%"
                verdict={completionLabel(completion)}
                color={completionColor(completion)}
                caption={`${formatCount(gaugeTotals.unlocked)} of ${formatCount(gaugeTotals.unlockable)} awards across the ${formatCount(gaugeGames.length)} games you are playing, queueing or have finished.`}
                size={wide ? 96 : 104}
              />
            </Card>

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
              detail={[
                'Queued',
                ...platformSplit(backlogGames).map(
                  ({ platform, count }) => `${count} ${PLATFORMS[platform].name}`,
                ),
              ].join(' · ')}
            />
          </section>

          {/* Controls --------------------------------------------------------
              One row: the field, the filters, the sort. The chips scroll
              sideways rather than wrap, so the row is always one line and the
              grid under it always starts at the same height. Lists join the
              chips from 1280, and the rating filter with them — below that,
              either stays in the row only while it is the one filtering. */}
          <section className="flex items-center gap-2.5 xl:gap-3">
            <div className="relative min-w-0 flex-1 xl:w-90 xl:flex-none">
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

            <div className="scroll-row flex min-w-0 items-center gap-2 xl:flex-1">
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
                  <span className="tabular-nums">
                    {games.filter((g) => g.platform === p).length}
                  </span>
                </FilterChip>
              ))}

              {/* Your lists, not the shelves: those are destinations in the
                  top bar, and a chip for each here was a second way there. */}
              {orderedCollections
                .filter(
                  (c) =>
                    activeCollectionFilter === c.id || (wide && !isPermanentCollection(c.id)),
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

            <Select
              id="library-sort"
              aria-label="Sort"
              value={sortBy}
              onChange={setSortBy}
              leading={<ArrowUpDown size={15} className="text-accent-900" />}
              className="w-42.5 shrink-0 xl:w-50"
              options={SORT_OPTIONS.map((option) => ({
                value: option,
                label: SORT_LABELS[option],
              }))}
            />

            {wide || ratingFilter !== 'all' ? (
              <Select
                id="library-rating"
                aria-label="Rating"
                value={ratingFilter}
                onChange={setRatingFilter}
                leading={<ListFilter size={15} className="text-trophy-900" />}
                className="w-40 shrink-0"
                options={RATING_FILTER_OPTIONS}
              />
            ) : null}
          </section>

          {/* Spotlight -------------------------------------------------------- */}
          {currentlyPlaying.length > 0 && (
            <section className="space-y-4">
              <SectionRule
                icon={<Flame className="text-trophy-900" size={17} />}
                title={collectionName(PLAYING_COLLECTION_ID, collections)}
                count={currentlyPlaying.length}
              />
              <GameList games={currentlyPlaying.slice(0, 4)} hidePlatform />
            </section>
          )}
        </>
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
          description={
            games.length === 0
              ? 'Search the catalog or add a game by hand to start tracking achievements and platinums.'
              : 'Try clearing a filter or searching for a different title.'
          }
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

