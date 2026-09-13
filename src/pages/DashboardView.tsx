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
  Loader2,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { GameGrid } from '../components/GameGrid';
import { PlatformIcon } from '../components/PlatformIcon';
import { TrophyBadge, TrophyPair } from '../components/TrophyBadge';
import { PLATFORMS, describePlatformOrder } from '../lib/constants';
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
import { oneOf, usePersistentState } from '../lib/usePersistentState';

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

const RATING_FILTERS = [
  'all',
  '9+',
  '7.5+',
  '6+',
  '4+',
  'unrated',
] as const satisfies readonly RatingFilterOption[];

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
    profile,
    loading,
    activePlatformFilter,
    setActivePlatformFilter,
    activeStatusFilter,
    setActiveStatusFilter,
    setIsQuickAddOpen,
  } = useGame();

  const [localSearch, setLocalSearch] = useState('');
  // Sort and rating filter persist: they describe how you like the library laid
  // out, and re-picking them after every reload was busywork.
  const [sortBy, setSortBy] = usePersistentState<GameSortOption>(
    'library-sort',
    'platform',
    oneOf(SORT_OPTIONS),
  );
  const [ratingFilter, setRatingFilter] = usePersistentState<RatingFilterOption>(
    'library-rating',
    'all',
    oneOf(RATING_FILTERS),
  );

  const backlogGames = games.filter((g) => g.status === 'backlog');
  const currentlyPlaying = games.filter((g) => g.status === 'playing');
  const perfectGames = games.filter(
    (g) =>
      g.status === 'mastered' ||
      (g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal),
  );

  /** Per-platform counts shown beside each headline number. */
  const splitByPlatform = (subset: typeof games, icon: (p: Platform) => React.ReactNode) =>
    PLATFORM_IDS.map((p) => ({
      key: p,
      icon: icon(p),
      count: subset.filter((g) => g.platform === p).length,
      title: PLATFORMS[p].name,
    }));

  const platformOrder = profile.platformOrder;

  const unlocked = games.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);
  const unlockable = games.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);
  const completion = unlockable > 0 ? Math.round((unlocked / unlockable) * 100) : 0;

  const processedGames = useMemo(() => {
    const result = games.filter((g) => {
      if (activePlatformFilter !== 'all' && g.platform !== activePlatformFilter) return false;
      if (activeStatusFilter !== 'all' && g.status !== activeStatusFilter) return false;

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
          One gauge for the ratio the whole library rolls up to, beside the
          three counts it is made of. */}
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
            caption={`${formatCount(unlocked)} of ${formatCount(unlockable)} unlocked`}
            size={88}
          />
        </Card>

        <div className="grid-metrics">
        <MetricCard
          icon={<TrophyPair size={17} />}
          tone="bg-trophy-700/16"
          value={String(perfectGames.length)}
          label="100% completed"
          breakdown={splitByPlatform(perfectGames, (p) => (
            <TrophyBadge platform={p} size={20} />
          ))}
        />
        <MetricCard
          icon={<Play size={20} />}
          tone="bg-accent-700/16 text-accent-900"
          value={String(currentlyPlaying.length)}
          label={statusLabel('playing', profile)}
          breakdown={splitByPlatform(currentlyPlaying, (p) => (
            <PlatformIcon platform={p} size={15} className="text-gray-700" />
          ))}
        />
        <MetricCard
          icon={<Hourglass size={20} />}
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

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((status) => (
            <FilterChip
              key={status}
              selected={activeStatusFilter === status}
              onClick={() => setActiveStatusFilter(status)}
            >
              {status === 'all' ? 'All statuses' : statusLabel(status, profile)}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-3">
          <div className="flex items-center gap-2">
            <label htmlFor="library-rating" className="eyebrow flex items-center gap-1 text-gray-600">
              <Star size={12} className="text-trophy-900" />
              Rating
            </label>
            <Select
              id="library-rating"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as RatingFilterOption)}
              className="w-auto"
            >
              <option value="all">Any rating</option>
              <option value="9+">Rated 9 or more</option>
              <option value="7.5+">Rated 7.5 or more</option>
              <option value="6+">Rated 6 or more</option>
              <option value="4+">Rated 4 or more</option>
              <option value="unrated">Unrated only</option>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="library-sort" className="eyebrow flex items-center gap-1 text-gray-600">
              <ArrowUpDown size={12} className="text-accent-900" />
              Sort
            </label>
            <Select
              id="library-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as GameSortOption)}
              className="w-auto"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'platform'
                    ? `Platform (${describePlatformOrder(platformOrder)})`
                    : SORT_LABELS[option]}
                </option>
              ))}
            </Select>
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

