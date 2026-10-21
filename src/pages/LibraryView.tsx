import React, { useState, useMemo } from 'react';
import { Gamepad2, Plus, Search, ListFilter, Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import { PlatformIcon } from '../components/PlatformIcon';
import { DEFAULT_COLLECTION_COLOR, PLATFORMS } from '../lib/constants';
import { aggregateCompletion } from '../lib/completion';
import { GameSortOption, compareGames } from '../lib/sortGames';
import { UNSHELVED_FILTER, isPermanentCollection, permanentOf } from '../lib/collections';
import { PLATFORM_IDS } from '../types';
import {
  Button,
  EmptyState,
  FilterChip,
  PageHeader,
  Select,
  SelectOption,
  TextInput,
} from '../components/ui';
import { SortControl } from '../components/SortControl';
import { formatCount, formatHours, sumHours } from '../lib/format';
import { oneOf } from '../lib/usePersistentState';
import { useSyncedPreference } from '../lib/useSyncedPreference';
import { useIsPhone } from '../lib/useMediaQuery';

type RatingFilterOption = 'all' | '9+' | '7.5+' | '6+' | '4+' | 'unrated';

// The stored keys stay `library-*`: this is the grid that used to be Home, and
// a sort or rating chosen there should still be the one in force here.
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

/** The list filter's "no list" option. */
const ANY_LIST = 'all';

/**
 * Every game, filtered and sorted: the grid that used to be Home.
 *
 * Moved here unchanged — the same cards, the same platform sections, the same
 * search, chips and sort — so Home can be a summary. Two things changed on the
 * way: the Playing spotlight above the grid is gone (Home's Now playing shows
 * those games, and the spotlight showed every one of them twice), and the list
 * and rating filters are dropdown chips that are always in the row. They used
 * to render only on a phone or from 1280 unless already filtering, so between
 * 768 and 1279 neither could be started at all.
 */
export const LibraryView: React.FC = () => {
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

  const platformOrder = profile.platformOrder;
  const libraryTotals = aggregateCompletion(games);
  const unshelvedCount = games.filter((g) => permanentOf(g.collections) === null).length;

  /**
   * Your lists, as the list filter's options. Not the shelves — they are
   * destinations of their own — unless one is the filter already in force,
   * so the chip can still name what it is filtering by.
   */
  const listOptions = useMemo<SelectOption[]>(() => {
    const lists = collections.filter(
      (c) => !isPermanentCollection(c.id) || c.id === activeCollectionFilter,
    );
    return [
      { value: ANY_LIST, label: 'Any list' },
      ...lists.map((c) => ({
        value: c.id,
        label: `${c.name} · ${games.filter((g) => g.collections?.includes(c.id)).length}`,
        color: c.color || DEFAULT_COLLECTION_COLOR,
      })),
    ];
  }, [collections, activeCollectionFilter, games]);

  // Unshelved shares the collection filter but has a chip of its own, so the
  // list dropdown reads it as "no list chosen".
  const listValue =
    activeCollectionFilter === UNSHELVED_FILTER ||
    !listOptions.some((option) => option.value === activeCollectionFilter)
      ? ANY_LIST
      : activeCollectionFilter;

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
        title="Library"
        subtitle={`${formatCount(games.length)} games · ${formatCount(libraryTotals.unlocked)} of ${formatCount(libraryTotals.unlockable)} awards · ${formatHours(sumHours(games))}h played`}
        action={phone ? undefined : sort}
      />

      {phone ? sort : null}

      {/* Controls ------------------------------------------------------------
          On a phone: the field, then the filters as one row of pills that
          scrolls sideways under the thumb. On a wide screen all of it is one
          line: the field, then the pills. Either way the chips scroll rather
          than wrap, so the grid under them always starts at the same height.
          The list and rating dropdowns are chips at the end of that row, at
          every width. */}
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

          <Select
            id="library-list"
            aria-label="List"
            chip
            active={listValue !== ANY_LIST}
            value={listValue}
            onChange={(value) => setActiveCollectionFilter(value)}
            options={listOptions}
          />

          {/* Grey, not gold: gold is for 100% and nothing else. */}
          <Select
            id="library-rating"
            aria-label="Rating"
            chip
            active={ratingFilter !== 'all'}
            value={ratingFilter}
            onChange={setRatingFilter}
            leading={<ListFilter size={14} />}
            options={RATING_FILTER_OPTIONS}
          />
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
