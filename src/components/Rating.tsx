import React from 'react';
import { MAX_RATING, RATING_STEP, formatRating, ratingColor, ratingLabel, snapRating } from '../lib/rating';
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
  /**
   * Appends the score's verdict word beside the number. Only where there is
   * room for it — on a card the digits have to stand alone.
   */
  verdict?: boolean;
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

/** Read-only score chip. Colour carries the value, red through to gold. */
export const RatingValue: React.FC<RatingValueProps> = ({
  value,
  size = 'sm',
  className,
  label = 'Rated',
  bare = false,
  verdict = false,
}) => {
  const clamped = snapRating(value);
  const color = ratingColor(clamped);

  return (
    <span
      title={`${label} ${formatRating(clamped)} out of ${MAX_RATING} — ${ratingLabel(clamped)}`}
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
        'inline-flex items-center justify-center gap-1.5 font-bold tabular-nums',
        bare ? SIZE_BARE[size] : cn('rounded-sm border', SIZE[size]),
        // The word needs breathing room the bare number does not.
        verdict && !bare && 'px-2',
        className,
      )}
    >
      {formatRating(clamped)}
      {verdict ? (
        <span className="text-50 font-bold uppercase tracking-wide opacity-90">
          {ratingLabel(clamped)}
        </span>
      ) : null}
    </span>
  );
};

interface RatingControlProps {
  value: number;
  onChange: (next: number) => void;
  /** Hides the numeric entry box for compact placements. */
  compact?: boolean;
  id?: string;
  'aria-describedby'?: string;
}

/**
 * Editable 0-100 rating: a slider whose track fills with the score colour,
 * plus a number box for precise entry.
 */
export const RatingControl: React.FC<RatingControlProps> = ({
  value,
  onChange,
  compact = false,
  id,
  ...rest
}) => {
  const clamped = snapRating(value);
  const color = ratingColor(clamped);
  const isRated = clamped > 0;

  const ratingField = useNumericField(clamped, (n) => onChange(snapRating(n)));
  const fillPercent = (clamped / MAX_RATING) * 100;

  return (
    // Wraps rather than overflows: this control sits in a form column that can
    // be half a dialog wide, and the verdict word beside it is not always short.
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
          background: `linear-gradient(90deg, ${color} ${fillPercent}%, var(--color-gray-300) ${fillPercent}%)`,
        }}
      />

      {!compact && (
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={MAX_RATING}
          step={RATING_STEP}
          {...ratingField}
          aria-label="Rating value"
          style={{ color, borderColor: isRated ? color : undefined }}
          className={cn(
            'h-9 w-16 rounded-sm border bg-black/25 px-2 text-center text-100 font-bold tabular-nums',
            'focus:outline-none',
            isRated ? '' : 'border-gray-300 text-gray-700',
          )}
        />
      )}

      {/* The score's own verdict, live beside the number. The guided flow
          already says "that works out to 8 — Great"; the slider said nothing,
          so the two ways of rating disagreed about how much they explained. */}
      {!compact && (
        // Never truncated: "OUTSTAND…" is worse than no verdict at all. The row
        // wraps instead, which is what the flex-wrap above is for.
        <span
          className="shrink-0 whitespace-nowrap text-50 font-bold uppercase tracking-wide"
          style={{ color: isRated ? color : 'var(--color-gray-600)' }}
        >
          {isRated ? ratingLabel(clamped) : 'Unrated'}
        </span>
      )}

      <button
        type="button"
        onClick={() => onChange(0)}
        disabled={!isRated}
        className="rounded-sm px-2 py-1 text-50 font-semibold text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-30"
      >
        Clear
      </button>
    </div>
  );
};
