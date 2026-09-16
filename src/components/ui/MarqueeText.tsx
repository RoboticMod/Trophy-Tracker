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
  title?: string;
}

/** Scroll speed, in px per second, while the text is moving. */
const SPEED = 28;

/**
 * A single line that scrolls to show its end when it does not fit.
 *
 * Text that fits is left exactly as it is. Text that does not is measured,
 * and the CSS animation is told how far to travel and how long to take, so a
 * slightly long name drifts a little and a very long one moves at the same
 * readable pace rather than racing. With reduced motion it truncates instead.
 */
export const MarqueeText: React.FC<MarqueeTextProps> = ({
  children,
  className,
  trigger = 'always',
  title,
}) => {
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useLayoutEffect(() => {
    const outer = box.current;
    const inner = text.current;
    if (!outer || !inner) return;

    const measure = () => setOverflow(Math.max(0, Math.ceil(inner.scrollWidth - outer.clientWidth)));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [children]);

  const overflowing = overflow > 1;
  // Travel time both ways, plus the rests the keyframes hold at either end.
  const duration = Math.max(4, ((overflow * 2) / SPEED) * 1.6);

  return (
    <span
      ref={box}
      data-overflowing={overflowing}
      data-trigger={trigger}
      title={overflowing ? (title ?? (typeof children === 'string' ? children : undefined)) : title}
      className={cn('marquee block min-w-0', className)}
      style={
        overflowing
          ? ({
              '--marquee-shift': `-${overflow}px`,
              '--marquee-duration': `${duration.toFixed(1)}s`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <span ref={text}>{children}</span>
    </span>
  );
};
