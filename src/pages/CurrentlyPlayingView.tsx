import React, { useMemo } from 'react';
import { Play } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import { PLAYING_COLLECTION_ID, collectionName } from '../lib/collections';
import { aggregateCompletion } from '../lib/completion';
import { formatCount, formatHours, sumHours } from '../lib/format';
import { GameSortOption, compareGames } from '../lib/sortGames';
import { oneOf } from '../lib/usePersistentState';
import { useSyncedPreference } from '../lib/useSyncedPreference';
import { useIsPhone } from '../lib/useMediaQuery';
import { SortControl } from '../components/SortControl';
import { Badge, EmptyState, PageHeader } from '../components/ui';

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

  // Last played first is what a shelf of games in progress is read for. A
  // phone used to be held to title order with no way to change it; it sorts
  // like every other width now, from the header.
  const [sortBy, setSortBy] = useSyncedPreference<GameSortOption>(
    'playing-sort',
    'recent',
    oneOf(SORT_OPTIONS),
  );

  // Platform order is the grid's to apply: it splits the shelf into its
  // platforms and keeps this order inside each.
  const playingGames = useMemo(
    () =>
      games
        .filter((g) => g.collections?.includes(PLAYING_COLLECTION_ID))
        .sort((a, b) => compareGames(a, b, sortBy) || a.title.localeCompare(b.title)),
    [games, sortBy],
  );

  const totals = aggregateCompletion(playingGames);

  const sort = (
    <SortControl id="playing-sort" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
  );

  return (
    <div className="mx-auto max-w-[1760px] space-y-6 md:space-y-7 md:pb-10">
      {/* One figure on a phone, in the pill beside the name: how many games
          are on the go. A wide screen says it as a line under the title, with
          the hours and the unlock tally beside it — there is the room there
          for all three without a strip of their own. */}
      <PageHeader
        title={collectionName(PLAYING_COLLECTION_ID, collections)}
        badge={<Badge tone="accent">{playingGames.length} active</Badge>}
        subtitle={`${formatCount(playingGames.length)} games in progress · ${formatHours(sumHours(playingGames))}h · ${formatCount(totals.unlocked)} of ${formatCount(totals.unlockable)} awards`}
        action={phone ? undefined : sort}
      />

      {phone ? sort : null}

      {/* Every card here is on the same shelf, so naming it on each would say
          nothing — a wide card ends in when it was last played instead. */}
      <GameGrid games={playingGames} platformOrder={platformOrder} meta="lastPlayed" />

      {playingGames.length === 0 && <EmptyState icon={<Play size={24} />} title="Nothing in progress" />}
    </div>
  );
};
