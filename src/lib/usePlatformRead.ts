import { useCallback, useRef, useState } from 'react';
import { Platform } from '../types';
import { useGame } from '../context/GameContext';
import { getSteamAchievements } from './steam';
import { getPsnTitleProgress, getPsnTitles, matchByTitle, normalizeTitle, PsnPlayedGame } from './psn';
import { usePsnTrophyScope } from './psnTrophyScope';

/** What a platform says about one game, read before it is saved. */
export interface PlatformProgress {
  /** Null for a PlayStation game with playtime but no trophy list. */
  unlocked: number | null;
  total: number | null;
  hoursPlayed: number | null;
  lastPlayedAt: string | null;
  lastUnlockedAt: string | null;
  /** The PlayStation trophy list it matched, so the saved game goes by id. */
  psnCommunicationId?: string;
  trophyList?: string;
}

export type PlatformReadError =
  /** The account for this platform is not linked in Settings. */
  | 'not-linked'
  /** A Steam game with no store app to read. */
  | 'no-app'
  /** No PlayStation trophy list or played game carries this title. */
  | 'unmatched'
  /** The account has this game, but hides its details. */
  | 'private-profile'
  /** The Steam account does not own the game. */
  | 'not-owned'
  | 'request-failed';

export type PlatformRead =
  | { status: 'idle' }
  | { status: 'reading'; platform: Platform }
  | { status: 'done'; platform: Platform; progress: PlatformProgress }
  | { status: 'failed'; platform: Platform; reason: PlatformReadError };

interface ReadTarget {
  title: string;
  steamAppId?: number;
}

/**
 * Reads a game's progress from a platform the moment it is chosen, before the
 * game is saved.
 *
 * Picking Steam or PlayStation in the add and edit forms used to change only a
 * label: the counts stayed at whatever was typed until the game was saved and
 * the next sync came round. Now the choice is the sync — the form fills in
 * with that platform's trophies, playtime and dates as soon as it is clicked,
 * and what it shows is what gets saved.
 *
 * Only the latest request lands: clicking Steam, then PlayStation, then Steam
 * again leaves the form with Steam's figures whatever order the replies come
 * back in.
 */
export function usePlatformRead() {
  const { platformAccounts } = useGame();
  const [trophyScope] = usePsnTrophyScope();
  const [read, setRead] = useState<PlatformRead>({ status: 'idle' });
  const latest = useRef(0);

  const steamId = platformAccounts?.steamId;
  const psnLinked = Boolean(platformAccounts?.psnAccountId);
  const includeDlc = trophyScope === 'all';

  const start = useCallback(
    async (
      platform: Platform,
      target: ReadTarget,
      apply: (progress: PlatformProgress) => void,
    ): Promise<void> => {
      const mine = ++latest.current;
      const settle = (next: PlatformRead) => {
        if (mine === latest.current) setRead(next);
      };

      const fail = (reason: PlatformReadError) => settle({ status: 'failed', platform, reason });

      if (platform === 'steam') {
        if (!steamId) return fail('not-linked');
        if (!target.steamAppId) return fail('no-app');
      } else {
        if (!psnLinked) return fail('not-linked');
        if (!target.title.trim()) return fail('unmatched');
      }

      setRead({ status: 'reading', platform });

      try {
        const progress =
          platform === 'steam'
            ? await readSteam(steamId!, target.steamAppId!)
            : await readPsn(target.title, includeDlc);
        if (mine !== latest.current) return;
        if ('reason' in progress) return fail(progress.reason);
        apply(progress);
        settle({ status: 'done', platform, progress });
      } catch {
        fail('request-failed');
      }
    },
    [steamId, psnLinked, includeDlc],
  );

  const reset = useCallback(() => {
    latest.current += 1;
    setRead({ status: 'idle' });
  }, []);

  return { read, start, reset };
}

type Outcome = PlatformProgress | { reason: PlatformReadError };

async function readSteam(steamId: string, appid: number): Promise<Outcome> {
  const result = await getSteamAchievements(steamId, appid);
  if (!result.data) {
    if (result.error === 'private-profile') return { reason: 'private-profile' };
    if (result.error === 'not-found') return { reason: 'not-owned' };
    if (result.error === 'not-linked') return { reason: 'not-linked' };
    return { reason: 'request-failed' };
  }
  return {
    unlocked: result.data.unlocked,
    total: result.data.total,
    hoursPlayed: result.data.hoursPlayed,
    lastPlayedAt: result.data.lastPlayedAt,
    lastUnlockedAt: result.data.lastUnlockedAt,
  };
}

async function readPsn(title: string, includeDlc: boolean): Promise<Outcome> {
  const library = await getPsnTitles();
  if (!library.data) {
    return {
      reason:
        library.error === 'psn-not-linked' || library.error === 'not-linked'
          ? 'not-linked'
          : 'request-failed',
    };
  }

  // The same matching the sync does, so what is read here is what the sync
  // will go on reading once the game is saved.
  const match = matchByTitle(title, library.data.titles, (t) => t.name);

  const playedByName = new Map<string, PsnPlayedGame>();
  library.data.played.forEach((entry) => {
    const key = normalizeTitle(entry.name);
    const known = playedByName.get(key);
    if (!known || entry.hoursPlayed > known.hoursPlayed) playedByName.set(key, entry);
  });
  const played = [...playedByName.values()];
  const playedGame =
    matchByTitle(title, played, (entry) => entry.name) ??
    (match ? matchByTitle(match.name, played, (entry) => entry.name) : undefined);

  if (!match && !playedGame) return { reason: 'unmatched' };

  // Only the trophy list's own counts. The account summary always includes
  // add-on trophies, so falling back to it could show a total the sync then
  // contradicts.
  const detail = match
    ? await getPsnTitleProgress(match.npCommunicationId, match.npServiceName, includeDlc)
    : undefined;
  if (match && !detail?.data) return { reason: 'request-failed' };

  return {
    unlocked: detail?.data?.earned ?? null,
    total: detail?.data?.total ?? null,
    hoursPlayed: playedGame?.hoursPlayed ?? null,
    lastPlayedAt: playedGame?.lastPlayedAt ?? match?.lastUpdatedAt ?? null,
    lastUnlockedAt: detail?.data?.lastEarnedAt ?? null,
    psnCommunicationId: match?.npCommunicationId,
    trophyList: match?.name,
  };
}
