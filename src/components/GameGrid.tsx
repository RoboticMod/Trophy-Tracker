import React, { useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { Platform, PLATFORM_IDS, UserGame } from '../types';
import { comparePlatformOrder } from '../lib/constants';
import { useIsPhone } from '../lib/useMediaQuery';
import { PlatformSectionHeader } from './PlatformSectionHeader';
import { CardLayout, CardMeta, GameCard } from './GameCard';

/**
 * Fewer games than this in a section and a wide screen lays them out as rows.
 * One or two cards stranded at the left of a five-column track is the alignment
 * fault rows exist to fix; three already reads as the start of a grid.
 */
const SPARSE_BELOW = 3;

type RenderAction = (game: UserGame, layout: CardLayout) => React.ReactNode;

interface GameListProps {
  games: UserGame[];
  renderAction?: RenderAction;
  hidePlatform?: boolean;
  meta?: CardMeta;
}

/**
 * One section's games: a grid of cards, or — on a wide screen, when there are
 * too few to fill a row — full-width rows. A phone is always the grid.
 */
export const GameList: React.FC<GameListProps> = ({ games, renderAction, hidePlatform, meta }) => {
  const phone = useIsPhone();
  const layout: CardLayout = !phone && games.length < SPARSE_BELOW ? 'row' : 'card';

  return (
    <div className={layout === 'row' ? 'flex flex-col gap-3' : 'grid-cards'}>
      <AnimatePresence>
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            layout={layout}
            meta={meta}
            hidePlatform={hidePlatform}
            action={renderAction?.(game, layout)}
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
    <div className="space-y-7">
      {groups.map(({ platform, games: list }) => (
        <section key={platform} className="space-y-3 md:space-y-4">
          <PlatformSectionHeader platform={platform} count={list.length} />
          <GameList games={list} renderAction={renderAction} meta={meta} hidePlatform />
        </section>
      ))}
    </div>
  );
};
