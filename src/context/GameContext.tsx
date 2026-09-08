import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import confetti from 'canvas-confetti';
import {
  Collection,
  GameStatus,
  Platform,
  SidebarConfig,
  UserGame,
  UserProfile,
} from '../types';
import {
  DEFAULT_COLLECTIONS,
  DEFAULT_COLLECTION_COLOR,
  DEFAULT_PLATFORM_SORT_ORDER,
} from '../lib/constants';
import { normalizeRating } from '../lib/rating';
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
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;

  addGame: (game: Omit<UserGame, 'id' | 'addedAt' | 'updatedAt'>) => void;
  updateGame: (id: string, updates: Partial<UserGame>) => void;
  deleteGame: (id: string) => void;
  createCollection: (name: string, description?: string, color?: string, icon?: string) => void;
  deleteCollection: (id: string) => void;

  updateProfile: (updates: Partial<UserProfile>) => void;
  updateSidebarConfig: (updates: Partial<SidebarConfig>) => void;
  replaceAll: (snapshot: {
    games: UserGame[];
    collections: Collection[];
    profile?: UserProfile;
  }) => Promise<void>;

  triggerCelebration: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isPerfect = (game: Pick<UserGame, 'achievementsUnlocked' | 'achievementsTotal'>) =>
  game.achievementsTotal > 0 && game.achievementsUnlocked >= game.achievementsTotal;

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingWrites, setPendingWrites] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [activePlatformFilter, setActivePlatformFilter] = useState<Platform | 'all'>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<GameStatus | 'all'>('all');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Latest state, so queue flushes and cache writes never close over stale data.
  const latest = useRef({ games, collections, profile });
  latest.current = { games, collections, profile };

  useEffect(() => {
    purgeLegacyStorage();
  }, []);

  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        // Literal hex: canvas-confetti paints to a canvas and cannot resolve
        // CSS custom properties. These mirror the trophy and platform tokens.
        colors: ['#f2c14e', '#66c0f4', '#4d9bf0', '#52c294', '#ffffff'],
      });
    } catch {
      // Canvas unavailable — the state change still happened.
    }
  }, []);

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
        setCollections(cached.collections.length ? cached.collections : DEFAULT_COLLECTIONS);
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

        const nextCollections = remoteCollections.length ? remoteCollections : DEFAULT_COLLECTIONS;
        const nextProfile: UserProfile = remoteProfile ?? {
          id,
          username: user?.email?.split('@')[0] || 'Player',
          email: user?.email,
          sidebarConfig: DEFAULT_SIDEBAR_CONFIG,
          platformOrder: DEFAULT_PLATFORM_SORT_ORDER,
        };

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
      setGames((prev) => [game, ...prev]);
      void push({ kind: 'game', op: 'upsert', game });
      if (game.status === 'mastered' || isPerfect(game)) triggerCelebration();
    },
    [push, triggerCelebration],
  );

  const updateGame = useCallback(
    (id: string, updates: Partial<UserGame>) => {
      let next: UserGame | null = null;
      let celebrate = false;

      setGames((prev) =>
        prev.map((game) => {
          if (game.id !== id) return game;

          const merged: UserGame = { ...game, ...updates, updatedAt: new Date().toISOString() };

          const becameFinished =
            (merged.status === 'completed' || merged.status === 'mastered') &&
            game.status !== 'completed' &&
            game.status !== 'mastered';
          if (becameFinished) merged.completedAt = merged.completedAt ?? merged.updatedAt;

          // Explicit undefined check: dropping back to 0 unlocked is a real edit.
          const progressed =
            updates.achievementsUnlocked !== undefined || updates.hoursPlayed !== undefined;
          if (progressed) merged.lastPlayedAt = merged.updatedAt;

          celebrate = becameFinished || (!isPerfect(game) && isPerfect(merged));
          next = merged;
          return merged;
        }),
      );

      if (next) void push({ kind: 'game', op: 'upsert', game: next });
      if (celebrate) triggerCelebration();
    },
    [push, triggerCelebration],
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
      void push({ kind: 'collections', op: 'upsert', collections: [collection] });
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
      isQuickAddOpen,
      setIsQuickAddOpen,
      addGame,
      updateGame,
      deleteGame,
      createCollection,
      deleteCollection,
      updateProfile,
      updateSidebarConfig,
      replaceAll,
      triggerCelebration,
    }),
    [
      games,
      collections,
      profile,
      loading,
      error,
      isOnline,
      pendingWrites,
      lastSyncedAt,
      refresh,
      activePlatformFilter,
      activeStatusFilter,
      isQuickAddOpen,
      addGame,
      updateGame,
      deleteGame,
      createCollection,
      deleteCollection,
      updateProfile,
      updateSidebarConfig,
      replaceAll,
      triggerCelebration,
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
