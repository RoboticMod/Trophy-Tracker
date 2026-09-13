import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Sparkles } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import { PlatformIcon } from '../components/PlatformIcon';
import { TrophyBadge, TrophyPair } from '../components/TrophyBadge';
import { PLATFORMS, describePlatformOrder } from '../lib/constants';
import { GameSortOption, SORT_LABELS, compareGames } from '../lib/sortGames';
import { oneOf, usePersistentState } from '../lib/usePersistentState';
import { Platform, PLATFORM_IDS } from '../types';
import { EmptyState, FilterChip, MetricCard, Select } from '../components/ui';

/**
 * Completion is not offered here: every game on this page is at 100%, so
 * sorting by it would leave the list untouched.
 */
const SORT_OPTIONS = [
  'platform',
  'recent',
  'unlocked-desc',
  'rating-desc',
  'achievement-rating-desc',
  'hours-desc',
  'title-asc',
] as const satisfies readonly GameSortOption[];

export const AchievementsView: React.FC = () => {
  const { games, profile } = useGame();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [sortBy, setSortBy] = usePersistentState<GameSortOption>(
    'achievements-sort',
    'platform',
    oneOf(SORT_OPTIONS),
  );

  const platformOrder = profile.platformOrder;

  /** Games where every achievement or trophy has been unlocked. */
  const completedGames = useMemo(
    () =>
      games.filter((g) => g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal),
    [games],
  );

  // Sorted before the grid splits the list into platform sections, so the
  // chosen order runs through both sections rather than only the first.
  const displayedGames = useMemo(
    () =>
      completedGames
        .filter((g) => selectedPlatform === 'all' || g.platform === selectedPlatform)
        .sort((a, b) => compareGames(a, b, sortBy, platformOrder)),
    [completedGames, selectedPlatform, sortBy, platformOrder],
  );

  const totalUnlocked = completedGames.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <div className="space-y-1 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trophy-700/16">
            <TrophyPair size={17} />
          </div>
          <h1 className="text-600 font-bold tracking-tight text-gray-1000">
            Achievements &amp; Platinum Trophies
          </h1>
        </div>
        <p className="text-75 text-gray-600">
          Every game where you have unlocked all achievements — Steam perfect games and PlayStation
          platinums.
        </p>
      </div>

      {/* Summary ----------------------------------------------------------- */}
      <div className="grid-metrics">
        <MetricCard
          icon={<TrophyPair size={17} />}
          tone="bg-trophy-700/16"
          value={String(completedGames.length)}
          label="100% finished titles"
          breakdown={PLATFORM_IDS.map((p) => ({
            key: p,
            icon: <TrophyBadge platform={p} size={20} />,
            count: completedGames.filter((g) => g.platform === p).length,
            title: PLATFORMS[p].name,
          }))}
        />
        <MetricCard
          icon={<Sparkles size={20} />}
          tone="bg-accent-700/16 text-accent-900"
          value={String(totalUnlocked)}
          label="Achievements unlocked"
        />
      </div>

      {/* Filter and sort ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <p className="eyebrow text-gray-600">
          {displayedGames.length} game{displayedGames.length === 1 ? '' : 's'} at 100%
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="achievements-sort"
              className="eyebrow flex items-center gap-1 text-gray-600"
            >
              <ArrowUpDown size={12} className="text-trophy-900" />
              Sort
            </label>
            <Select
              id="achievements-sort"
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

          <div className="flex items-center gap-1.5">
          <FilterChip
            tone="trophy"
            selected={selectedPlatform === 'all'}
            onClick={() => setSelectedPlatform('all')}
          >
            All platforms
          </FilterChip>

          {PLATFORM_IDS.map((p) => {
            const count = completedGames.filter((g) => g.platform === p).length;
            return (
              <FilterChip
                key={p}
                tone="trophy"
                selected={selectedPlatform === p}
                onClick={() => setSelectedPlatform(p)}
                title={`${PLATFORMS[p].name} — ${count} at 100%`}
              >
                <PlatformIcon platform={p} size={15} />
                <span>{PLATFORMS[p].shortName}</span>
                <span className="opacity-70">({count})</span>
              </FilterChip>
            );
          })}
          </div>
        </div>
      </div>

      <GameGrid
        games={displayedGames}
        grouped={selectedPlatform === 'all'}
        platformOrder={platformOrder}
      />

      {displayedGames.length === 0 && (
        <EmptyState
          icon={<TrophyPair size={24} />}
          title="Nothing at 100% yet"
          description={
            selectedPlatform !== 'all'
              ? `No ${PLATFORMS[selectedPlatform].name} game is fully unlocked yet.`
              : 'Unlock every achievement in a game to earn its Steam perfect-game ribbon or PlayStation platinum here.'
          }
        />
      )}
    </div>
  );
};
