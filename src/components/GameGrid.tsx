import React, { useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { Platform, PLATFORM_IDS, UserGame } from '../types';
import { comparePlatformOrder } from '../lib/constants';
import { PlatformSectionHeader } from './PlatformSectionHeader';
import { CardMeta, GameCard } from './GameCard';
import { useGame } from '../context/GameContext';

type RenderAction = (game: UserGame) => React.ReactNode;

interface GameListProps {
  games: UserGame[];
  renderAction?: RenderAction;
  hidePlatform?: boolean;
  meta?: CardMeta;
}

/**
 * One section's games, as a grid of cards — however few there are. A section
 * of one or two used to become full-width rows on a wide screen; a card that
 * looks like every other card turned out to matter more than a filled row.
 */
export const GameList: React.FC<GameListProps> = ({ games, renderAction, hidePlatform, meta }) => {
  // Read here, once, and handed to each card as the few values that concern
  // it — so a card only re-renders when its own game or its own slice of this
  // changes. See GameCard's props.
  const { collections, profile, added, follow, celebration, celebrationPlayed } = useGame();

  return (
    <div className="grid-cards">
      <AnimatePresence>
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            meta={meta}
            hidePlatform={hidePlatform}
            action={renderAction?.(game)}
            collections={collections}
            highlightStyle={profile.highlightStyle}
            announcing={added?.gameId === game.id}
            followToken={follow?.gameId === game.id ? follow.token : null}
            celebrationToken={celebration?.gameId === game.id ? celebration.token : null}
            celebrationPlayed={celebrationPlayed}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface GameGridProps {
  games: UserGame[];
  /**
   * False while a single platform is already filtered to, where splitting the
   * list would only produce one section under a heading that repeats the filter.
   */
  grouped?: boolean;
  platformOrder?: Platform[];
  /** Per-card action, e.g. the backlog's start button. */
  renderAction?: RenderAction;
  /** What a wide card's bottom line ends with. */
  meta?: CardMeta;
}

/**
 * The library grid, optionally split into per-platform sections.
 *
 * When grouped, the section heading states the platform, so the cards inside
 * drop their own platform chip rather than repeating it on every tile.
 */
export const GameGrid: React.FC<GameGridProps> = ({
  games,
  grouped = true,
  platformOrder,
  renderAction,
  meta,
}) => {
  const groups = useMemo(() => {
    if (!grouped) return null;
    return [...PLATFORM_IDS]
      .sort((a, b) => comparePlatformOrder(a, b, platformOrder))
      .map((platform) => ({ platform, games: games.filter((g) => g.platform === platform) }))
      .filter((group) => group.games.length > 0);
  }, [games, grouped, platformOrder]);

  if (!groups) {
    return <GameList games={games} renderAction={renderAction} meta={meta} />;
  }

  return (
    <div className="space-y-6 md:space-y-7">
      {groups.map(({ platform, games: list }) => (
        <section key={platform} className="space-y-3 md:space-y-4">
          <PlatformSectionHeader platform={platform} count={list.length} />
          <GameList games={list} renderAction={renderAction} meta={meta} hidePlatform />
        </section>
      ))}
    </div>
  );
};
