import React, { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { comparePlatformOrder, PLATFORMS } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { navLabel, NAV_DESTINATIONS } from '../lib/navigation';
import { PLATFORM_IDS } from '../types';
import { EmptyState, Eyebrow, Meter, StatCaption, StatTile } from '../components/ui';
import { PlayIcon } from '../components/icons';

const PLAYING = NAV_DESTINATIONS.find((d) => d.path === '/playing')!;

export const CurrentlyPlayingView: React.FC = () => {
  const { games, profile, sidebarConfig, ui } = useGame();
  const platformOrder = profile.platformOrder;

  const playing = useMemo(
    () =>
      games
        .filter((g) => g.status === 'playing')
        .sort((a, b) => {
          const diff = comparePlatformOrder(a.platform, b.platform, platformOrder);
          return diff !== 0 ? diff : a.title.localeCompare(b.title);
        }),
    [games, platformOrder],
  );

  const hours = playing.reduce((sum, g) => sum + (g.hoursPlayed || 0), 0);
  const unlocked = playing.reduce((sum, g) => sum + (g.achievementsUnlocked || 0), 0);
  const possible = playing.reduce((sum, g) => sum + (g.achievementsTotal || 0), 0);
  const percent = possible > 0 ? Math.round((unlocked / possible) * 100) : 0;

  const gridClass = ui.cardLayout === 'poster' ? 'grid-cards-poster' : 'grid-cards';

  return (
    <section className="tt-rise flex flex-col gap-[clamp(20px,2.6vw,28px)]">
      <div>
        <Eyebrow style={{ color: 'var(--tt-accent, #45c8ea)' }}>In progress</Eyebrow>
        <h1 className="m-0 mt-1 font-display text-[clamp(28px,4.2vw,42px)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
          {navLabel(PLAYING, sidebarConfig)}
        </h1>
        <p className="m-0 mt-2 max-w-[56ch] text-[14px] text-muted [text-wrap:pretty]">
          Games on the go right now. Log hours and unlocks as you play.
        </p>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
        <StatTile
          label="Active titles"
          value={playing.length}
          valueColor="var(--tt-accent, #45c8ea)"
          size="sm"
          footer={
            <StatCaption>
              {PLATFORM_IDS.map((p, i) => (
                <React.Fragment key={p}>
                  {i > 0 ? ' · ' : ''}
                  {playing.filter((g) => g.platform === p).length} {PLATFORMS[p].shortName}
                </React.Fragment>
              ))}
            </StatCaption>
          }
        />

        <StatTile
          label="Hours logged"
          value={`${hours}h`}
          size="sm"
          footer={<StatCaption>Across active games</StatCaption>}
        />

        <StatTile
          label="Active unlocks"
          value={`${percent}%`}
          valueColor="var(--tt-gold-hi, #ffd36b)"
          size="sm"
          footer={
            <>
              <Meter value={percent} complete label="Active unlock progress" />
              <StatCaption className="tabular-nums">
                {unlocked} / {possible} unlocked
              </StatCaption>
            </>
          }
        />
      </div>

      {playing.length > 0 ? (
        <div className={gridClass}>
          {playing.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<PlayIcon size={20} />}
          title="Nothing in progress"
          description={`Pick something from your library or backlog and set its status to "${statusLabel('playing', profile)}".`}
        />
      )}
    </section>
  );
};
