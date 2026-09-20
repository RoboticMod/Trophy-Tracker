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
 * The padding is the card's own, passed with `bare`: `cn` is a plain join, so a
 * `p-3.5` handed to Card does not override its default `p-5` — it only loses to
 * whichever of the two Tailwind happened to emit last, which is `p-5`.
 *
 * Everything is centred on the card's own height, and the emblem is a column of
 * the row rather than a mark pinned to a corner. These sit in a grid beside the
 * library gauge, which is the taller thing in the row, so the cards are stretched
 * well past the height their content needs: hugging the top edge, the figures
 * left the lower half of every card empty and the emblem floating away from the
 * number it belongs to. Centred, the card reads at any height the row gives it.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  tone,
  value,
  label,
  breakdown,
}) => (
  <Card bare className="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-4">
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="eyebrow truncate text-gray-600">{label}</div>

      {/* Centred rather than sharing a baseline: an icon paired with a small
          digit sits optically low beside a numeral this size, which read as the
          split having slipped off the line. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-500 font-bold leading-none tabular-nums text-gray-1000 sm:text-600">
          {value}
        </span>

        {breakdown?.length ? (
          <span className="flex items-center gap-2.5">
            {breakdown.map((entry) => (
              <span key={entry.key} className="flex items-center gap-1.5" title={entry.title}>
                {entry.icon}
                <span className="text-75 font-bold tabular-nums text-gray-700">{entry.count}</span>
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </div>

    {/* A column of its own, which it can afford now that these are one per row
        on a phone — the crowding that put it in the corner was a card sharing a
        phone's width with another. */}
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md sm:h-10 sm:w-10 sm:rounded-lg',
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
