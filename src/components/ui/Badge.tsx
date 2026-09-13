import React from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'positive'
  | 'negative'
  | 'notice'
  | 'trophy'
  | 'violet';

/**
 * Every tone is the same recipe: a faint wash of the colour, a stronger ring of
 * it, and the light end of the ramp as ink. That keeps six tones reading as one
 * component rather than six differently-weighted shapes.
 */
const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-gray-700/12 text-gray-700 border-gray-500/40',
  accent: 'bg-accent-700/16 text-accent-900 border-accent-700/45',
  positive: 'bg-positive-700/16 text-positive-900 border-positive-700/45',
  negative: 'bg-negative-700/16 text-negative-900 border-negative-700/45',
  notice: 'bg-notice-700/16 text-notice-900 border-notice-700/45',
  trophy: 'bg-trophy-700/16 text-trophy-900 border-trophy-700/50',
  violet: 'bg-violet-700/18 text-violet-900 border-violet-700/45',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

/** Compact status label. One height, one radius, one type size — everywhere. */
export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', children, className, title }) => (
  <span
    title={title}
    className={cn(
      'inline-flex h-5.5 items-center gap-1.5 rounded-full border px-2.5',
      'text-50 font-bold uppercase tracking-wide whitespace-nowrap',
      TONE[tone],
      className,
    )}
  >
    {children}
  </span>
);
