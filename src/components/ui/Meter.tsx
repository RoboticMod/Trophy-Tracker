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
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-gray-200', className)}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={color ? { backgroundColor: color } : undefined}
        className={cn('h-full rounded-full', color ? '' : TONE[tone])}
      />
    </div>
  );
};
