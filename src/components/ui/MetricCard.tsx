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
  /** Token classes for the icon well, e.g. "bg-trophy-100 text-trophy-900". */
  tone: string;
  value: string;
  label: string;
  /** Optional per-platform split shown beneath the headline number. */
  breakdown?: MetricBreakdown[];
}

/** The headline statistic card used across the dashboard and achievements. */
export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  tone,
  value,
  label,
  breakdown,
}) => (
  <Card className="space-y-3">
    <div className="flex items-center gap-3">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', tone)}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-600 font-bold leading-none text-gray-1000">{value}</div>
        <div className="mt-1 truncate text-50 font-medium text-gray-700">{label}</div>
      </div>
    </div>

    {breakdown?.length ? (
      <div className="flex items-center gap-4 border-t border-gray-200 pt-2.5">
        {breakdown.map((entry) => (
          <span key={entry.key} className="flex items-center gap-1.5" title={entry.title}>
            {entry.icon}
            <span className="text-100 font-semibold text-gray-900">{entry.count}</span>
          </span>
        ))}
      </div>
    ) : null}
  </Card>
);
