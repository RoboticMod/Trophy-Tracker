import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { getGameLogo } from './steam';
import { beforeBackgroundStep } from './backgroundWork';

/**
 * Where a game with nothing better to find is asked about again.
 *
 * A library is mostly games already holding the best logo there is; the
 * remainder either have none or hold a provisional one. Those are worth asking
 * about again — SteamGridDB is community-uploaded and grows — but not every
 * session, or a library of misses becomes a burst of requests on every open.
 */
const RETRY_AFTER_MS = 1000 * 60 * 60 * 24 * 7;

/** How long to wait between lookups, so a large library trickles. */
const GAP_MS = 350;

/** Which games were asked about and found nothing better, and when. */
const MISS_KEY = 'trophy-tracker:logo-misses';

/**
 * Whether a stored logo is the fallback rather than the real answer.
 *
 * Steam's CDN is what answers when SteamGridDB cannot — no key set, or nothing
 * uploaded for the title. It is a fair stand-in and a poor match: its logo art
 * runs from 1.78 to 6.53 in aspect where SteamGridDB's is curated to something
 * close to 16:9, so a strip of Steam's own files draws at wildly different
 * heights. A library backfilled before the key was set is entirely these.
 *
 * Recognised by host, which is the only thing the stored value carries. That is
 * enough: the two sources have no others between them.
 */
export const isProvisional = (url: string): boolean => url.includes('steamstatic');

/**
 * Whether an answer is worth writing over what a game already holds.
 *
 * Its own function because it is the one place this pass can lose something: it
 * decides when a stored logo is replaced, and every wrong answer is either a
 * downgrade or a write that achieves nothing. The rules, in order:
 *
 * - nothing found changes nothing;
 * - the same answer again changes nothing;
 * - an empty slot takes whatever arrives;
 * - a provisional logo takes a real one, which is the upgrade;
 * - a real logo takes nothing — above all not the fallback, which is what the
 *   route returns whenever SteamGridDB has no answer for a title.
 */
export const isUpgrade = (
  stored: string | undefined,
  incoming: string | null,
  // A predicate rather than a plain boolean: saying "true" here is exactly the
  // claim that there is something to write, so the caller should not have to
  // re-test for it.
): incoming is string => {
  if (!incoming || incoming === stored) return false;
  if (!stored) return true;
  return isProvisional(stored) && !isProvisional(incoming);
};

type Misses = Record<string, number>;

const readMisses = (): Misses => {
  try {
    return JSON.parse(window.localStorage.getItem(MISS_KEY) ?? '{}') as Misses;
  } catch {
    return {};
  }
};

const writeMisses = (misses: Misses) => {
  try {
    window.localStorage.setItem(MISS_KEY, JSON.stringify(misses));
  } catch {
    // A full or blocked store only costs us the memory of this pass.
  }
};

/**
 * Filling in each game's own lettering, for the middle of its card.
 *
 * The same job as `useCoverArt`, and deliberately the same shape: one pass per
 * session, one title at a time, reading the library and the writer through a
 * ref so its own writes do not restart it.
 *
 * What it cannot share is where the answer comes from. A cover is RAWG's, keyed
 * by title; a logo is SteamGridDB's, also keyed by title — which is the whole
 * reason a PlayStation game can have one — with Steam's CDN behind it for a
 * linked app. Both live behind the edge function, because neither upstream
 * sends CORS headers and the SteamGridDB key must not ship in the bundle.
 *
 * A game with no logo anywhere is the normal case, not an error. It is
 * remembered as a miss and left alone for a week rather than asked about on
 * every open — the upstream is community-uploaded, so today's nothing is worth
 * retrying eventually, just not constantly.
 *
 * It upgrades as well as fills. Steam's CDN answers whenever SteamGridDB cannot,
 * which includes every game resolved before the key was set, and those would
 * otherwise keep the fallback for ever — a pass that only looks at games with
 * no logo never looks at them again. So a provisional logo is a candidate too,
 * and the write is guarded to be an improvement rather than merely a change:
 * nothing ever replaces a real answer, least of all the fallback.
 *
 * Mounted once, by the sync provider.
 */
export function useGameLogos() {
  const { getGames, updateGame, loading } = useGame();

  const latest = useRef({ getGames, updateGame });
  latest.current = { getGames, updateGame };

  const started = useRef(false);
  const unmounted = useRef(false);
  useEffect(
    () => () => {
      unmounted.current = true;
    },
    [],
  );

  useEffect(() => {
    if (loading || started.current) return;
    started.current = true;

    void (async () => {
      const misses = readMisses();
      const now = Date.now();

      // Games with no logo, and games holding a fallback that SteamGridDB may
      // now be able to better. The second set is why this upgrades rather than
      // only fills: a library backfilled before the key was set holds nothing
      // but Steam's own art, and asking only about empty games would leave it
      // that way for good.
      const pending = latest.current
        .getGames()
        .filter((game) => !game.logoImage || isProvisional(game.logoImage))
        .filter((game) => now - (misses[game.id] ?? 0) > RETRY_AFTER_MS);

      for (const game of pending) {
        // Only in a visible tab, and only when the page has nothing better to
        // do: each answer re-renders the app.
        await beforeBackgroundStep();
        if (unmounted.current) return;

        const result = await getGameLogo(game.title, game.steamAppId);
        if (unmounted.current) return;

        // An unreachable function is not a miss: recording it would leave the
        // whole library untried for a week over one flight of bad network.
        if (result.error) return;

        const logo = result.data?.logo ?? null;

        // Against the stored copy rather than the one this loop started with:
        // a sync or an edit may have moved on since.
        const current = latest.current.getGames().find((g) => g.id === game.id);

        if (current && isUpgrade(current.logoImage, logo)) {
          latest.current.updateGame(game.id, { logoImage: logo });
        } else {
          // Nothing, or nothing new. Either way this game has been asked and
          // keeps whatever it already had; a week from now it is worth asking
          // once more, because the upstream grows.
          misses[game.id] = now;
          writeMisses(misses);
        }

        await new Promise((resolve) => setTimeout(resolve, GAP_MS));
      }
    })();
  }, [loading]);
}
