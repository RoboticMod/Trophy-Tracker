import React from 'react';
import { cn } from '../../lib/cn';
import { softEdge } from '../../lib/tone';

interface StatTileProps {
  label: string;
  /** Colour of the caps label, which is what identifies the statistic. */
  labelColor?: string;
  value: React.ReactNode;
  /** Colour of the headline numeral. */
  valueColor?: string;
  /** Line under the number, or a meter. */
  footer?: React.ReactNode;
  /** The trophy treatment, for anything counting completion. */
  gold?: boolean;
  /** Headline size. The dashboard row runs smaller than the stats page. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VALUE_SIZE = {
  sm: 'text-[30px]',
  md: 'text-[32px]',
  lg: 'text-[34px]',
} as const;

/** The headline-number tile used across the dashboard, playing and stats pages. */
export const StatTile: React.FC<StatTileProps> = ({
  label,
  labelColor = '#9a9082',
  value,
  valueColor = '#f7f3ec',
  footer,
  gold = false,
  size = 'md',
  className,
}) => (
  <div
    style={
      gold
        ? {
            background:
              'linear-gradient(165deg, var(--color-gold-wash), var(--tt-surface, #1a1714) 72%)',
            boxShadow: `inset 0 0 0 1px ${softEdge('var(--tt-gold, #e5a83c)', 40)}`,
          }
        : undefined
    }
    className={cn(
      'flex flex-col gap-1.5 rounded-panel p-[18px]',
      gold ? '' : 'bg-surface hairline',
      className,
    )}
  >
    <span
      style={{ color: labelColor }}
      className="font-display text-[10px] font-semibold uppercase tracking-[0.16em]"
    >
      {label}
    </span>
    <span
      style={{ color: valueColor }}
      className={cn('font-display font-bold leading-none tabular-nums', VALUE_SIZE[size])}
    >
      {value}
    </span>
    {footer}
  </div>
);

/** The caption line under a stat tile's number. */
export const StatCaption: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <span className={cn('truncate text-[12px] text-subtle', className)}>{children}</span>;
