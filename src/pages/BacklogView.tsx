import React, { useMemo, useState } from 'react';
import { Hourglass, Plus, Play } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import { PlatformIcon } from '../components/PlatformIcon';
import { Platform, PLATFORM_IDS } from '../types';
import { PLATFORMS, comparePlatformOrder } from '../lib/constants';
import {
  BACKLOG_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  collectionName,
  fileInPermanent,
} from '../lib/collections';
import { aggregateCompletion } from '../lib/completion';
import { formatCount } from '../lib/format';
import { useIsPhone } from '../lib/useMediaQuery';
import { cn } from '../lib/cn';
import { IntroNotice } from '../components/IntroNotice';
import { Badge, Button, EmptyState, PageHeader } from '../components/ui';

export const BacklogView: React.FC = () => {
  const { games, collections, setIsQuickAddOpen, updateGame, profile } = useGame();
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const platformOrder = profile.platformOrder;
  const phone = useIsPhone();

  const backlogGames = useMemo(
    () => games.filter((g) => g.collections?.includes(BACKLOG_COLLECTION_ID)),
    [games],
  );

  const sorted = useMemo(
    () =>
      [...backlogGames].sort((a, b) => {
        const pDiff = comparePlatformOrder(a.platform, b.platform, platformOrder);
        return pDiff !== 0 ? pDiff : a.title.localeCompare(b.title);
      }),
    [backlogGames, platformOrder],
  );

  const filtered = sorted.filter((g) => platformFilter === 'all' || g.platform === platformFilter);

  const startLabel = `Start ${collectionName(PLAYING_COLLECTION_ID, collections).toLowerCase()}`;

  const { unlocked, unlockable } = aggregateCompletion(backlogGames);

  const filters: { value: Platform | 'all'; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: backlogGames.length },
    ...PLATFORM_IDS.map((p) => ({
      value: p,
      label: PLATFORMS[p].shortName,
      count: backlogGames.filter((g) => g.platform === p).length,
    })),
  ];

  /**
   * The platform filter as one segmented control: three choices of which
   * exactly one is always true is a segment, not a row of toggles. Beside the
   * title on a wide screen; across the full width on a phone, where each
   * segment is a third of the row and a platform is its mark and its count.
   */
  const segmented = (
    <div
      role="radiogroup"
      aria-label="Platform"
      className="panel-inset flex h-11 shrink-0 items-center gap-0.5 rounded-md p-0.75 md:h-10"
    >
      {filters.map((option) => {
        const selected = platformFilter === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPlatformFilter(option.value)}
            title={option.value === 'all' ? undefined : PLATFORMS[option.value].name}
            className={cn(
              'flex h-9.5 flex-1 items-center justify-center gap-1.75 rounded-control border text-90 font-bold transition-colors md:h-8.5 md:flex-none md:px-4',
              selected
                ? 'border-gray-500 bg-gray-300 text-gray-1000'
                : 'border-transparent text-gray-700 hover:text-gray-1000',
            )}
          >
            {option.value === 'all' ? null : <PlatformIcon platform={option.value} size={15} />}
            {option.value === 'all' || !phone ? option.label : null}{' '}
            <span className="tabular-nums">{option.count}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1760px] space-y-6 md:space-y-7 md:pb-10">
      {/* How many are queued. A phone says only that, beside the page's name
          in its fixed header: the awards waiting inside them measure the size
          of the job rather than the queue. A wide screen has a caption line to
          put both in, and there the job is worth knowing — it is what you are
          choosing between.

          Neutral, not gold: gold is what a finished game earns, and a queue of
          games you have not started has earned nothing. */}
      <PageHeader
        title={collectionName(BACKLOG_COLLECTION_ID, collections)}
        badge={<Badge tone="neutral">{backlogGames.length} queued</Badge>}
        subtitle={`${formatCount(backlogGames.length)} games queued · ${formatCount(unlockable - unlocked)} awards waiting`}
        action={phone ? undefined : segmented}
      />

      <IntroNotice id="backlog">
        Games queued and waiting to be played. Starting one from its card moves it to
        “{collectionName(PLAYING_COLLECTION_ID, collections)}”.
      </IntroNotice>

      {phone ? segmented : null}

      <GameGrid
        games={filtered}
        grouped={platformFilter === 'all'}
        platformOrder={platformOrder}
        renderAction={(game) => (
          // Spans the card. On a phone it is a target of its own at a field's
          // height, inside the card's strip, saying only "Start" in the width
          // it has.
          <Button
            variant="positive"
            size={phone ? 'l' : 's'}
            className="w-full"
            onClick={() =>
              updateGame(game.id, {
                collections: fileInPermanent(game.collections, PLAYING_COLLECTION_ID),
              })
            }
          >
            <Play size={phone ? 16 : 14} />
            {phone ? 'Start' : startLabel}
          </Button>
        )}
      />

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
