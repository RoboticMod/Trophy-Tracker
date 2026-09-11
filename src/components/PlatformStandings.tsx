import React, { useMemo } from 'react';
import { UserGame, PLATFORM_IDS, Platform } from '../types';
import { PLATFORMS } from '../lib/constants';
import { softEdge } from '../lib/tone';
import { trophySrc } from './TrophyBadge';
import { cn } from '../lib/cn';

export interface PlatformStanding {
  platform: Platform;
  name: string;
  color: string;
  trophy: string;
  games: number;
  hours: number;
  unlocked: number;
  possible: number;
  completionRate: number;
  perfectCount: number;
  rank: number;
}

const isPerfect = (g: UserGame) =>
  g.status === 'mastered' || (g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal);

/**
 * Ranks the platforms by the share of their available achievements unlocked —
 * not by raw count, which would simply crown whichever platform holds more
 * games.
 */
export function usePlatformStandings(games: UserGame[]): PlatformStanding[] {
  return useMemo(
    () =>
      PLATFORM_IDS.map((platform) => {
        const owned = games.filter((g) => g.platform === platform);
        const unlocked = owned.reduce((sum, g) => sum + (g.achievementsUnlocked || 0), 0);
        const possible = owned.reduce((sum, g) => sum + (g.achievementsTotal || 0), 0);
        return {
          platform,
          name: PLATFORMS[platform].name,
          color: PLATFORMS[platform].color,
          trophy: trophySrc(platform),
          games: owned.length,
          hours: owned.reduce((sum, g) => sum + (g.hoursPlayed || 0), 0),
          unlocked,
          possible,
          completionRate: possible > 0 ? Math.round((unlocked / possible) * 100) : 0,
          perfectCount: owned.filter(isPerfect).length,
          rank: 0,
        };
      })
        .filter((s) => s.games > 0)
        .sort((a, b) => b.completionRate - a.completionRate)
        .map((s, i) => ({ ...s, rank: i + 1 })),
    [games],
  );
}

/** The leader wears the trophy metal; everyone else keeps the neutral hairline. */
const rankStyle = (rank: number) => ({
  edge:
    rank === 1
      ? softEdge('var(--tt-gold, #e5a83c)', 35)
      : 'var(--tt-line, #35302a)',
  background: rank === 1 ? 'var(--color-gold-wash, #2a2013)' : 'var(--tt-surface-3, #2b2620)',
  color: rank === 1 ? 'var(--tt-gold-hi, #ffd36b)' : '#b8ae9f',
});

const RankBadge: React.FC<{ rank: number; size: number }> = ({ rank, size }) => {
  const tone = rankStyle(rank);
  return (
    <span
      style={{
        height: size,
        width: size,
        background: tone.background,
        color: tone.color,
        fontSize: size >= 32 ? 14 : 12,
      }}
      className="flex shrink-0 items-center justify-center rounded-full font-display font-bold"
    >
      {rank}
    </span>
  );
};

const TrophyCount: React.FC<{ src: string; count: number; size?: number }> = ({
  src,
  count,
  size = 13,
}) => (
  <span className="inline-flex items-center gap-[3px] font-display text-[11px] font-semibold tabular-nums text-gold-hi">
    <span
      aria-hidden="true"
      style={{
        height: size,
        width: size,
        backgroundImage: `url(${src})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
      className="inline-block shrink-0"
    />
    {count}
  </span>
);

/** Compact standings, for the dashboard column beside "Continue playing". */
export const StandingsCompact: React.FC<{ standings: PlatformStanding[] }> = ({ standings }) => (
  <>
    {standings.map((s) => (
      <div
        key={s.platform}
        style={{ boxShadow: `inset 0 0 0 1px ${rankStyle(s.rank).edge}` }}
        className="flex flex-col gap-2 rounded-inset bg-surface-2 p-3.5"
      >
        <div className="flex items-center gap-2.5">
          <RankBadge rank={s.rank} size={26} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[13px] font-bold text-ink">
              {s.name}
            </span>
            <span className="block text-[11px] text-subtle">
              {s.games} games &middot; {s.hours}h logged
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span
              style={{ color: s.color }}
              className="block font-display text-[18px] font-bold leading-none tabular-nums"
            >
              {s.completionRate}%
            </span>
            <TrophyCount src={s.trophy} count={s.perfectCount} />
          </span>
        </div>
        <div className="h-[5px] overflow-hidden rounded-full bg-bg">
          <div
            style={{ width: `${s.completionRate}%`, background: s.color }}
            className="h-full rounded-full transition-[width] duration-300 ease-tt"
          />
        </div>
      </div>
    ))}
  </>
);

/** Full-width standings row, for the statistics page. */
export const StandingsRow: React.FC<{ standing: PlatformStanding; className?: string }> = ({
  standing: s,
  className,
}) => (
  <div
    style={{ boxShadow: `inset 0 0 0 1px ${rankStyle(s.rank).edge}` }}
    className={cn('flex flex-wrap items-center gap-3 rounded-inset bg-surface-2 px-4 py-3.5', className)}
  >
    <RankBadge rank={s.rank} size={34} />

    <span className="min-w-[150px] flex-1">
      <span className="block font-display text-[15px] font-bold text-ink">{s.name}</span>
      <span className="block text-[12px] text-subtle">
        {s.games} games &middot; {s.hours}h logged
      </span>
    </span>

    <span className="min-w-[140px] flex-2">
      <span className="flex items-center gap-2.5">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
          <span
            style={{ width: `${s.completionRate}%`, background: s.color }}
            className="block h-full rounded-full transition-[width] duration-300 ease-tt"
          />
        </span>
        <span
          style={{ color: s.color }}
          className="font-display text-[15px] font-bold tabular-nums"
        >
          {s.completionRate}%
        </span>
      </span>
      <span className="mt-1 block text-[11px] tabular-nums text-subtle">
        {s.unlocked} / {s.possible} unlocked
      </span>
    </span>

    <span
      style={{ boxShadow: `inset 0 0 0 1px ${softEdge('var(--tt-gold, #e5a83c)', 30)}` }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-control bg-gold-wash px-2.5 py-1.5"
    >
      <span
        aria-hidden="true"
        style={{
          backgroundImage: `url(${s.trophy})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
        className="inline-block h-[17px] w-[17px]"
      />
      <span className="font-display text-[13px] font-bold tabular-nums text-gold-hi">
        {s.perfectCount}
      </span>
    </span>
  </div>
);
