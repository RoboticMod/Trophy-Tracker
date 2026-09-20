import React, { useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { Platform, PLATFORM_IDS, UserGame } from '../types';
import { comparePlatformOrder } from '../lib/constants';
import { PlatformSectionHeader } from './PlatformSectionHeader';
import { GameCard } from './GameCard';
import { GamePosterCard } from './GamePosterCard';
import { useIsPhone } from '../lib/useMediaQuery';

interface GameGridProps {
  games: UserGame[];
  /**
   * False while a single platform is already filtered to, where splitting the
   * list would only produce one section under a heading that repeats the filter.
   */
  grouped?: boolean;
  platformOrder?: Platform[];
  /** Per-card action, e.g. the backlog's start button. */
  renderAction?: (game: UserGame) => React.ReactNode;
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
}) => {
  /**
   * Two different cards rather than one restyled.
   *
   * A phone shows box art and a tap target; a desktop shows a wide card with
   * the title, playtime and both ratings on it. They share almost no markup,
   * and rendering both with one hidden by CSS would put two elements carrying
   * the same data-game-id in the document — which is exactly what the follow
   * lookup searches for when it decides whether a game is already on screen.
   */
  const phone = useIsPhone();
  const Card = phone ? GamePosterCard : GameCard;
  const gridClass = phone ? 'grid-posters' : 'grid-cards';
  const groups = useMemo(() => {
    if (!grouped) return null;
    return [...PLATFORM_IDS]
      .sort((a, b) => comparePlatformOrder(a, b, platformOrder))
      .map((platform) => ({ platform, games: games.filter((g) => g.platform === platform) }))
      .filter((group) => group.games.length > 0);
  }, [games, grouped, platformOrder]);

  if (!groups) {
    return (
      <div className={gridClass}>
        <AnimatePresence>
          {games.map((game) => (
            <Card key={game.id} game={game} action={renderAction?.(game)} />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {groups.map(({ platform, games: list }) => (
        <section key={platform} className="space-y-3">
          <PlatformSectionHeader platform={platform} count={list.length} />
          <div className={gridClass}>
            <AnimatePresence>
              {list.map((game) => (
                <Card key={game.id} game={game} action={renderAction?.(game)} hidePlatform />
              ))}
            </AnimatePresence>
          </div>
        </section>
      ))}
    </div>
  );
};
