import React, { useMemo } from 'react';
import { BarChart3, Clock, Gamepad2, Calendar, Percent, TrendingUp } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { PLATFORMS, comparePlatformOrder } from '../lib/constants';
import { statusLabel, STATUS_TONE } from '../lib/status';
import { GameStatus, PLATFORM_IDS } from '../types';
import { CoverArt } from '../components/CoverArt';
import { PlatformIcon } from '../components/PlatformIcon';
import { TrophyBadge, TrophyPair, trophyLabel } from '../components/TrophyBadge';
import { Badge, Card, EmptyState, Meter } from '../components/ui';

const STATUS_BREAKDOWN: GameStatus[] = ['playing', 'backlog', 'completed', 'mastered'];

export const StatsView: React.FC = () => {
  const { games, profile } = useGame();
  const platformOrder = profile.platformOrder;

  const totalGames = games.length;
  const totalHours = games.reduce((acc, g) => acc + (g.hoursPlayed || 0), 0);
  const totalAchievements = games.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);
  const totalMaxAchievements = games.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);
  const completedGames = games.filter((g) => g.status === 'completed' || g.status === 'mastered');
  const perfectGames = games.filter(
    (g) =>
      g.status === 'mastered' ||
      (g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal),
  );
  const activePlaying = games.filter((g) => g.status === 'playing');

  const overallCompletionRate =
    totalMaxAchievements > 0 ? Math.round((totalAchievements / totalMaxAchievements) * 100) : 0;

  /** The actual most-played title, not simply the first row in the array. */
  const longestPlayed = useMemo(
    () =>
      games.reduce<(typeof games)[number] | null>(
        (best, g) => (!best || (g.hoursPlayed || 0) > (best.hoursPlayed || 0) ? g : best),
        null,
      ),
    [games],
  );

  const platformStats = useMemo(
    () =>
      PLATFORM_IDS.map((p) => {
        const pGames = games.filter((g) => g.platform === p);
        const achievements = pGames.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);
        const maxAchievements = pGames.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);
        return {
          platform: p,
          config: PLATFORMS[p],
          count: pGames.length,
          hours: pGames.reduce((acc, g) => acc + (g.hoursPlayed || 0), 0),
          achievements,
          maxAchievements,
          completionRate:
            maxAchievements > 0 ? Math.round((achievements / maxAchievements) * 100) : 0,
          perfectCount: pGames.filter(
            (g) => g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal,
          ).length,
        };
      })
        .filter((s) => s.count > 0)
        .sort((a, b) => comparePlatformOrder(a.platform, b.platform, platformOrder)),
    [games, platformOrder],
  );

  const recentGames = useMemo(
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

  if (totalGames === 0) {
    return (
      <div className="mx-auto max-w-[1760px] pb-10">
        <EmptyState
          icon={<BarChart3 size={24} />}
          title="No statistics yet"
          description="Add a few games and log some progress — the breakdowns fill in from your library."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-100 text-accent-900">
          <BarChart3 size={20} />
        </div>
        <div>
          <h1 className="text-600 font-bold tracking-tight text-gray-1000">Statistics</h1>
          <p className="text-75 text-gray-700">
            Progress, achievements and hours played across your library.
          </p>
        </div>
      </div>

      {/* Headline metrics -------------------------------------------------- */}
      <div className="grid-metrics">
        <Card className="flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between text-75 font-semibold text-gray-700">
            <span>Tracked games</span>
            <Gamepad2 size={16} className="text-accent-900" />
          </div>
          <div>
            <div className="text-700 font-bold text-gray-1000">{totalGames}</div>
            <div className="text-50 text-gray-700">
              Across {platformStats.length} platform{platformStats.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="text-50 text-gray-700">
            {activePlaying.length} in progress right now
          </div>
        </Card>

        <Card className="flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between text-75 font-semibold text-gray-700">
            <span>Achievement completion</span>
            <Percent size={16} className="text-trophy-900" />
          </div>
          <div>
            <div className="text-700 font-bold text-gray-1000">{overallCompletionRate}%</div>
            <div className="text-50 text-gray-700">
              {totalAchievements} / {totalMaxAchievements} unlocked
            </div>
          </div>
          <Meter value={overallCompletionRate} tone="trophy" label="Overall completion" />
        </Card>

        <Card className="flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between text-75 font-semibold text-gray-700">
            <span>Playtime logged</span>
            <Clock size={16} className="text-gray-700" />
          </div>
          <div>
            <div className="text-700 font-bold text-gray-1000">{totalHours}h</div>
            <div className="text-50 text-gray-700">~{(totalHours / 24).toFixed(1)} days total</div>
          </div>
          <div className="truncate text-50 text-gray-700">
            {longestPlayed
              ? `Most played: ${longestPlayed.title} (${longestPlayed.hoursPlayed}h)`
              : 'No playtime logged yet'}
          </div>
        </Card>

        <Card className="flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between text-75 font-semibold text-gray-700">
            <span>100% completed</span>
            <TrophyPair size={15} />
          </div>
          <div>
            <div className="text-700 font-bold text-positive-900">{perfectGames.length}</div>
            <div className="text-50 text-gray-700">Perfect games &amp; platinums</div>
          </div>
          <div className="text-50 text-gray-700">
            {completedGames.length} titles finished overall
          </div>
        </Card>
      </div>

      {/* Platform breakdown ------------------------------------------------ */}
      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 text-200 font-bold text-gray-1000">
          <Gamepad2 size={16} className="text-accent-900" />
          Platform breakdown
        </h2>

        <div className="space-y-3">
          {platformStats.map((stat) => (
            <div
              key={stat.platform}
              className="space-y-2 rounded-md border border-gray-200 bg-gray-75 p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-75">
                <div className="flex items-center gap-2.5">
                  <div
                    style={{ color: stat.config.color }}
                    className="flex h-8 w-8 items-center justify-center rounded-sm bg-gray-200"
                  >
                    <PlatformIcon platform={stat.platform} size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-1000">{stat.config.name}</span>
                    <span className="ml-2 text-gray-600">
                      {stat.count} game{stat.count === 1 ? '' : 's'} • {stat.hours}h
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-medium text-gray-700">
                  {stat.perfectCount > 0 && (
                    <span
                      className="flex items-center gap-1.5 text-trophy-900"
                      title={`${stat.perfectCount} ${trophyLabel(stat.platform)}`}
                    >
                      <TrophyBadge platform={stat.platform} size={18} />
                      <span className="text-50">{stat.perfectCount}</span>
                    </span>
                  )}
                  <span>
                    {stat.achievements}/{stat.maxAchievements} ({stat.completionRate}%)
                  </span>
                </div>
              </div>

              <Meter
                value={stat.completionRate}
                color={stat.config.color}
                label={`${stat.config.name} completion`}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Showcase ----------------------------------------------------------- */}
      {perfectGames.length > 0 && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-200 font-bold text-gray-1000">
              <TrophyPair size={15} />
              100% showcase
            </h2>
            <span className="text-75 text-gray-700">{perfectGames.length} titles</span>
          </div>

          <div className="grid-metrics">
            {perfectGames.map((game) => (
              <div
                key={game.id}
                className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-75 p-3"
              >
                <CoverArt
                  src={game.coverImage}
                  title={game.title}
                  className="h-12 w-12 shrink-0 rounded-sm object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform={game.platform} size={13} className="text-gray-600" />
                    <h3 className="truncate text-75 font-semibold text-gray-1000">{game.title}</h3>
                  </div>
                  <div className="text-50 text-gray-700">
                    {game.achievementsUnlocked}/{game.achievementsTotal} unlocked
                  </div>
                </div>
                <TrophyBadge platform={game.platform} size={26} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Distribution + history --------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="flex items-center gap-2 text-200 font-bold text-gray-1000">
            <TrendingUp size={16} className="text-positive-900" />
            Status distribution
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {STATUS_BREAKDOWN.map((status) => {
              const count =
                status === 'mastered'
                  ? perfectGames.length
                  : games.filter((g) => g.status === status).length;
              return (
                <div key={status} className="rounded-md border border-gray-200 bg-gray-75 p-3.5">
                  <div className="text-400 font-bold text-gray-1000">{count}</div>
                  <div className="mt-1">
                    <Badge tone={STATUS_TONE[status]}>{statusLabel(status, profile)}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="flex items-center gap-2 text-200 font-bold text-gray-1000">
            <Calendar size={16} className="text-accent-900" />
            Recent activity
          </h2>

          <div className="divide-y divide-gray-200">
            {recentGames.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-gray-200 text-gray-700">
                    <PlatformIcon platform={g.platform} size={14} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-75 font-semibold text-gray-1000">{g.title}</h3>
                    <p className="text-50 text-gray-700">
                      {g.hoursPlayed}h • {g.achievementsUnlocked}/{g.achievementsTotal} unlocked
                    </p>
                  </div>
                </div>

                <Badge tone={STATUS_TONE[g.status]}>{statusLabel(g.status, profile)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
