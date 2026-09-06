import React, { useState, useId } from 'react';
import { Star, Minus, Plus, RotateCcw } from 'lucide-react';

interface StarRatingProps {
  value: number; // 0 to 5 in 0.5 increments
  onChange?: (val: number) => void;
  readOnly?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showSteppers?: boolean;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value = 0,
  onChange,
  readOnly = false,
  size = 'md',
  showLabel = true,
  showSteppers = false,
  className = '',
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const idPrefix = useId().replace(/:/g, '');

  // Clamp value between 0 and 5, rounded to nearest 0.5
  const clampedValue = Math.min(5, Math.max(0, Math.round(value * 2) / 2));
  const activeRating = hoverValue !== null ? hoverValue : clampedValue;

  const sizeStyles = {
    xs: { iconSize: 12, spacing: 'gap-0.5', text: 'text-[10px]' },
    sm: { iconSize: 14, spacing: 'gap-1', text: 'text-xs' },
    md: { iconSize: 18, spacing: 'gap-1.5', text: 'text-xs' },
    lg: { iconSize: 22, spacing: 'gap-2', text: 'text-sm' },
  }[size];

  const handleStarHalfClick = (starIndex: number, isRightHalf: boolean) => {
    if (readOnly || !onChange) return;
    const targetVal = isRightHalf ? starIndex : starIndex - 0.5;
    // If clicking exact current rating, toggle back to 0
    if (targetVal === clampedValue) {
      onChange(0);
    } else {
      onChange(targetVal);
    }
  };

  const handleHalfHover = (starIndex: number, isRightHalf: boolean) => {
    if (readOnly) return;
    setHoverValue(isRightHalf ? starIndex : starIndex - 0.5);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverValue(null);
  };

  const increment = (amount: number) => {
    if (readOnly || !onChange) return;
    const next = Math.min(5, Math.max(0, Math.round((clampedValue + amount) * 2) / 2));
    onChange(next);
  };

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      {/* 5 Stars with Half-Star SVG definition */}
      <div
        className={`inline-flex items-center ${sizeStyles.spacing}`}
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const isFull = activeRating >= starIndex;
          const isHalf = !isFull && activeRating >= starIndex - 0.5;
          const halfGradId = `half-star-${idPrefix}-${starIndex}`;

          return (
            <div
              key={starIndex}
              className={`relative select-none ${
                readOnly ? 'cursor-default' : 'cursor-pointer group'
              }`}
              style={{ width: sizeStyles.iconSize, height: sizeStyles.iconSize }}
            >
              {/* SVG Graphic with crisp half-split support */}
              <svg
                width={sizeStyles.iconSize}
                height={sizeStyles.iconSize}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transition-transform duration-100 group-hover:scale-110 pointer-events-none"
              >
                <defs>
                  <linearGradient id={halfGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#27272a" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={isFull ? '#f59e0b' : isHalf ? `url(#${halfGradId})` : '#27272a'}
                  stroke={isFull || isHalf ? '#f59e0b' : '#3f3f46'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Interactive Hitboxes: Left Half and Right Half */}
              {!readOnly && (
                <>
                  <div
                    title={`${starIndex - 0.5} Stars`}
                    className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer"
                    onMouseEnter={() => handleHalfHover(starIndex, false)}
                    onClick={() => handleStarHalfClick(starIndex, false)}
                  />
                  <div
                    title={`${starIndex} Stars`}
                    className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer"
                    onMouseEnter={() => handleHalfHover(starIndex, true)}
                    onClick={() => handleStarHalfClick(starIndex, true)}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className={`font-semibold font-mono tracking-tight transition-colors ${
            clampedValue > 0 ? 'text-amber-400' : 'text-zinc-500'
          } ${sizeStyles.text}`}
        >
          {clampedValue > 0 ? `${clampedValue.toFixed(1)} / 5` : 'Unrated'}
        </span>
      )}

      {/* Quick Steppers & Clear (if interactive & requested) */}
      {!readOnly && showSteppers && onChange && (
        <div className="flex items-center gap-1 ml-1">
          <button
            type="button"
            title="Decrease 0.5 stars"
            disabled={clampedValue <= 0}
            onClick={() => increment(-0.5)}
            className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-xs"
          >
            <Minus size={11} />
          </button>
          <button
            type="button"
            title="Increase 0.5 stars"
            disabled={clampedValue >= 5}
            onClick={() => increment(0.5)}
            className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-xs"
          >
            <Plus size={11} />
          </button>
          {clampedValue > 0 && (
            <button
              type="button"
              title="Clear rating"
              onClick={() => onChange(0)}
              className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
};
