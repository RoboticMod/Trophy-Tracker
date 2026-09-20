import React, { useMemo } from 'react';
import { Play } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import { comparePlatformOrder } from '../lib/constants';
import { PLAYING_COLLECTION_ID, collectionName } from '../lib/collections';
import { IntroNotice } from '../components/IntroNotice';
import { Badge, EmptyState, PageHeader } from '../components/ui';

export const CurrentlyPlayingView: React.FC = () => {
  const { games, collections, profile } = useGame();
  const platformOrder = profile.platformOrder;

  const playingGames = useMemo(
    () =>
      games
        .filter((g) => g.collections?.includes(PLAYING_COLLECTION_ID))
        .sort((a, b) => {
          const pDiff = comparePlatformOrder(a.platform, b.platform, platformOrder);
          return pDiff !== 0 ? pDiff : a.title.localeCompare(b.title);
        }),
    [games, platformOrder],
  );

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      {/* One figure: how many games are on the go. The hours and the unlock
          tally that used to sit beside it are on every card below, and a
          running total of either is not what this page is opened for. */}
      <PageHeader
        icon={<Play size={18} />}
        iconClassName="bg-accent-700/16 text-accent-900"
        title={collectionName(PLAYING_COLLECTION_ID, collections)}
        badge={<Badge tone="accent">{playingGames.length} active</Badge>}
        stats={[{ key: 'titles', label: 'active titles', value: String(playingGames.length) }]}
      />

      <IntroNotice id="playing">
        Games in progress right now. Log hours and achievement unlocks as you go.
      </IntroNotice>

      <GameGrid games={playingGames} platformOrder={platformOrder} />

      {playingGames.length === 0 && (
        <EmptyState
          icon={<Play size={24} />}
          title="Nothing in progress"
          description={`Pick something from your library or backlog and put it on the "${collectionName(
            PLAYING_COLLECTION_ID,
            collections,
          )}" shelf.`}
        />
      )}
    </div>
  );
};
