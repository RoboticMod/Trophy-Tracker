import React from 'react';
import { cn } from '../../lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Removes the default padding when the card manages its own layout. */
  bare?: boolean;
  /**
   * Replaces the default border and background tokens. cn() only concatenates,
   * so a tint passed through className would sit alongside the default and let
   * stylesheet order pick the winner — this substitutes them instead.
   */
  surface?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, bare = false, surface }) => (
  <div
    className={cn(
      'rounded-lg border',
      surface ?? 'border-gray-200 bg-gray-100',
      bare ? '' : 'p-5',
      className,
    )}
  >
    {children}
  </div>
);

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** Accent tone for the icon well, using token classes. */
  iconClassName?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  description,
  iconClassName = 'bg-accent-100 text-accent-900',
  action,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
          iconClassName,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-200 font-bold text-gray-1000">{title}</h2>
        {description ? <p className="text-75 text-gray-700">{description}</p> : null}
      </div>
    </div>
    {action}
  </div>
);
