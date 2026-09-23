import React from 'react';
import { MAX_RATING, RATING_STEP, formatRating, ratingColor, snapRating } from '../lib/rating';
import { cn } from '../lib/cn';
import { useNumericField } from '../lib/useNumericField';

interface RatingValueProps {
  value: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  /** Names what was scored, so two chips on one card read differently. */
  label?: string;
  /**
   * Drops the chip's own outline, tint and rounding, leaving just the coloured
   * number. For placements that already sit inside a container of their own,
   * where a second bordered shape nested inside the first only adds clutter.
   */
  bare?: boolean;
}

const SIZE: Record<NonNullable<RatingValueProps['size']>, string> = {
  xs: 'h-4 min-w-7 px-1 text-50',
  sm: 'h-5 min-w-8 px-1.5 text-50',
  md: 'h-6 min-w-10 px-2 text-75',
};

/** Bare scores carry no box of their own, so they need no height or padding. */
const SIZE_BARE: Record<NonNullable<RatingValueProps['size']>, string> = {
  xs: 'text-50',
  sm: 'text-50',
  md: 'text-75',
};

/** Read-only score chip. Colour carries the value, red through to green. */
export const RatingValue: React.FC<RatingValueProps> = ({
  value,
  size = 'sm',
  className,
  label = 'Rated',
  bare = false,
}) => {
  const clamped = snapRating(value);
  const color = ratingColor(clamped);

  return (
    <span
      title={`${label} ${formatRating(clamped)} out of ${MAX_RATING}`}
      style={
        bare
          ? { color }
          : {
              color,
              borderColor: color,
              backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
            }
      }
      className={cn(
        'inline-flex items-center justify-center font-bold tabular-nums',
        bare ? SIZE_BARE[size] : cn('rounded-sm border', SIZE[size]),
        className,
      )}
    >
      {formatRating(clamped)}
    </span>
  );
};

interface RatingControlProps {
  value: number;
  onChange: (next: number) => void;
  id?: string;
  'aria-describedby'?: string;
}

/**
 * Editable 0-10 rating: a slider whose track fills with the score colour, plus
 * a number box for precise entry. The number is the whole verdict — the colour
 * already says good or bad, and a word beside it only repeated that.
 */
export const RatingControl: React.FC<RatingControlProps> = ({ value, onChange, id, ...rest }) => {
  const clamped = snapRating(value);
  const color = ratingColor(clamped);
  const isRated = clamped > 0;

  const ratingField = useNumericField(clamped, (n) => onChange(snapRating(n)));

  /**
   * The thumb's centre only ever reaches from half a thumb in from the left to
   * half a thumb in from the right, so anything that must line up with it has
   * to have the thumb's width taken out of its span.
   *
   * The ticks do that by being drawn across the travel rather than the track.
   * The fill cannot: inset the same way, it started half a thumb in from the
   * left and left the first few pixels of track showing bare grey at every
   * value. So it spans the whole track and carries the inset in its stop
   * instead — full width, ending exactly under the thumb's centre.
   */
  const TRAVEL = `calc(100% - var(--rating-thumb))`;

  const fillStop =
    `calc(var(--rating-thumb) / 2 + ` +
    `${clamped / MAX_RATING} * (100% - var(--rating-thumb)))`;

  const fill =
    `linear-gradient(90deg, ${color} 0, ${color} ${fillStop}, ` +
    `var(--color-gray-300) ${fillStop})`;

  /**
   * The scale, as a row of ticks under the track rather than notches cut into
   * it: a notch in a 6px bar read as the fill breaking up, where a tick below
   * reads as a ruler. Tall at every whole point, short at every half — the
   * steps the slider actually lands on.
   */
  const steps = Math.round(MAX_RATING / RATING_STEP);
  const ticks = Array.from({ length: steps + 1 }, (_, index) => ({
    at: index / steps,
    whole: (index * RATING_STEP) % 1 === 0,
  }));

  return (
    // The height of a text input, so this lines up with the field beside it.
    <div className="flex h-9 items-center gap-3">
      <div
        className="relative flex h-full min-w-24 flex-1 items-center"
        style={{ '--rating-thumb': '14px' } as React.CSSProperties}
      >
      <input
        id={id}
        type="range"
        min={0}
        max={MAX_RATING}
        step={RATING_STEP}
        value={clamped}
        onChange={(e) => onChange(snapRating(Number(e.target.value)))}
        aria-label={`Rating out of ${MAX_RATING}`}
        {...rest}
        className="rating-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-300"
        style={{
          color,
          backgroundImage: fill,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Across the thumb's travel, not the track, so each tick sits under
          the thumb's centre at its value. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[calc(50%+6px)] h-2">
        {ticks.map(({ at, whole }) => (
          <span
            key={at}
            className={cn(
              'absolute top-0 w-px -translate-x-1/2 rounded-full',
              whole ? 'h-2 bg-gray-500' : 'h-1 bg-gray-400',
            )}
            style={{ left: `calc(var(--rating-thumb) / 2 + ${at} * ${TRAVEL})` }}
          />
        ))}
      </div>
      </div>

      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={MAX_RATING}
        step={RATING_STEP}
        placeholder="–"
        {...ratingField}
        aria-label="Rating value"
        style={{ color, borderColor: isRated ? color : undefined }}
        className={cn(
          'no-spinner h-9 w-16 shrink-0 rounded-sm border bg-black/25 px-2 text-center text-100 font-bold tabular-nums',
          'focus:outline-none',
          isRated ? '' : 'border-gray-300 text-gray-700',
        )}
      />
    </div>
  );
};
