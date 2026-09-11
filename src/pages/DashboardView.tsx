import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { StandingsCompact, usePlatformStandings } from '../components/PlatformStandings';
import { PlayIcon, RankingIcon, SearchIcon } from '../components/icons';
import { PLATFORMS, comparePlatformOrder, describePlatformOrder } from '../lib/constants';
import { statusLabel, STATUS_COLOR } from '../lib/status';
import { ACCENT_TONE, GOLD_TONE } from '../lib/tone';
import { GameStatus, PLATFORM_IDS, Platform } from '../types';
import {
  Button,
  Chip,
  ChipRowLabel,
  EmptyState,
  Eyebrow,
  Panel,
  Select,
  StatCaption,
  StatTile,
} from '../components/ui';
import { TrophyBadge } from '../components/TrophyBadge';
import { cn } from '../lib/cn';

type SortOption =
  | 'platform'
  | 'recent'
  | 'rating'
  | 'achRating'
  | 'hours'
  | 'completion'
  | 'title';

type RatingFilter = 'all' | '90' | '75' | '60' | '40' | 'unrated';

const STATUS_FILTERS: (GameStatus | 'all')[] = [
  'all',
  'playing',
  'backlog',
  'completed',
  'mastered',
  'dropped',
];

const RATING_FILTERS: RatingFilter[] = ['all', '90', '75', '60', '40', 'unrated'];

const isPerfect = (g: { status: GameStatus; achievementsUnlocked: number; achievementsTotal: number }) =>
  g.status === 'mastered' || (g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal);

export const DashboardView: React.FC = () => {
  const {
    games,
    profile,
    ui,
    loading,
    activePlatformFilter,
    setActivePlatformFilter,
    activeStatusFilter,
    setActiveStatusFilter,
    setIsQuickAddOpen,
  } = useGame();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('platform');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');

  const platformOrder = profile.platformOrder;
  const standings = usePlatformStandings(games);

  const playing = games.filter((g) => g.status === 'playing');
  const backlog = games.filter((g) => g.status === 'backlog');
  const perfect = games.filter(isPerfect);

  const totalUnlocked = games.reduce((sum, g) => sum + (g.achievementsUnlocked || 0), 0);
  const totalPossible = games.reduce((sum, g) => sum + (g.achievementsTotal || 0), 0);
  const playingHours = playing.reduce((sum, g) => sum + (g.hoursPlayed || 0), 0);
  const backlogPotential = backlog.reduce((sum, g) => sum + (g.achievementsTotal || 0), 0);
  const onPlatform = (subset: typeof games, p: Platform) =>
    subset.filter((g) => g.platform === p).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const result = games.filter((g) => {
      if (q) {
        const matchesTitle = g.title.toLowerCase().includes(q);
        const matchesGenre = g.genres.some((genre) => genre.toLowerCase().includes(q));
        if (!matchesTitle && !matchesGenre) return false;
      }
      if (activePlatformFilter !== 'all' && g.platform !== activePlatformFilter) return false;

      // "Mastered" filters on actual completion, not just the stored status, so
      // a game whose last achievement landed without its status being changed
      // still shows up where the user expects it.
      if (activeStatusFilter === 'mastered') {
        if (!isPerfect(g)) return false;
      } else if (activeStatusFilter !== 'all' && g.status !== activeStatusFilter) {
        return false;
      }

      const rating = g.rating || 0;
      if (ratingFilter === 'unrated') return rating === 0;
      if (ratingFilter !== 'all' && rating < Number(ratingFilter)) return false;
      return true;
    });

    const completion = (g: (typeof games)[number]) =>
      g.achievementsTotal > 0 ? g.achievementsUnlocked / g.achievementsTotal : 0;

    result.sort((a, b) => {
      switch (sort) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'achRating':
          return (b.achievementRating || 0) - (a.achievementRating || 0);
        case 'hours':
          return (b.hoursPlayed || 0) - (a.hoursPlayed || 0);
        case 'completion':
          return completion(b) - completion(a);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'recent': {
          const at = new Date(a.lastPlayedAt || a.addedAt || 0).getTime();
          const bt = new Date(b.lastPlayedAt || b.addedAt || 0).getTime();
          return bt - at;
        }
        default: {
          const diff = comparePlatformOrder(a.platform, b.platform, platformOrder);
          return diff !== 0 ? diff : a.title.localeCompare(b.title);
        }
      }
    });

    return result;
  }, [
    games,
    query,
    activePlatformFilter,
    activeStatusFilter,
    ratingFilter,
    sort,
    platformOrder,
  ]);

  const clearFilters = () => {
    setQuery('');
    setActivePlatformFilter('all');
    setActiveStatusFilter('all');
    setRatingFilter('all');
  };

  const gridClass = ui.cardLayout === 'poster' ? 'grid-cards-poster' : 'grid-cards';

  return (
    <section className="tt-rise flex flex-col gap-[clamp(20px,2.6vw,32px)]">
      {/* Headline and the three standing counts ---------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[260px]">
          <Eyebrow>Welcome back, {profile.username || 'Player'}</Eyebrow>
          <h1 className="m-0 mt-1 font-display text-[clamp(28px,4.2vw,46px)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
            {ui.dashTitle}
          </h1>
          <p className="m-0 mt-2 max-w-[52ch] text-[14px] text-muted [text-wrap:pretty]">
            {games.length} tracked titles, {totalUnlocked} unlocks banked and{' '}
            {Math.max(0, totalPossible - totalUnlocked)} still out there.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <StatTile
            gold
            size="lg"
            className="min-w-[132px] !p-4"
            label="100% club"
            labelColor="var(--tt-gold, #e5a83c)"
            valueColor="var(--tt-gold-hi, #ffd36b)"
            value={
              <span className="flex items-baseline gap-2">
                {perfect.length}
                <span className="inline-flex items-center gap-1.5 font-display text-[12px] font-semibold tabular-nums text-muted">
                  {PLATFORM_IDS.map((p) => (
                    <React.Fragment key={p}>
                      <TrophyBadge platform={p} size={15} />
                      {onPlatform(perfect, p)}
                    </React.Fragment>
                  ))}
                </span>
              </span>
            }
          />

          <StatTile
            size="lg"
            className="min-w-[118px] !p-4"
            label={statusLabel('playing', profile)}
            labelColor="var(--tt-accent, #45c8ea)"
            value={
              <span className="flex items-baseline gap-1.5">
                {playing.length}
                <StatCaption>{playingHours}h in</StatCaption>
              </span>
            }
          />

          <StatTile
            size="lg"
            className="min-w-[118px] !p-4"
            label={statusLabel('backlog', profile)}
            labelColor="#d98b3a"
            value={
              <span className="flex items-baseline gap-1.5">
                {backlog.length}
                <StatCaption>{backlogPotential} locked</StatCaption>
              </span>
            }
          />
        </div>
      </div>

      {/* Continue playing + standings -------------------------------------- */}
      {playing.length > 0 || standings.length > 0 ? (
        <div className="grid items-start gap-3.5 min-[1180px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {playing.length > 0 ? (
            <Panel className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 flex items-center gap-2 font-display text-[15px] font-bold tracking-[0.01em] text-ink">
                  <PlayIcon size={15} color="var(--tt-accent, #45c8ea)" />
                  Continue playing
                </h2>
                <Link
                  to="/playing"
                  className="font-display text-[12px] font-semibold text-accent hover:text-accent-ink"
                >
                  View all
                </Link>
              </div>
              <div className={gridClass}>
                {playing.slice(0, 4).map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            </Panel>
          ) : null}

          {standings.length > 0 ? (
            <Panel className="flex flex-col gap-3.5">
              <h2 className="m-0 flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                <RankingIcon size={15} color="var(--tt-gold-hi, #ffd36b)" />
                Platform standings
              </h2>
              <StandingsCompact standings={standings} />
              <p className="m-0 text-[11px] text-faint [text-wrap:pretty]">
                Ranked by share of available achievements unlocked on each platform.
              </p>
            </Panel>
          ) : null}
        </div>
      ) : null}

      {/* All games --------------------------------------------------------- */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 font-display text-[clamp(20px,2.4vw,26px)] font-bold tracking-[-0.01em] text-ink">
            All games{' '}
            <span className="text-[15px] font-semibold text-subtle">{filtered.length}</span>
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <SearchIcon
                size={14}
                color="#9a9082"
                className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by title or genre"
                aria-label="Filter library"
                className="h-9 w-[220px] max-w-full rounded-control border-0 bg-surface pl-8 pr-3 text-[13px] text-ink shadow-[inset_0_0_0_1px_var(--tt-line)] transition-shadow focus:shadow-[inset_0_0_0_1px_var(--tt-accent)] focus:outline-none"
              />
            </div>

            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              aria-label="Sort library"
            >
              <option value="platform">Platform ({describePlatformOrder(platformOrder)})</option>
              <option value="recent">Recently played</option>
              <option value="rating">Game rating: highest</option>
              <option value="achRating">Grind rating: highest</option>
              <option value="hours">Playtime: most hours</option>
              <option value="completion">Completion: highest</option>
              <option value="title">Title: A to Z</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 rounded-panel bg-bg-2 p-3.5 hairline">
          <div className="flex flex-wrap items-center gap-2">
            <ChipRowLabel>Platform</ChipRowLabel>
            <Chip
              selected={activePlatformFilter === 'all'}
              onClick={() => setActivePlatformFilter('all')}
            >
              All {games.length}
            </Chip>
            {PLATFORM_IDS.map((p) => (
              <Chip
                key={p}
                tone={PLATFORMS[p].color}
                title={PLATFORMS[p].name}
                selected={activePlatformFilter === p}
                onClick={() => setActivePlatformFilter(p)}
              >
                {PLATFORMS[p].shortName} {onPlatform(games, p)}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ChipRowLabel>Status</ChipRowLabel>
            {STATUS_FILTERS.map((status) => (
              <Chip
                key={status}
                tone={status === 'all' ? ACCENT_TONE : STATUS_COLOR[status]}
                selected={activeStatusFilter === status}
                onClick={() => setActiveStatusFilter(status)}
              >
                {status === 'all' ? 'Any' : statusLabel(status, profile)}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ChipRowLabel>Rating</ChipRowLabel>
            {RATING_FILTERS.map((value) => (
              <Chip
                key={value}
                tone={GOLD_TONE}
                selected={ratingFilter === value}
                onClick={() => setRatingFilter(value)}
              >
                {value === 'all' ? 'Any' : value === 'unrated' ? 'Unrated' : `${value}+`}
              </Chip>
            ))}
          </div>
        </div>

        {loading && games.length === 0 ? (
          <LibrarySkeleton className={gridClass} />
        ) : filtered.length > 0 ? (
          <div className={gridClass}>
            {filtered.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : games.length === 0 ? (
          <EmptyState
            title="Your library is empty"
            description="Search the catalog or add a game by hand to start tracking achievements and platinums."
            action={
              <Button variant="accent" size="m" onClick={() => setIsQuickAddOpen(true)}>
                Add game
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="Nothing matches those filters"
            description="Loosen a filter or clear the search to see the rest of your library."
            action={
              <Button variant="neutral" size="m" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        )}
      </div>
    </section>
  );
};

/** Placeholder tiles while the first load is in flight. */
const LibrarySkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className} aria-hidden="true">
    {Array.from({ length: 8 }, (_, i) => (
      <div
        key={i}
        className={cn('h-[300px] animate-pulse rounded-panel bg-surface hairline')}
        style={{ animationDelay: `${i * 60}ms` }}
      />
    ))}
  </div>
);
