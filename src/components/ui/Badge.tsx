import React from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'negative' | 'notice' | 'trophy';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-gray-200 text-gray-800 border-gray-300',
  accent: 'bg-accent-100 text-accent-900 border-accent-400',
  positive: 'bg-positive-100 text-positive-900 border-positive-700',
  negative: 'bg-negative-100 text-negative-900 border-negative-700',
  notice: 'bg-notice-100 text-notice-900 border-notice-700',
  trophy: 'bg-trophy-100 text-trophy-900 border-trophy-700',
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
      'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5',
      'text-50 font-semibold whitespace-nowrap',
      TONE[tone],
      className,
    )}
  >
    {children}
  </span>
);
