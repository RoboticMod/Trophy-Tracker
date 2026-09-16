import { useCallback, useRef, useState } from 'react';
import { UserGame } from '../types';
import { useGame } from '../context/GameContext';
import { getSteamAchievements, getSteamLibrary, SteamError } from './steam';
import {
  NEW_ACHIEVEMENTS_COLLECTION,
  NEW_ACHIEVEMENTS_COLOR,
  NEW_ACHIEVEMENTS_DESCRIPTION,
  findNewAchievementsCollection,
  hasNewActivity,
  isDueForSync,
  reconcile,
  syncFieldsFor,
} from './sync';

/**
 * How long a synced game is left alone before it is worth asking again.
 *
 * Short, because the question is cheap: the library call says which games have
 * been played since, and only those cost a request of their own.
 */
export const SYNC_INTERVAL_MS = 15 * 60 * 1000;

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
 * The longest a linked game goes unasked, whatever the platform says.
 *
 * A developer adding achievements to a game you finished years ago does not
 * make it "played", so activity alone would never notice the list grew.
 */
export const SYNC_SAFETY_NET_MS = 24 * 60 * 60 * 1000;

export interface SyncOptions {
  /**
   * Ask about every linked game, even one the platform says has not been
   * played since the last sync — for when you have asked for a sync yourself.
   */
  force?: boolean;
}

/**
 * Pulling Steam's version of your progress into the library.
 *
 * Writes go through updateGame like any other edit, so they inherit the
 * optimistic update, the offline queue and — the good part — the completion
 * celebration. A game finished while the app was closed still gets its burst
 * the moment the app learns about it.
 *
 * Mounted once, by the sync provider: a second copy would have its own guard
 * and could run alongside the first.
 */
export function useSteamSync() {
  const { getGames, collections, platformAccounts, updateGame, createCollection } = useGame();

  const [state, setState] = useState<SyncState>({
    running: false,
    lastReport: null,
    lastRunAt: null,
  });

  // A guard rather than state: a timed run and a button press can land
  // together, and syncing the same game twice would have the second run
  // reconciling against figures the first had already written.
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

  /**
   * One game, one request.
   *
   * Used the moment a game is added or linked, so the figures arrive without
   * walking the whole library. The function returns playtime alongside the
   * achievements for exactly this reason.
   */
  const syncOne = useCallback(
    async (game: UserGame): Promise<{ updated: boolean; grew: boolean; error?: SteamError }> => {
      if (!steamId || !game.steamAppId) return { updated: false, grew: false, error: 'not-linked' };

      const result = await getSteamAchievements(steamId, game.steamAppId);
      if (!result.data) return { updated: false, grew: false, error: result.error };

      // Reconciled against the stored copy, which may have moved on since the
      // caller took its snapshot.
      const current = getGames().find((g) => g.id === game.id) ?? game;
      const { updates, changed, grewList } = reconcile(current, {
        unlocked: result.data.unlocked,
        total: result.data.total,
        hoursPlayed: result.data.hoursPlayed ?? undefined,
        lastPlayedAt: result.data.lastPlayedAt,
        lastUnlockedAt: result.data.lastUnlockedAt,
      });

      // Stamped even when nothing moved, so an unchanged game is not asked
      // about again on every single pass.
      const patch: Partial<UserGame> = {
        ...updates,
        ...syncFieldsFor(current),
        lastSyncedAt: new Date().toISOString(),
      };
      if (grewList) patch.collections = fileAsGrown(current);

      updateGame(game.id, patch);
      return { updated: changed, grew: grewList };
    },
    [steamId, getGames, updateGame, fileAsGrown],
  );

  /**
   * Every linked game, plus playtime from the owned-games list.
   *
   * Playtime comes from one call for the whole library rather than one per
   * game, and the same call says when each game was last played — so a game
   * untouched since its last sync is skipped rather than asked about.
   */
  const syncAll = useCallback(
    async (options: SyncOptions = {}): Promise<SyncReport> => {
      const empty: SyncReport = { checked: 0, updated: 0, grown: [] };
      if (!steamId || running.current) return empty;

      const candidates = getGames().filter(
        (game) => game.platform === 'steam' && game.steamAppId,
      );
      if (candidates.length === 0) return empty;

      running.current = true;
      setState((prev) => ({ ...prev, running: true }));

      const report: SyncReport = { checked: 0, updated: 0, grown: [] };

      try {
        const library = await getSteamLibrary(steamId);
        const playtime = new Map(library.data?.map((entry) => [entry.appid, entry]) ?? []);
        if (library.error) report.error = library.error;

        for (const candidate of candidates) {
          const owned = playtime.get(candidate.steamAppId!);

          const due =
            options.force ||
            hasNewActivity(candidate, owned?.lastPlayedAt) ||
            isDueForSync(candidate, SYNC_SAFETY_NET_MS);
          if (!due) continue;

          report.checked += 1;
          const achievements = await getSteamAchievements(steamId, candidate.steamAppId!);

          if (!achievements.data) {
            report.error = achievements.error ?? report.error;
            continue;
          }

          const game = getGames().find((g) => g.id === candidate.id) ?? candidate;
          const { updates, changed, grewList } = reconcile(game, {
            unlocked: achievements.data.unlocked,
            total: achievements.data.total,
            hoursPlayed: owned?.hoursPlayed,
            lastPlayedAt: owned?.lastPlayedAt,
            lastUnlockedAt: achievements.data.lastUnlockedAt,
          });

          const patch: Partial<UserGame> = {
            ...updates,
            ...syncFieldsFor(game),
            lastSyncedAt: new Date().toISOString(),
          };
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
    [getGames, steamId, updateGame, fileAsGrown],
  );

  return {
    /** False when no Steam account is linked, which every caller renders. */
    isLinked: Boolean(steamId),
    state,
    syncOne,
    syncAll,
  };
}
