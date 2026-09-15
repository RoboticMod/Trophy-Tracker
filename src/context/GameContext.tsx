import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CELEBRATION_MS } from '../components/Celebration';

/**
 * Long enough for a freshly added card to settle and for its progress bar to
 * finish sweeping up to full before the burst answers it.
 */
const ADD_CELEBRATION_DELAY_MS = 750;

import {
  Collection,
  GAME_STATUSES,
  GameStatus,
  Platform,
  PlatformAccounts,
  SidebarConfig,
  UserGame,
  UserProfile,
} from '../types';
import {
  DEFAULT_COLLECTIONS,
  DEFAULT_COLLECTION_COLOR,
  DEFAULT_PLATFORM_SORT_ORDER,
  withSystemColors,
} from '../lib/constants';
import { isPerfect } from '../lib/completion';
import { normalizeRating } from '../lib/rating';
import { playAwardSound, preloadAwardSounds } from '../lib/sound';
import { oneOf, usePersistentState } from '../lib/usePersistentState';
import { useAuth } from './AuthContext';
import * as db from '../lib/db';
import {
  PendingWrite,
  clearUserCache,
  enqueue,
  purgeLegacyStorage,
  readQueue,
  readSnapshot,
  writeQueue,
  writeSnapshot,
} from '../lib/localCache';

/** How long a new game stays flagged for its card to scroll itself into view. */
const FOLLOW_GAME_MS = 4000;

export const DEFAULT_SIDEBAR_CONFIG: SidebarConfig = {
  showCurrentlyPlaying: true,
  showBacklog: true,
  showCollections: true,
  showAchievements: true,
  showStats: true,
  showSearch: true,
};

interface GameContextType {
  games: UserGame[];
  collections: Collection[];
  profile: UserProfile;
  sidebarConfig: SidebarConfig;
  /** Linked Steam and PlayStation accounts, or null when none are. */
  platformAccounts: PlatformAccounts | null;
  linkSteamAccount: (account: { steamId: string; persona?: string }) => Promise<void>;
  unlinkSteamAccount: () => Promise<void>;
  /** Re-reads the link row, after the edge function has changed it. */
  refreshPlatformAccounts: () => Promise<void>;

  loading: boolean;
  /** Message shown when a write could not reach the cloud. */
  error: string | null;
  dismissError: () => void;
  isOnline: boolean;
  /** Writes waiting for connectivity. */
  pendingWrites: number;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;

  activePlatformFilter: Platform | 'all';
  setActivePlatformFilter: (platform: Platform | 'all') => void;
  activeStatusFilter: GameStatus | 'all';
  setActiveStatusFilter: (status: GameStatus | 'all') => void;
  /** Library collection filter. 'all', or a collection id. */
  activeCollectionFilter: string;
  setActiveCollectionFilter: (collectionId: string) => void;
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;

  addGame: (game: Omit<UserGame, 'id' | 'addedAt' | 'updatedAt'>) => void;
  updateGame: (id: string, updates: Partial<UserGame>) => void;
  deleteGame: (id: string) => void;
  /** Returns the created collection, so a caller can file a game into it. */
  createCollection: (
    name: string,
    description?: string,
    color?: string,
    icon?: string,
  ) => Collection;
  updateCollection: (id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>) => void;
  deleteCollection: (id: string) => void;

  updateProfile: (updates: Partial<UserProfile>) => void;
  updateSidebarConfig: (updates: Partial<SidebarConfig>) => void;
  replaceAll: (snapshot: {
    games: UserGame[];
    collections: Collection[];
    profile?: UserProfile;
  }) => Promise<void>;

  /** The game currently celebrating. The token restarts the burst on repeats. */
  celebration: { gameId: string; token: number } | null;
  triggerCelebration: (gameId: string, delayMs?: number) => void;
  /**
   * A game to bring on screen: just added, or just re-filed by a status change.
   * The token makes flagging the same game twice a fresh event — without it, a
   * game added and then moved moments later would only ever be followed once.
   */
  follow: { gameId: string; token: number } | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Guards for the filters below, which survive a reload in localStorage. */
const isPlatformFilter = (value: unknown): value is Platform | 'all' =>
  value === 'all' || value === 'steam' || value === 'ps5';
const isStatusFilter = oneOf(['all', ...GAME_STATUSES] as const);
const isCollectionFilter = (value: unknown): value is string => typeof value === 'string';

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [games, setGames] = useState<UserGame[]>([]);
  const [collections, setCollections] = useState<Collection[]>(DEFAULT_COLLECTIONS);
  const [profile, setProfile] = useState<UserProfile>(() => ({
    id: 'anonymous',
    username: 'Player',
    sidebarConfig: DEFAULT_SIDEBAR_CONFIG,
    platformOrder: DEFAULT_PLATFORM_SORT_ORDER,
  }));

  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccounts | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingWrites, setPendingWrites] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Persisted rather than plain state: these describe how you like the library
  // laid out, and re-picking them after every reload was busywork — the same
  // reasoning the sort and rating filters already follow.
  const [activePlatformFilter, setActivePlatformFilter] = usePersistentState<Platform | 'all'>(
    'library-platform',
    'all',
    isPlatformFilter,
  );
  const [activeStatusFilter, setActiveStatusFilter] = usePersistentState<GameStatus | 'all'>(
    'library-status',
    'all',
    isStatusFilter,
  );
  const [activeCollectionFilter, setActiveCollectionFilter] = usePersistentState<string>(
    'library-collection',
    'all',
    isCollectionFilter,
  );
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Latest state, so queue flushes and cache writes never close over stale data.
  const latest = useRef({ games, collections, profile });
  latest.current = { games, collections, profile };

  useEffect(() => {
    purgeLegacyStorage();
  }, []);

  const [celebration, setCelebration] = useState<{ gameId: string; token: number } | null>(null);
  const celebrationTimers = useRef<number[]>([]);
  const [follow, setFollow] = useState<{ gameId: string; token: number } | null>(null);
  const followTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (followTimer.current !== null) window.clearTimeout(followTimer.current);
    },
    [],
  );

  /**
   * Marks a game for its card to bring itself on screen. Used whenever a change
   * moves a game somewhere the eye was not already looking — added to the
   * library, or promoted out of the backlog into another section entirely.
   */
  const followGame = useCallback((gameId: string) => {
    setFollow({ gameId, token: Date.now() });
    if (followTimer.current !== null) window.clearTimeout(followTimer.current);
    followTimer.current = window.setTimeout(() => setFollow(null), FOLLOW_GAME_MS);
  }, []);

  const clearCelebrationTimers = () => {
    celebrationTimers.current.forEach(window.clearTimeout);
    celebrationTimers.current = [];
  };

  const triggerCelebration = useCallback((gameId: string, delayMs = 0) => {
    clearCelebrationTimers();

    const play = () => {
      setCelebration({ gameId, token: Date.now() });

      // The sound is started here rather than from the Celebration component, so
      // it begins on the same tick the burst does and inherits the same delay —
      // including the wait that lets a newly added game's meter sweep to full
      // first. Read from the ref because an added game may not be in the state
      // this callback closed over yet.
      const game = latest.current.games.find((g) => g.id === gameId);
      if (game) playAwardSound(game.platform);

      celebrationTimers.current.push(
        window.setTimeout(() => setCelebration(null), CELEBRATION_MS),
      );
    };

    if (delayMs > 0) celebrationTimers.current.push(window.setTimeout(play, delayMs));
    else play();
  }, []);

  // Fetched and decoded up front, so the first completion is not the one that
  // plays late while the file is still downloading.
  useEffect(() => {
    preloadAwardSounds();
  }, []);

  useEffect(() => clearCelebrationTimers, []);

  /* ---------------------------------------------------------------------- */
  /* Cloud writes: optimistic locally, queued when offline                   */
  /* ---------------------------------------------------------------------- */

  const applyWrite = useCallback(async (entry: PendingWrite, id: string) => {
    if (entry.kind === 'game' && entry.op === 'upsert') await db.upsertGame(entry.game, id);
    else if (entry.kind === 'game') await db.deleteGame(entry.id, id);
    else if (entry.kind === 'collections') await db.upsertCollections(entry.collections, id);
    else if (entry.kind === 'collection') await db.deleteCollection(entry.id, id);
    else if (entry.kind === 'profile') await db.saveProfile(entry.profile, id);
  }, []);

  const flushQueue = useCallback(
    async (id: string) => {
      const queue = readQueue(id);
      if (queue.length === 0) {
        setPendingWrites(0);
        return;
      }

      const remaining: PendingWrite[] = [];
      for (const entry of queue) {
        try {
          await applyWrite(entry, id);
        } catch {
          remaining.push(entry);
        }
      }

      writeQueue(id, remaining);
      setPendingWrites(remaining.length);
      if (remaining.length === 0) setLastSyncedAt(new Date().toISOString());
    },
    [applyWrite],
  );

  const push = useCallback(
    async (entry: PendingWrite) => {
      if (!userId) return;
      try {
        await applyWrite(entry, userId);
        setLastSyncedAt(new Date().toISOString());
      } catch (err) {
        // Keep the optimistic local change and retry when connectivity returns.
        enqueue(userId, entry);
        setPendingWrites(readQueue(userId).length);
        setError(
          err instanceof Error
            ? `Saved locally — could not reach the cloud (${err.message}).`
            : 'Saved locally — could not reach the cloud.',
        );
      }
    },
    [userId, applyWrite],
  );

  /* ---------------------------------------------------------------------- */
  /* Load                                                                    */
  /* ---------------------------------------------------------------------- */

  const load = useCallback(
    async (id: string) => {
      setLoading(true);

      // Paint from cache immediately so a slow network is not a blank screen.
      const cached = readSnapshot(id);
      if (cached) {
        // Cached rows predate the 0-100 rating scale, so normalise on read.
        setGames(cached.games.map((g) => ({ ...g, rating: normalizeRating(g.rating) })));
        setCollections(
          withSystemColors(cached.collections.length ? cached.collections : DEFAULT_COLLECTIONS),
        );
        if (cached.profile) setProfile(cached.profile);
      }
      setPendingWrites(readQueue(id).length);

      try {
        await flushQueue(id);

        const [remoteGames, remoteCollections, remoteProfile] = await Promise.all([
          db.listGames(id),
          db.listCollections(id),
          db.getProfile(id),
        ]);

        const nextCollections = withSystemColors(
          remoteCollections.length ? remoteCollections : DEFAULT_COLLECTIONS,
        );
        const nextProfile: UserProfile = remoteProfile ?? {
          id,
          username: user?.email?.split('@')[0] || 'Player',
          email: user?.email,
          sidebarConfig: DEFAULT_SIDEBAR_CONFIG,
          platformOrder: DEFAULT_PLATFORM_SORT_ORDER,
        };

        // Fetched on its own rather than in the batch above: this table arrived
        // after the others, so a project running an older schema answers with
        // "relation does not exist" — which must not take the whole library
        // down with it. No link simply means no live platform data.
        db.getPlatformAccounts(id)
          .then(setPlatformAccounts)
          .catch(() => setPlatformAccounts(null));

        setGames(remoteGames);
        setCollections(nextCollections);
        setProfile(nextProfile);
        writeSnapshot(id, {
          games: remoteGames,
          collections: nextCollections,
          profile: nextProfile,
        });
        setLastSyncedAt(new Date().toISOString());
        setError(null);

        // First sign-in on a fresh account: seed starter collections and profile.
        if (!remoteCollections.length) await db.upsertCollections(DEFAULT_COLLECTIONS, id);
        if (!remoteProfile) await db.saveProfile(nextProfile, id);
      } catch (err) {
        setError(
          err instanceof Error
            ? `Could not load your library from the cloud (${err.message}). Showing the last local copy.`
            : 'Could not load your library from the cloud. Showing the last local copy.',
        );
      } finally {
        setLoading(false);
      }
    },
    [flushQueue, user?.email],
  );

  useEffect(() => {
    if (!userId) {
      setGames([]);
      setCollections(DEFAULT_COLLECTIONS);
      setLoading(false);
      return;
    }
    void load(userId);
  }, [userId, load]);

  // Persist a cache snapshot whenever state settles.
  useEffect(() => {
    if (!userId || loading) return;
    writeSnapshot(userId, { games, collections, profile });
  }, [userId, loading, games, collections, profile]);

  // Retry queued writes as soon as the connection comes back.
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      if (userId) void flushQueue(userId);
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [userId, flushQueue]);

  /* ---------------------------------------------------------------------- */
  /* Mutations                                                               */
  /* ---------------------------------------------------------------------- */

  const addGame = useCallback(
    (data: Omit<UserGame, 'id' | 'addedAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const game: UserGame = { ...data, id: newId(), addedAt: now, updatedAt: now };

      // A game added already finished is dated now unless a date was given, so
      // it has somewhere to sit in a list ordered by completion.
      if (!game.completedAt && (game.status === 'mastered' || isPerfect(game))) {
        game.completedAt = now;
      }
      setGames((prev) => [game, ...prev]);
      void push({ kind: 'game', op: 'upsert', game });

      // Sorting and platform grouping decide where a new game lands, which is
      // often out of sight.
      followGame(game.id);

      // Held back so the new card can land and run its progress bar up to full
      // first — firing on mount put the burst behind the dialog that was still
      // closing, and it was over before the card was even looked at.
      if (game.status === 'mastered' || isPerfect(game)) {
        triggerCelebration(game.id, ADD_CELEBRATION_DELAY_MS);
      }
    },
    [push, triggerCelebration, followGame],
  );

  const updateGame = useCallback(
    (id: string, updates: Partial<UserGame>) => {
      // Derived from the latest ref rather than inside the setGames updater:
      // React decides when that updater runs, so reading a flag set inside it
      // is a race — one that silently skipped the completion celebration.
      const current = latest.current.games.find((g) => g.id === id);
      if (!current) return;

      const merged: UserGame = { ...current, ...updates, updatedAt: new Date().toISOString() };

      const becameFinished =
        (merged.status === 'completed' || merged.status === 'mastered') &&
        current.status !== 'completed' &&
        current.status !== 'mastered';
      if (becameFinished) merged.completedAt = merged.completedAt ?? merged.updatedAt;

      /**
       * Taking an unlock back undoes the completion.
       *
       * The status was standing in for 100% in several places, so a game filed
       * as mastered kept its gold rim, its nav badge and its place in the
       * showcase after an unlock was removed — while the meter underneath
       * honestly read 95%. Losing the last unlock now demotes the shelf the
       * game sits on, and the completion date goes with it, since there is no
       * longer a completion for it to date. Only the status the app set itself
       * is withdrawn: an explicit status in this same edit is left alone.
       */
      if (
        updates.status === undefined &&
        merged.status === 'mastered' &&
        isPerfect(current) &&
        !isPerfect(merged)
      ) {
        merged.status = 'playing';
        merged.completedAt = undefined;
      }

      // Explicit undefined check: dropping back to 0 unlocked is a real edit.
      const progressed =
        updates.achievementsUnlocked !== undefined || updates.hoursPlayed !== undefined;
      if (progressed) merged.lastPlayedAt = merged.updatedAt;

      // Unlocking the last one counts even when the status never changes.
      const becamePerfect = !isPerfect(current) && isPerfect(merged);
      const celebrate = becameFinished || becamePerfect;

      // The last unlock is a completion in its own right, whatever shelf the
      // game is filed on, so it carries a date like any other.
      if (becamePerfect && !merged.completedAt) merged.completedAt = merged.updatedAt;

      // A status change re-files a game: out of the backlog, into another
      // section, sometimes off the current view entirely. Follow it so the move
      // is something you watch rather than something you go looking for.
      if (updates.status !== undefined && updates.status !== current.status) {
        followGame(id);
      }

      setGames((prev) => prev.map((game) => (game.id === id ? merged : game)));
      void push({ kind: 'game', op: 'upsert', game: merged });
      if (celebrate) triggerCelebration(id);
    },
    [push, triggerCelebration, followGame],
  );

  const deleteGame = useCallback(
    (id: string) => {
      setGames((prev) => prev.filter((g) => g.id !== id));
      void push({ kind: 'game', op: 'delete', id });
    },
    [push],
  );

  const createCollection = useCallback(
    (name: string, description?: string, color = DEFAULT_COLLECTION_COLOR, icon = 'Folder') => {
      const collection: Collection = {
        id: newId(),
        name,
        description,
        color,
        icon,
        isSystem: false,
        createdAt: new Date().toISOString(),
      };
      setCollections((prev) => [...prev, collection]);
      // Kept on the ref as well as in state: a caller that creates a collection
      // and files a game into it in the same tick would otherwise look it up
      // before React has applied the update and create a second one.
      latest.current.collections = [...latest.current.collections, collection];
      void push({ kind: 'collections', op: 'upsert', collections: [collection] });
      return collection;
    },
    [push],
  );

  const updateCollection = useCallback(
    (id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>) => {
      const current = latest.current.collections.find((c) => c.id === id);
      if (!current) return;

      // A system collection's colour is identity rather than user data —
      // withSystemColors restores it on every load — so an attempt to change it
      // would be undone on the next refresh. Everything else is editable.
      const { color, ...rest } = updates;
      const merged: Collection = {
        ...current,
        ...rest,
        ...(current.isSystem ? {} : { color: color ?? current.color }),
        updatedAt: new Date().toISOString(),
      };

      setCollections((prev) => prev.map((c) => (c.id === id ? merged : c)));
      void push({ kind: 'collections', op: 'upsert', collections: [merged] });
    },
    [push],
  );

  const deleteCollection = useCallback(
    (id: string) => {
      setCollections((prev) => prev.filter((c) => c.id !== id));

      const affected = latest.current.games.filter((g) => g.collections?.includes(id));
      if (affected.length) {
        const now = new Date().toISOString();
        const updated = affected.map((g) => ({
          ...g,
          collections: g.collections.filter((c) => c !== id),
          updatedAt: now,
        }));
        setGames((prev) => prev.map((g) => updated.find((u) => u.id === g.id) ?? g));
        updated.forEach((game) => void push({ kind: 'game', op: 'upsert', game }));
      }

      void push({ kind: 'collection', op: 'delete', id });
    },
    [push],
  );

  /**
   * Linking an account writes straight through rather than joining the offline
   * queue: there is nothing to do with a link until the network is back anyway,
   * and a queued one would report success for a connection that never happened.
   */
  const linkSteamAccount = useCallback(
    async (account: { steamId: string; persona?: string }) => {
      if (!userId) return;
      await db.saveSteamAccount(
        { steamId: account.steamId, steamPersona: account.persona ?? null },
        userId,
      );
      setPlatformAccounts((prev) => ({
        ...(prev ?? {}),
        steamId: account.steamId,
        steamPersona: account.persona,
      }));
    },
    [userId],
  );

  const unlinkSteamAccount = useCallback(async () => {
    if (!userId) return;
    await db.saveSteamAccount({ steamId: null, steamPersona: null }, userId);
    setPlatformAccounts((prev) => ({ ...(prev ?? {}), steamId: undefined, steamPersona: undefined }));
  }, [userId]);

  /**
   * The PlayStation link is established by the edge function rather than from
   * here — the NPSSO is exchanged server-side and never touches this client —
   * so afterwards the row is simply re-read.
   */
  const refreshPlatformAccounts = useCallback(async () => {
    if (!userId) return;
    try {
      setPlatformAccounts(await db.getPlatformAccounts(userId));
    } catch {
      setPlatformAccounts(null);
    }
  }, [userId]);

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      const next = { ...latest.current.profile, ...updates };
      setProfile(next);
      void push({ kind: 'profile', op: 'upsert', profile: next });
    },
    [push],
  );

  const updateSidebarConfig = useCallback(
    (updates: Partial<SidebarConfig>) => {
      updateProfile({
        sidebarConfig: {
          ...(latest.current.profile.sidebarConfig || DEFAULT_SIDEBAR_CONFIG),
          ...updates,
        },
      });
    },
    [updateProfile],
  );

  const replaceAll = useCallback(
    async (snapshot: { games: UserGame[]; collections: Collection[]; profile?: UserProfile }) => {
      if (!userId) return;
      setGames(snapshot.games);
      setCollections(snapshot.collections);
      if (snapshot.profile) setProfile({ ...snapshot.profile, id: userId });

      try {
        await db.upsertGames(snapshot.games, userId);
        await db.upsertCollections(snapshot.collections, userId);
        if (snapshot.profile) await db.saveProfile({ ...snapshot.profile, id: userId }, userId);
        setLastSyncedAt(new Date().toISOString());
      } catch (err) {
        setError(
          err instanceof Error
            ? `Restored locally, but the cloud copy was not updated (${err.message}).`
            : 'Restored locally, but the cloud copy was not updated.',
        );
      }
    },
    [userId],
  );

  const refresh = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId, load]);

  const value = useMemo<GameContextType>(
    () => ({
      games,
      collections,
      profile,
      sidebarConfig: profile.sidebarConfig || DEFAULT_SIDEBAR_CONFIG,
      platformAccounts,
      linkSteamAccount,
      unlinkSteamAccount,
      refreshPlatformAccounts,
      loading,
      error,
      dismissError: () => setError(null),
      isOnline,
      pendingWrites,
      lastSyncedAt,
      refresh,
      activePlatformFilter,
      setActivePlatformFilter,
      activeStatusFilter,
      setActiveStatusFilter,
      activeCollectionFilter,
      setActiveCollectionFilter,
      isQuickAddOpen,
      setIsQuickAddOpen,
      addGame,
      updateGame,
      deleteGame,
      createCollection,
      updateCollection,
      deleteCollection,
      updateProfile,
      updateSidebarConfig,
      replaceAll,
      celebration,
      triggerCelebration,
      follow,
    }),
    [
      games,
      collections,
      profile,
      platformAccounts,
      linkSteamAccount,
      unlinkSteamAccount,
      refreshPlatformAccounts,
      loading,
      error,
      isOnline,
      pendingWrites,
      lastSyncedAt,
      refresh,
      activePlatformFilter,
      setActivePlatformFilter,
      activeStatusFilter,
      setActiveStatusFilter,
      activeCollectionFilter,
      setActiveCollectionFilter,
      isQuickAddOpen,
      addGame,
      updateGame,
      deleteGame,
      createCollection,
      updateCollection,
      deleteCollection,
      updateProfile,
      updateSidebarConfig,
      replaceAll,
      celebration,
      triggerCelebration,
      follow,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

export { clearUserCache };
