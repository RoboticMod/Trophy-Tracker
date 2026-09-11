import React from 'react';
import { cn } from '../../lib/cn';
import { softEdge } from '../../lib/tone';

interface MeterProps {
  /** 0-100. */
  value: number;
  label?: string;
  /**
   * A complete meter switches from the flat accent to the trophy gradient and
   * picks up a glow, so finishing a game is visible in the bar itself rather
   * than only in the number beside it.
   */
  complete?: boolean;
  /** Paints the fill with a raw colour, for per-platform breakdowns. */
  color?: string;
  /** Track colour. Defaults to the control fill; the page ground reads better
      when the meter sits on a panel row rather than a card. */
  track?: 'control' | 'page';
  className?: string;
  height?: number;
}

export const Meter: React.FC<MeterProps> = ({
  value,
  label,
  complete = false,
  color,
  track = 'control',
  className,
  height = 5,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  const fill = color
    ? color
    : complete
      ? 'linear-gradient(90deg, var(--tt-gold, #e5a83c), var(--tt-gold-hi, #ffd36b))'
      : 'var(--tt-accent, #45c8ea)';

  return (
    <div
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={{ height }}
      className={cn(
        'w-full overflow-hidden rounded-full',
        track === 'page' ? 'bg-bg' : 'bg-surface-3',
        className,
      )}
    >
      <div
        style={{
          width: `${clamped}%`,
          background: fill,
          boxShadow: complete
            ? `0 0 12px -2px ${softEdge('var(--tt-gold-hi, #ffd36b)', 70)}`
            : undefined,
        }}
        className="h-full rounded-full transition-[width] duration-300 ease-tt"
      />
    </div>
  );
};
