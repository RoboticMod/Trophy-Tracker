import React, { useState, useMemo } from 'react';
import {
  Gamepad2,
  Hourglass,
  Home,
  Play,
  Plus,
  Search,
  Flame,
  FolderKanban,
  ListFilter,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { GameGrid } from '../components/GameGrid';
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
import { Platform, PLATFORM_IDS } from '../types';
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  Gauge,
  MetricCard,
  PageHeader,
  SectionTitle,
  Select,
  TextInput,
} from '../components/ui';
import { IntroNotice } from '../components/IntroNotice';
import { completionColor, completionLabel } from '../lib/rating';
import { formatCount } from '../lib/format';
import { oneOf } from '../lib/usePersistentState';
import { useSyncedPreference } from '../lib/useSyncedPreference';
import { useIsPhone } from '../lib/useMediaQuery';
import { CollectionsSheet } from '../components/CollectionsSheet';

type RatingFilterOption = 'all' | '9+' | '7.5+' | '6+' | '4+' | 'unrated';

/**
 * Platform is not offered here: the grid already groups into a Steam section
 * and a PlayStation one, so ordering by platform sorted the page into an order
 * it was going to be shown in anyway.
 */
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
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);

  // The collection filter is a wrapped chip row on a wide screen and a single
  // button on a phone, which are different controls rather than one restyled.
  const phone = useIsPhone();
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
  const { unlocked, unlockable, percent: completion } = aggregateCompletion(gaugeGames);

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

    result.sort((a, b) => compareGames(a, b, sortBy, platformOrder));

    return result;
  }, [
    games,
    activePlatformFilter,
    activeCollectionFilter,
    ratingFilter,
    localSearch,
    sortBy,
    platformOrder,
  ]);

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <PageHeader
        icon={<Home size={18} />}
        iconClassName="bg-accent-700/16 text-accent-900"
        title="Home"
      />

      <IntroNotice id="library">
        Progress and achievement unlocks across Steam and PlayStation.
      </IntroNotice>

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
            caption={`${formatCount(unlocked)} of ${formatCount(unlockable)} across playing, backlog and 100%`}
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
          label={collectionName(PLAYING_COLLECTION_ID, collections)}
          breakdown={splitByPlatform(currentlyPlaying, (p) => (
            <PlatformIcon platform={p} size={15} className="text-gray-700" />
          ))}
        />
        <MetricCard
          icon={<Hourglass size={24} />}
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

        {/* One button on a phone, the whole row from md up.

            Wrapped to four or five lines of small targets, the chip row was
            the tallest thing on this page and you had to read all of it to
            find the collection you wanted. The sheet gives each one a line and
            a strip of its covers instead. */}
        {phone ? (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              buttonStyle="outline"
              className="w-full justify-between"
              onClick={() => setIsCollectionsOpen(true)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <FolderKanban size={15} />
                <span className="truncate">
                  {activeCollectionFilter === 'all'
                    ? 'All collections'
                    : collectionName(activeCollectionFilter, collections)}
                </span>
              </span>
              <span className="shrink-0 tabular-nums opacity-70">{processedGames.length}</span>
            </Button>
          </div>
        ) : (
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

      <CollectionsSheet
        isOpen={isCollectionsOpen}
        onClose={() => setIsCollectionsOpen(false)}
      />
    </div>
  );
};

