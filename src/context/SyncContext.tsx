import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { UserGame } from '../types';
import { useGame } from './GameContext';
import { SYNC_INTERVAL_MS, SyncReport, SyncState, useSteamSync } from '../lib/useSteamSync';
import { PsnSyncReport, PsnSyncState, usePsnSync } from '../lib/usePsnSync';
import { PsnError, PsnTitle } from '../lib/psn';
import { isSyncLinked } from '../lib/sync';
import { useCoverArt } from '../lib/useCoverArt';

interface SyncContextType {
  steam: { isLinked: boolean; state: SyncState };
  psn: { isLinked: boolean; state: PsnSyncState };
  /** Either platform is mid-sync, or the library is reloading for one. */
  running: boolean;
  /** When the last full sync finished. */
  lastRunAt: string | null;
  /**
   * Everything at once: queued writes out, the library back in from the cloud,
   * then both platforms asked about every linked game.
   */
  syncEverything: () => Promise<void>;
  /** One game, straight away — after it is added or linked. */
  syncGame: (game: UserGame) => Promise<void>;
  /** The PSN account's trophy lists, for matching a game by hand. */
  loadPsnTitles: () => Promise<PsnTitle[] | PsnError>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

/**
 * The one place platform data is fetched from.
 *
 * There used to be a Sync button per game and two more in Settings, each with
 * its own copy of the sync hooks — and so its own idea of whether a sync was
 * already running. Now the app keeps itself current: when it opens, every few
 * minutes while it is on screen, when the tab comes back into view, when the
 * connection returns, and the moment a game is added or linked. Each pass only
 * asks about games the platform says have been played since, so running often
 * is cheap. One button, in the top bar, does everything on demand.
 */
export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, refresh, isOnline } = useGame();
  const steam = useSteamSync();
  const psn = usePsnSync();

  // Cover art is kept current here too: it comes from RAWG rather than from
  // either platform, so it has no account to hang off — but it is the same
  // "keep the library current on its own" job.
  useCoverArt();

  const [reloading, setReloading] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  // The hooks' callbacks change whenever the library does. A timer set up once
  // must reach the current ones, not the ones from when it was created.
  const latest = useRef({ steam, psn });
  latest.current = { steam, psn };

  const syncLinked = useCallback(async (force: boolean) => {
    const { steam: s, psn: p } = latest.current;
    const runs: Promise<SyncReport | PsnSyncReport>[] = [];
    if (s.isLinked) runs.push(s.syncAll({ force }));
    if (p.isLinked) runs.push(p.syncAll({ force }));
    if (runs.length === 0) return;
    await Promise.all(runs);
    setLastRunAt(new Date().toISOString());
  }, []);

  const syncEverything = useCallback(async () => {
    setReloading(true);
    try {
      // Flushes the offline queue first, then reloads, so a platform sync is
      // reconciled against what is really stored rather than a stale copy.
      await refresh();
    } finally {
      setReloading(false);
    }
    await syncLinked(true);
  }, [refresh, syncLinked]);

  const syncGame = useCallback(async (game: UserGame) => {
    if (!isSyncLinked(game)) return;
    const { steam: s, psn: p } = latest.current;
    if (game.platform === 'ps5') {
      // PSN answers for the whole account in one request, so one game and all
      // of them are the same call.
      if (p.isLinked) await p.syncAll({ force: true });
    } else if (s.isLinked) {
      await s.syncOne(game);
    }
  }, []);

  const linked = steam.isLinked || psn.isLinked;

  // Once the library has loaded, and again whenever a platform is linked. Keyed
  // on the links rather than on loading alone: a reload for the sync button
  // flips loading too, and must not start a second pass beside its own.
  const syncedFor = useRef<string | null>(null);
  useEffect(() => {
    if (loading || !linked) return;
    const key = `${steam.isLinked}:${psn.isLinked}`;
    if (syncedFor.current === key) return;
    syncedFor.current = key;
    void syncLinked(false);
  }, [loading, linked, steam.isLinked, psn.isLinked, syncLinked]);

  // On a timer while the app is in view, and on coming back to it.
  useEffect(() => {
    if (loading || !linked) return;

    const tick = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void syncLinked(false);
    };

    const timer = window.setInterval(tick, SYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [loading, linked, syncLinked]);

  // When the connection returns, after whatever was missed while it was gone.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current && !loading && linked) void syncLinked(false);
    wasOnline.current = isOnline;
  }, [isOnline, loading, linked, syncLinked]);

  const value = useMemo<SyncContextType>(
    () => ({
      steam: { isLinked: steam.isLinked, state: steam.state },
      psn: { isLinked: psn.isLinked, state: psn.state },
      running: reloading || steam.state.running || psn.state.running,
      lastRunAt,
      syncEverything,
      syncGame,
      loadPsnTitles: psn.loadTitles,
    }),
    [
      steam.isLinked,
      steam.state,
      psn.isLinked,
      psn.state,
      reloading,
      lastRunAt,
      syncEverything,
      syncGame,
      psn.loadTitles,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export function useSync(): SyncContextType {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
}
