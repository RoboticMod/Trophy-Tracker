import React, { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { PLATFORMS, comparePlatformOrder } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { navLabel, NAV_DESTINATIONS } from '../lib/navigation';
import { PLATFORM_IDS, Platform } from '../types';
import { Button, Chip, EmptyState, Eyebrow } from '../components/ui';
import { HourglassIcon, PlayIcon } from '../components/icons';

const BACKLOG = NAV_DESTINATIONS.find((d) => d.path === '/backlog')!;

export const BacklogView: React.FC = () => {
  const { games, profile, sidebarConfig, ui, updateGame, setIsQuickAddOpen } = useGame();
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const platformOrder = profile.platformOrder;

  const backlog = useMemo(() => games.filter((g) => g.status === 'backlog'), [games]);

  const sorted = useMemo(
    () =>
      [...backlog].sort((a, b) => {
        const diff = comparePlatformOrder(a.platform, b.platform, platformOrder);
        return diff !== 0 ? diff : a.title.localeCompare(b.title);
      }),
    [backlog, platformOrder],
  );

  const shown = sorted.filter((g) => platformFilter === 'all' || g.platform === platformFilter);
  const potential = backlog.reduce((sum, g) => sum + (g.achievementsTotal || 0), 0);
  const onPlatform = (p: Platform) => backlog.filter((g) => g.platform === p).length;

  /** Promotes the first game in the current platform order to "playing". */
  const startNext = () => {
    const next = sorted[0];
    if (next) updateGame(next.id, { status: 'playing' });
  };

  const gridClass = ui.cardLayout === 'poster' ? 'grid-cards-poster' : 'grid-cards';

  return (
    <section className="tt-rise flex flex-col gap-[clamp(20px,2.6vw,28px)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow style={{ color: '#d98b3a' }}>Queued up</Eyebrow>
          <h1 className="m-0 mt-1 font-display text-[clamp(28px,4.2vw,42px)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
            {navLabel(BACKLOG, sidebarConfig)}
          </h1>
          <p className="m-0 mt-2 max-w-[52ch] text-[14px] text-muted">
            {backlog.length} games waiting, {potential} achievements still locked behind them.
          </p>
        </div>

        {sorted.length > 0 ? (
          <Button variant="queued" size="xl" onClick={startNext}>
            <PlayIcon size={15} />
            Start next game
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip
          size="md"
          tone="#d98b3a"
          selected={platformFilter === 'all'}
          onClick={() => setPlatformFilter('all')}
        >
          All {backlog.length}
        </Chip>
        {PLATFORM_IDS.map((p) => (
          <Chip
            key={p}
            size="md"
            tone={PLATFORMS[p].color}
            title={PLATFORMS[p].name}
            selected={platformFilter === p}
            onClick={() => setPlatformFilter(p)}
          >
            {PLATFORMS[p].shortName} {onPlatform(p)}
          </Chip>
        ))}
      </div>

      {shown.length > 0 ? (
        <div className={gridClass}>
          {shown.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<HourglassIcon size={20} />}
          title={`Your ${statusLabel('backlog', profile).toLowerCase()} is clear`}
          description="Nothing is waiting under this filter. Add games from the catalog to queue them up."
          action={
            <Button variant="accent" size="m" onClick={() => setIsQuickAddOpen(true)}>
              Add game
            </Button>
          }
        />
      )}
    </section>
  );
};
