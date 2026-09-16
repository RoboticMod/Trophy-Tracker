import { useCallback, useRef, useState } from 'react';
import { UserGame } from '../types';
import { useGame } from '../context/GameContext';
import { PsnError, PsnPlayedGame, PsnTitle, getPsnTitles, normalizeTitle } from './psn';
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
import { SYNC_SAFETY_NET_MS, SyncOptions } from './useSteamSync';

export interface PsnSyncReport {
  checked: number;
  updated: number;
  /** Games whose trophy list grew after they had been finished. */
  grown: string[];
  /** Tracked PS5 games no trophy list or played game matched. */
  unmatched: number;
  error?: PsnError;
}

export interface PsnSyncState {
  running: boolean;
  lastReport: PsnSyncReport | null;
  lastRunAt: string | null;
}

/** The later of two timestamps, either of which may be missing. */
const later = (a?: string | null, b?: string | null): string | null => {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
};

/**
 * Pulling PlayStation trophy progress and playtime into the library.
 *
 * One request covers the whole account — PSN returns every title with a trophy
 * list, and every game played with its playtime — so this fetches once and
 * then matches, rather than asking per game the way Steam has to.
 *
 * The reconciliation is the same code Steam's sync uses, which is the point:
 * the rule about a finished game whose list has grown has one implementation,
 * and trophy lists grow on PlayStation too.
 *
 * Mounted once, by the sync provider.
 */
export function usePsnSync() {
  const { getGames, collections, platformAccounts, updateGame, createCollection } = useGame();

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
    async (options: SyncOptions = {}): Promise<PsnSyncReport> => {
      const empty: PsnSyncReport = { checked: 0, updated: 0, grown: [], unmatched: 0 };
      if (!isLinked || running.current) return empty;

      const candidates = getGames().filter((game) => game.platform === 'ps5');
      if (candidates.length === 0) return empty;

      running.current = true;
      setState((prev) => ({ ...prev, running: true }));

      const report: PsnSyncReport = { checked: 0, updated: 0, grown: [], unmatched: 0 };

      try {
        const library = await getPsnTitles();
        if (!library.data) {
          report.error = library.error;
          return report;
        }

        // Indexed both ways: by the trophy-set id for a game that has been
        // matched before, and by a flattened name for one that has not.
        const byId = new Map<string, PsnTitle>();
        const byName = new Map<string, PsnTitle>();
        library.data.titles.forEach((title) => {
          byId.set(title.npCommunicationId, title);
          byName.set(normalizeTitle(title.name), title);
        });

        // PS4 and PS5 copies of one game are separate entries with separate
        // clocks. The one with the most hours is the one you actually played,
        // and playtime only ever climbs, so that is the figure kept.
        const playedByName = new Map<string, PsnPlayedGame>();
        library.data.played.forEach((entry) => {
          const key = normalizeTitle(entry.name);
          const known = playedByName.get(key);
          if (!known || entry.hoursPlayed > known.hoursPlayed) playedByName.set(key, entry);
        });

        for (const candidate of candidates) {
          const match = candidate.psnCommunicationId
            ? byId.get(candidate.psnCommunicationId)
            : byName.get(normalizeTitle(candidate.title));
          const played =
            playedByName.get(normalizeTitle(candidate.title)) ??
            (match ? playedByName.get(normalizeTitle(match.name)) : undefined);

          if (!match && !played) {
            report.unmatched += 1;
            continue;
          }

          const touchedAt = later(match?.lastUpdatedAt, played?.lastPlayedAt);
          const due =
            options.force ||
            !candidate.psnCommunicationId ||
            hasNewActivity(candidate, touchedAt) ||
            isDueForSync(candidate, SYNC_SAFETY_NET_MS);
          if (!due) continue;

          report.checked += 1;
          const game = getGames().find((g) => g.id === candidate.id) ?? candidate;

          const { updates, changed, grewList } = reconcile(game, {
            // A game with playtime but no trophy list keeps its own counts.
            unlocked: match ? match.earned : game.achievementsUnlocked,
            total: match ? match.total : game.achievementsTotal,
            hoursPlayed: played?.hoursPlayed,
            lastPlayedAt: played?.lastPlayedAt ?? match?.lastUpdatedAt,
            // The list gives no per-trophy times, so the title's own last
            // update dates a platinum earned since the previous sync. It is
            // within a sync interval of the truth, and the date can be
            // corrected by hand like any other.
            lastUnlockedAt: match?.lastUpdatedAt,
          });

          const patch: Partial<UserGame> = {
            ...updates,
            ...syncFieldsFor(game),
            lastSyncedAt: new Date().toISOString(),
          };

          // Remembered on first match, so the next sync goes by id and a game
          // renamed in either place keeps working.
          if (match && !game.psnCommunicationId) {
            patch.psnCommunicationId = match.npCommunicationId;
          }
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
    [getGames, isLinked, updateGame, fileAsGrown],
  );

  return { isLinked, state, syncAll };
}
