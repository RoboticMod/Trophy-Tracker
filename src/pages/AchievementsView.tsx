import React, { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import { PlatformIcon } from '../components/PlatformIcon';
import { TrophyBadge, TrophyPair } from '../components/TrophyBadge';
import { PLATFORMS, comparePlatformOrder, describePlatformOrder } from '../lib/constants';
import { Platform, PLATFORM_IDS } from '../types';
import { EmptyState, MetricCard } from '../components/ui';
import { cn } from '../lib/cn';

export const AchievementsView: React.FC = () => {
  const { games, profile } = useGame();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');

  const platformOrder = profile.platformOrder;

  /** Games where every achievement or trophy has been unlocked. */
  const completedGames = useMemo(
    () =>
      games.filter((g) => g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal),
    [games],
  );

  const displayedGames = useMemo(
    () =>
      completedGames
        .filter((g) => selectedPlatform === 'all' || g.platform === selectedPlatform)
        .sort((a, b) => {
          const pDiff = comparePlatformOrder(a.platform, b.platform, platformOrder);
          return pDiff !== 0 ? pDiff : a.title.localeCompare(b.title);
        }),
    [completedGames, selectedPlatform, platformOrder],
  );

  const totalUnlocked = completedGames.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <div className="space-y-1 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trophy-100">
            <TrophyPair size={17} />
          </div>
          <h1 className="text-600 font-bold tracking-tight text-gray-1000">
            Achievements &amp; Platinum Trophies
          </h1>
        </div>
        <p className="text-75 text-gray-700">
          Every game where you have unlocked all achievements — Steam perfect games and PlayStation
          platinums.
        </p>
      </div>

      {/* Summary ----------------------------------------------------------- */}
      <div className="grid-metrics">
        <MetricCard
          icon={<TrophyPair size={17} />}
          tone="bg-trophy-100"
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
          tone="bg-accent-100 text-accent-900"
          value={String(totalUnlocked)}
          label="Achievements unlocked"
        />
      </div>

      {/* Filter ------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <p className="text-75 text-gray-700">
          <span className="font-semibold text-gray-800">
            Sorted by platform: {describePlatformOrder(platformOrder)}
          </span>
          <span className="mx-2 text-gray-500">•</span>
          {displayedGames.length} game{displayedGames.length === 1 ? '' : 's'}
        </p>

        <div className="flex items-center gap-1.5">
          <PlatformChip
            selected={selectedPlatform === 'all'}
            onClick={() => setSelectedPlatform('all')}
          >
            All platforms
          </PlatformChip>

          {PLATFORM_IDS.map((p) => {
            const count = completedGames.filter((g) => g.platform === p).length;
            return (
              <PlatformChip
                key={p}
                selected={selectedPlatform === p}
                onClick={() => setSelectedPlatform(p)}
                title={`${PLATFORMS[p].name} — ${count} at 100%`}
              >
                <PlatformIcon platform={p} size={15} />
                <span>{PLATFORMS[p].shortName}</span>
                <span className="opacity-70">({count})</span>
              </PlatformChip>
            );
          })}
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

const PlatformChip: React.FC<{
  selected: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}> = ({ selected, onClick, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={selected}
    className={cn(
      'inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-75 font-semibold transition-colors',
      selected
        ? 'border-trophy-700 bg-trophy-100 text-trophy-900'
        : 'border-gray-200 bg-gray-100 text-gray-700 hover:border-gray-300 hover:text-gray-900',
    )}
  >
    {children}
  </button>
);
