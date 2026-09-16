import { Collection, Platform, SyncSource, UserGame } from '../types';
import { isPerfect } from './completion';

/**
 * Which service a platform's figures come from.
 *
 * The two vocabularies do not line up: the console is a PS5, the service is
 * PSN. Mapping in one place keeps every call site from having to remember that.
 */
export const syncSourceFor = (platform: Platform): SyncSource =>
  platform === 'ps5' ? 'psn' : 'steam';

/**
 * Reconciling what a platform reports against what is tracked here.
 *
 * Kept apart from the fetching and from React so the rules are one readable
 * thing: what a sync is allowed to change, what it must never touch, and what
 * happens when a finished game grows a new list of achievements.
 */

/** The name of the collection a game lands in when its award list grows. */
export const NEW_ACHIEVEMENTS_COLLECTION = 'New Achievements';

export const NEW_ACHIEVEMENTS_DESCRIPTION =
  'Finished games that have gained achievements since you completed them';

/** Trophy gold, matching the 100% treatment these games have just left. */
export const NEW_ACHIEVEMENTS_COLOR = '#f2c14e';

/** What a platform says about one game, in this app's own units. */
export interface PlatformProgress {
  unlocked: number;
  total: number;
  /** Hours, to a tenth. Absent where the platform does not report playtime. */
  hoursPlayed?: number;
  lastPlayedAt?: string | null;
  /** When the most recent award was earned, which dates a completion. */
  lastUnlockedAt?: string | null;
}

export interface Reconciliation {
  /** The patch to apply, or an empty object when nothing has moved. */
  updates: Partial<UserGame>;
  changed: boolean;
  /**
   * The list this game was finished with has grown. The game is no longer at
   * 100% through no fault of yours — a DLC arrived, or the developer added
   * achievements to the base game.
   */
  grewList: boolean;
}

/**
 * Works out what to write for one game.
 *
 * Fields a sync owns: the award counts, playtime, last played, and the date a
 * completion happened. Fields it must never touch: status (except to withdraw
 * a completion it can see is no longer true), rating, achievement rating,
 * notes and collections. Those are judgements, and no API has an opinion worth
 * overwriting them with.
 */
export function reconcile(game: UserGame, incoming: PlatformProgress): Reconciliation {
  const updates: Partial<UserGame> = {};
  const wasPerfect = isPerfect(game);

  const merged = {
    achievementsUnlocked: incoming.unlocked,
    achievementsTotal: incoming.total,
  };
  const nowPerfect = isPerfect(merged);

  if (incoming.total !== game.achievementsTotal) updates.achievementsTotal = incoming.total;
  if (incoming.unlocked !== game.achievementsUnlocked) {
    updates.achievementsUnlocked = incoming.unlocked;
  }

  // Playtime only ever climbs. Steam counts what Steam saw, and a figure typed
  // in by hand may include hours it did not — a console version, a pirated
  // afternoon in 2009, time on another account. Taking the larger of the two
  // means a sync can never quietly erase hours you know you played.
  if (incoming.hoursPlayed !== undefined && incoming.hoursPlayed > (game.hoursPlayed || 0)) {
    updates.hoursPlayed = incoming.hoursPlayed;
  }

  if (incoming.lastPlayedAt && incoming.lastPlayedAt !== game.lastPlayedAt) {
    const known = game.lastPlayedAt ? new Date(game.lastPlayedAt).getTime() : 0;
    if (new Date(incoming.lastPlayedAt).getTime() > known) {
      updates.lastPlayedAt = incoming.lastPlayedAt;
    }
  }

  /**
   * A finished game whose list has grown.
   *
   * The completion was real and its date stays: you did earn every achievement
   * that existed at the time. What changes is that there is more to do now, so
   * the game comes off the finished shelf and goes back to being played. The
   * status is stated explicitly rather than left for the ordinary "lost its
   * 100%" rule to withdraw, because that rule also clears the completion date —
   * right when an unlock is taken back by hand, wrong when a developer adds a
   * DLC years later.
   */
  const grewList = wasPerfect && !nowPerfect && incoming.total > game.achievementsTotal;
  if (grewList && game.status === 'mastered') {
    updates.status = 'playing';
    updates.completedAt = game.completedAt;
  }

  /**
   * A finished game gets the date it was actually finished.
   *
   * Not only on the transition: a game that was already at 100% before it was
   * ever linked has no date at all, and the platform is the only thing that
   * knows when the last one was earned. So any undated completion is dated,
   * whenever the sync first sees it — and a date already there is left alone,
   * because it may well have been typed in by hand.
   */
  if (nowPerfect && !game.completedAt && incoming.lastUnlockedAt) {
    updates.completedAt = incoming.lastUnlockedAt;
  }

  return { updates, changed: Object.keys(updates).length > 0, grewList };
}

/** Finds the collection new-achievement games belong in, if it exists yet. */
export const findNewAchievementsCollection = (collections: Collection[]): Collection | undefined =>
  collections.find(
    (collection) => collection.name.trim().toLowerCase() === NEW_ACHIEVEMENTS_COLLECTION.toLowerCase(),
  );

/** Whether a game is due another look, given how long ago it was last synced. */
export function isDueForSync(game: UserGame, intervalMs: number): boolean {
  if (!game.autoSync) return false;
  if (!game.lastSyncedAt) return true;
  return Date.now() - new Date(game.lastSyncedAt).getTime() > intervalMs;
}
