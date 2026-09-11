import React, { useEffect, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { cn } from '../lib/cn';

interface CoverArtProps {
  /** Cover URL from the catalog or the user; blank when there is none. */
  src?: string;
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
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
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(className, imageClassName)}
    />
  );
};
