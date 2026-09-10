import React from 'react';
import { cn } from '../../lib/cn';

interface OverlayBadgeProps {
  children: React.ReactNode;
  /** Optional identity tint layered above the scrim, e.g. a platform colour. */
  tint?: string;
  /** Square form for a lone icon; otherwise a pill sized for icon + label. */
  square?: boolean;
  /** Round disc for a lone mark that should read as an emblem, not a chip. */
  circle?: boolean;
  /** Overrides the disc diameter, for marks that carry more visual weight. */
  size?: number;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

/**
 * The single indicator chip used for everything that sits on top of cover art:
 * the platform icon, the status pills, and the completion trophy.
 *
 * All variants share one height (28px), radius and gap so the overlay row is
 * optically aligned, and all sit on the same darkened frosted scrim so they
 * stay readable over bright artwork rather than blending into it.
 */
export const OverlayBadge: React.FC<OverlayBadgeProps> = ({
  children,
  tint,
  square = false,
  circle = false,
  size,
  className,
  title,
  style,
}) => (
  <span
    title={title}
    style={size ? { ...style, width: size, height: size } : style}
    className={cn(
      'relative isolate inline-flex shrink-0 items-center justify-center gap-1.5',
      'overlay-scrim',
      size ? '' : 'h-7',
      circle
        ? 'aspect-square rounded-full'
        : cn('rounded-sm', square ? 'w-7' : 'px-2.5 text-50 font-semibold uppercase tracking-wide'),
      className,
    )}
  >
    {tint ? (
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 -z-10',
          circle ? 'rounded-full' : 'rounded-sm',
        )}
        style={{ backgroundColor: tint }}
      />
    ) : null}
    {children}
  </span>
);
