import React from 'react';
import { MAX_RATING, ratingColor, ratingLabel } from '../lib/rating';
import { cn } from '../lib/cn';

interface RatingValueProps {
  value: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE: Record<NonNullable<RatingValueProps['size']>, string> = {
  xs: 'h-4 min-w-7 px-1 text-50',
  sm: 'h-5 min-w-8 px-1.5 text-50',
  md: 'h-6 min-w-10 px-2 text-75',
};

/** Read-only score chip. Colour carries the value, red through to gold. */
export const RatingValue: React.FC<RatingValueProps> = ({ value, size = 'sm', className }) => {
  const clamped = Math.max(0, Math.min(MAX_RATING, Math.round(value)));
  const color = ratingColor(clamped);

  return (
    <span
      title={`Rated ${clamped} out of ${MAX_RATING} — ${ratingLabel(clamped)}`}
      style={{ color, borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}
      className={cn(
        'inline-flex items-center justify-center rounded-sm border font-bold tabular-nums',
        SIZE[size],
        className,
      )}
    >
      {clamped}
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
  const clamped = Math.max(0, Math.min(MAX_RATING, Math.round(value)));
  const color = ratingColor(clamped);
  const isRated = clamped > 0;

  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        min={0}
        max={MAX_RATING}
        step={1}
        value={clamped}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Rating out of 100"
        {...rest}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-300 accent-current"
        style={{
          color,
          background: `linear-gradient(90deg, ${color} ${clamped}%, var(--color-gray-300) ${clamped}%)`,
        }}
      />

      {!compact && (
        <input
          type="number"
          min={0}
          max={MAX_RATING}
          value={clamped}
          onChange={(e) => onChange(Math.max(0, Math.min(MAX_RATING, Number(e.target.value))))}
          aria-label="Rating value"
          style={{ color, borderColor: isRated ? color : undefined }}
          className={cn(
            'h-9 w-16 rounded-sm border bg-gray-75 px-2 text-center text-100 font-bold tabular-nums',
            'focus:outline-none',
            isRated ? '' : 'border-gray-300 text-gray-700',
          )}
        />
      )}

      <button
        type="button"
        onClick={() => onChange(0)}
        disabled={!isRated}
        className="rounded-sm px-2 py-1 text-50 text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-30"
      >
        Clear
      </button>
    </div>
  );
};
