import React from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'accent' | 'secondary' | 'negative' | 'positive';
export type ButtonStyle = 'fill' | 'outline' | 'subtle';
export type ButtonSize = 's' | 'm' | 'l';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  buttonStyle?: ButtonStyle;
  size?: ButtonSize;
  /** Renders the button as a perfect square for a single icon. */
  iconOnly?: boolean;
}

const SIZE: Record<ButtonSize, string> = {
  s: 'h-7 px-3 gap-1.5 text-75',
  m: 'h-8 px-4 gap-2 text-100',
  // A field's corner and type from md, where fields, selects and dialog
  // buttons share one 40px height and should read as one family.
  l: 'h-10 px-5 gap-2 text-100 md:rounded-md md:text-90',
};

const ICON_SIZE: Record<ButtonSize, string> = {
  s: 'h-7 w-7',
  m: 'h-8 w-8',
  l: 'h-10 w-10',
};

/**
 * A filled button is lit rather than flat: a gradient falling across it, a
 * hairline of white along the top edge where the light would catch, and a halo
 * of its own colour around it.
 *
 * The halo is unoffset — an offset shadow pools under the button and reads as a
 * heavy drop shadow rather than as the control glowing. The secondary is the
 * exception to all of it: it is a surface, not an action, so it stays unlit.
 */
const FILL: Record<ButtonVariant, string> = {
  accent:
    'bg-gradient-to-br from-accent-700 to-accent-600 text-gray-1000 shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_14px_-5px_var(--color-accent-700)] hover:from-accent-800 hover:to-accent-700 active:from-accent-600 active:to-accent-600',
  secondary:
    'bg-gray-200 text-gray-900 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] hover:bg-gray-300 active:bg-gray-400',
  negative:
    'bg-gradient-to-br from-negative-700 to-negative-700 text-gray-1000 shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_0_14px_-5px_var(--color-negative-700)] hover:from-negative-900 hover:to-negative-700',
  positive:
    'bg-gradient-to-br from-positive-700 to-positive-700 text-gray-25 shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_14px_-5px_var(--color-positive-700)] hover:from-positive-900 hover:to-positive-700',
};

const OUTLINE: Record<ButtonVariant, string> = {
  accent: 'border border-accent-700/60 text-accent-900 hover:bg-accent-700/12 hover:border-accent-700',
  secondary: 'border border-gray-300 text-gray-800 hover:bg-gray-200 hover:text-gray-900',
  negative: 'border border-negative-700/60 text-negative-900 hover:bg-negative-700/12',
  positive: 'border border-positive-700/60 text-positive-900 hover:bg-positive-700/12',
};

const SUBTLE: Record<ButtonVariant, string> = {
  accent: 'text-accent-900 hover:bg-accent-700/12',
  secondary: 'text-gray-700 hover:bg-gray-200 hover:text-gray-900',
  negative: 'text-negative-900 hover:bg-negative-700/12',
  positive: 'text-positive-900 hover:bg-positive-700/12',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  buttonStyle = 'fill',
  size = 'm',
  iconOnly = false,
  className,
  type = 'button',
  ...rest
}) => {
  const tone =
    buttonStyle === 'fill' ? FILL[variant] : buttonStyle === 'outline' ? OUTLINE[variant] : SUBTLE[variant];

  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-sm font-bold whitespace-nowrap',
        'transition-all duration-100',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        iconOnly ? cn(ICON_SIZE[size], 'px-0') : SIZE[size],
        tone,
        className,
      )}
      {...rest}
    />
  );
};
