import React from 'react';
import { cn } from '../../lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Removes the default padding when the card manages its own layout. */
  bare?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, bare = false }) => (
  <div className={cn('panel rounded-lg', bare ? '' : 'p-5', className)}>{children}</div>
);

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** Accent tone for the icon well, using token classes. */
  iconClassName?: string;
  action?: React.ReactNode;
}

/**
 * The title of a panel: a micro uppercase label rather than a sentence-case
 * heading, so section titles sit as chrome around the content instead of
 * competing with the numbers and game titles inside them.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  description,
  iconClassName = 'bg-accent-700/16 text-accent-900',
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
        <h2 className="eyebrow text-gray-1000">{title}</h2>
        {description ? <p className="mt-1 text-75 text-gray-600">{description}</p> : null}
      </div>
    </div>
    {action}
  </div>
);

/**
 * A section title standing on its own, outside a panel — the rule running to
 * the edge is what separates one band of the page from the next now that the
 * panels themselves are translucent.
 */
export const SectionTitle: React.FC<{
  children: React.ReactNode;
  /** Sits at the far right of the rule, e.g. a count or a control. */
  action?: React.ReactNode;
  className?: string;
}> = ({ children, action, className }) => (
  <div className={cn('flex items-center gap-3', className)}>
    <span aria-hidden className="h-3.5 w-0.5 shrink-0 rounded-full bg-accent-700" />
    <h2 className="eyebrow shrink-0 text-gray-900">{children}</h2>
    <span aria-hidden className="h-px min-w-4 flex-1 bg-gray-200" />
    {action}
  </div>
);
