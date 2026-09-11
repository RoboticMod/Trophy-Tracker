import React from 'react';
import { cn } from '../../lib/cn';
import { ACCENT_TONE, chipStyle } from '../../lib/tone';

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  /** The hue this chip stands for. Defaults to the accent. */
  tone?: string;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = {
  sm: 'h-[30px] px-[11px]',
  md: 'h-8 px-3',
  lg: 'h-[34px] px-3',
} as const;

/**
 * The filter chip used by every chip row in the app. The colour rule lives in
 * lib/tone.ts so a platform chip, a status chip and a collection chip all read
 * as the same control wearing different identities.
 */
export const Chip: React.FC<ChipProps> = ({
  selected,
  onClick,
  tone = ACCENT_TONE,
  title,
  children,
  size = 'sm',
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={selected}
    style={chipStyle(selected, tone)}
    className={cn(
      'inline-flex cursor-pointer items-center gap-1.5 rounded-control border-0',
      'font-display text-[12px] font-semibold tabular-nums transition-all duration-100 ease-tt',
      SIZE[size],
      className,
    )}
  >
    {children}
  </button>
);

/** The caps label at the head of a chip row. */
export const ChipRowLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="w-[62px] shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
    {children}
  </span>
);

/** A small round dot in a status or collection colour. */
export const Dot: React.FC<{ color: string; size?: number; className?: string }> = ({
  color,
  size = 8,
  className,
}) => (
  <span
    aria-hidden="true"
    style={{ background: color, height: size, width: size }}
    className={cn('shrink-0 rounded-full', className)}
  />
);
