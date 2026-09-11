import React, { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { TrophyBadge, TrophyPair } from '../components/TrophyBadge';
import { PLATFORMS, comparePlatformOrder, describePlatformOrder } from '../lib/constants';
import { navLabel, NAV_DESTINATIONS } from '../lib/navigation';
import { GOLD_TONE, softEdge } from '../lib/tone';
import { PLATFORM_IDS, Platform } from '../types';
import { Chip, EmptyState, Eyebrow } from '../components/ui';

const TROPHY_ROOM = NAV_DESTINATIONS.find((d) => d.path === '/achievements')!;

export const AchievementsView: React.FC = () => {
  const { games, profile, sidebarConfig, ui } = useGame();
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const platformOrder = profile.platformOrder;

  /** Every game where the last achievement or trophy has actually landed. */
  const perfect = useMemo(
    () =>
      games.filter(
        (g) =>
          g.status === 'mastered' ||
          (g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal),
      ),
    [games],
  );

  const shown = useMemo(
    () =>
      perfect
        .filter((g) => platformFilter === 'all' || g.platform === platformFilter)
        .sort((a, b) => {
          const diff = comparePlatformOrder(a.platform, b.platform, platformOrder);
          return diff !== 0 ? diff : a.title.localeCompare(b.title);
        }),
    [perfect, platformFilter, platformOrder],
  );

  const unlocked = perfect.reduce((sum, g) => sum + (g.achievementsUnlocked || 0), 0);
  const onPlatform = (p: Platform) => perfect.filter((g) => g.platform === p).length;

  const gridClass = ui.cardLayout === 'poster' ? 'grid-cards-poster' : 'grid-cards';

  return (
    <section className="tt-rise flex flex-col gap-[clamp(20px,2.6vw,28px)]">
      {/* The banner is the one place the whole page is the trophy metal. */}
      <div
        style={{
          background:
            'linear-gradient(150deg, var(--color-gold-wash, #2a2013), var(--tt-bg-2, #16130f) 68%)',
          boxShadow: `inset 0 0 0 1px ${softEdge('var(--tt-gold, #e5a83c)', 40)}`,
        }}
        className="relative overflow-hidden rounded-panel p-[clamp(20px,3vw,34px)]"
      >
        <Eyebrow style={{ color: 'var(--tt-gold, #e5a83c)' }}>Everything finished to 100%</Eyebrow>
        <h1 className="m-0 mt-1.5 font-display text-[clamp(28px,4.2vw,44px)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
          {navLabel(TROPHY_ROOM, sidebarConfig)}
        </h1>

        <div className="mt-5 flex flex-wrap gap-7">
          <BannerStat value={perfect.length} label="Titles" color="var(--tt-gold-hi, #ffd36b)" />
          <BannerStat value={unlocked} label="Unlocks earned" />
          <span className="block">
            <span className="flex items-center gap-2.5">
              {PLATFORM_IDS.map((p) => (
                <span
                  key={p}
                  title={`${onPlatform(p)} on ${PLATFORMS[p].name}`}
                  className="inline-flex items-center gap-1.5 font-display text-[26px] font-bold leading-none tabular-nums text-ink"
                >
                  <TrophyBadge platform={p} size={22} />
                  {onPlatform(p)}
                </span>
              ))}
            </span>
            <span className="mt-1.5 block font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Perfect &amp; platinum split
            </span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            size="md"
            tone={GOLD_TONE}
            selected={platformFilter === 'all'}
            onClick={() => setPlatformFilter('all')}
          >
            All {perfect.length}
          </Chip>
          {PLATFORM_IDS.map((p) => (
            <Chip
              key={p}
              size="md"
              tone={PLATFORMS[p].color}
              title={`${PLATFORMS[p].name} — ${onPlatform(p)} at 100%`}
              selected={platformFilter === p}
              onClick={() => setPlatformFilter(p)}
            >
              {PLATFORMS[p].shortName} {onPlatform(p)}
            </Chip>
          ))}
        </div>
        <span className="text-[12px] text-subtle">
          Sorted {describePlatformOrder(platformOrder)}
        </span>
      </div>

      {shown.length > 0 ? (
        <div className={gridClass}>
          {shown.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<TrophyPair size={22} />}
          title="Nothing at 100% yet"
          description={
            platformFilter !== 'all'
              ? `No ${PLATFORMS[platformFilter].name} game is fully unlocked yet.`
              : 'Unlock every achievement in a game to earn its Steam perfect-game ribbon or PlayStation platinum here.'
          }
        />
      )}
    </section>
  );
};

const BannerStat: React.FC<{ value: number; label: string; color?: string }> = ({
  value,
  label,
  color = '#f7f3ec',
}) => (
  <span className="block">
    <span
      style={{ color }}
      className="block font-display text-[36px] font-bold leading-none tabular-nums"
    >
      {value}
    </span>
    <span className="mt-1 block font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
      {label}
    </span>
  </span>
);
