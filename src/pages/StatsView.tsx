import React, { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { StandingsRow, usePlatformStandings } from '../components/PlatformStandings';
import { CoverArt } from '../components/CoverArt';
import { TrophyBadge } from '../components/TrophyBadge';
import { RankingIcon, StatsIcon } from '../components/icons';
import { statusLabel, STATUS_COLOR } from '../lib/status';
import { softEdge } from '../lib/tone';
import { navLabel, NAV_DESTINATIONS } from '../lib/navigation';
import { GameStatus } from '../types';
import {
  EmptyState,
  Eyebrow,
  Meter,
  Panel,
  PanelHeading,
  StatCaption,
  StatTile,
} from '../components/ui';

const STATS = NAV_DESTINATIONS.find((d) => d.path === '/stats')!;

const DISTRIBUTION: GameStatus[] = ['playing', 'backlog', 'completed', 'mastered', 'dropped'];

export const StatsView: React.FC = () => {
  const { games, profile, sidebarConfig } = useGame();
  const standings = usePlatformStandings(games);

  const totalHours = games.reduce((sum, g) => sum + (g.hoursPlayed || 0), 0);
  const unlocked = games.reduce((sum, g) => sum + (g.achievementsUnlocked || 0), 0);
  const possible = games.reduce((sum, g) => sum + (g.achievementsTotal || 0), 0);
  const overallPercent = possible > 0 ? Math.round((unlocked / possible) * 100) : 0;

  const playing = games.filter((g) => g.status === 'playing');
  const finished = games.filter((g) => g.status === 'completed' || g.status === 'mastered');
  const perfect = games.filter(
    (g) =>
      g.status === 'mastered' ||
      (g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal),
  );

  /** The actual most-played title, not simply the first row in the array. */
  const mostPlayed = useMemo(
    () =>
      games.reduce<(typeof games)[number] | null>(
        (best, g) => (!best || (g.hoursPlayed || 0) > (best.hoursPlayed || 0) ? g : best),
        null,
      ),
    [games],
  );

  const recent = useMemo(
    () =>
      [...games]
        .sort(
          (a, b) =>
            new Date(b.lastPlayedAt || b.updatedAt || b.addedAt).getTime() -
            new Date(a.lastPlayedAt || a.updatedAt || a.addedAt).getTime(),
        )
        .slice(0, 6),
    [games],
  );

  if (games.length === 0) {
    return (
      <section className="tt-rise">
        <EmptyState
          icon={<StatsIcon size={20} />}
          title="No statistics yet"
          description="Add a few games and log some progress — the breakdowns fill in from your library."
        />
      </section>
    );
  }

  return (
    <section className="tt-rise flex flex-col gap-[clamp(20px,2.6vw,28px)]">
      <div>
        <Eyebrow>Career record</Eyebrow>
        <h1 className="m-0 mt-1 font-display text-[clamp(28px,4.2vw,42px)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
          {navLabel(STATS, sidebarConfig)}
        </h1>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))]">
        <StatTile
          label="Tracked games"
          value={games.length}
          footer={<StatCaption>{playing.length} in progress now</StatCaption>}
        />

        <StatTile
          label="Achievement completion"
          value={`${overallPercent}%`}
          valueColor="var(--tt-gold-hi, #ffd36b)"
          footer={
            <>
              <Meter value={overallPercent} complete label="Overall completion" />
              <StatCaption className="tabular-nums">
                {unlocked} / {possible} unlocked
              </StatCaption>
            </>
          }
        />

        <StatTile
          label="Playtime logged"
          value={`${totalHours}h`}
          footer={
            <StatCaption>
              ~{(totalHours / 24).toFixed(1)} days
              {mostPlayed ? ` · Most played: ${mostPlayed.title}` : ''}
            </StatCaption>
          }
        />

        <StatTile
          gold
          label="100% completed"
          labelColor="var(--tt-gold, #e5a83c)"
          value={perfect.length}
          valueColor="var(--tt-gold-hi, #ffd36b)"
          footer={
            <span className="text-[12px] text-muted">
              {finished.length} titles finished overall
            </span>
          }
        />
      </div>

      {standings.length > 0 ? (
        <Panel className="flex flex-col gap-3.5">
          <PanelHeading className="flex items-center gap-2">
            <RankingIcon size={16} color="var(--tt-gold-hi, #ffd36b)" />
            Platform leaderboard
          </PanelHeading>
          {standings.map((standing) => (
            <StandingsRow key={standing.platform} standing={standing} />
          ))}
        </Panel>
      ) : null}

      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        <Panel className="flex flex-col gap-3.5">
          <PanelHeading>Status distribution</PanelHeading>
          <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,130px),1fr))]">
            {DISTRIBUTION.map((status) => {
              // "Mastered" counts real completion, so a game finished without
              // its status being changed is still counted once, here.
              const count =
                status === 'mastered'
                  ? perfect.length
                  : games.filter((g) => g.status === status).length;
              return (
                <div key={status} className="rounded-inset bg-surface-2 p-3.5 hairline">
                  <span
                    style={{ color: STATUS_COLOR[status] }}
                    className="block font-display text-[24px] font-bold leading-none tabular-nums"
                  >
                    {count}
                  </span>
                  <span className="mt-1.5 block font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                    {statusLabel(status, profile)}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel className="flex flex-col gap-1.5">
          <PanelHeading className="mb-2">Recent activity</PanelHeading>
          {recent.map((game) => (
            <div
              key={game.id}
              className="flex items-center gap-3 py-[9px] shadow-[inset_0_-1px_0_var(--tt-surface-3)]"
            >
              <CoverArt
                src={game.coverImage}
                title={game.title}
                className="h-[30px] w-[30px] shrink-0 overflow-hidden rounded-control object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[13px] font-semibold text-ink">
                  {game.title}
                </span>
                <span className="block text-[11px] tabular-nums text-subtle">
                  {game.hoursPlayed}h &middot; {game.achievementsUnlocked}/
                  {game.achievementsTotal}
                </span>
              </span>
              <span
                style={{ color: STATUS_COLOR[game.status] }}
                className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em]"
              >
                {statusLabel(game.status, profile)}
              </span>
            </div>
          ))}
        </Panel>
      </div>

      {perfect.length > 0 ? (
        <Panel className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <PanelHeading>100% showcase</PanelHeading>
            <span className="text-[12px] tabular-nums text-subtle">{perfect.length} titles</span>
          </div>
          <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))]">
            {perfect.map((game) => (
              <div
                key={game.id}
                style={{
                  background:
                    'linear-gradient(165deg, var(--color-gold-wash, #2a2013), var(--tt-surface-2, #221e1a) 74%)',
                  boxShadow: `inset 0 0 0 1px ${softEdge('var(--tt-gold, #e5a83c)', 30)}`,
                }}
                className="flex items-center gap-3 rounded-inset p-3"
              >
                <CoverArt
                  src={game.coverImage}
                  title={game.title}
                  className="h-[42px] w-[42px] shrink-0 overflow-hidden rounded-control object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[13px] font-bold text-ink">
                    {game.title}
                  </span>
                  <span className="block text-[11px] tabular-nums text-muted">
                    {game.achievementsUnlocked}/{game.achievementsTotal} unlocked
                  </span>
                </span>
                <TrophyBadge platform={game.platform} size={24} />
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </section>
  );
};
