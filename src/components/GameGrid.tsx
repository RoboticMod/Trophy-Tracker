import React, { useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { Platform, PLATFORM_IDS, UserGame } from '../types';
import { comparePlatformOrder } from '../lib/constants';
import { PlatformSectionHeader } from './PlatformSectionHeader';
import { GameCard } from './GameCard';

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
  const groups = useMemo(() => {
    if (!grouped) return null;
    return [...PLATFORM_IDS]
      .sort((a, b) => comparePlatformOrder(a, b, platformOrder))
      .map((platform) => ({ platform, games: games.filter((g) => g.platform === platform) }))
      .filter((group) => group.games.length > 0);
  }, [games, grouped, platformOrder]);

  if (!groups) {
    return (
      <div className="grid-cards">
        <AnimatePresence>
          {games.map((game) => (
            <GameCard key={game.id} game={game} action={renderAction?.(game)} />
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
          <div className="grid-cards">
            <AnimatePresence>
              {list.map((game) => (
                <GameCard key={game.id} game={game} action={renderAction?.(game)} hidePlatform />
              ))}
            </AnimatePresence>
          </div>
        </section>
      ))}
    </div>
  );
};
