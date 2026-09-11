import React from 'react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * An empty grid explains itself on the page ground rather than on a panel — a
 * filled surface with nothing in it reads as content that failed to load.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      'mx-auto flex w-full max-w-[460px] flex-col items-center gap-2.5 rounded-panel',
      'px-6 py-14 text-center hairline',
      className,
    )}
  >
    {icon ? (
      <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-surface-2 text-subtle">
        {icon}
      </span>
    ) : null}
    <h3 className="m-0 font-display text-[17px] font-bold text-ink">{title}</h3>
    <p className="m-0 max-w-[40ch] text-[13px] text-subtle [text-wrap:pretty]">{description}</p>
    {action ? <div className="mt-1.5 flex flex-wrap justify-center gap-2">{action}</div> : null}
  </div>
);
