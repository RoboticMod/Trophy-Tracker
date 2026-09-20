import React, { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { IntroNotice } from '../components/IntroNotice';
import { GameGrid } from '../components/GameGrid';
import { PlatformIcon } from '../components/PlatformIcon';
import { TrophyBadge, TrophyPair } from '../components/TrophyBadge';
import { PLATFORMS } from '../lib/constants';
import { GameSortOption, SORT_LABELS, compareGames } from '../lib/sortGames';
import { isPerfect } from '../lib/completion';
import { oneOf } from '../lib/usePersistentState';
import { useSyncedPreference } from '../lib/useSyncedPreference';
import { Platform, PLATFORM_IDS } from '../types';
import { Badge, EmptyState, FilterChip, PageHeader, Select } from '../components/ui';

/**
 * Completion is not offered here: every game on this page is at 100%, so
 * sorting by it would leave the list untouched.
 */
const SORT_OPTIONS = [
  'completed-desc',
  'completed-asc',
  'recent',
  'unlocked-desc',
  'achievement-rating-desc',
  'hours-desc',
  'title-asc',
] as const satisfies readonly GameSortOption[];

export const AchievementsView: React.FC = () => {
  const { games, profile } = useGame();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  // A new key rather than the old one: this page now defaults to the date a
  // game was finished, and an install that had already saved a choice under the
  // previous key would be pinned to the old default forever.
  const [sortBy, setSortBy] = useSyncedPreference<GameSortOption>(
    'achievements-sort-v2',
    'completed-desc',
    oneOf(SORT_OPTIONS),
  );

  const platformOrder = profile.platformOrder;

  /** Games where every achievement or trophy has been unlocked. */
  const completedGames = useMemo(() => games.filter(isPerfect), [games]);

  // Sorted before the grid splits the list into platform sections, so the
  // chosen order runs through both sections rather than only the first.
  const displayedGames = useMemo(
    () =>
      completedGames
        .filter((g) => selectedPlatform === 'all' || g.platform === selectedPlatform)
        .sort((a, b) => compareGames(a, b, sortBy)),
    [completedGames, selectedPlatform, sortBy],
  );

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <PageHeader
        icon={<TrophyPair size={17} />}
        iconClassName="bg-trophy-700/16"
        title="100% Achievements & Platinum Trophies"
        // The total, then the same total split by platform — each in a pill of
        // the one height and radius, so the marks sit on a line with the words
        // rather than each figure setting its own. The running count of every
        // unlock earned went with the strip these replace: it is a tally that
        // only grows, and nothing is done with it.
        badge={
          <>
            <Badge tone="trophy">{completedGames.length} finished</Badge>
            {PLATFORM_IDS.map((p) => (
              <Badge key={p} tone="trophy" title={PLATFORMS[p].name}>
                <TrophyBadge platform={p} size={13} />
                {completedGames.filter((g) => g.platform === p).length}
              </Badge>
            ))}
          </>
        }
      />

      <IntroNotice id="achievements">
        Every game where you have unlocked all achievements — Steam perfect games and PlayStation
        platinums.
      </IntroNotice>

      {/* Filter and sort ----------------------------------------------------
          No rule of its own: the header block above already ends in one, and
          with the intro notice dismissed the two sat a bare gap apart and read
          as a mistake. The gap is the separation. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
              onChange={setSortBy}
              options={SORT_OPTIONS.map((option) => ({
                value: option,
                label: SORT_LABELS[option],
              }))}
            />
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
