import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { getGamePoster } from './steam';
import { isUpgrade } from './useGameLogos';

/** Where a game with nothing better to find is asked about again. */
const RETRY_AFTER_MS = 1000 * 60 * 60 * 24 * 7;

/** How long to wait between lookups, so a large library trickles. */
const GAP_MS = 350;

/** Which games were asked about and found nothing better, and when. */
const MISS_KEY = 'trophy-tracker:poster-misses';

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
 * Filling in each game's portrait poster, for the previews on a list's row.
 *
 * The logo pass, again — same source order, same rules, same shape — for a
 * different picture: a 600 × 900 cover with the game's name painted in, so a
 * row of three previews says which games they are without a logo laid over
 * them. SteamGridDB by title first, the only source a PlayStation game has;
 * Steam's portrait capsule behind it for a linked app.
 *
 * Steam's file is provisional in the same sense a Steam logo is — a fair stand-
 * in that a SteamGridDB answer should replace — so `isUpgrade` decides every
 * write here as well. A game with no poster anywhere keeps drawing its own
 * landscape art, cropped to the box; that is a miss, remembered for a week.
 *
 * Mounted once, by the sync provider.
 */
export function useGamePosters() {
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
        .filter((game) => !game.posterImage || game.posterImage.includes('steamstatic'))
        .filter((game) => now - (misses[game.id] ?? 0) > RETRY_AFTER_MS);

      for (const game of pending) {
        if (unmounted.current) return;

        const result = await getGamePoster(game.title, game.steamAppId);
        if (unmounted.current) return;

        // An unreachable function — or one not yet redeployed with this route —
        // is not a miss, or the whole library would sit untried for a week.
        if (result.error) return;

        const poster = result.data?.poster ?? null;
        const current = latest.current.getGames().find((g) => g.id === game.id);

        if (current && isUpgrade(current.posterImage, poster)) {
          latest.current.updateGame(game.id, { posterImage: poster });
        } else {
          misses[game.id] = now;
          writeMisses(misses);
        }

        await new Promise((resolve) => setTimeout(resolve, GAP_MS));
      }
    })();
  }, [loading]);
}
