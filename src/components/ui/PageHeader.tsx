import React from 'react';
import { cn } from '../../lib/cn';

/**
 * The title block every library page opens with.
 *
 * Five pages hand-rolled the same shape — one of them said so in a comment —
 * which is five places to change when the shape does. They also each carried a
 * paragraph under the title restating what the title already said; that text
 * now lives in a dismissable `IntroNotice` instead, so it can be read once and
 * then be gone for good.
 */
export const PageHeader: React.FC<{
  /** The tinted square to the left of the title. */
  icon: React.ReactNode;
  /** Token classes for that square — its background, and its ink. */
  iconClassName?: string;
  title: React.ReactNode;
  /** A count or a state, sitting beside the title rather than under it. */
  badge?: React.ReactNode;
  /** Controls pushed to the trailing edge, above the fold on a wide screen. */
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, iconClassName = 'bg-gray-300 text-gray-800', title, badge, action, className }) => (
  <div
    className={cn(
      'flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-5',
      className,
    )}
  >
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
          iconClassName,
        )}
      >
        {icon}
      </div>
      <h1 className="min-w-0 text-600 font-bold tracking-tight text-gray-1000">{title}</h1>
      {badge}
    </div>

    {action}
  </div>
);
