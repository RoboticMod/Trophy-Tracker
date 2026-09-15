import { useCallback, useRef, useState } from 'react';
import { UserGame } from '../types';
import { useGame } from '../context/GameContext';
import { PsnError, PsnTitle, getPsnTitles, normalizeTitle } from './psn';
import {
  NEW_ACHIEVEMENTS_COLLECTION,
  NEW_ACHIEVEMENTS_COLOR,
  NEW_ACHIEVEMENTS_DESCRIPTION,
  findNewAchievementsCollection,
  isDueForSync,
  reconcile,
} from './sync';
import { SYNC_INTERVAL_MS } from './useSteamSync';

export interface PsnSyncReport {
  checked: number;
  updated: number;
  /** Games whose trophy list grew after they had been finished. */
  grown: string[];
  /** Titles PSN knows about that no tracked game matched. */
  unmatched: number;
  error?: PsnError;
}

export interface PsnSyncState {
  running: boolean;
  lastReport: PsnSyncReport | null;
  lastRunAt: string | null;
}

/**
 * Pulling PlayStation trophy progress into the library.
 *
 * One request covers the whole account — PSN returns every title with a trophy
 * list and how far through each one you are — so this fetches once and then
 * matches, rather than asking per game the way Steam has to.
 *
 * The reconciliation is the same code Steam's sync uses, which is the point:
 * the rule about a finished game whose list has grown has one implementation,
 * and trophy lists grow on PlayStation too.
 */
export function usePsnSync() {
  const { games, collections, platformAccounts, updateGame, createCollection } = useGame();

  const [state, setState] = useState<PsnSyncState>({
    running: false,
    lastReport: null,
    lastRunAt: null,
  });
  const running = useRef(false);

  const isLinked = Boolean(platformAccounts?.psnAccountId);

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

  const syncAll = useCallback(
    async (options: { onlyDue?: boolean } = {}): Promise<PsnSyncReport> => {
      const empty: PsnSyncReport = { checked: 0, updated: 0, grown: [], unmatched: 0 };
      if (!isLinked || running.current) return empty;

      const candidates = games.filter(
        (game) =>
          game.platform === 'ps5' &&
          game.autoSync &&
          (!options.onlyDue || isDueForSync(game, SYNC_INTERVAL_MS)),
      );
      if (candidates.length === 0) return empty;

      running.current = true;
      setState((prev) => ({ ...prev, running: true }));

      const report: PsnSyncReport = {
        checked: candidates.length,
        updated: 0,
        grown: [],
        unmatched: 0,
      };

      try {
        const titles = await getPsnTitles();
        if (!titles.data) {
          report.error = titles.error;
          return report;
        }

        // Indexed both ways: by the trophy-set id for a game that has been
        // matched before, and by a flattened name for one that has not.
        const byId = new Map<string, PsnTitle>();
        const byName = new Map<string, PsnTitle>();
        titles.data.forEach((title) => {
          byId.set(title.npCommunicationId, title);
          byName.set(normalizeTitle(title.name), title);
        });

        for (const game of candidates) {
          const match = game.psnCommunicationId
            ? byId.get(game.psnCommunicationId)
            : byName.get(normalizeTitle(game.title));

          if (!match) {
            report.unmatched += 1;
            continue;
          }

          const { updates, changed, grewList } = reconcile(game, {
            unlocked: match.earned,
            total: match.total,
            lastPlayedAt: match.lastUpdatedAt,
            // The list gives no per-trophy times, so the title's own last
            // update dates a platinum earned since the previous sync. It is
            // within a sync interval of the truth, and the date can be
            // corrected by hand like any other.
            lastUnlockedAt: match.lastUpdatedAt,
          });

          const patch: Partial<UserGame> = {
            ...updates,
            lastSyncedAt: new Date().toISOString(),
          };

          // Remembered on first match, so the next sync goes by id and a game
          // renamed in either place keeps working.
          if (!game.psnCommunicationId) patch.psnCommunicationId = match.npCommunicationId;
          if (grewList) {
            patch.collections = fileAsGrown(game);
            report.grown.push(game.title);
          }

          updateGame(game.id, patch);
          if (changed) report.updated += 1;
        }
      } finally {
        running.current = false;
        setState({ running: false, lastReport: report, lastRunAt: new Date().toISOString() });
      }

      return report;
    },
    [games, isLinked, updateGame, fileAsGrown],
  );

  return { isLinked, state, syncAll };
}
