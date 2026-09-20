import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { canSearchRawg, needsCover, rawgCover, useCatalogSettings } from './catalog';
import { steamLogoUrl } from './image';

/**
 * Bringing the library's covers over to RAWG.
 *
 * Every cover in the app comes from RAWG now, but a library built before that
 * is full of Steam store banners — and a game added while RAWG was unreachable
 * has no art at all. Both are the same job: ask RAWG for the title, and keep
 * what comes back.
 *
 * One pass per session, one title at a time so a large library is a trickle of
 * requests rather than a burst of them, and every lookup is cached for a day
 * afterwards — so the second session only asks about the games the first one
 * could not place. A title RAWG does not know keeps its lettered tile and is
 * asked about again tomorrow, which costs one request and eventually catches
 * the game RAWG adds later.
 *
 * Mounted once, by the sync provider: this is the same kind of work as a
 * platform sync, and a second copy would walk the library alongside the first.
 */
export function useCoverArt() {
  const { getGames, updateGame, loading } = useGame();
  const { rawgKey } = useCatalogSettings();

  // The pass outlives the render it started in, so it reads the library and the
  // writer through a ref. Holding them as dependencies instead would have every
  // write it makes re-run the effect that is running it.
  const latest = useRef({ getGames, updateGame, rawgKey });
  latest.current = { getGames, updateGame, rawgKey };

  const started = useRef(false);
  const unmounted = useRef(false);
  useEffect(
    () => () => {
      unmounted.current = true;
    },
    [],
  );

  useEffect(() => {
    if (loading || started.current || !canSearchRawg(rawgKey)) return;
    started.current = true;

    void (async () => {
      const pending = latest.current.getGames().filter((game) => needsCover(game.coverImage));

      for (const game of pending) {
        if (unmounted.current) return;

        const cover = await rawgCover(game.title, latest.current.rawgKey);
        if (unmounted.current) return;

        // Against the stored copy rather than the one this loop started with: a
        // sync or an edit may have moved on since.
        const current = latest.current.getGames().find((g) => g.id === game.id);
        if (cover && current && needsCover(current.coverImage)) {
          latest.current.updateGame(game.id, { coverImage: cover });
        }
      }
    })();
  }, [loading, rawgKey]);
}

/**
 * Bringing the library's logos over from Steam.
 *
 * Steam publishes a game's name as its own transparent file, beside the art, at
 * a path the app can work out from the app id alone. That is the pair a poster
 * tile wants: a picture, and lettering that can be placed on it rather than
 * baked into it at whatever size the storefront chose.
 *
 * Unlike covers, this asks for nothing over the network to decide. The URL
 * either resolves when a tile draws it or it does not, and a logo that 404s
 * falls back to the art alone — so the pass is a straight write over the
 * library rather than a walk of requests, and games already in the library get
 * one on the next load.
 *
 * Mounted beside the cover pass, by the sync provider.
 */
export function useSteamLogos() {
  const { getGames, updateGame, loading } = useGame();

  const latest = useRef({ getGames, updateGame });
  latest.current = { getGames, updateGame };

  const started = useRef(false);

  useEffect(() => {
    if (loading || started.current) return;
    started.current = true;

    latest.current
      .getGames()
      // Only where there is one to be had and none set: a logo chosen by hand
      // is a choice, and this must never overwrite it.
      .filter((game) => !game.logoImage && steamLogoUrl(game))
      .forEach((game) => {
        latest.current.updateGame(game.id, { logoImage: steamLogoUrl(game) });
      });
  }, [loading]);
}
