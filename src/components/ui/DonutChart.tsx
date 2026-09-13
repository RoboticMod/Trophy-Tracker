import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  /** A raw colour, since these come from data rather than from one token. */
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  /** Shown large in the hole. */
  total: number;
  /** The micro label under the total. */
  totalLabel: string;
  size?: number;
  className?: string;
}

const STROKE = 16;

/**
 * Bleed for the segment glow, which an svg would otherwise clip flat at its own
 * viewport — the same allowance the gauge makes.
 */
const BLEED = 10;

/** A hairline of empty track between segments, in fractions of the circle. */
const GAP = 0.006;

/**
 * A ring split into proportional segments, with the total in the hole.
 *
 * Deliberately a donut rather than a filled pie: the app already states figures
 * inside a ring on this page, so a solid wedge chart would be the only shape of
 * its kind here. The hole also gives the total somewhere to live, which a pie
 * has no room for.
 */
export const DonutChart: React.FC<DonutChartProps> = ({
  slices,
  total,
  totalLabel,
  size = 168,
  className,
}) => {
  const radius = (size - STROKE) / 2;
  const box = size + BLEED * 2;
  const mid = box / 2;

  const sum = slices.reduce((acc, s) => acc + s.value, 0);
  const drawn = slices.filter((s) => s.value > 0);

  // Each segment is placed by rotating its own <g>, so the segment itself always
  // starts at zero and its dash offset is free to animate the draw-on.
  let cursor = 0;
  const segments = drawn.map((slice) => {
    const fraction = sum > 0 ? slice.value / sum : 0;
    const startAngle = cursor * 360;
    cursor += fraction;
    // One slice filling the whole ring must not have a gap cut into it, or the
    // ring would show a notch for no reason.
    const gap = drawn.length > 1 ? GAP : 0;
    return { ...slice, fraction, startAngle, length: Math.max(fraction - gap, 0.001) };
  });

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        className="absolute"
        style={{ top: -BLEED, left: -BLEED }}
        aria-hidden
      >
        <circle
          cx={mid}
          cy={mid}
          r={radius}
          fill="none"
          stroke="var(--color-gray-300)"
          strokeWidth={STROKE}
          opacity={0.5}
        />

        {segments.map((segment) => (
          <motion.circle
            key={segment.key}
            cx={mid}
            cy={mid}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={STROKE}
            // pathLength 1 lets the dash pattern be written in fractions of the
            // circle rather than in px of circumference.
            pathLength={1}
            strokeDasharray={`${segment.length} ${1 - segment.length}`}
            // -90 puts the first segment at twelve o'clock rather than at three.
            transform={`rotate(${segment.startAngle - 90} ${mid} ${mid})`}
            initial={{ strokeDashoffset: segment.length }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 5px color-mix(in srgb, ${segment.color} 40%, transparent))`,
            }}
          />
        ))}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-700 font-bold leading-none tabular-nums text-gray-1000">{total}</span>
        <span className="eyebrow mt-1.5 text-gray-600">{totalLabel}</span>
      </div>
    </div>
  );
};

/**
 * The rows that name what each segment is, with its count and share.
 *
 * Each row carries its own proportional bar as well as the figure. The ring
 * already shows the split, so the bars are not new information — but they give
 * the rows something to fill a wide card with, and they make two similar shares
 * comparable in a way that two neighbouring arcs are not.
 */
export const DonutLegend: React.FC<{ slices: DonutSlice[]; className?: string }> = ({
  slices,
  className,
}) => {
  const sum = slices.reduce((acc, s) => acc + s.value, 0);

  return (
    <ul className={cn('min-w-0 flex-1 space-y-3', className)}>
      {slices.map((slice) => {
        const share = sum > 0 ? (slice.value / sum) * 100 : 0;
        return (
          <li key={slice.key} className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: slice.color,
                  boxShadow: `0 0 7px -1px ${slice.color}`,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-75 font-semibold text-gray-800">
                {slice.label}
              </span>
              <span className="shrink-0 text-75 font-bold tabular-nums text-gray-1000">
                {slice.value}
              </span>
              <span className="w-9 shrink-0 text-right text-50 tabular-nums text-gray-600">
                {Math.round(share)}%
              </span>
            </div>

            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-300/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${share}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: slice.color, boxShadow: `0 0 8px -3px ${slice.color}` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};
