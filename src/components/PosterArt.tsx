import React, { useEffect, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { UserGame } from '../types';
import { coverUrl, portraitCoverUrl } from '../lib/image';
import { cn } from '../lib/cn';

type PosterGame = Pick<
  UserGame,
  'title' | 'platform' | 'steamAppId' | 'coverImage' | 'coverPortrait' | 'logoImage'
>;

/**
 * Where a poster's picture came from, which decides two things: whether it can
 * fill the frame, and whether it already has the game's name printed on it.
 */
type ArtKind = 'chosen' | 'capsule' | 'landscape';

const candidates = (game: PosterGame): { src: string; kind: ArtKind }[] =>
  [
    { src: game.coverPortrait, kind: 'chosen' as const },
    { src: portraitCoverUrl(game), kind: 'capsule' as const },
    { src: game.coverImage, kind: 'landscape' as const },
  ].filter((c): c is { src: string; kind: ArtKind } => Boolean(c.src?.trim()));

/**
 * A game's art in a tall frame, without ever cutting it in half.
 *
 * The obvious way to fill a 2:3 tile is `object-cover`, and for real box art
 * that is right — the picture was cut to this shape. But most games here have
 * no box art, only a 16:9 banner, and covering with that throws away a third of
 * the width from each side: a game whose name and face sit centre-left comes
 * out as a slab of background. That is what made Resident Evil unrecognisable.
 *
 * So nothing is ever cropped. The picture is contained, and a blurred, scaled
 * copy of itself fills whatever is left over. Art that is already 2:3 covers
 * the frame exactly and the backdrop never shows; a banner letterboxes onto its
 * own colours, which reads as deliberate rather than broken.
 */
export const PosterArt: React.FC<{
  game: PosterGame;
  className?: string;
  /** Room left at the foot for a card's own row of figures. */
  logoInset?: boolean;
}> = ({ game, className, logoInset = false }) => {
  const list = candidates(game);
  const [index, setIndex] = useState(0);

  const key = list.map((c) => c.src).join('|');
  useEffect(() => {
    setIndex(0);
  }, [key]);

  const current = list[index];

  if (!current) {
    const initial = game.title.trim().charAt(0).toUpperCase();
    return (
      <div
        aria-hidden
        className={cn('flex items-center justify-center bg-gray-200 text-gray-600', className)}
      >
        {initial ? (
          <span className="text-400 font-bold leading-none text-gray-700">{initial}</span>
        ) : (
          <Gamepad2 size={20} />
        )}
      </div>
    );
  }

  const url = coverUrl(current.src);

  /**
   * A storefront capsule has the game's name across it already, so laying the
   * separate logo file on top would print it twice. Anything else is either art
   * chosen by hand — which is what saying "use this poster" means — or a banner
   * that needs all the help it can get being identified.
   */
  const logo = current.kind === 'capsule' ? undefined : game.logoImage;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Blurred and overscaled, so the edges of the blur never show as a seam
          against the frame. Hidden from assistive tech: it is the same picture
          twice, and the second copy is wallpaper. */}
      <img
        aria-hidden
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl saturate-150"
      />
      <div aria-hidden className="absolute inset-0 bg-gray-25/35" />

      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setIndex((n) => n + 1)}
        className="relative h-full w-full object-contain object-center"
      />

      {/* A box of a definite size with the logo centred inside it, rather than
          an image left to size itself. A wide logo given only a max-height
          scales to its natural width and runs off both edges of a tile this
          narrow; constrained in both directions it cannot. */}
      {logo ? (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-[6%] flex items-end justify-center',
            // Clear of the figures row when there is one, at the foot when not.
            logoInset ? 'bottom-[15%] h-[26%]' : 'bottom-[6%] h-[26%]',
          )}
        >
          <img
            src={logo}
            alt={game.title}
            className="max-h-full max-w-full object-contain drop-shadow-[0_2px_6px_rgb(0_0_0/0.8)]"
          />
        </div>
      ) : null}
    </div>
  );
};
