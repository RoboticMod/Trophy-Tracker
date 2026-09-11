import React, { useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { Play, Clock } from 'lucide-react';
import { TrophyPair } from '../components/TrophyBadge';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { comparePlatformOrder } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { Card, EmptyState } from '../components/ui';

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

  const totalHours = playingGames.reduce((acc, g) => acc + (g.hoursPlayed || 0), 0);
  const unlocked = playingGames.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);
  const possible = playingGames.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <div className="border-b border-gray-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-100 text-accent-900">
              <Play size={18} />
            </div>
            <h1 className="text-600 font-bold tracking-tight text-gray-1000">
              {statusLabel('playing', profile)}
            </h1>
            <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-75 font-semibold text-accent-900">
              {playingGames.length} active
            </span>
          </div>
          <p className="text-75 text-gray-700">
            Games in progress right now. Log hours and achievement unlocks as you go.
          </p>
        </div>
      </div>

      <div className="grid-metrics">
        <Summary
          icon={<Play size={18} />}
          tone="bg-accent-100 text-accent-900"
          value={String(playingGames.length)}
          label="Active titles"
        />
        <Summary
          icon={<Clock size={18} />}
          tone="bg-gray-200 text-gray-800"
          value={`${totalHours}h`}
          label="Logged in active games"
        />
        <Summary
          icon={<TrophyPair size={16} />}
          tone="bg-trophy-100"
          value={`${unlocked} / ${possible}`}
          label={`Active unlocks (${possible > 0 ? Math.round((unlocked / possible) * 100) : 0}%)`}
        />
      </div>

      <div className="grid-cards">
        <AnimatePresence>
          {playingGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </AnimatePresence>
      </div>

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

const Summary: React.FC<{
  icon: React.ReactNode;
  tone: string;
  value: string;
  label: string;
}> = ({ icon, tone, value, label }) => (
  <Card className="flex items-center gap-3">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${tone}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-400 font-bold text-gray-1000">{value}</div>
      <div className="truncate text-50 text-gray-700">{label}</div>
    </div>
  </Card>
);
