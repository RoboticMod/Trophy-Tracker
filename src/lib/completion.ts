import { UserGame } from '../types';

/**
 * The one definition of "100%" in the app.
 *
 * This lived as an inline expression in seven places, and three of those also
 * accepted `status === 'mastered'` as proof on its own — so a game filed as
 * mastered with 19 of 20 unlocked was finished on the card, finished in the nav
 * badge, and unfinished on the achievements page all at once. Status is a shelf
 * you put a game on; the counts are what was actually earned, and only the
 * counts answer this question.
 */

/** Only the fields completion is derived from, so callers can pass a draft. */
export type AwardCounts = Pick<UserGame, 'achievementsUnlocked' | 'achievementsTotal'>;

/** Every achievement or trophy unlocked. A game with no list tracked is not. */
export const isPerfect = (game: AwardCounts): boolean =>
  game.achievementsTotal > 0 && game.achievementsUnlocked >= game.achievementsTotal;

/** 0-1, for arcs and comparators. */
export const completionRatio = (game: AwardCounts): number =>
  game.achievementsTotal > 0 ? game.achievementsUnlocked / game.achievementsTotal : 0;

/**
 * 0-100, rounded. Capped, because an unlocked count can sit above the total for
 * as long as it takes a sync to learn the list grew.
 */
export const completionPercent = (game: AwardCounts): number =>
  Math.min(100, Math.round(completionRatio(game) * 100));

export interface CompletionTotals {
  unlocked: number;
  unlockable: number;
  percent: number;
}

/**
 * The ratio a set of games rolls up to: everything unlocked over everything
 * there is to unlock. Not an average of per-game percentages — a 3/3 game would
 * otherwise weigh as heavily as a 40/120 one.
 */
export function aggregateCompletion(games: AwardCounts[]): CompletionTotals {
  const unlocked = games.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);
  const unlockable = games.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);
  return {
    unlocked,
    unlockable,
    percent: unlockable > 0 ? Math.min(100, Math.round((unlocked / unlockable) * 100)) : 0,
  };
}
