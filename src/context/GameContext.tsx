import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CELEBRATION_WINDOW_MS } from '../components/Celebration';

import {
  Collection,
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
  withPermanentCollections,
  withPermanentColors,
} from '../lib/constants';
import {
  COMPLETE_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  fileInPermanent,
  isPermanentCollection,
  normalizeCollections,
  permanentOf,
} from '../lib/collections';
import { isPerfect } from '../lib/completion';
import { normalizeRating } from '../lib/rating';
import { preloadAwardSounds } from '../lib/sound';
import { usePersistentState } from '../lib/usePersistentState';
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
  /**
   * A signed-in account with nothing on the server yet.
   *
   * Deliberately not an error: a first sign-in used to be reported as a library
   * that could not be loaded, which is alarming and untrue. The setup route is
   * what this sends people to instead.
   */
  needsSetup: boolean;
  dismissError: () => void;
  isOnline: boolean;
  /** Writes waiting for connectivity. */
  pendingWrites: number;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
  /**
   * The library as of the last write, not the last render. For work that runs
   * across awaits — a sync that starts after a reload — where the games a
   * callback closed over may already be out of date.
   */
  getGames: () => UserGame[];

  activePlatformFilter: Platform | 'all';
  setActivePlatformFilter: (platform: Platform | 'all') => void;
  /** Library collection filter. 'all', or a collection id. */
  activeCollectionFilter: string;
  setActiveCollectionFilter: (collectionId: string) => void;
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;

  /**
   * Returns the stored game, so a caller can sync the one it just added.
   *
   * `announce` is how a caller says whether the game deserves saying out loud —
   * the dialog that shows what landed, where it went and whether it is syncing.
   * The add dialog wants that; the search page does not, since adding there is
   * a run of games and a dialog after each would be two clicks apiece.
   */
  addGame: (
    game: Omit<UserGame, 'id' | 'addedAt' | 'updatedAt'>,
    options?: { announce?: boolean },
  ) => UserGame;
  updateGame: (id: string, updates: Partial<UserGame>, options?: UpdateGameOptions) => void;
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

  /**
   * A game with a completion still to be celebrated. The token restarts the
   * burst on repeats.
   *
   * It is a request rather than the burst itself: the card plays it — its
   * sound with it — once it is actually on screen, and says so by calling
   * `celebrationPlayed`, so a completion that lands on another page or below
   * the fold is waiting when you get there instead of already over.
   */
  celebration: { gameId: string; token: number } | null;
  triggerCelebration: (gameId: string) => void;
  /** Called by whichever surface has just played this celebration. */
  celebrationPlayed: (token: number) => void;

  /**
   * A game just added, waiting to be announced.
   *
   * Adding used to throw the page at the new game: opening another shelf,
   * scrolling, and landing somewhere you had not asked to be. Now the app says
   * what it did — the game, where it went, whether it is syncing — and going
   * there is a button rather than a surprise.
   */
  added: { gameId: string; token: number } | null;
  dismissAdded: () => void;
  /**
   * A game the app itself re-filed, waiting to be announced.
   *
   * Only ever the app's own doing — unlocking the last achievement, or a
   * trophy list growing under a finished game. A move you made by hand needs no
   * announcement, because you are the one who made it.
   */
  moved: { gameId: string; collectionId: string; token: number } | null;
  dismissMoved: () => void;
  /**
   * Take me to this game: opens the page it is on, if it is not this one, and
   * scrolls its card into view.
   */
  goToGame: (gameId: string) => void;
  /**
   * A game to bring on screen: asked for by name, or re-filed by a move to
   * another shelf. The token makes flagging the same game twice a fresh event —
   * without it, a game moved twice over would only ever be followed once.
   */
  follow: { gameId: string; token: number } | null;
}

/** How a caller describes a write, where the difference changes what is said. */
export interface UpdateGameOptions {
  /**
   * This edit was the app's idea, not the user's — a sync moving a game whose
   * trophy list grew. A move it causes is announced; a move you made by hand is
   * not, because you are the one who made it.
   */
  automatic?: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Guards for the filters below, which survive a reload in localStorage. */
const isPlatformFilter = (value: unknown): value is Platform | 'all' =>
  value === 'all' || value === 'steam' || value === 'ps5';
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
  // Not an error: an account that has never been set up, which the setup route
  // answers and the banner used to mislabel as a failed load.
  const [needsSetup, setNeedsSetup] = useState(false);
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
  const [added, setAdded] = useState<{ gameId: string; token: number } | null>(null);
  const [moved, setMoved] = useState<{
    gameId: string;
    collectionId: string;
    token: number;
  } | null>(null);
  const [follow, setFollow] = useState<{ gameId: string; token: number } | null>(null);
  const followTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (followTimer.current !== null) window.clearTimeout(followTimer.current);
    },
    [],
  );

  /**
   * Marks a game for its card to bring itself on screen. Used when a change
   * moves a game somewhere the eye was not already looking — promoted out of
   * the backlog into another section entirely — and when it is asked for by
   * name, from the dialog that announces a game just added.
   */
  const followGame = useCallback((gameId: string) => {
    setFollow({ gameId, token: Date.now() });
    if (followTimer.current !== null) window.clearTimeout(followTimer.current);
    followTimer.current = window.setTimeout(() => setFollow(null), FOLLOW_GAME_MS);
  }, []);

  const dismissAdded = useCallback(() => setAdded(null), []);
  const dismissMoved = useCallback(() => setMoved(null), []);

  /** The "go to game" the announcement offers: put the dialog away, then go. */
  const goToGame = useCallback(
    (gameId: string) => {
      setAdded(null);
      setMoved(null);
      followGame(gameId);
    },
    [followGame],
  );

  const clearCelebrationTimers = () => {
    celebrationTimers.current.forEach(window.clearTimeout);
    celebrationTimers.current = [];
  };

  const triggerCelebration = useCallback((gameId: string) => {
    clearCelebrationTimers();
    setCelebration({ gameId, token: Date.now() });

    // Only an expiry. A celebration normally ends because the card played it
    // and said so; this is for the one that never gets looked at.
    celebrationTimers.current.push(
      window.setTimeout(() => setCelebration(null), CELEBRATION_WINDOW_MS),
    );
  }, []);

  const celebrationPlayed = useCallback((token: number) => {
    setCelebration((current) => (current?.token === token ? null : current));
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
          withPermanentColors(
            withPermanentCollections(
              cached.collections.length ? cached.collections : DEFAULT_COLLECTIONS,
            ),
          ),
        );
        if (cached.profile) setProfile(cached.profile);
      }
      setPendingWrites(readQueue(id).length);

      // Held across the try below, so the seeding writes that follow it can see
      // what the load found without being inside its catch.
      let profileToSeed: UserProfile | null = null;
      let collectionsToSeed: Collection[] = [];

      try {
        await flushQueue(id);

        const [remoteGames, remoteCollections, remoteProfile] = await Promise.all([
          db.listGames(id),
          db.listCollections(id),
          db.getProfile(id),
        ]);

        // The permanent shelves are asserted on every load, not only on an
        // empty account: a game's shelf is its membership of one of these rows,
        // so a row deleted out of band would strand every game filed on it.
        const nextCollections = withPermanentColors(
          withPermanentCollections(
            remoteCollections.length ? remoteCollections : DEFAULT_COLLECTIONS,
          ),
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

        /**
         * Games already at 100% but filed somewhere else.
         *
         * Reaching 100% now moves a game onto that shelf as it happens, but
         * games that got there before that rule existed are still filed as
         * playing, or on no shelf at all. They are moved once, here, quietly —
         * these are old completions, not new ones, so nothing celebrates.
         */
        const promoted: UserGame[] = [];
        const nextGames = remoteGames.map((game) => {
          const collections = normalizeCollections(game.collections);
          const needsShelf = isPerfect(game) && permanentOf(collections) !== COMPLETE_COLLECTION_ID;
          const changed =
            needsShelf || collections.length !== (game.collections?.length ?? 0);
          if (!changed) return game;

          const fixed: UserGame = {
            ...game,
            collections: needsShelf
              ? fileInPermanent(collections, COMPLETE_COLLECTION_ID)
              : collections,
            completedAt: needsShelf ? game.completedAt ?? game.updatedAt : game.completedAt,
          };
          promoted.push(fixed);
          return fixed;
        });

        // A filter naming a collection that has since been deleted — on another
        // device, or by the migration that merged the legacy shelves — would
        // show an empty library with nothing to explain it.
        setActiveCollectionFilter((filter) =>
          filter !== 'all' && !nextCollections.some((c) => c.id === filter) ? 'all' : filter,
        );

        latest.current.games = nextGames;
        latest.current.collections = nextCollections;
        setGames(nextGames);
        setCollections(nextCollections);
        setProfile(nextProfile);
        promoted.forEach((game) => void push({ kind: 'game', op: 'upsert', game }));
        writeSnapshot(id, {
          games: nextGames,
          collections: nextCollections,
          profile: nextProfile,
        });
        setLastSyncedAt(new Date().toISOString());
        setError(null);

        /**
         * A brand-new account, as opposed to one whose cloud is unreachable.
         *
         * Nothing at all on the server is not a failure — it is someone who has
         * just signed up. Reporting it as "could not load your library" is what
         * the setup route exists to replace.
         */
        setNeedsSetup(
          !remoteProfile && remoteCollections.length === 0 && remoteGames.length === 0,
        );
        if (!remoteProfile) profileToSeed = nextProfile;
        // A fresh account gets the whole starter set; an existing one gets back
        // only whichever permanent shelves it was missing.
        collectionsToSeed = remoteCollections.length
          ? nextCollections.filter(
              (c) => isPermanentCollection(c.id) && !remoteCollections.some((r) => r.id === c.id),
            )
          : nextCollections;
      } catch (err) {
        setError(
          err instanceof Error
            ? `Could not load your library from the cloud (${err.message}). Showing the last local copy.`
            : 'Could not load your library from the cloud. Showing the last local copy.',
        );
        setLoading(false);
        return;
      }

      setLoading(false);

      /**
       * Seeding, deliberately outside the try above.
       *
       * These writes are repairs, not the load: folding them into the same
       * catch meant a seed that failed — which it did on every account after
       * the first, while collection ids were globally unique — was reported as
       * a library that could not be read. A failed seed is retried on the next
       * load and costs nothing in the meantime.
       */
      try {
        await db.upsertCollections(collectionsToSeed, id);
        if (profileToSeed) await db.saveProfile(profileToSeed, id);
      } catch {
        // Retried on the next load; the shelves are present locally regardless.
      }
    },
    [flushQueue, push, user?.email],
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
  /**
   * Keeps the 100% shelf in step with whether a game is actually finished.
   *
   * One rule, both directions: earning every award files the game onto that
   * shelf, and losing one takes it off again — but only on the crossing, so a
   * game deliberately shelved elsewhere while at 100% stays where it was put.
   * Coming off, it lands on Playing, because it is a game you are part-way
   * through again rather than one with no shelf at all.
   *
   * There is no lazy re-creation here any more: the shelf is a permanent
   * collection, asserted on every load, so it cannot be missing.
   */
  const shelfForCompletion = (
    collections: string[],
    wasPerfect: boolean,
    isNowPerfect: boolean,
  ): string[] => {
    if (isNowPerfect) return fileInPermanent(collections, COMPLETE_COLLECTION_ID);
    if (wasPerfect && permanentOf(collections) === COMPLETE_COLLECTION_ID) {
      return fileInPermanent(collections, PLAYING_COLLECTION_ID);
    }
    return collections;
  };

  const addGame = useCallback(
    (
      data: Omit<UserGame, 'id' | 'addedAt' | 'updatedAt'>,
      { announce = true }: { announce?: boolean } = {},
    ) => {
      const now = new Date().toISOString();
      const game: UserGame = { ...data, id: newId(), addedAt: now, updatedAt: now };

      // Every unlock earned is the 100% shelf, whatever was picked in the form.
      if (isPerfect(game)) {
        game.collections = fileInPermanent(game.collections, COMPLETE_COLLECTION_ID);
        // A game added already finished is dated now unless a date was given,
        // so it has somewhere to sit in a list ordered by completion.
        game.completedAt = game.completedAt ?? now;
      }

      // The choke point: nothing reaches the cloud on two shelves at once.
      game.collections = normalizeCollections(game.collections);

      latest.current.games = [game, ...latest.current.games];
      setGames((prev) => [game, ...prev]);
      void push({ kind: 'game', op: 'upsert', game });

      // Sorting and platform grouping decide where a new game lands, which is
      // often out of sight and may not even be on this page. Rather than going
      // there uninvited, the app says what it did and offers the trip.
      if (announce) setAdded({ gameId: game.id, token: Date.now() });

      // Requested now, played by whichever surface is in front of someone — the
      // announcement while it is open, the card once it has been scrolled to.
      if (isPerfect(game)) triggerCelebration(game.id);

      return game;
    },
    [push, triggerCelebration],
  );

  const updateGame = useCallback(
    (id: string, updates: Partial<UserGame>, options: UpdateGameOptions = {}) => {
      // Derived from the latest ref rather than inside the setGames updater:
      // React decides when that updater runs, so reading a flag set inside it
      // is a race — one that silently skipped the completion celebration.
      const current = latest.current.games.find((g) => g.id === id);
      if (!current) return;

      const merged: UserGame = { ...current, ...updates, updatedAt: new Date().toISOString() };

      const wasPerfect = isPerfect(current);
      const nowPerfect = isPerfect(merged);
      const shelfBefore = permanentOf(current.collections);

      // Explicit undefined check: dropping back to 0 unlocked is a real edit.
      const progressed =
        updates.achievementsUnlocked !== undefined || updates.hoursPlayed !== undefined;
      if (progressed) merged.lastPlayedAt = merged.updatedAt;

      /**
       * Completion follows the counts, and only the counts.
       *
       * An explicit shelf in this same edit wins: the app withdraws only what
       * the app itself decided. So moving a game by hand is never argued with,
       * while unlocking the last award — or taking one back — re-files it.
       */
      // Whether this particular move was the app's doing, which is the only
      // kind worth announcing.
      let refiled = options.automatic === true;
      if (updates.collections === undefined && nowPerfect !== wasPerfect) {
        merged.collections = shelfForCompletion(merged.collections, wasPerfect, nowPerfect);
        refiled = true;
      }

      // The last unlock is a completion in its own right, whatever shelf the
      // game is filed on, so it carries a date like any other — and losing it
      // takes the date away, since there is no longer a completion to date.
      if (nowPerfect && !merged.completedAt) merged.completedAt = merged.updatedAt;
      if (wasPerfect && !nowPerfect && updates.completedAt === undefined) {
        merged.completedAt = undefined;
      }

      merged.collections = normalizeCollections(merged.collections);

      // Unlocking the last one counts even when nothing else changes.
      const celebrate = !wasPerfect && nowPerfect;

      // Moving shelf re-files a game: out of the backlog, into another section,
      // sometimes off the current view entirely. Follow it so the move is
      // something you watch rather than something you go looking for.
      const shelfAfter = permanentOf(merged.collections);
      if (shelfAfter !== shelfBefore) {
        followGame(id);

        // Moved by the app rather than by you: say so, the same way adding a
        // game does, rather than letting it change shelf behind your back.
        if (refiled && shelfAfter) {
          setMoved({ gameId: id, collectionId: shelfAfter, token: Date.now() });
        }
      }

      // The ref as well as state, so a second write to this game before the
      // next render — a sync walking the library — builds on this one.
      latest.current.games = latest.current.games.map((game) => (game.id === id ? merged : game));
      setGames((prev) => prev.map((game) => (game.id === id ? merged : game)));
      void push({ kind: 'game', op: 'upsert', game: merged });
      if (celebrate) triggerCelebration(id);
    },
    [push, triggerCelebration, followGame],
  );

  const deleteGame = useCallback(
    (id: string) => {
      latest.current.games = latest.current.games.filter((g) => g.id !== id);
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

      // A permanent collection's colour is identity rather than user data —
      // withPermanentColors restores it on every load — so an attempt to change
      // it would be undone on the next refresh. Locked by id rather than by a
      // stored flag, which a restored backup can get wrong. Name and
      // description stay editable, which is how the shelves are renamed.
      const { color, ...rest } = updates;
      const merged: Collection = {
        ...current,
        ...rest,
        ...(isPermanentCollection(id) ? {} : { color: color ?? current.color }),
        updatedAt: new Date().toISOString(),
      };

      setCollections((prev) => prev.map((c) => (c.id === id ? merged : c)));
      void push({ kind: 'collections', op: 'upsert', collections: [merged] });
    },
    [push],
  );

  const deleteCollection = useCallback(
    (id: string) => {
      // The real guard, in the model rather than only in the UI: a shelf is
      // where games live, so deleting one would strand every game on it.
      if (isPermanentCollection(id)) return;

      // A filter naming a collection that no longer exists shows an empty
      // library with nothing to explain it.
      setActiveCollectionFilter((filter) => (filter === id ? 'all' : filter));

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

      // The same choke point every other write goes through: a restored backup
      // is the likeliest source of an illegal array, since it may have been
      // written by any past version of the app.
      const games = snapshot.games.map((game) => ({
        ...game,
        collections: normalizeCollections(game.collections),
      }));
      const collections = withPermanentColors(withPermanentCollections(snapshot.collections));

      setGames(games);
      setCollections(collections);
      latest.current.games = games;
      latest.current.collections = collections;
      if (snapshot.profile) setProfile({ ...snapshot.profile, id: userId });

      try {
        await db.upsertGames(games, userId);
        await db.upsertCollections(collections, userId);
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

  const getGames = useCallback(() => latest.current.games, []);

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
      needsSetup,
      dismissError: () => setError(null),
      isOnline,
      pendingWrites,
      lastSyncedAt,
      refresh,
      getGames,
      activePlatformFilter,
      setActivePlatformFilter,
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
      celebrationPlayed,
      added,
      dismissAdded,
      moved,
      dismissMoved,
      goToGame,
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
      needsSetup,
      isOnline,
      pendingWrites,
      lastSyncedAt,
      refresh,
      getGames,
      activePlatformFilter,
      setActivePlatformFilter,
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
      celebrationPlayed,
      added,
      dismissAdded,
      moved,
      dismissMoved,
      goToGame,
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
