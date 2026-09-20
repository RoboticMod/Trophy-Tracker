import React, { useMemo, useState } from 'react';
import { Hourglass, Plus, Play, Filter } from 'lucide-react';
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
import { IntroNotice } from '../components/IntroNotice';
import { Button, EmptyState, FilterChip, PageHeader } from '../components/ui';

export const BacklogView: React.FC = () => {
  const { games, collections, setIsQuickAddOpen, updateGame, profile } = useGame();
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const platformOrder = profile.platformOrder;

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

  const potentialAchievements = backlogGames.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);

  const startLabel = `Start ${collectionName(PLAYING_COLLECTION_ID, collections).toLowerCase()}`;

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <PageHeader
        icon={<Hourglass size={18} />}
        title={collectionName(BACKLOG_COLLECTION_ID, collections)}
        stats={[
          { key: 'queued', label: 'in queue', value: String(backlogGames.length) },
          {
            key: 'unlockable',
            label: 'still to unlock',
            value: String(potentialAchievements),
          },
        ]}
      />

      <IntroNotice id="backlog">
        Games queued and waiting to be played. Starting one from its card moves it to
        “{collectionName(PLAYING_COLLECTION_ID, collections)}”.
      </IntroNotice>

      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1 flex items-center gap-1 text-gray-600">
          <Filter size={13} />
          Platform
        </span>

        <FilterChip
          tone="neutral"
          selected={platformFilter === 'all'}
          onClick={() => setPlatformFilter('all')}
        >
          All ({backlogGames.length})
        </FilterChip>

        {PLATFORM_IDS.map((p) => {
          const count = backlogGames.filter((g) => g.platform === p).length;
          return (
            <FilterChip
              key={p}
              tone="neutral"
              selected={platformFilter === p}
              onClick={() => setPlatformFilter(p)}
              title={PLATFORMS[p].name}
            >
              <PlatformIcon platform={p} size={15} />
              <span>{PLATFORMS[p].shortName}</span>
              <span className="opacity-70">({count})</span>
            </FilterChip>
          );
        })}
      </div>

      <GameGrid
        games={filtered}
        grouped={platformFilter === 'all'}
        platformOrder={platformOrder}
        renderAction={(game) => (
          <Button
            variant="positive"
            size="s"
            className="w-full"
            onClick={() =>
              updateGame(game.id, {
                collections: fileInPermanent(game.collections, PLAYING_COLLECTION_ID),
              })
            }
          >
            <Play size={14} />
            {startLabel}
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
