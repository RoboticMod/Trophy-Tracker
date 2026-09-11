import React from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'accent' | 'neutral' | 'outline' | 'ghost' | 'danger' | 'queued';
export type ButtonSize = 's' | 'm' | 'l' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders the button as a square for a single glyph. */
  iconOnly?: boolean;
}

/**
 * Control heights come from the design's four rungs: 30px for a control tucked
 * inside a row, 34px for a secondary action, 38px for a toolbar action, and
 * 42px for the one primary action on a screen.
 */
const SIZE: Record<ButtonSize, string> = {
  s: 'h-[30px] px-3 gap-1.5 text-[12px]',
  m: 'h-[34px] px-3.5 gap-1.5 text-[13px]',
  l: 'h-[38px] px-4 gap-[7px] text-[13px]',
  xl: 'h-[42px] px-[18px] gap-2 text-[14px]',
};

const ICON_SIZE: Record<ButtonSize, string> = {
  s: 'h-[30px] w-[30px]',
  m: 'h-[34px] w-[34px]',
  l: 'h-[38px] w-[38px]',
  xl: 'h-[42px] w-[42px]',
};

const VARIANT: Record<ButtonVariant, string> = {
  accent: 'bg-accent text-accent-on hover:bg-accent-ink',
  neutral: 'bg-surface-3 text-body hover:bg-line',
  // Outlines carry their edge as an inset shadow, so hovering one never nudges
  // the row it sits in by the width of a border.
  outline: 'bg-transparent text-body hairline-2 hover:bg-surface-2',
  ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-ink',
  danger:
    'bg-transparent text-danger shadow-[inset_0_0_0_1px_rgb(242_104_111_/_.45)] hover:bg-danger-wash',
  queued: 'bg-queued text-[#1d1204] hover:bg-[#eaa257]',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'neutral',
  size = 'm',
  iconOnly = false,
  className,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    className={cn(
      'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-control border-0',
      'font-display font-bold whitespace-nowrap transition-colors duration-100 ease-tt',
      'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
      iconOnly ? cn(ICON_SIZE[size], 'px-0') : SIZE[size],
      VARIANT[variant],
      className,
    )}
    {...rest}
  />
);
