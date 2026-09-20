import React, { useEffect, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { coverUrl } from '../lib/image';
import { cn } from '../lib/cn';

interface CoverArtProps {
  /**
   * Cover URL from the catalog or the user; blank when there is none.
   *
   * Several may be given, best first: each is tried in turn and the first that
   * loads is kept. This is how a portrait tile asks for Steam’s library
   * capsule and falls back to the stored landscape art when there is none.
   */
  src?: string | (string | undefined)[];
  title: string;
  className?: string;
  /** Extra classes for the <img> only, e.g. hover transforms. */
  imageClassName?: string;
}

/**
 * A game's cover, or — when the title has no art, or the art fails to load —
 * a plain lettered tile. Deliberately not a stock photo: an unrelated image
 * reads as real cover art and misrepresents the game.
 */
export const CoverArt: React.FC<CoverArtProps> = ({ src, title, className, imageClassName }) => {
  const sources = (Array.isArray(src) ? src : [src]).filter(
    (value): value is string => Boolean(value?.trim()),
  );
  // Which candidate is being shown. Past the end means every one failed.
  const [index, setIndex] = useState(0);

  const key = sources.join('|');
  useEffect(() => {
    setIndex(0);
  }, [key]);

  const current = sources[index];

  if (!current) {
    const initial = title.trim().charAt(0).toUpperCase();

    return (
      <div
        aria-hidden
        className={cn(
          'flex items-center justify-center bg-gray-200 text-gray-600',
          className,
        )}
      >
        {initial ? (
          <span className="text-400 font-bold leading-none text-gray-700">{initial}</span>
        ) : (
          <Gamepad2 size={20} />
        )}
      </div>
    );
  }

  return (
    <img
      // Asked for at the size it is drawn at. A library saved before that was
      // true still holds RAWG's full 2560px key art, and this is where those
      // come back down without anything having to rewrite the records.
      key={current}
      src={coverUrl(current)}
      alt=""
      loading="lazy"
      decoding="async"
      // On to the next candidate, and past the last one to the lettered tile.
      onError={() => setIndex((n) => n + 1)}
      className={cn(className, imageClassName)}
    />
  );
};
