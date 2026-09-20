import React from 'react';
import { Card } from './Card';
import { cn } from '../../lib/cn';

export interface MetricBreakdown {
  key: string;
  icon: React.ReactNode;
  count: number;
  title: string;
}

interface MetricCardProps {
  icon: React.ReactNode;
  /** Token classes for the icon well, e.g. "bg-trophy-700/16 text-trophy-900". */
  tone: string;
  value: string;
  label: string;
  /** Optional per-platform split shown beneath the headline number. */
  breakdown?: MetricBreakdown[];
}

/**
 * The headline statistic card used across the dashboard and achievements.
 *
 * The label leads as a micro caption and the number carries the weight beneath
 * it, so a row of these scans as a strip of figures rather than as a list of
 * sentences with numbers attached.
 *
 * The per-platform split sits on the number's own line rather than in a divided
 * row beneath it. Given three or four of these side by side, a separate row for
 * two small figures left the cards mostly empty space.
 *
 * The emblem is set against the right edge and centred on the card's full
 * height rather than tucked into the top corner. In the corner it shared a line
 * with the label and left the whole lower right of the card empty; centred, it
 * balances the number and reads as the card's mark. It is also given a well
 * comfortably larger than the artwork inside it, so the glyph has room to
 * breathe instead of filling its box edge to edge.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  tone,
  value,
  label,
  breakdown,
}) => (
  <Card className="relative flex flex-col gap-1 p-3 sm:gap-2 sm:p-4">
    {/* The emblem sits in the corner rather than in a column of its own.
        Centred against the card's full height it claimed a share of the width
        at every size, which on a phone left the label about seventy pixels to
        live in — "Active unlocks (64%)" came out as "Active unl…". Out of the
        flow, the text gets the whole card and only has to keep clear of one
        corner. */}
    <div className="eyebrow min-w-0 pr-10 text-gray-600 line-clamp-2 sm:truncate sm:pr-12">
      {label}
    </div>

    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:gap-x-3">
      <span className="text-500 font-bold leading-none tabular-nums text-gray-1000 sm:text-700">
        {value}
      </span>

      {breakdown?.length ? (
        <span className="flex items-center gap-3">
          {breakdown.map((entry) => (
            <span key={entry.key} className="flex items-center gap-1.5" title={entry.title}>
              {entry.icon}
              <span className="text-75 font-bold tabular-nums text-gray-700">{entry.count}</span>
            </span>
          ))}
        </span>
      ) : null}
    </div>

    <div
      className={cn(
        'absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md sm:h-9 sm:w-9 sm:rounded-lg',
        tone,
      )}
    >
      {icon}
    </div>
  </Card>
);

interface StatTileProps {
  label: string;
  value: string;
  /** One line of detail under the number. */
  caption?: string;
  /** Overrides the value ink, for a figure that carries its own verdict. */
  color?: string;
  /**
   * "inset" is a well cut into the panel around it. A tile standing on the page
   * itself has no panel to be cut into, and the well reads as a black hole
   * there — "panel" gives it the same glass as every card beside it.
   */
  surface?: 'inset' | 'panel';
}

/**
 * The compact form of the same idea: label, number, detail, no chrome. Used in
 * a strip where several related figures belong together and a card apiece would
 * break them into separate thoughts.
 */
export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  caption,
  color,
  surface = 'inset',
}) => (
  <div
    className={
      surface === 'panel'
        ? 'panel rounded-lg px-3.5 py-3 sm:px-5 sm:py-4'
        : 'panel-inset rounded-md px-3 py-2.5 sm:px-3.5 sm:py-3'
    }
  >
    {/* Same reasoning as the card above: on a phone a clipped label says less
        than a wrapped one. */}
    <div className="eyebrow text-gray-600 line-clamp-2 sm:truncate">{label}</div>
    <div
      className="mt-1.5 text-400 font-bold leading-none tabular-nums text-gray-1000 sm:text-500"
      style={color ? { color } : undefined}
    >
      {value}
    </div>
    {caption ? (
      <div className="mt-1 text-50 text-gray-600 line-clamp-2 sm:truncate">{caption}</div>
    ) : null}
  </div>
);
