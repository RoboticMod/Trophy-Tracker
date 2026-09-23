import React from 'react';
import { cn } from '../../lib/cn';

/**
 * The colour a chip takes when it is the active filter. It follows whatever the
 * page is filtering: gold on the achievements view, neutral on the backlog,
 * accent everywhere else — so the selection reads as part of that page rather
 * than as one generic highlight reused across all of them.
 */
export type FilterChipTone = 'accent' | 'trophy' | 'neutral';

const SELECTED: Record<FilterChipTone, string> = {
  accent: 'border-accent-700/60 bg-accent-700/16 text-accent-900 shadow-[0_0_14px_-5px_var(--color-accent-700)]',
  trophy: 'border-trophy-700/60 bg-trophy-700/16 text-trophy-900 shadow-[0_0_14px_-5px_var(--color-trophy-700)]',
  neutral: 'border-gray-500 bg-gray-300 text-gray-1000',
};

interface FilterChipProps {
  selected: boolean;
  onClick: () => void;
  tone?: FilterChipTone;
  /**
   * A raw colour for the selected state, overriding the tone. Used where the
   * thing being filtered carries its own identity colour — a collection — so
   * the chip lights in that colour rather than in the page's accent.
   */
  color?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A toggle in a row of filters. Shared by the library, backlog, achievements
 * and catalog views, which all previously kept their own copy of this markup.
 */
export const FilterChip: React.FC<FilterChipProps> = ({
  selected,
  onClick,
  tone = 'accent',
  color,
  title,
  children,
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={selected}
    // A supplied colour is data rather than a token, so it is carried inline —
    // the same wash, edge and bloom the tone classes apply, in that colour.
    style={
      selected && color
        ? {
            borderColor: color,
            backgroundColor: `${color}22`,
            boxShadow: `0 0 14px -5px ${color}`,
          }
        : undefined
    }
    // A 36px pill at 13px, at every width: in a phone's scrolling row the row
    // around it makes up the 44px target, and on a desktop it sits level with
    // the 40px field and selects in a one-line control row.
    className={cn(
      'inline-flex h-9 shrink-0 items-center gap-1.75 rounded-full border px-3.5',
      'text-90 font-bold whitespace-nowrap transition-all',
      selected
        ? color
          ? 'text-gray-1000'
          : SELECTED[tone]
        : 'border-gray-300 bg-white/3 text-gray-700 hover:border-gray-400 hover:bg-white/6 hover:text-gray-900',
      className,
    )}
  >
    {children}
  </button>
);
