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
/** One figure in the strip under a page title. */
export interface PageHeaderStat {
  key: string;
  /** What the figure is, set small and muted after the number itself. */
  label: string;
  value: string;
  /** A per-platform split or similar, drawn inline after the label. */
  breakdown?: React.ReactNode;
}

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
  /**
   * The page's headline figures, as a strip under the title.
   *
   * These used to be a band of cards below the header, and on a wide screen
   * they were mostly void: a label and a number floating beside an emblem
   * pinned to the far right. Worse, the band stretched to fill the row, so a
   * page with two figures drew wider boxes than one with three, and one page
   * had reached for a different component entirely. A strip cannot drift that
   * way — every page gets the same one.
   */
  stats?: PageHeaderStat[];
  className?: string;
}> = ({
  icon,
  iconClassName = 'bg-gray-300 text-gray-800',
  title,
  badge,
  action,
  stats,
  className,
}) => (
  <div className={cn('space-y-3 border-b border-gray-200 pb-5', className)}>
    <div className="flex flex-wrap items-center justify-between gap-3">
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

    {/* Number first, then what it counts. A row of these scans as figures with
        captions rather than as sentences with numbers buried in them. */}
    {stats?.length ? (
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {stats.map((stat) => (
          <div key={stat.key} className="flex items-baseline gap-1.5">
            <dd className="text-300 font-bold tabular-nums text-gray-1000">{stat.value}</dd>
            <dt className="eyebrow text-gray-600">{stat.label}</dt>
            {stat.breakdown}
          </div>
        ))}
      </dl>
    ) : null}
  </div>
);
