import { UserGame } from '../types';
import { completionRatio } from './completion';

/**
 * Every way a list of games can be ordered. Views offer a subset — completion
 * means nothing on a page where everything is already at 100%, and unlock count
 * means little on one where most games sit at zero.
 *
 * Platform is not one of them. Every grid already splits into a Steam section
 * and a PlayStation one, so choosing it sorted a page into the order it was
 * going to be shown in anyway.
 */
export type GameSortOption =
  | 'recent'
  | 'achievement-rating-desc'
  | 'hours-desc'
  | 'completion-desc'
  | 'unlocked-desc'
  | 'completed-desc'
  | 'completed-asc'
  | 'title-asc';

/** Option labels, so two views offering the same sort never word it differently. */
export const SORT_LABELS: Record<GameSortOption, string> = {
  recent: 'Recently played',
  'achievement-rating-desc': 'Achievement rating: highest first',
  'hours-desc': 'Playtime: most hours',
  'completion-desc': 'Completion: highest',
  'unlocked-desc': 'Unlocks: most earned',
  'completed-desc': 'Completed: newest first',
  'completed-asc': 'Completed: oldest first',
  'title-asc': 'Title: A to Z',
};

const lastTouched = (g: UserGame) => new Date(g.lastPlayedAt || g.addedAt || 0).getTime();

/**
 * The completion date as a number, or null where a game has none.
 *
 * A missing date is not an old one: sorting it as zero would bury every
 * undated game at the bottom of "newest first" and float it to the top of
 * "oldest first", which reads as a claim that it was finished in 1970. Both
 * directions send it to the end instead.
 */
const completedOn = (g: UserGame): number | null => {
  if (!g.completedAt) return null;
  const time = new Date(g.completedAt).getTime();
  return Number.isFinite(time) ? time : null;
};

/** Orders by completion date, keeping undated games last either way. */
function byCompletionDate(a: UserGame, b: UserGame, newestFirst: boolean): number {
  const aAt = completedOn(a);
  const bAt = completedOn(b);
  if (aAt === null && bAt === null) return a.title.localeCompare(b.title);
  if (aAt === null) return 1;
  if (bAt === null) return -1;
  return newestFirst ? bAt - aAt : aAt - bAt;
}

/**
 * The comparator behind every sorted list in the app.
 *
 * Sorting runs over the whole list before it is split into platform sections,
 * so a chosen order carries through each section rather than applying to only
 * one of them.
 */
export function compareGames(a: UserGame, b: UserGame, sortBy: GameSortOption): number {
  switch (sortBy) {
    case 'achievement-rating-desc':
      return (b.achievementRating || 0) - (a.achievementRating || 0);
    case 'hours-desc':
      return (b.hoursPlayed || 0) - (a.hoursPlayed || 0);
    case 'completion-desc':
      return completionRatio(b) - completionRatio(a);
    case 'unlocked-desc':
      return (b.achievementsUnlocked || 0) - (a.achievementsUnlocked || 0);
    case 'completed-desc':
      return byCompletionDate(a, b, true);
    case 'completed-asc':
      return byCompletionDate(a, b, false);
    case 'title-asc':
      return a.title.localeCompare(b.title);
    case 'recent':
    default:
      return lastTouched(b) - lastTouched(a);
  }
}
