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
  const fillPercent = (clamped / MAX_RATING) * 100;

  /**
   * A tick at every whole point, so the track is a scale rather than a smear.
   *
   * Layered into the input's own background rather than added as elements: a
   * range input's track cannot hold children, and a sibling overlay would have
   * to be kept in step with the thumb's inset by hand.
   */
  const tickSpacing = 100 / MAX_RATING;
  const ticks =
    `repeating-linear-gradient(90deg, transparent 0, transparent calc(${tickSpacing}% - 1px), ` +
    `var(--color-gray-100) calc(${tickSpacing}% - 1px), var(--color-gray-100) ${tickSpacing}%)`;

  return (
    // The height of a text input, so this lines up with the field beside it.
    <div className="flex h-9 items-center gap-3">
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
        className="h-1.5 min-w-24 flex-1 cursor-pointer appearance-none rounded-full bg-gray-300 accent-current"
        style={{
          color,
          background: `${ticks}, linear-gradient(90deg, ${color} ${fillPercent}%, var(--color-gray-300) ${fillPercent}%)`,
        }}
      />

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
          'h-9 w-16 shrink-0 rounded-sm border bg-black/25 px-2 text-center text-100 font-bold tabular-nums',
          'focus:outline-none',
          isRated ? '' : 'border-gray-300 text-gray-700',
        )}
      />
    </div>
  );
};
