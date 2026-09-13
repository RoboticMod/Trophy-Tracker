import { Platform, UserGame } from '../types';
import { comparePlatformOrder } from './constants';

/**
 * Every way a list of games can be ordered. Views offer a subset — completion
 * means nothing on a page where everything is already at 100%, and unlock count
 * means little on one where most games sit at zero.
 */
export type GameSortOption =
  | 'platform'
  | 'recent'
  | 'rating-desc'
  | 'achievement-rating-desc'
  | 'hours-desc'
  | 'completion-desc'
  | 'unlocked-desc'
  | 'title-asc';

/** Option labels, so two views offering the same sort never word it differently. */
export const SORT_LABELS: Record<GameSortOption, string> = {
  platform: 'Platform',
  recent: 'Recently played',
  'rating-desc': 'Game rating: highest first',
  'achievement-rating-desc': 'Achievement rating: highest first',
  'hours-desc': 'Playtime: most hours',
  'completion-desc': 'Completion: highest',
  'unlocked-desc': 'Unlocks: most earned',
  'title-asc': 'Title: A to Z',
};

const completionOf = (g: UserGame) =>
  g.achievementsTotal > 0 ? g.achievementsUnlocked / g.achievementsTotal : 0;

const lastTouched = (g: UserGame) => new Date(g.lastPlayedAt || g.addedAt || 0).getTime();

/**
 * The comparator behind every sorted list in the app.
 *
 * Sorting runs over the whole list before it is split into platform sections,
 * so a chosen order carries through each section rather than applying to only
 * one of them.
 */
export function compareGames(
  a: UserGame,
  b: UserGame,
  sortBy: GameSortOption,
  platformOrder?: Platform[],
): number {
  switch (sortBy) {
    case 'platform': {
      const pDiff = comparePlatformOrder(a.platform, b.platform, platformOrder);
      return pDiff !== 0 ? pDiff : a.title.localeCompare(b.title);
    }
    case 'rating-desc':
      return (b.rating || 0) - (a.rating || 0);
    case 'achievement-rating-desc':
      return (b.achievementRating || 0) - (a.achievementRating || 0);
    case 'hours-desc':
      return (b.hoursPlayed || 0) - (a.hoursPlayed || 0);
    case 'completion-desc':
      return completionOf(b) - completionOf(a);
    case 'unlocked-desc':
      return (b.achievementsUnlocked || 0) - (a.achievementsUnlocked || 0);
    case 'title-asc':
      return a.title.localeCompare(b.title);
    case 'recent':
    default:
      return lastTouched(b) - lastTouched(a);
  }
}
