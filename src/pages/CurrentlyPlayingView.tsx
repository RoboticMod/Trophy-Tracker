import React, { useMemo } from 'react';
import { Play } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import { comparePlatformOrder } from '../lib/constants';
import { PLAYING_COLLECTION_ID, collectionName } from '../lib/collections';
import { formatHours, sumHours } from '../lib/format';
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

  const totalHours = sumHours(playingGames);
  const unlocked = playingGames.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);
  const possible = playingGames.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <PageHeader
        icon={<Play size={18} />}
        iconClassName="bg-accent-700/16 text-accent-900"
        title={collectionName(PLAYING_COLLECTION_ID, collections)}
        badge={<Badge tone="accent">{playingGames.length} active</Badge>}
        stats={[
          { key: 'titles', label: 'active titles', value: String(playingGames.length) },
          { key: 'hours', label: 'logged', value: `${formatHours(totalHours)}h` },
          {
            key: 'unlocks',
            label: `unlocked (${possible > 0 ? Math.round((unlocked / possible) * 100) : 0}%)`,
            value: `${unlocked} / ${possible}`,
          },
        ]}
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
