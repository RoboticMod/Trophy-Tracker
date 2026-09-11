import React, { useEffect, useState } from 'react';
import { GridIcon } from './icons';
import { cn } from '../lib/cn';

interface CoverArtProps {
  /** Cover URL from the catalog or the user; blank when there is none. */
  src?: string;
  title: string;
  className?: string;
  /** Extra classes for the <img> only, e.g. hover transforms. */
  imageClassName?: string;
  /**
   * Size of the fallback letter. The card default fills a cover tile; list rows
   * pass something smaller so the placeholder matches the row it sits in.
   */
  letterSize?: number;
}

/**
 * A game's cover, or — when the title has no art, or the art fails to load —
 * a plain lettered tile. Deliberately not a stock photo: an unrelated image
 * reads as real cover art and misrepresents the game.
 */
export const CoverArt: React.FC<CoverArtProps> = ({
  src,
  title,
  className,
  imageClassName,
  letterSize = 44,
}) => {
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
          'flex items-center justify-center',
          'bg-[linear-gradient(150deg,var(--tt-surface-3),var(--tt-bg-2)_60%)]',
          className,
        )}
      >
        {initial ? (
          <span
            style={{ fontSize: letterSize }}
            className="font-display font-bold leading-none tracking-[-0.02em] text-line"
          >
            {initial}
          </span>
        ) : (
          <GridIcon size={20} className="text-line-2" />
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
