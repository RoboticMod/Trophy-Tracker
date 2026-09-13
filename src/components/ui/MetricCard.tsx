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
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  tone,
  value,
  label,
  breakdown,
}) => (
  <Card className="flex flex-col justify-between gap-2 p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="eyebrow min-w-0 truncate pt-0.5 text-gray-600">{label}</div>
      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', tone)}>
        {icon}
      </div>
    </div>

    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-700 font-bold leading-none tabular-nums text-gray-1000">{value}</span>

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
  </Card>
);

interface StatTileProps {
  label: string;
  value: string;
  /** One line of detail under the number. */
  caption?: string;
  /** Overrides the value ink, for a figure that carries its own verdict. */
  color?: string;
}

/**
 * The compact form of the same idea: label, number, detail, no chrome. Used in
 * a strip where several related figures belong together and a card apiece would
 * break them into separate thoughts.
 */
export const StatTile: React.FC<StatTileProps> = ({ label, value, caption, color }) => (
  <div className="panel-inset rounded-md px-3.5 py-3">
    <div className="eyebrow truncate text-gray-600">{label}</div>
    <div
      className="mt-1.5 text-500 font-bold leading-none tabular-nums text-gray-1000"
      style={color ? { color } : undefined}
    >
      {value}
    </div>
    {caption ? <div className="mt-1 truncate text-50 text-gray-600">{caption}</div> : null}
  </div>
);
