import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

interface MarqueeTextProps {
  children: React.ReactNode;
  className?: string;
  /**
   * "always" scrolls whenever the text overflows — for a control whose label
   * has to be readable at a glance. "hover" waits for the nearest `.group` to
   * be hovered, for a grid where a dozen moving titles would be noise.
   */
  trigger?: 'always' | 'hover';
  /**
   * How many lines the text may wrap to before it scrolls instead.
   *
   * 1 — the default — never wraps: the text stays on one line and scrolls
   * sideways. More than one lets a long name use the extra lines first, which
   * is easier to read than any amount of movement, and only scrolls — upwards,
   * a line at a time — once even those are not enough.
   */
  lines?: number;
  title?: string;
}

/** Scroll speed, in px per second, while the text is moving. */
const SPEED = 28;

/**
 * How much overflow is worth moving for, per axis.
 *
 * Sideways, a pixel or two is sub-pixel measurement noise. Vertically the
 * clamp height is rounded to whole pixels against a fractional line height, so
 * text that fits its lines exactly can still measure a couple of pixels over —
 * well under the half-line that a genuine extra line would show.
 */
const SLACK = { x: 1, y: 6 } as const;

/**
 * Text that scrolls to show the rest of itself when it does not fit.
 *
 * Text that fits is left exactly as it is. Text that does not is measured, and
 * the CSS animation is told how far to travel and how long to take, so a
 * slightly long name drifts a little and a very long one moves at the same
 * readable pace rather than racing. With reduced motion it truncates instead.
 */
export const MarqueeText: React.FC<MarqueeTextProps> = ({
  children,
  className,
  trigger = 'always',
  lines = 1,
  title,
}) => {
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  const axis = lines > 1 ? 'y' : 'x';

  useLayoutEffect(() => {
    const outer = box.current;
    const inner = text.current;
    if (!outer || !inner) return;

    const measure = () =>
      setOverflow(
        Math.max(
          0,
          Math.ceil(
            axis === 'y'
              ? inner.scrollHeight - outer.clientHeight
              : inner.scrollWidth - outer.clientWidth,
          ),
        ),
      );
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [children, axis]);

  const overflowing = overflow > SLACK[axis];
  // Travel time both ways, plus the rests the keyframes hold at either end.
  const duration = Math.max(4, ((overflow * 2) / SPEED) * 1.6);

  return (
    <span
      ref={box}
      data-overflowing={overflowing}
      data-trigger={trigger}
      data-axis={axis}
      title={overflowing ? (title ?? (typeof children === 'string' ? children : undefined)) : title}
      className={cn('marquee block min-w-0', className)}
      style={
        {
          ...(lines > 1 ? { '--marquee-lines': String(lines) } : null),
          ...(overflowing
            ? {
                [axis === 'y' ? '--marquee-y' : '--marquee-x']: `-${overflow}px`,
                '--marquee-duration': `${duration.toFixed(1)}s`,
              }
            : null),
        } as React.CSSProperties
      }
    >
      <span ref={text}>{children}</span>
    </span>
  );
};
