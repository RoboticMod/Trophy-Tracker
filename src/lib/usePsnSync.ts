import { useCallback, useRef, useState } from 'react';
import { UserGame } from '../types';
import {
  COMPLETE_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  fileInPermanent,
  permanentOf,
} from './collections';
import { useGame } from '../context/GameContext';
import {
  PsnError,
  PsnPlayedGame,
  PsnTitle,
  getPsnTitleProgress,
  getPsnTitles,
  matchByTitle,
  normalizeTitle,
} from './psn';
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
import { usePsnTrophyScope } from './psnTrophyScope';

export interface PsnSyncReport {
  checked: number;
  updated: number;
  /** Games whose trophy list grew after they had been finished. */
  grown: string[];
  /** Tracked PS5 games no trophy list or played game matched. */
  unmatched: number;
  error?: PsnError;
}

/**
 * What the last sync made of one game, for the status shown on its page.
 * Absent until a sync has looked at the game in this session.
 */
export interface PsnGameOutcome {
  state: 'synced' | 'unchanged' | 'unmatched' | 'failed';
  at: string;
  /** The trophy list it was matched to, as PlayStation names it. */
  trophyList?: string;
  /** Whether PSN reported playtime for it. */
  hasPlaytime?: boolean;
  error?: PsnError;
}

export interface PsnSyncState {
  running: boolean;
  lastReport: PsnSyncReport | null;
  lastRunAt: string | null;
  /** Per game, keyed by game id. */
  outcomes: Record<string, PsnGameOutcome>;
  /** The account's trophy lists as of the last fetch, for linking by hand. */
  titles: PsnTitle[];
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
 * One request lists the whole account — every trophy list with its counts, and
 * every game played with its playtime — which is enough to match games and to
 * see which have moved. Each game that has moved then gets one more request for
 * its own trophy list, which is the only place PSN dates individual trophies:
 * that is what the "last trophy earned" date and a completion date come from.
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
    outcomes: {},
    titles: [],
  });
  const running = useRef(false);
  // A forced pass asked for while another was running — a game added or
  // linked mid-sync. It runs as soon as the current one ends, rather than
  // being dropped until the next timed pass.
  const rerun = useRef(false);
  const self = useRef<((options?: SyncOptions) => Promise<PsnSyncReport>) | null>(null);

  const isLinked = Boolean(platformAccounts?.psnAccountId);

  // Read here rather than passed in: this hook is the only thing that asks PSN
  // for counts, so the preference belongs where the request is made.
  const [trophyScope] = usePsnTrophyScope();
  const includeDlc = trophyScope === 'all';

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

      const listed = game.collections.includes(collection.id)
        ? game.collections
        : [...game.collections, collection.id];

      // A game whose list has grown is no longer finished, so it comes off the
      // 100% shelf and goes back to being played. Applied after the list is
      // added, and shelf-first, so the New Achievements membership survives.
      return permanentOf(listed) === COMPLETE_COLLECTION_ID
        ? fileInPermanent(listed, PLAYING_COLLECTION_ID)
        : listed;
    },
    [collections, createCollection],
  );

  const syncAll = useCallback(
    async (options: SyncOptions = {}): Promise<PsnSyncReport> => {
      const empty: PsnSyncReport = { checked: 0, updated: 0, grown: [], unmatched: 0 };
      if (!isLinked) return empty;
      if (running.current) {
        if (options.force) rerun.current = true;
        return empty;
      }

      const candidates = getGames().filter((game) => game.platform === 'ps5');
      if (candidates.length === 0) return empty;

      running.current = true;
      setState((prev) => ({ ...prev, running: true }));

      const report: PsnSyncReport = { checked: 0, updated: 0, grown: [], unmatched: 0 };
      const outcomes: Record<string, PsnGameOutcome> = {};
      let titles: PsnTitle[] | undefined;
      const now = () => new Date().toISOString();

      try {
        const library = await getPsnTitles();
        if (!library.data) {
          report.error = library.error;
          candidates.forEach((game) => {
            outcomes[game.id] = { state: 'failed', at: now(), error: library.error };
          });
          return report;
        }
        titles = library.data.titles;

        const byId = new Map(titles.map((title) => [title.npCommunicationId, title]));

        // PS4 and PS5 copies of one game are separate entries with separate
        // clocks. The one with the most hours is the one you actually played,
        // and playtime only ever climbs, so that is the figure kept.
        const playedByName = new Map<string, PsnPlayedGame>();
        library.data.played.forEach((entry) => {
          const key = normalizeTitle(entry.name);
          const known = playedByName.get(key);
          if (!known || entry.hoursPlayed > known.hoursPlayed) playedByName.set(key, entry);
        });
        const played = [...playedByName.values()];

        for (const candidate of candidates) {
          // By id once a game has been matched, so a rename on either side
          // keeps working; by title until then.
          const match = candidate.psnCommunicationId
            ? byId.get(candidate.psnCommunicationId)
            : matchByTitle(candidate.title, titles, (title) => title.name);
          const playedGame =
            matchByTitle(candidate.title, played, (entry) => entry.name) ??
            (match ? matchByTitle(match.name, played, (entry) => entry.name) : undefined);

          if (!match && !playedGame) {
            report.unmatched += 1;
            outcomes[candidate.id] = { state: 'unmatched', at: now() };
            continue;
          }

          const touchedAt = later(match?.lastUpdatedAt, playedGame?.lastPlayedAt);
          const due =
            options.force ||
            !candidate.psnCommunicationId ||
            // A game with trophies but no date for the latest one yet — every
            // game synced before that date was recorded.
            (!candidate.lastUnlockedAt && (match?.earned ?? 0) > 0) ||
            hasNewActivity(candidate, touchedAt) ||
            isDueForSync(candidate, SYNC_SAFETY_NET_MS);

          const outcome: PsnGameOutcome = {
            state: 'unchanged',
            at: now(),
            trophyList: match?.name,
            hasPlaytime: Boolean(playedGame && playedGame.hoursPlayed > 0),
          };
          outcomes[candidate.id] = outcome;
          if (!due) continue;

          report.checked += 1;

          // The trophy list itself, for exact counts and the date of the most
          // recent trophy. The summary figures stand in if it cannot be read.
          const detail = match
            ? await getPsnTitleProgress(match.npCommunicationId, match.npServiceName, includeDlc)
            : undefined;
          if (detail?.error) outcome.error = detail.error;

          const game = getGames().find((g) => g.id === candidate.id) ?? candidate;

          const { updates, changed, grewList } = reconcile(game, {
            // Only the counts the trophy list itself gives, for whichever groups
            // the trophy-scope preference asked for. The account summary beside
            // it always counts add-on trophies,
            // so falling back to it would have a game's total jump by twenty
            // every time one detail request happened to fail. A game with
            // playtime but no trophy list keeps its own counts.
            unlocked: detail?.data?.earned ?? game.achievementsUnlocked,
            total: detail?.data?.total ?? game.achievementsTotal,
            hoursPlayed: playedGame?.hoursPlayed,
            lastPlayedAt: playedGame?.lastPlayedAt ?? match?.lastUpdatedAt,
            // Only a real trophy date: the list's own "last updated" also moves
            // when PSN touches the list for other reasons.
            lastUnlockedAt: detail?.data?.lastEarnedAt ?? null,
          });

          const patch: Partial<UserGame> = {
            ...updates,
            ...syncFieldsFor(game),
            lastSyncedAt: now(),
          };

          // Remembered on first match, so the next sync goes by id.
          if (match && game.psnCommunicationId !== match.npCommunicationId) {
            patch.psnCommunicationId = match.npCommunicationId;
          }
          if (grewList) {
            patch.collections = fileAsGrown(game);
            report.grown.push(game.title);
          }

          updateGame(game.id, patch);
          if (changed) report.updated += 1;
          outcome.state = changed ? 'synced' : 'unchanged';
        }
      } catch {
        report.error = 'request-failed';
      } finally {
        running.current = false;
        setState((prev) => ({
          running: false,
          lastReport: report,
          lastRunAt: now(),
          outcomes: { ...prev.outcomes, ...outcomes },
          titles: titles ?? prev.titles,
        }));
        if (rerun.current) {
          rerun.current = false;
          window.setTimeout(() => void self.current?.({ force: true }), 0);
        }
      }

      return report;
    },
    [getGames, isLinked, updateGame, fileAsGrown, includeDlc],
  );

  self.current = syncAll;

  /** The account's trophy lists, for picking one by hand. */
  const loadTitles = useCallback(async (): Promise<PsnTitle[] | PsnError> => {
    const library = await getPsnTitles();
    if (!library.data) return library.error ?? 'request-failed';
    const titles = library.data.titles;
    setState((prev) => ({ ...prev, titles }));
    return titles;
  }, []);

  return { isLinked, state, syncAll, loadTitles };
}
