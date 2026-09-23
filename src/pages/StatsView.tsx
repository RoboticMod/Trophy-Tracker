import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Gamepad2,
  Calendar,
  TrendingUp,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { PLATFORMS, comparePlatformOrder } from '../lib/constants';
import {
  BACKLOG_COLLECTION_ID,
  PERMANENT_COLOR,
  PERMANENT_COLLECTION_IDS,
  PERMANENT_OVERLAY_CLASS,
  PLAYING_COLLECTION_ID,
  collectionName,
  permanentOf,
} from '../lib/collections';
import { aggregateCompletion, completionPercent, isPerfect } from '../lib/completion';
import { backlogLabel, completionColor } from '../lib/rating';
import { formatCount, formatHours, relativeTime, sumHours } from '../lib/format';
import { cn } from '../lib/cn';
import { PLATFORM_IDS } from '../types';
import { CoverArt } from '../components/CoverArt';
import { PlatformIcon } from '../components/PlatformIcon';
import { TrophyBadge, trophyLabel } from '../components/TrophyBadge';
import {
  Button,
  EmptyState,
  Gauge,
  Meter,
  PageHeader,
  SectionRule,
} from '../components/ui';
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { PhoneHeaderAction } from '../lib/phoneHeader';
import { IntroNotice } from '../components/IntroNotice';

/**
 * The three shelves plus everything on none of them. That last slice is what
 * keeps the ring honest: a game can now sit in the library without being filed
 * anywhere, and the donut's whole premise is that its segments add up to the
 * library total.
 */
const UNSHELVED = 'unshelved';

const SHELF_BREAKDOWN = [...PERMANENT_COLLECTION_IDS, UNSHELVED] as const;

/** The sections of this page, in the order they appear until you change it. */
const SECTIONS = [
  { id: 'headline', name: 'Overview' },
  { id: 'platforms', name: 'Platforms' },
  // The ids stay as they were so saved statsOrder arrays keep working. The 100%
  // showcase that used to sit here is the Trophies page's job; a saved order
  // still naming it simply skips it.
  { id: 'distribution', name: 'Distribution' },
  { id: 'activity', name: 'Recent' },
] as const;

const DEFAULT_STATS_ORDER = SECTIONS.map((s) => s.id) as string[];

const sectionName = (id: string) => SECTIONS.find((s) => s.id === id)?.name ?? id;

export const StatsView: React.FC = () => {
  const { games, collections, profile, sidebarConfig, updateSidebarConfig } = useGame();
  const platformOrder = profile.platformOrder;

  const [isReordering, setIsReordering] = useState(false);

  /**
   * A stored order can be stale in both directions: it may still name a section
   * that no longer exists, and it will not name one added since it was saved.
   * Filtering to the known set and appending whatever is missing keeps the page
   * whole either way, rather than dropping a section off it.
   */
  const storedOrder = sidebarConfig?.statsOrder;
  const order = useMemo(() => {
    const kept = (storedOrder ?? []).filter((id) => DEFAULT_STATS_ORDER.includes(id));
    return [...kept, ...DEFAULT_STATS_ORDER.filter((id) => !kept.includes(id))];
  }, [storedOrder]);

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    updateSidebarConfig({ statsOrder: next });
  };

  const totalGames = games.length;
  const totalHours = sumHours(games);
  const {
    unlocked: totalAchievements,
    unlockable: totalMaxAchievements,
    percent: overallCompletionRate,
  } = aggregateCompletion(games);
  const perfectGames = games.filter(isPerfect);
  const activePlaying = games.filter((g) => g.collections?.includes(PLAYING_COLLECTION_ID));

  const backlogCount = games.filter((g) => g.collections?.includes(BACKLOG_COLLECTION_ID)).length;
  // An empty library is 0% cleared rather than 100%: nothing has been worked
  // through, and a full arc would congratulate you for owning no games.
  const backlogCleared =
    totalGames > 0 ? Math.round(((totalGames - backlogCount) / totalGames) * 100) : 0;

  const platformStats = useMemo(
    () =>
      PLATFORM_IDS.map((p) => {
        const pGames = games.filter((g) => g.platform === p);
        const { percent } = aggregateCompletion(pGames);
        return {
          platform: p,
          config: PLATFORMS[p],
          count: pGames.length,
          hours: sumHours(pGames),
          completionRate: percent,
          perfectCount: pGames.filter(isPerfect).length,
        };
      })
        .filter((s) => s.count > 0)
        .sort((a, b) => comparePlatformOrder(a.platform, b.platform, platformOrder)),
    [games, platformOrder],
  );

  /**
   * The shelf split, as segments of the whole library.
   *
   * Every game lands in exactly one segment, because a game is on at most one
   * shelf and anything on none falls into "Unshelved" — which is what lets the
   * segments add up to the library total rather than claiming more games than
   * you own.
   */
  const shelfSlices = useMemo(
    () =>
      SHELF_BREAKDOWN.map((shelf) => {
        const isUnshelved = shelf === UNSHELVED;
        return {
          key: shelf,
          label: isUnshelved ? 'Unshelved' : collectionName(shelf, collections),
          value: games.filter((g) =>
            isUnshelved ? permanentOf(g.collections) === null : g.collections?.includes(shelf),
          ).length,
          color: isUnshelved ? 'var(--color-gray-400)' : PERMANENT_COLOR[shelf],
        };
      }).filter((slice) => slice.value > 0),
    [games, collections],
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

  // A phone keeps its column of reorderable sections. A wide screen lays the
  // same figures out as fixed panels: one column below 1280, two from there.
  const phone = useIsPhone();
  const wide = useMediaQuery('(min-width: 80rem)');

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

  /* -- Panels, the same at every width ------------------------------------ */

  const inset = (label: string, value: string, caption: string, color?: string) => (
    <div className="panel-inset rounded-md px-3 py-2.5 md:px-3.5 md:py-3">
      <div className="eyebrow truncate text-gray-600">{label}</div>
      <div
        className="mt-1.75 text-400 font-bold leading-none tabular-nums text-gray-1000 md:mt-2.25 md:text-550"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="mt-1.25 truncate text-75 text-gray-700 md:mt-1.5">{caption}</div>
    </div>
  );

  /* The backlog gauge over the four totals. The arc measures how much of the
     library has left the queue; the number in the middle is what is still
     waiting, which is the figure you actually act on. Two by two on a phone,
     where four across left each figure 70px. */
  const overview = (
    <section className="panel flex flex-col gap-4 rounded-lg p-4 md:gap-4.5 md:p-4.5 xl:gap-5 xl:p-5">
      <Gauge
        layout="inline"
        hero
        large={wide}
        label="Backlog left"
        fraction={backlogCleared / 100}
        value={String(backlogCount)}
        verdict={backlogLabel(backlogCleared)}
        color={completionColor(backlogCleared)}
        caption={`${formatCount(totalGames - backlogCount)} of ${formatCount(totalGames)} games cleared.`}
        size={wide ? 120 : 104}
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-2.5">
        {inset('Tracked', formatCount(totalGames), `${activePlaying.length} in progress`)}
        {inset(
          'Completion',
          `${overallCompletionRate}%`,
          `${formatCount(totalAchievements)} of ${formatCount(totalMaxAchievements)}`,
          completionColor(overallCompletionRate),
        )}
        {inset('Playtime', `${formatHours(totalHours)}h`, `~${Math.round(totalHours / 24)} days`)}
        {inset(
          '100%',
          String(perfectGames.length),
          platformStats.map((stat) => `${stat.perfectCount} ${stat.config.shortName}`).join(' · '),
          'var(--color-trophy-900)',
        )}
      </div>
    </section>
  );

  /* Where the library sits, as one bar split by shelf and a legend under it.
     A bar rather than a ring: the ring left most of a wide panel empty, and on
     a phone it pushed its own legend off to one side. */
  const distribution = (
    <section className="panel flex flex-col gap-3.5 rounded-lg p-4 md:gap-4 md:p-4.5 xl:p-5">
      <SectionRule
        tone="panel"
        icon={<TrendingUp size={phone ? 16 : 17} className="text-positive-900" />}
        title="Distribution"
        count={`${formatCount(totalGames)} games`}
      />
      <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-[4px] md:h-4">
        {shelfSlices.map((slice) => (
          <span
            key={slice.key}
            className="h-full"
            title={`${slice.label}: ${slice.value}`}
            style={{
              width: `${(slice.value / totalGames) * 100}%`,
              backgroundColor: slice.color,
              boxShadow: `0 0 9px -3px ${slice.color}`,
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-y-2.5 md:grid-cols-2 md:gap-x-6 xl:grid-cols-1 xl:gap-y-3">
        {shelfSlices.map((slice) => (
          <div key={slice.key} className="flex items-center gap-2.5 md:gap-3">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color, boxShadow: `0 0 7px -1px ${slice.color}` }}
            />
            <span className="min-w-0 flex-1 truncate text-90 text-gray-800">{slice.label}</span>
            <span className="shrink-0 text-90 font-bold tabular-nums text-gray-1000">
              {slice.value}
            </span>
            <span className="w-9.5 shrink-0 text-right text-75 tabular-nums text-gray-600 md:w-10.5">
              {Math.round((slice.value / totalGames) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  /* Each platform: its mark in a well, its size, how many of its games are
     finished, and a meter for how far through its awards you are. Side by side
     on a tablet, where the panel spans the page; stacked on a phone and in the
     right-hand column from 1280. */
  const platforms = (
    <section className="panel flex flex-col gap-3.5 rounded-lg p-4 md:gap-4 md:p-4.5 xl:gap-4.5 xl:p-5">
      <SectionRule
        tone="panel"
        icon={<Gamepad2 size={phone ? 16 : 17} className="text-accent-900" />}
        title="Platforms"
      />
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-4 xl:grid-cols-1 xl:gap-4.5">
        {platformStats.map((stat) => (
          <div key={stat.platform} className="flex flex-col gap-2.25 md:gap-2.5">
            <div className="flex min-h-11 items-center gap-3 xl:gap-3.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-gray-200 md:h-9.5 md:w-9.5 md:rounded-md xl:h-10 xl:w-10"
                style={{ color: stat.config.color }}
              >
                <PlatformIcon platform={stat.platform} size={wide ? 20 : phone ? 18 : 19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-100 font-bold text-gray-1000 md:text-150">
                  {stat.config.name}
                </span>
                <span className="block truncate text-75 tabular-nums text-gray-700 md:mt-0.5">
                  {stat.count} {stat.count === 1 ? 'game' : 'games'} · {formatHours(stat.hours)}h ·{' '}
                  {stat.completionRate}% complete
                </span>
              </span>
              {/* Shown at zero as well, dimmed: one platform's row ending in a
                  figure and the other's ending in nothing reads as a bug rather
                  than as a score of none. */}
              <span
                className={cn(
                  'flex shrink-0 items-center gap-1.5 text-90 font-bold tabular-nums md:gap-1.75 md:text-150',
                  stat.perfectCount > 0 ? 'text-trophy-900' : 'text-gray-600',
                )}
                title={`${stat.perfectCount} ${trophyLabel(stat.platform)}`}
              >
                <TrophyBadge
                  platform={stat.platform}
                  size={wide ? 22 : 20}
                  muted={stat.perfectCount === 0}
                />
                {stat.perfectCount}
              </span>
            </div>
            <Meter
              value={stat.completionRate}
              color={stat.config.color}
              label={`${stat.config.name} completion`}
            />
          </div>
        ))}
      </div>
    </section>
  );

  /* The last six games touched, newest first: the art, the name, its figures,
     and on the right when and which shelf. */
  const recent = (
    <section className="panel flex flex-col gap-3.5 rounded-lg p-4 md:gap-4 md:p-4.5 xl:p-5">
      <SectionRule
        tone="panel"
        icon={<Calendar size={phone ? 16 : 17} className="text-gray-800" />}
        title="Recent"
      />
      <ol className="flex flex-col gap-2.5 md:gap-3">
        {recentGames.map((g) => {
          const shelf = permanentOf(g.collections);
          const when = g.lastPlayedAt || g.updatedAt || g.addedAt;
          return (
            <li key={g.id} className="flex min-h-11 items-center gap-3 md:gap-3.5">
              <CoverArt
                src={g.coverImage}
                title={g.title}
                className="h-8 w-14 shrink-0 rounded-sm object-cover md:h-10 md:w-18"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 md:gap-1.75">
                  <PlatformIcon
                    platform={g.platform}
                    size={phone ? 13 : 14}
                    className="shrink-0 text-gray-600"
                  />
                  <h3 className="truncate text-90 font-bold text-gray-1000">{g.title}</h3>
                </div>
                <p className="mt-0.75 truncate text-75 tabular-nums text-gray-700">
                  {formatHours(g.hoursPlayed)}h · {g.achievementsUnlocked}/{g.achievementsTotal} ·{' '}
                  {completionPercent(g)}%
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.75 md:gap-1">
                <time className="text-75 tabular-nums text-gray-600" dateTime={when}>
                  {relativeTime(when)}
                </time>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.25 text-75 font-bold md:gap-1.5',
                    shelf ? PERMANENT_OVERLAY_CLASS[shelf] : 'text-gray-600',
                  )}
                >
                  <span aria-hidden className="h-1.75 w-1.75 rounded-full bg-current" />
                  {shelf ? collectionName(shelf, collections) : 'Unshelved'}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );

  if (!phone) {
    /* -- Wide screen: fixed panels, two columns from 1280 ------------------ */
    return (
      <div className="mx-auto max-w-[1760px] space-y-6 md:space-y-7 md:pb-10">
        <PageHeader
          title="Statistics"
          subtitle={`Across ${formatCount(totalGames)} games, ${platformStats.length} ${
            platformStats.length === 1 ? 'platform' : 'platforms'
          } and ${formatHours(totalHours)} hours.`}
        />

        <IntroNotice id="stats">
          Progress, achievements and hours played across your library.
        </IntroNotice>

        {wide ? (
          <div className="grid grid-cols-2 items-start gap-4">
            <div className="flex flex-col gap-4">
              {overview}
              {distribution}
            </div>
            <div className="flex flex-col gap-4">
              {platforms}
              {recent}
            </div>
          </div>
        ) : (
          <>
            {overview}
            {platforms}
            {distribution}
            {recent}
          </>
        )}
      </div>
    );
  }

  /* -- Phone: one column, in the order you choose ------------------------- */

  const sections: Record<string, React.ReactNode> = {
    headline: overview,
    platforms,
    distribution,
    activity: recent,
  };

  return (
    <div className="mx-auto max-w-[1760px] space-y-6 md:space-y-7 md:pb-10">
      {/* The reorder toggle lives in the fixed header, in place of Add: it is
          the one control this page has, and a strip of it at the top scrolled
          away with the figures it rearranges. */}
      <PhoneHeaderAction>
        <button
          type="button"
          onClick={() => setIsReordering((open) => !open)}
          aria-pressed={isReordering}
          aria-label={isReordering ? 'Done reordering' : 'Reorder sections'}
          title={isReordering ? 'Done reordering' : 'Reorder sections'}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-md transition-colors',
            isReordering
              ? 'bg-accent-700/16 text-accent-900'
              : 'text-gray-800 hover:bg-white/5',
          )}
        >
          <ArrowUpDown size={19} />
        </button>
      </PhoneHeaderAction>

      <IntroNotice id="stats">
        Progress, achievements and hours played across your library.
      </IntroNotice>

      {isReordering && storedOrder?.length ? (
        <Button
          variant="secondary"
          buttonStyle="outline"
          size="l"
          className="w-full"
          onClick={() => updateSidebarConfig({ statsOrder: DEFAULT_STATS_ORDER })}
        >
          <RotateCcw size={15} />
          Reset order
        </Button>
      ) : null}

      {order.map((id, index) => {
        const content = sections[id];
        if (!content) return null;

        return (
          <section key={id} className="space-y-2">
            {isReordering && (
              <div className="flex items-center gap-1 rounded-md border border-dashed border-gray-400/60 bg-white/2 pl-3 pr-1">
                <span className="eyebrow min-w-0 flex-1 truncate text-gray-700">
                  {sectionName(id)}
                </span>
                <button
                  type="button"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${sectionName(id)} up`}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-gray-800 disabled:text-gray-500"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === order.length - 1}
                  aria-label={`Move ${sectionName(id)} down`}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-gray-800 disabled:text-gray-500"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            )}
            {content}
          </section>
        );
      })}
    </div>
  );
};
