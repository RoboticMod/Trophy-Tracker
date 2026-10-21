import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useGame } from './GameContext';
import { useSync } from './SyncContext';
import { isPerfect } from '../lib/completion';
import {
  ProgressMarks,
  ProgressNotification,
  readNotifications,
  readProgressMarks,
  writeNotifications,
  writeProgressMarks,
} from '../lib/localCache';

/** How many the bell keeps, newest first. */
const MAX_KEPT = 50;
/** How long one is kept once it has happened. */
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

interface NotificationsValue {
  notifications: ProgressNotification[];
  unreadCount: number;
  /** An unread one finished a game — the bell turns gold for it. */
  hasUnreadCompletion: boolean;
  markAllRead: () => void;
  clear: () => void;
  /**
   * Puts cleared notifications back — the Undo after "Clear all". Anything that
   * arrived in between is kept: a restore merges by id rather than replacing.
   */
  restore: (list: ProgressNotification[]) => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

const prune = (list: ProgressNotification[]): ProgressNotification[] => {
  const cutoff = Date.now() - KEEP_MS;
  return list
    .filter((n) => new Date(n.at).getTime() >= cutoff)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, MAX_KEPT);
};

/**
 * What the platforms brought back that this device had not seen, kept in the
 * bell until it is looked at.
 *
 * It used to be a dialog that opened by itself once a session, after the
 * opening sync: in the way when it arrived, and gone for good once dismissed.
 * Now the same news lands in the bell, which says there is something waiting
 * and keeps it there to be read whenever.
 *
 * Award counts as of the last look are kept on the device, and each sync pass
 * that settles is compared against them. A game added since is left out — it
 * is new rather than further along — and so is one that went backwards, which
 * is a correction rather than progress. After the first pass of a session only
 * games a platform keeps up to date are compared, so a count you changed by
 * hand is not handed back to you as news.
 */
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { getGames, loading } = useGame();
  const sync = useSync();
  const userId = user?.id ?? null;

  const [notifications, setNotifications] = useState<ProgressNotification[]>(() =>
    userId ? prune(readNotifications(userId)) : [],
  );

  // A different account is a different history.
  const loadedFor = useRef(userId);
  useEffect(() => {
    if (loadedFor.current === userId) return;
    loadedFor.current = userId;
    setNotifications(userId ? prune(readNotifications(userId)) : []);
  }, [userId]);

  const commit = useCallback(
    (update: (list: ProgressNotification[]) => ProgressNotification[]) => {
      if (!userId) return;
      setNotifications((list) => {
        const next = prune(update(list));
        writeNotifications(userId, next);
        return next;
      });
    },
    [userId],
  );

  const linked = sync.steam.isLinked || sync.psn.isLinked;
  /**
   * Waited for: the counts are only worth comparing once a sync has brought
   * the platforms' version of them in. Where nothing is linked there is no
   * pass to wait for, and the cloud reload is the whole story.
   */
  const settled = !loading && !sync.running && (!linked || sync.lastRunAt !== null);
  const lastChecked = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !settled) return;
    const pass = `${userId}:${sync.lastRunAt ?? 'open'}`;
    if (lastChecked.current === pass) return;
    const firstOfSession = lastChecked.current === null;
    lastChecked.current = pass;

    const games = getGames();
    const marks = readProgressMarks(userId);

    // Recorded before anything is shown, so the same news is never waiting
    // a second time.
    const now: ProgressMarks = {};
    games.forEach((game) => {
      now[game.id] = game.achievementsUnlocked;
    });
    writeProgressMarks(userId, now);

    // Nothing to compare against on a device's first visit, and a library's
    // worth of "new" progress is not news.
    if (!marks) return;

    const at = new Date().toISOString();
    const moved = games.filter(
      (game) =>
        game.achievementsTotal > 0 &&
        marks[game.id] !== undefined &&
        game.achievementsUnlocked > marks[game.id] &&
        (firstOfSession || game.syncSource !== undefined),
    );
    if (moved.length === 0) return;

    commit((list) => {
      const next = [...list];
      moved.forEach((game) => {
        const completed = isPerfect(game);
        // Still unread from an earlier pass: that run of progress carries on,
        // rather than the same game appearing twice.
        const open = next.findIndex((n) => n.gameId === game.id && !n.read);
        if (open >= 0) {
          next[open] = {
            ...next[open],
            to: game.achievementsUnlocked,
            total: game.achievementsTotal,
            completed: next[open].completed || completed,
            at,
          };
        } else {
          next.push({
            id: `${game.id}:${Date.now()}`,
            gameId: game.id,
            from: marks[game.id],
            to: game.achievementsUnlocked,
            total: game.achievementsTotal,
            completed,
            at,
            read: false,
          });
        }
      });
      return next;
    });
  }, [userId, settled, sync.lastRunAt, getGames, commit]);

  const markAllRead = useCallback(
    () =>
      commit((list) =>
        list.some((n) => !n.read) ? list.map((n) => (n.read ? n : { ...n, read: true })) : list,
      ),
    [commit],
  );
  const clear = useCallback(() => commit(() => []), [commit]);
  const restore = useCallback(
    (cleared: ProgressNotification[]) =>
      commit((list) => {
        const present = new Set(list.map((n) => n.id));
        return [...list, ...cleared.filter((n) => !present.has(n.id))];
      }),
    [commit],
  );

  const value = useMemo<NotificationsValue>(() => {
    const unread = notifications.filter((n) => !n.read);
    return {
      notifications,
      unreadCount: unread.length,
      hasUnreadCompletion: unread.some((n) => n.completed),
      markAllRead,
      clear,
      restore,
    };
  }, [notifications, markAllRead, clear, restore]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export function useNotifications(): NotificationsValue {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationsProvider');
  return value;
}
