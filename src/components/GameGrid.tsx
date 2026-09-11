import React, { useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { Platform, PLATFORM_IDS, UserGame } from '../types';
import { PLATFORMS, comparePlatformOrder } from '../lib/constants';
import { PlatformIcon } from './PlatformIcon';
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
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <span style={{ color: PLATFORMS[platform].color }} className="flex items-center">
              <PlatformIcon platform={platform} size={17} />
            </span>
            <h3 className="text-200 font-bold text-gray-1000">{PLATFORMS[platform].name}</h3>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-50 font-medium text-gray-700">
              {list.length}
            </span>
          </div>
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
