import React from 'react';
import { cn } from '../../lib/cn';
import { Dot } from './Chip';

interface SyncPillProps {
  children: React.ReactNode;
  /** Compact form for the sidebar footer. */
  size?: 'sm' | 'md';
  className?: string;
}

/** The green "Synced" pill. The only place the positive hue appears as chrome. */
export const SyncPill: React.FC<SyncPillProps> = ({ children, size = 'md', className }) => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center gap-[7px] rounded-full bg-positive-wash',
      'font-display font-bold uppercase text-positive',
      'shadow-[inset_0_0_0_1px_rgb(79_195_138_/_.35)]',
      size === 'sm'
        ? 'h-[26px] px-[11px] text-[10px] tracking-[0.12em]'
        : 'h-7 px-3 text-[11px] tracking-[0.12em]',
      className,
    )}
  >
    <Dot color="#4fc38a" size={6} />
    {children}
  </span>
);

interface CountPillProps {
  children: React.ReactNode;
  /** Ink colour; the wash is derived from it. */
  color: string;
  background: string;
  className?: string;
}

/** The number beside a nav row: playing on the accent, trophies on gold. */
export const CountPill: React.FC<CountPillProps> = ({
  children,
  color,
  background,
  className,
}) => (
  <span
    style={{ color, background }}
    className={cn(
      'shrink-0 rounded-full px-2 py-px font-display text-[11px] font-bold tabular-nums',
      className,
    )}
  >
    {children}
  </span>
);
