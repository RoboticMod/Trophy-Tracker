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
  COMPLETE_COLLECTION_ID,
  PERMANENT_COLOR,
  PERMANENT_COLLECTION_IDS,
  PERMANENT_TONE,
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
import { PlatformSectionHeader } from '../components/PlatformSectionHeader';
import { TrophyBadge, TrophyPair, trophyLabel, awardNoun } from '../components/TrophyBadge';
import { RatingValue } from '../components/Rating';
import {
  Badge,
  Button,
  Card,
  DonutChart,
  DonutLegend,
  EmptyState,
  Gauge,
  Meter,
  PageHeader,
  SectionHeader,
  StatTile,
} from '../components/ui';
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
  { id: 'platforms', name: 'Platform breakdown' },
  { id: 'showcase', name: '100% showcase' },
  // The id stays 'distribution' so saved statsOrder arrays keep working.
  { id: 'distribution', name: 'Shelf distribution' },
  { id: 'activity', name: 'Recent activity' },
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
  const completedGames = games.filter(
    (g) => isPerfect(g) || g.collections?.includes(COMPLETE_COLLECTION_ID),
  );
  const perfectGames = games.filter(isPerfect);
  const activePlaying = games.filter((g) => g.collections?.includes(PLAYING_COLLECTION_ID));

  const backlogCount = games.filter((g) => g.collections?.includes(BACKLOG_COLLECTION_ID)).length;
  // An empty library is 0% cleared rather than 100%: nothing has been worked
  // through, and a full arc would congratulate you for owning no games.
  const backlogCleared =
    totalGames > 0 ? Math.round(((totalGames - backlogCount) / totalGames) * 100) : 0;

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

  /** The showcase, split into platform sections in the user's own order. */
  const showcaseGroups = useMemo(
    () =>
      [...PLATFORM_IDS]
        .sort((a, b) => comparePlatformOrder(a, b, platformOrder))
        .map((platform) => ({
          platform,
          games: perfectGames.filter((g) => g.platform === platform),
        }))
        .filter((group) => group.games.length > 0),
    [perfectGames, platformOrder],
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

  /* -- Sections, keyed so the page can render them in any order ------------ */

  const sections: Record<string, React.ReactNode> = {
    /* Headline ------------------------------------------------------------
       The backlog gauge beside the plain totals. The arc measures how much
       of the library has left the queue; the number in the middle is what is
       still waiting, which is the figure you actually act on. */
    headline: (
      <div className="grid gap-3 lg:grid-cols-[minmax(15rem,1fr)_2.5fr]">
        <Card className="flex items-center justify-center py-6">
          <Gauge
            label="Backlog left"
            fraction={backlogCleared / 100}
            value={String(backlogCount)}
            verdict={backlogLabel(backlogCleared)}
            color={completionColor(backlogCleared)}
            caption={
              totalGames > 0
                ? `${formatCount(totalGames - backlogCount)} of ${formatCount(totalGames)} cleared`
                : 'Nothing queued yet'
            }
          />
        </Card>

        {/* The four figures stand on their own rather than inside a panel, so
            each is a panel itself — the same glass as the gauge card beside
            them, rather than a well cut into nothing. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            surface="panel"
            label="Tracked games"
            value={formatCount(totalGames)}
            caption={`${activePlaying.length} in progress right now`}
          />
          <StatTile
            surface="panel"
            label="Achievement completion"
            value={`${overallCompletionRate}%`}
            color={completionColor(overallCompletionRate)}
            caption={`${formatCount(totalAchievements)} of ${formatCount(totalMaxAchievements)} unlocked`}
          />
          <StatTile
            surface="panel"
            label="Playtime logged"
            value={`${formatHours(totalHours)}h`}
            caption={`~${(totalHours / 24).toFixed(1)} days · most: ${
              longestPlayed ? longestPlayed.title : 'nothing yet'
            }`}
          />
          <StatTile
            surface="panel"
            label="100% completed"
            value={String(perfectGames.length)}
            color="var(--color-trophy-900)"
            caption={`${completedGames.length} titles finished overall`}
          />
        </div>
      </div>
    ),

    platforms: (
      <Card className="space-y-4">
        <SectionHeader
          icon={<Gamepad2 size={16} />}
          title="Platform breakdown"
          description="Completion and hours on each platform"
        />

        <div className="space-y-3">
          {platformStats.map((stat) => (
            <div key={stat.platform} className="panel-inset space-y-2 rounded-md p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-75">
                <div className="flex items-center gap-2.5">
                  <div
                    style={{ color: stat.config.color }}
                    // Dimmer than the same mark elsewhere: here it sits in a
                    // filled well rather than on the page, and the well already
                    // separates it from the panel behind.
                    className="flex h-8 w-8 items-center justify-center rounded-sm bg-gray-200 drop-shadow-[0_0_2px_currentColor]"
                  >
                    <PlatformIcon platform={stat.platform} size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-gray-1000">{stat.config.name}</span>
                    <span className="ml-2 text-gray-600">
                      {stat.count} game{stat.count === 1 ? '' : 's'} • {formatHours(stat.hours)}h
                    </span>
                  </div>
                </div>

                {/* What a platform is scanned for here is how many of its games
                    are finished. The running achievement total that used to sit
                    beside it was the page's least actionable figure, and the
                    meter below already carries the completion share.

                    Shown at zero as well, dimmed: one platform's row ending in
                    a figure and the other's ending in nothing reads as a bug
                    rather than as a score of none. */}
                <div className="flex items-center gap-3 font-bold tabular-nums text-gray-700">
                  <span
                    className={cn(
                      'flex items-center gap-1.5',
                      stat.perfectCount > 0 ? 'text-trophy-900' : 'text-gray-600',
                    )}
                    title={`${stat.perfectCount} ${trophyLabel(stat.platform)}`}
                  >
                    <TrophyBadge
                      platform={stat.platform}
                      size={18}
                      muted={stat.perfectCount === 0}
                    />
                    <span className="text-50">{stat.perfectCount}</span>
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
    ),

    // Null rather than an empty panel: a showcase of nothing is not worth the
    // heading, and the reorder list skips whatever has no content.
    showcase:
      perfectGames.length === 0 ? null : (
        <Card className="space-y-4">
          <SectionHeader
            icon={<TrophyPair size={15} />}
            iconClassName="bg-trophy-700/16"
            title="100% showcase"
            description="Every game finished to the last unlock"
            action={
              <Badge tone="trophy">
                {perfectGames.length} title{perfectGames.length === 1 ? '' : 's'}
              </Badge>
            }
          />

          {/* Split by platform under the same rule the 100% tab and the library
              grid use, so a Steam perfect game and a PlayStation platinum are
              never read as one undivided run of tiles. */}
          <div className="space-y-5">
            {showcaseGroups.map(({ platform, games: list }) => (
              <section key={platform} className="space-y-3">
                <PlatformSectionHeader platform={platform} count={list.length} />

                <div className="grid-metrics">
                  {list.map((game) => (
                    <div key={game.id} className="panel-inset flex items-center gap-3 rounded-md p-3">
                      <CoverArt
                        src={game.coverImage}
                        title={game.title}
                        className="h-12 w-12 shrink-0 rounded-sm object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-75 font-bold text-gray-1000">{game.title}</h3>
                        {/* The platform's own word, as everywhere else: Steam
                            games have achievements, PlayStation games have
                            trophies. The platform itself is stated by the
                            heading above, so the row no longer repeats it. */}
                        <div className="eyebrow mt-1 text-gray-600">
                          {formatCount(game.achievementsUnlocked)} {awardNoun(game.platform)}
                        </div>
                      </div>
                      <TrophyBadge platform={game.platform} size={26} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Card>
      ),

    distribution: (
      <Card className="space-y-4">
        <SectionHeader
          icon={<TrendingUp size={16} />}
          iconClassName="bg-positive-700/16 text-positive-900"
          title="Shelf distribution"
          description="Where your library currently sits"
        />

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          <DonutChart slices={shelfSlices} total={totalGames} totalLabel="Games" size={150} />
          <DonutLegend slices={shelfSlices} />
        </div>
      </Card>
    ),

    /* A timeline rather than a list: the date leads each row, so the column
       reads as a history you scan down instead of as six unordered cards that
       happen to be sorted. */
    activity: (
      <Card className="space-y-4">
          <SectionHeader
            icon={<Calendar size={16} />}
            title="Recent activity"
            description="Your last six updates, newest first"
          />

          <ol className="space-y-1.5">
            {recentGames.map((g) => {
              const progress = completionPercent(g);
              const shelf = permanentOf(g.collections);

              return (
                <li
                  key={g.id}
                  className="panel-inset flex items-center gap-3 rounded-md px-3 py-2.5"
                >
                  <time
                    className="eyebrow w-14 shrink-0 text-right text-gray-600"
                    dateTime={g.lastPlayedAt || g.updatedAt || g.addedAt}
                  >
                    {relativeTime(g.lastPlayedAt || g.updatedAt || g.addedAt)}
                  </time>

                  <CoverArt
                    src={g.coverImage}
                    title={g.title}
                    className="h-9 w-9 shrink-0 rounded-sm object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <PlatformIcon platform={g.platform} size={12} className="text-gray-600" />
                      <h3 className="truncate text-75 font-bold text-gray-1000">{g.title}</h3>
                    </div>
                    <p className="mt-0.5 truncate text-50 tabular-nums text-gray-600">
                      {formatHours(g.hoursPlayed)}h • {g.achievementsUnlocked}/{g.achievementsTotal}{' '}
                      {awardNoun(g.platform).toLowerCase()} ({progress}%)
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {g.rating ? (
                      <RatingValue value={g.rating} size="xs" label="Game rated" />
                    ) : null}
                    {shelf && (
                      <Badge tone={PERMANENT_TONE[shelf]}>{collectionName(shelf, collections)}</Badge>
                    )}
                  </div>
                </li>
              );
            })}
        </ol>
      </Card>
    ),
  };

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <PageHeader
        icon={<BarChart3 size={18} />}
        iconClassName="bg-accent-700/16 text-accent-900"
        title="Statistics"
        action={
          <div className="flex items-center gap-2">
            {isReordering && storedOrder?.length ? (
              <Button
                variant="secondary"
                buttonStyle="subtle"
                size="s"
                onClick={() => updateSidebarConfig({ statsOrder: DEFAULT_STATS_ORDER })}
              >
                <RotateCcw size={13} />
                Reset order
              </Button>
            ) : null}

            <Button
              variant={isReordering ? 'accent' : 'secondary'}
              buttonStyle={isReordering ? 'fill' : 'outline'}
              size="s"
              onClick={() => setIsReordering((open) => !open)}
              aria-pressed={isReordering}
            >
              <ArrowUpDown size={13} />
              {isReordering ? 'Done' : 'Reorder sections'}
            </Button>
          </div>
        }
      />

      <IntroNotice id="stats">
        Progress, achievements and hours played across your library.
      </IntroNotice>

      {order.map((id, index) => {
        const content = sections[id];
        if (!content) return null;

        return (
          <section key={id} className="space-y-2">
            {isReordering && (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-400/60 bg-white/2 px-3 py-1.5">
                <span className="eyebrow min-w-0 flex-1 truncate text-gray-700">
                  {sectionName(id)}
                </span>
                <Button
                  variant="secondary"
                  buttonStyle="outline"
                  size="s"
                  iconOnly
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${sectionName(id)} up`}
                >
                  <ChevronUp size={14} />
                </Button>
                <Button
                  variant="secondary"
                  buttonStyle="outline"
                  size="s"
                  iconOnly
                  onClick={() => moveSection(index, 1)}
                  disabled={index === order.length - 1}
                  aria-label={`Move ${sectionName(id)} down`}
                >
                  <ChevronDown size={14} />
                </Button>
              </div>
            )}
            {content}
          </section>
        );
      })}
    </div>
  );
};
