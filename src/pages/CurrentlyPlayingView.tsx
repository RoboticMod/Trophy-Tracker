import React, { useMemo } from 'react';
import { ArrowUpDown, Play } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import { comparePlatformOrder } from '../lib/constants';
import { PLAYING_COLLECTION_ID, collectionName } from '../lib/collections';
import { aggregateCompletion } from '../lib/completion';
import { formatCount, formatHours, sumHours } from '../lib/format';
import { GameSortOption, SORT_LABELS, compareGames } from '../lib/sortGames';
import { oneOf } from '../lib/usePersistentState';
import { useSyncedPreference } from '../lib/useSyncedPreference';
import { useIsPhone } from '../lib/useMediaQuery';
import { IntroNotice } from '../components/IntroNotice';
import { Badge, EmptyState, PageHeader, Select } from '../components/ui';

const SORT_OPTIONS = [
  'recent',
  'title-asc',
  'hours-desc',
  'completion-desc',
] as const satisfies readonly GameSortOption[];

export const CurrentlyPlayingView: React.FC = () => {
  const { games, collections, profile } = useGame();
  const platformOrder = profile.platformOrder;
  const phone = useIsPhone();

  // A wide screen has the room for a sort beside the title, and last played
  // first is what a shelf of games in progress is read for. A phone keeps the
  // order it has always had.
  const [sortBy, setSortBy] = useSyncedPreference<GameSortOption>(
    'playing-sort',
    'recent',
    oneOf(SORT_OPTIONS),
  );

  const playingGames = useMemo(
    () =>
      games
        .filter((g) => g.collections?.includes(PLAYING_COLLECTION_ID))
        .sort((a, b) => {
          if (!phone) return compareGames(a, b, sortBy);
          const pDiff = comparePlatformOrder(a.platform, b.platform, platformOrder);
          return pDiff !== 0 ? pDiff : a.title.localeCompare(b.title);
        }),
    [games, platformOrder, phone, sortBy],
  );

  const totals = aggregateCompletion(playingGames);

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      {/* One figure on a phone, in the pill beside the name: how many games
          are on the go. A wide screen says it as a line under the title, with
          the hours and the unlock tally beside it — there is the room there
          for all three without a strip of their own. */}
      <PageHeader
        title={collectionName(PLAYING_COLLECTION_ID, collections)}
        badge={<Badge tone="accent">{playingGames.length} active</Badge>}
        subtitle={`${formatCount(playingGames.length)} games in progress · ${formatHours(sumHours(playingGames))}h · ${formatCount(totals.unlocked)} of ${formatCount(totals.unlockable)} awards`}
        action={
          phone ? undefined : (
            <Select
              id="playing-sort"
              aria-label="Sort"
              value={sortBy}
              onChange={setSortBy}
              leading={<ArrowUpDown size={15} className="text-accent-900" />}
              className="w-50"
              options={SORT_OPTIONS.map((option) => ({
                value: option,
                label: SORT_LABELS[option],
              }))}
            />
          )
        }
      />

      <IntroNotice id="playing">
        Games in progress right now. Log hours and achievement unlocks as you go.
      </IntroNotice>

      {/* Every card here is on the same shelf, so naming it on each would say
          nothing — a wide card ends in when it was last played instead. */}
      <GameGrid games={playingGames} platformOrder={platformOrder} meta="lastPlayed" />

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
