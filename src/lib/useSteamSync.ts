import { useCallback, useRef, useState } from 'react';
import { UserGame } from '../types';
import { useGame } from '../context/GameContext';
import { getSteamAchievements, getSteamLibrary, SteamError } from './steam';
import {
  NEW_ACHIEVEMENTS_COLLECTION,
  NEW_ACHIEVEMENTS_COLOR,
  NEW_ACHIEVEMENTS_DESCRIPTION,
  findNewAchievementsCollection,
  isDueForSync,
  reconcile,
} from './sync';

/** How long a synced game is left alone before it is worth asking again. */
export const SYNC_INTERVAL_MS = 60 * 60 * 1000;

export interface SyncReport {
  checked: number;
  updated: number;
  /** Games whose award list grew after they had been finished. */
  grown: string[];
  error?: SteamError;
}

export interface SyncState {
  running: boolean;
  lastReport: SyncReport | null;
  lastRunAt: string | null;
}

/**
 * Pulling Steam's version of your progress into the library.
 *
 * Writes go through updateGame like any other edit, so they inherit the
 * optimistic update, the offline queue and — the good part — the completion
 * celebration. A platinum earned on the console while the app was closed still
 * gets its burst the moment the app learns about it.
 */
export function useSteamSync() {
  const { games, collections, platformAccounts, updateGame, createCollection } = useGame();

  const [state, setState] = useState<SyncState>({
    running: false,
    lastReport: null,
    lastRunAt: null,
  });

  // A guard rather than state: an automatic run on load and a "sync now" press
  // can land together, and syncing the same game twice would have the second
  // run reconciling against figures the first had already written.
  const running = useRef(false);

  const steamId = platformAccounts?.steamId;

  /**
   * Files a game that has gained achievements since it was finished.
   *
   * The collection is created the first time one is needed rather than shipped
   * empty with the defaults — a list that has never applied to anything is
   * clutter in the sidebar.
   */
  const fileAsGrown = useCallback(
    (game: UserGame) => {
      const collection =
        findNewAchievementsCollection(collections) ??
        createCollection(
          NEW_ACHIEVEMENTS_COLLECTION,
          NEW_ACHIEVEMENTS_DESCRIPTION,
          NEW_ACHIEVEMENTS_COLOR,
          'Sparkles',
        );

      if (game.collections.includes(collection.id)) return game.collections;
      return [...game.collections, collection.id];
    },
    [collections, createCollection],
  );

  const syncOne = useCallback(
    async (game: UserGame): Promise<{ updated: boolean; grew: boolean; error?: SteamError }> => {
      if (!steamId || !game.steamAppId) return { updated: false, grew: false, error: 'not-linked' };

      const result = await getSteamAchievements(steamId, game.steamAppId);
      if (!result.data) return { updated: false, grew: false, error: result.error };

      const { updates, changed, grewList } = reconcile(game, {
        unlocked: result.data.unlocked,
        total: result.data.total,
        lastUnlockedAt: result.data.lastUnlockedAt,
      });

      // Stamped even when nothing moved, so an unchanged game is not asked
      // about again on every single load.
      const patch: Partial<UserGame> = { ...updates, lastSyncedAt: new Date().toISOString() };
      if (grewList) patch.collections = fileAsGrown(game);

      updateGame(game.id, patch);
      return { updated: changed, grew: grewList };
    },
    [steamId, updateGame, fileAsGrown],
  );

  /**
   * Every linked game, plus playtime from the owned-games list.
   *
   * Playtime comes from one call for the whole library rather than one per
   * game — it is the same request either way, and a library of eighty games
   * should not be eighty requests.
   */
  const syncAll = useCallback(
    async (options: { onlyDue?: boolean } = {}): Promise<SyncReport> => {
      const empty: SyncReport = { checked: 0, updated: 0, grown: [] };
      if (!steamId || running.current) return empty;

      const candidates = games.filter(
        (game) =>
          game.platform === 'steam' &&
          game.autoSync &&
          game.steamAppId &&
          (!options.onlyDue || isDueForSync(game, SYNC_INTERVAL_MS)),
      );
      if (candidates.length === 0) return empty;

      running.current = true;
      setState((prev) => ({ ...prev, running: true }));

      const report: SyncReport = { checked: candidates.length, updated: 0, grown: [] };

      try {
        const library = await getSteamLibrary(steamId);
        const playtime = new Map(library.data?.map((entry) => [entry.appid, entry]) ?? []);
        if (library.error) report.error = library.error;

        for (const game of candidates) {
          const owned = game.steamAppId ? playtime.get(game.steamAppId) : undefined;
          const achievements = await getSteamAchievements(steamId, game.steamAppId!);

          if (!achievements.data) {
            report.error = achievements.error ?? report.error;
            continue;
          }

          const { updates, changed, grewList } = reconcile(game, {
            unlocked: achievements.data.unlocked,
            total: achievements.data.total,
            hoursPlayed: owned?.hoursPlayed,
            lastPlayedAt: owned?.lastPlayedAt,
            lastUnlockedAt: achievements.data.lastUnlockedAt,
          });

          const patch: Partial<UserGame> = { ...updates, lastSyncedAt: new Date().toISOString() };
          if (grewList) {
            patch.collections = fileAsGrown(game);
            report.grown.push(game.title);
          }

          updateGame(game.id, patch);
          if (changed) report.updated += 1;
        }
      } finally {
        running.current = false;
        setState({
          running: false,
          lastReport: report,
          lastRunAt: new Date().toISOString(),
        });
      }

      return report;
    },
    [games, steamId, updateGame, fileAsGrown],
  );

  return {
    /** False when no Steam account is linked, which every caller renders. */
    isLinked: Boolean(steamId),
    state,
    syncOne,
    syncAll,
  };
}
