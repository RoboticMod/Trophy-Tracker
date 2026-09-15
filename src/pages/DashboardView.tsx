import React, { useState, useMemo } from 'react';
import {
  Gamepad2,
  Hourglass,
  Play,
  Plus,
  Search,
  Flame,
  Star,
  ArrowUpDown,
  ListFilter,
  Loader2,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { GameGrid } from '../components/GameGrid';
import { PlatformIcon } from '../components/PlatformIcon';
import { TrophyBadge, TrophyPair } from '../components/TrophyBadge';
import { DEFAULT_COLLECTION_COLOR, PLATFORMS, describePlatformOrder } from '../lib/constants';
import { aggregateCompletion, isPerfect } from '../lib/completion';
import { GameSortOption, SORT_LABELS, compareGames } from '../lib/sortGames';
import { statusLabel } from '../lib/status';
import { GameStatus, Platform, PLATFORM_IDS } from '../types';
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  Gauge,
  MetricCard,
  SectionTitle,
  Select,
  TextInput,
} from '../components/ui';
import { completionColor, completionLabel } from '../lib/rating';
import { formatCount } from '../lib/format';
import { oneOf } from '../lib/usePersistentState';
import { useSyncedPreference } from '../lib/useSyncedPreference';

type RatingFilterOption = 'all' | '9+' | '7.5+' | '6+' | '4+' | 'unrated';

const SORT_OPTIONS = [
  'platform',
  'recent',
  'rating-desc',
  'achievement-rating-desc',
  'hours-desc',
  'completion-desc',
  'title-asc',
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

const STATUS_FILTERS: (GameStatus | 'all')[] = [
  'all',
  'playing',
  'backlog',
  'completed',
  'mastered',
];

export const DashboardView: React.FC = () => {
  const {
    games,
    collections,
    profile,
    loading,
    activePlatformFilter,
    setActivePlatformFilter,
    activeStatusFilter,
    setActiveStatusFilter,
    activeCollectionFilter,
    setActiveCollectionFilter,
    setIsQuickAddOpen,
  } = useGame();

  const [localSearch, setLocalSearch] = useState('');
  // Sort and rating filter persist: they describe how you like the library laid
  // out, and re-picking them after every reload was busywork.
  const [sortBy, setSortBy] = useSyncedPreference<GameSortOption>(
    'library-sort',
    'platform',
    oneOf(SORT_OPTIONS),
  );
  const [ratingFilter, setRatingFilter] = useSyncedPreference<RatingFilterOption>(
    'library-rating',
    'all',
    oneOf(RATING_FILTERS),
  );

  const backlogGames = games.filter((g) => g.status === 'backlog');
  const currentlyPlaying = games.filter((g) => g.status === 'playing');
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

  /**
   * The gauge measures the queue and the finished shelf, not the whole library.
   *
   * A game you are part-way through is a figure in motion, and averaging it in
   * made the arc a reading of "how far into everything am I" — a number that
   * only ever drifts. Backlog plus finished is the ratio that actually means
   * something: what is waiting against what has been seen through.
   */
  const gaugeGames = useMemo(
    () => games.filter((g) => g.status === 'backlog' || isPerfect(g)),
    [games],
  );
  const { unlocked, unlockable, percent: completion } = aggregateCompletion(gaugeGames);

  const processedGames = useMemo(() => {
    const result = games.filter((g) => {
      if (activePlatformFilter !== 'all' && g.platform !== activePlatformFilter) return false;
      if (activeStatusFilter !== 'all' && g.status !== activeStatusFilter) return false;
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

    result.sort((a, b) => compareGames(a, b, sortBy, platformOrder));

    return result;
  }, [
    games,
    activePlatformFilter,
    activeStatusFilter,
    activeCollectionFilter,
    ratingFilter,
    localSearch,
    sortBy,
    platformOrder,
  ]);

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <div className="border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-600 font-bold tracking-tight text-gray-1000">Library</h1>
          <p className="mt-1 text-75 text-gray-600">
            Progress and achievement unlocks across Steam and PlayStation.
          </p>
        </div>
      </div>

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
            caption={`${formatCount(unlocked)} of ${formatCount(unlockable)} across backlog and finished games`}
            size={88}
          />
        </Card>

        <div className="grid-metrics">
        <MetricCard
          icon={<TrophyPair size={22} />}
          tone="bg-trophy-700/16"
          value={String(perfectGames.length)}
          label="100% completed"
          breakdown={splitByPlatform(perfectGames, (p) => (
            <TrophyBadge platform={p} size={20} />
          ))}
        />
        <MetricCard
          icon={<Play size={24} />}
          tone="bg-accent-700/16 text-accent-900"
          value={String(currentlyPlaying.length)}
          label={statusLabel('playing', profile)}
          breakdown={splitByPlatform(currentlyPlaying, (p) => (
            <PlatformIcon platform={p} size={15} className="text-gray-700" />
          ))}
        />
        <MetricCard
          icon={<Hourglass size={24} />}
          tone="bg-gray-300 text-gray-800"
          value={String(backlogGames.length)}
          label={statusLabel('backlog', profile)}
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
              {statusLabel('playing', profile)}
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

        {/* Collections, each lit in its own colour when it is the one being
            shown — the same identity the tabs on the collections page and the
            dot on a game's chip already carry. */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            selected={activeCollectionFilter === 'all'}
            onClick={() => setActiveCollectionFilter('all')}
          >
            All collections ({games.length})
          </FilterChip>

          {collections.map((collection) => {
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

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-3">
          <div className="flex items-center gap-2">
            <label htmlFor="library-status" className="eyebrow flex items-center gap-1 text-gray-600">
              <ListFilter size={12} className="text-accent-900" />
              Status
            </label>
            <Select
              id="library-status"
              value={activeStatusFilter}
              onChange={setActiveStatusFilter}
              options={STATUS_FILTERS.map((status) => ({
                value: status,
                label: status === 'all' ? 'All statuses' : statusLabel(status, profile),
              }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="library-rating" className="eyebrow flex items-center gap-1 text-gray-600">
              <Star size={12} className="text-trophy-900" />
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
                label:
                  option === 'platform'
                    ? `Platform (${describePlatformOrder(platformOrder)})`
                    : SORT_LABELS[option],
              }))}
            />
          </div>
        </div>
      </section>

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

