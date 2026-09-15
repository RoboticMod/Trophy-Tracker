import React, { useId, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/cn';

export interface SparkPoint {
  /** Unix seconds. */
  ts: number;
  value: number;
}

interface SparklineProps {
  points: SparkPoint[];
  /** Drives the line, the fill and the marker. */
  color: string;
  /** Formats the value in the readout, e.g. thousands separators. */
  formatValue?: (value: number) => string;
  label: string;
  height?: number;
  className?: string;
}

/** Drawing box. The path is computed in these units and scaled by the viewBox. */
const WIDTH = 600;
/** Room above and below for the stroke and its glow, in the same units. */
const PAD = 6;

const formatTimestamp = (ts: number) =>
  new Date(ts * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
  });

/**
 * A line chart for one series over time — concurrent players, in practice.
 *
 * Deliberately spare: no axes, no gridlines, no legend. The figure that matters
 * is stated in words beside the chart, and the shape is here to say whether it
 * is climbing, falling or holding. Hovering reads out a single point, which is
 * the only interrogation a single series needs.
 *
 * The viewBox does the scaling, so the path is computed once in its own units
 * and stretches to whatever width the card gives it.
 */
export const Sparkline: React.FC<SparklineProps> = ({
  points,
  color,
  formatValue = String,
  label,
  height = 132,
  className,
}) => {
  const reduceMotion = useReducedMotion();
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (points.length === 0) return null;

    const values = points.map((p) => p.value);
    const max = Math.max(...values);
    // A flat series must not divide by zero, and a floor of zero keeps the
    // shape honest: a line that never moves should look like one, not like
    // noise magnified to fill the box.
    const span = max > 0 ? max : 1;
    const step = points.length > 1 ? WIDTH / (points.length - 1) : 0;

    const coords = points.map((point, index) => ({
      x: points.length > 1 ? index * step : WIDTH / 2,
      y: PAD + (1 - point.value / span) * (height - PAD * 2),
      point,
    }));

    const line = coords
      .map((c, index) => `${index === 0 ? 'M' : 'L'}${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
      .join(' ');

    return {
      coords,
      line,
      // Closed back along the baseline, so the same path can be filled.
      area: `${line} L${WIDTH} ${height} L0 ${height} Z`,
      max,
    };
  }, [points, height]);

  if (!geometry) {
    return (
      <div
        className={cn(
          'panel-inset flex items-center justify-center rounded-md text-75 text-gray-600',
          className,
        )}
        style={{ height }}
      >
        No player history for this range
      </div>
    );
  }

  const active = hover !== null ? geometry.coords[hover] : null;

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
        className="block overflow-visible"
        onPointerLeave={() => setHover(null)}
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - box.left) / box.width;
          const index = Math.round(ratio * (geometry.coords.length - 1));
          setHover(Math.max(0, Math.min(geometry.coords.length - 1, index)));
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        <motion.path
          d={geometry.area}
          fill={`url(#${gradientId})`}
          initial={{ opacity: reduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: 'easeOut' }}
        />

        {/* Drawn on rather than faded in: the line is a history, and watching
            it run left to right is the same motion as reading it. */}
        <motion.path
          d={geometry.line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb, ${color} 45%, transparent))` }}
          initial={{ pathLength: reduceMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: 'easeOut' }}
        />

        {active ? (
          <>
            <line
              x1={active.x}
              y1={0}
              x2={active.x}
              y2={height}
              stroke="var(--color-gray-500)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r={4}
              fill={color}
              stroke="var(--color-gray-25)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : null}
      </svg>

      {/* The readout sits above the chart in a fixed spot rather than following
          the cursor: a tooltip that moves with the pointer covers the very line
          it is describing. */}
      <div className="mt-2 flex items-center justify-between gap-3 text-50 text-gray-600">
        <span className="tabular-nums">
          {active ? formatTimestamp(active.point.ts) : formatTimestamp(points[0].ts)}
        </span>
        <span className="font-bold tabular-nums text-gray-1000">
          {active ? formatValue(active.point.value) : formatValue(geometry.max)}
          <span className="ml-1 font-normal text-gray-600">
            {active ? 'players' : 'peak in range'}
          </span>
        </span>
        <span className="tabular-nums">{formatTimestamp(points[points.length - 1].ts)}</span>
      </div>
    </div>
  );
};
