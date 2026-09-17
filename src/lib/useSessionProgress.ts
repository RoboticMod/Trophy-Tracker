import { useCallback, useEffect, useRef, useState } from 'react';
import { UserGame } from '../types';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useSync } from '../context/SyncContext';
import { isPerfect } from './completion';
import { ProgressMarks, readProgressMarks, writeProgressMarks } from './localCache';

/** One game that moved on while you were away. */
export interface SessionProgress {
  game: UserGame;
  /** Where the game stood the last time this device looked. */
  from: number;
  /** Awards earned since. */
  gained: number;
  /** Those awards finished it off. */
  completed: boolean;
}

/**
 * What has happened since this device last looked.
 *
 * The app syncs on open, so the first thing it learns each session is every
 * trophy earned on the console and every achievement earned on a PC it was not
 * watching — and then says nothing about any of it. The counts simply are what
 * they are by the time you see them, and a platinum won on Sunday looks exactly
 * like a platinum won a year ago.
 *
 * This is the difference: award counts as of the last visit are kept on the
 * device, and what has moved since is handed back once the opening sync has
 * settled. A game added since the last visit is left out — it is new rather
 * than further along — and so is one that went backwards, which is a correction
 * rather than progress.
 */
export function useSessionProgress(): {
  progress: SessionProgress[];
  dismiss: () => void;
} {
  const { user } = useAuth();
  const { getGames, loading } = useGame();
  const sync = useSync();

  const [progress, setProgress] = useState<SessionProgress[]>([]);
  const checkedFor = useRef<string | null>(null);

  const linked = sync.steam.isLinked || sync.psn.isLinked;

  /**
   * Waited for on purpose: the counts are only worth comparing once the opening
   * sync has brought the platforms' version of them in. Where nothing is linked
   * there is no pass to wait for, and the cloud reload is the whole story.
   */
  const settled = !loading && (!linked || sync.lastRunAt !== null);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId || !settled || checkedFor.current === userId) return;
    checkedFor.current = userId;

    const games = getGames();
    const marks = readProgressMarks(userId);

    // Recorded before anything is shown: whatever happens to the dialog after
    // this — dismissed, or the tab closed on it — the same news is not waiting
    // again tomorrow.
    const now: ProgressMarks = {};
    games.forEach((game) => {
      now[game.id] = game.achievementsUnlocked;
    });
    writeProgressMarks(userId, now);

    // Nothing to compare against on a device's first visit, and a library's
    // worth of "new" progress is not news.
    if (!marks) return;

    const moved = games
      .filter((game) => game.achievementsTotal > 0 && marks[game.id] !== undefined)
      .map<SessionProgress>((game) => ({
        game,
        from: marks[game.id],
        gained: game.achievementsUnlocked - marks[game.id],
        completed: isPerfect(game) && game.achievementsUnlocked > marks[game.id],
      }))
      .filter((entry) => entry.gained > 0)
      // Finished games first, then whatever moved the most.
      .sort((a, b) => Number(b.completed) - Number(a.completed) || b.gained - a.gained);

    if (moved.length > 0) setProgress(moved);
  }, [userId, settled, getGames]);

  // A different account signing in is a different device history.
  useEffect(() => {
    if (checkedFor.current !== null && checkedFor.current !== userId) {
      checkedFor.current = null;
      setProgress([]);
    }
  }, [userId]);

  const dismiss = useCallback(() => setProgress([]), []);

  return { progress, dismiss };
}
