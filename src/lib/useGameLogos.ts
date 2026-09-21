import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { getGameLogo } from './steam';

/**
 * Where a game with no logo is asked about again.
 *
 * A library is mostly games whose logo has already been found and stored; the
 * remainder are the ones no source had. Those are worth asking about again —
 * SteamGridDB is community-uploaded and grows — but not every session, or a
 * library of misses becomes a burst of requests on every open.
 */
const RETRY_AFTER_MS = 1000 * 60 * 60 * 24 * 7;

/** How long to wait between lookups, so a large library trickles. */
const GAP_MS = 350;

/** Which games were asked about and found nothing, and when. */
const MISS_KEY = 'trophy-tracker:logo-misses';

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

      const pending = latest.current
        .getGames()
        .filter((game) => !game.logoImage)
        .filter((game) => now - (misses[game.id] ?? 0) > RETRY_AFTER_MS);

      for (const game of pending) {
        if (unmounted.current) return;

        const result = await getGameLogo(game.title, game.steamAppId);
        if (unmounted.current) return;

        // An unreachable function is not a miss: recording it would leave the
        // whole library untried for a week over one flight of bad network.
        if (result.error) return;

        const logo = result.data?.logo ?? null;

        if (logo) {
          // Against the stored copy rather than the one this loop started with:
          // a sync or an edit may have moved on since.
          const current = latest.current.getGames().find((g) => g.id === game.id);
          if (current && !current.logoImage) {
            latest.current.updateGame(game.id, { logoImage: logo });
          }
        } else {
          misses[game.id] = now;
          writeMisses(misses);
        }

        await new Promise((resolve) => setTimeout(resolve, GAP_MS));
      }
    })();
  }, [loading]);
}
