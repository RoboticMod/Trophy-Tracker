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
  l: 'h-10 px-5 gap-2 text-100',
};

const ICON_SIZE: Record<ButtonSize, string> = {
  s: 'h-7 w-7',
  m: 'h-8 w-8',
  l: 'h-10 w-10',
};

const FILL: Record<ButtonVariant, string> = {
  accent: 'bg-accent-700 text-gray-1000 hover:bg-accent-800 active:bg-accent-600',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
  negative: 'bg-negative-700 text-gray-1000 hover:bg-negative-900',
  positive: 'bg-positive-700 text-gray-1000 hover:bg-positive-900',
};

const OUTLINE: Record<ButtonVariant, string> = {
  accent: 'border border-accent-700 text-accent-900 hover:bg-accent-100',
  secondary: 'border border-gray-300 text-gray-800 hover:bg-gray-200 hover:text-gray-900',
  negative: 'border border-negative-700 text-negative-900 hover:bg-negative-100',
  positive: 'border border-positive-700 text-positive-900 hover:bg-positive-100',
};

const SUBTLE: Record<ButtonVariant, string> = {
  accent: 'text-accent-900 hover:bg-accent-100',
  secondary: 'text-gray-700 hover:bg-gray-200 hover:text-gray-900',
  negative: 'text-negative-900 hover:bg-negative-100',
  positive: 'text-positive-900 hover:bg-positive-100',
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
        'inline-flex items-center justify-center rounded-sm font-semibold whitespace-nowrap',
        'transition-colors duration-100',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        iconOnly ? cn(ICON_SIZE[size], 'px-0') : SIZE[size],
        tone,
        className,
      )}
      {...rest}
    />
  );
};
