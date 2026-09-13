import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';

interface MeterProps {
  /** 0-100. */
  value: number;
  label?: string;
  tone?: 'accent' | 'trophy' | 'positive';
  className?: string;
  /** Paints the fill with a raw colour, for per-platform breakdowns. */
  color?: string;
}

const TONE: Record<NonNullable<MeterProps['tone']>, string> = {
  accent: 'bg-accent-700',
  trophy: 'bg-trophy-900',
  positive: 'bg-positive-700',
};

/** Matching bloom per tone, so the fill reads as lit rather than painted. */
const TONE_GLOW: Record<NonNullable<MeterProps['tone']>, string> = {
  accent: 'shadow-[0_0_9px_-2px_var(--color-accent-700)]',
  trophy: 'shadow-[0_0_9px_-2px_var(--color-trophy-900)]',
  positive: 'shadow-[0_0_9px_-2px_var(--color-positive-700)]',
};

export const Meter: React.FC<MeterProps> = ({
  value,
  label,
  tone = 'accent',
  className,
  color,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-full',
        'bg-gray-300/60 shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]',
        className,
      )}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        // A raw colour carries its own bloom inline, since there is no token
        // class to pair it with.
        style={
          color
            ? { backgroundColor: color, boxShadow: `0 0 8px -3px ${color}` }
            : undefined
        }
        className={cn('h-full rounded-full', color ? '' : cn(TONE[tone], TONE_GLOW[tone]))}
      />
    </div>
  );
};
