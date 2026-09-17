import React, { useMemo } from 'react';
import { Play, Clock } from 'lucide-react';
import { TrophyPair } from '../components/TrophyBadge';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import { comparePlatformOrder } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { formatHours, sumHours } from '../lib/format';
import { Badge, EmptyState, MetricCard } from '../components/ui';

export const CurrentlyPlayingView: React.FC = () => {
  const { games, profile } = useGame();
  const platformOrder = profile.platformOrder;

  const playingGames = useMemo(
    () =>
      games
        .filter((g) => g.status === 'playing')
        .sort((a, b) => {
          const pDiff = comparePlatformOrder(a.platform, b.platform, platformOrder);
          return pDiff !== 0 ? pDiff : a.title.localeCompare(b.title);
        }),
    [games, platformOrder],
  );

  const totalHours = sumHours(playingGames);
  const unlocked = playingGames.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);
  const possible = playingGames.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <div className="border-b border-gray-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-700/16 text-accent-900">
              <Play size={18} />
            </div>
            <h1 className="text-600 font-bold tracking-tight text-gray-1000">
              {statusLabel('playing', profile)}
            </h1>
            <Badge tone="accent">{playingGames.length} active</Badge>
          </div>
          <p className="text-75 text-gray-600">
            Games in progress right now. Log hours and achievement unlocks as you go.
          </p>
        </div>
      </div>

      <div className="grid-metrics">
        <MetricCard
          icon={<Play size={18} />}
          tone="bg-accent-700/16 text-accent-900"
          value={String(playingGames.length)}
          label="Active titles"
        />
        <MetricCard
          icon={<Clock size={18} />}
          tone="bg-gray-200 text-gray-800"
          value={`${formatHours(totalHours)}h`}
          label="Logged in active games"
        />
        <MetricCard
          icon={<TrophyPair size={16} />}
          tone="bg-trophy-700/16"
          value={`${unlocked} / ${possible}`}
          label={`Active unlocks (${possible > 0 ? Math.round((unlocked / possible) * 100) : 0}%)`}
        />
      </div>

      <GameGrid games={playingGames} platformOrder={platformOrder} />

      {playingGames.length === 0 && (
        <EmptyState
          icon={<Play size={24} />}
          title="Nothing in progress"
          description={`Pick something from your library or backlog and set its status to "${statusLabel('playing', profile)}".`}
        />
      )}
    </div>
  );
};
