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
  title,
  children,
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={selected}
    className={cn(
      'inline-flex h-8 items-center gap-1.5 rounded-sm border px-3',
      'text-75 font-bold whitespace-nowrap transition-all',
      selected
        ? SELECTED[tone]
        : 'border-gray-300 bg-white/3 text-gray-700 hover:border-gray-400 hover:bg-white/6 hover:text-gray-900',
      className,
    )}
  >
    {children}
  </button>
);
