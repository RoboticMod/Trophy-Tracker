import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Hourglass, Plus, Play, Filter } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { PlatformIcon } from '../components/PlatformIcon';
import { Platform, PLATFORM_IDS } from '../types';
import { PLATFORMS, comparePlatformOrder } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { Button, Card, EmptyState } from '../components/ui';
import { cn } from '../lib/cn';

export const BacklogView: React.FC = () => {
  const { games, setIsQuickAddOpen, updateGame, profile } = useGame();
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const platformOrder = profile.platformOrder;

  const backlogGames = useMemo(() => games.filter((g) => g.status === 'backlog'), [games]);

  const sorted = useMemo(
    () =>
      [...backlogGames].sort((a, b) => {
        const pDiff = comparePlatformOrder(a.platform, b.platform, platformOrder);
        return pDiff !== 0 ? pDiff : a.title.localeCompare(b.title);
      }),
    [backlogGames, platformOrder],
  );

  const filtered = sorted.filter((g) => platformFilter === 'all' || g.platform === platformFilter);

  const potentialAchievements = backlogGames.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);

  /** Promotes the first game in the current platform order to "playing". */
  const startNext = () => {
    const next = sorted[0];
    if (next) updateGame(next.id, { status: 'playing' });
  };

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-notice-100 text-notice-900">
            <Hourglass size={20} />
          </div>
          <div>
            <h1 className="text-600 font-bold tracking-tight text-gray-1000">
              {statusLabel('backlog', profile)}
            </h1>
            <p className="text-75 text-gray-700">Games queued and waiting to be played</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sorted.length > 0 && (
            <Button variant="positive" size="l" onClick={startNext}>
              <Play size={14} />
              <span>Start next game</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid-metrics">
        <Card>
          <div className="text-600 font-bold text-gray-1000">{backlogGames.length}</div>
          <div className="text-50 font-medium text-gray-700">Games in queue</div>
        </Card>
        <Card>
          <div className="text-600 font-bold text-notice-900">{potentialAchievements}</div>
          <div className="text-50 font-medium text-gray-700">Achievements still to unlock</div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1 text-75 font-medium text-gray-700">
          <Filter size={13} />
          Platform
        </span>

        <Chip selected={platformFilter === 'all'} onClick={() => setPlatformFilter('all')}>
          All ({backlogGames.length})
        </Chip>

        {PLATFORM_IDS.map((p) => {
          const count = backlogGames.filter((g) => g.platform === p).length;
          return (
            <Chip
              key={p}
              selected={platformFilter === p}
              onClick={() => setPlatformFilter(p)}
              title={PLATFORMS[p].name}
            >
              <PlatformIcon platform={p} size={15} />
              <span>{PLATFORMS[p].shortName}</span>
              <span className="opacity-70">({count})</span>
            </Chip>
          );
        })}
      </div>

      <div className="grid-cards">
        <AnimatePresence>
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={<Hourglass size={24} />}
          title="Your backlog is clear"
          description="Nothing is waiting under this filter. Add games from the catalog to queue them up."
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

const Chip: React.FC<{
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
        ? 'border-notice-700 bg-notice-100 text-notice-900'
        : 'border-gray-200 bg-gray-100 text-gray-700 hover:border-gray-300 hover:text-gray-900',
    )}
  >
    {children}
  </button>
);
