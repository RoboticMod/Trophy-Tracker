import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';
import { EASE_OUT } from '../../lib/motion';

interface GaugeProps {
  /** 0-1. How much of the arc is painted. */
  fraction: number;
  /** Pre-formatted centre text — the caller owns rounding and units. */
  value: string;
  /** Rendered smaller and raised beside the value, e.g. "%" or "h". */
  suffix?: string;
  /** The micro label above the arc, stating what is being measured. */
  label: string;
  /** One word for what the number means, in the value's own colour. */
  verdict?: string;
  /** A line of supporting detail under the verdict. */
  caption?: string;
  /** Drives the arc, the verdict ink and the bloom behind the number. */
  color: string;
  /** Outer diameter in px. */
  size?: number;
  /**
   * "stacked" centres the label above the arc and the verdict below it, for a
   * card that exists to show this one figure. "inline" sets the text beside the
   * arc instead, which is about half the height — for a row where the gauge has
   * to sit level with ordinary stat tiles.
   */
  layout?: 'stacked' | 'inline';
  className?: string;
}

/** Three quarters of a turn, open at the bottom, starting from the lower left. */
const SWEEP = 270;
const START = 135;
const STROKE = 7;

/**
 * Breathing room around the arc, in px.
 *
 * An svg clips at its own viewport, and the arc's drop-shadow extends past the
 * stroke — drawn in a box exactly as wide as the circle, the glow gets sliced
 * off flat at the edges. So the svg is grown by this much on every side and
 * pulled back out by the same amount, which leaves the arc exactly where it was
 * and gives the glow somewhere to land.
 */
const BLEED = 14;

/**
 * The headline statistic of this design: a number inside an arc, under a micro
 * label and over a one-word verdict.
 *
 * Colour does the work — the arc, the verdict and the bloom behind the number
 * are all one hue supplied by the caller, so a glance at the card reads as good
 * or bad before any of the text is parsed.
 */
export const Gauge: React.FC<GaugeProps> = ({
  fraction,
  value,
  suffix,
  label,
  verdict,
  caption,
  color,
  size = 132,
  layout = 'stacked',
  className,
}) => {
  const inline = layout === 'inline';
  const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  // Only three quarters of the circle is track, so the dash pattern has to be
  // cut to the sweep before the value is measured against it.
  const arc = circumference * (SWEEP / 360);

  // The padded drawing box. The circle keeps its radius and simply sits in the
  // middle of a larger canvas.
  const box = size + BLEED * 2;
  const mid = box / 2;

  return (
    <div
      className={cn(
        inline
          ? 'flex items-center gap-4 text-left'
          : 'flex flex-col items-center text-center',
        className,
      )}
    >
      {inline ? null : <span className="eyebrow text-gray-600">{label}</span>}

      <div
        className={cn('relative shrink-0', inline ? '' : 'mt-2.5')}
        style={{ width: size, height: size }}
      >
        {/* The bloom sits behind the number rather than behind the arc, so the
            colour reads as coming off the value itself. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: size * 1.5,
            height: size * 1.5,
            background: `radial-gradient(circle, color-mix(in srgb, ${color} 13%, transparent) 0, transparent 68%)`,
          }}
        />

        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          // No rotation here: a dash pattern already starts at 3 o'clock and
          // runs clockwise, and each circle is rotated to the arc's own start
          // below. Turning the whole svg as well would carry the gap away from
          // the bottom, where it belongs.
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
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            transform={`rotate(${START} ${mid} ${mid})`}
          />
          <motion.circle
            cx={mid}
            cy={mid}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            transform={`rotate(${START} ${mid} ${mid})`}
            initial={{ strokeDashoffset: arc }}
            animate={{ strokeDashoffset: arc * (1 - clamped) }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
            style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb, ${color} 35%, transparent))` }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-700 font-bold leading-none tabular-nums text-gray-900">
            {value}
            {suffix ? (
              <span className="ml-0.5 align-super text-300 font-semibold">{suffix}</span>
            ) : null}
          </div>
        </div>
      </div>

      {inline ? (
        <div className="min-w-0">
          <div className="eyebrow truncate text-gray-600">{label}</div>
          {verdict ? (
            <div className="mt-1.5 text-100 font-bold uppercase tracking-wide" style={{ color }}>
              {verdict}
            </div>
          ) : null}
          {caption ? (
            <p className="mt-1 text-50 leading-snug text-gray-600">{caption}</p>
          ) : null}
        </div>
      ) : (
        <>
          {verdict ? (
            <div className="mt-1.5 text-75 font-bold uppercase tracking-wide" style={{ color }}>
              {verdict}
            </div>
          ) : null}

          {caption ? (
            <p className="mt-0.5 max-w-[15rem] text-50 leading-snug text-gray-600">{caption}</p>
          ) : null}
        </>
      )}
    </div>
  );
};
