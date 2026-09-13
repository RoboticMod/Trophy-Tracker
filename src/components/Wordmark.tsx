import React from 'react';
import { APP_NAME } from '../lib/constants';
import { TrophyPair } from './TrophyBadge';
import { cn } from '../lib/cn';

interface WordmarkProps {
  /** Hides the name below the given breakpoint, leaving the mark alone. */
  size?: 'sm' | 'md';
  /** Drops the name entirely, for the narrowest rails. */
  markOnly?: boolean;
  className?: string;
}

/**
 * The app's lockup: both award marks in a gold-lit well, then the name set in
 * two weights.
 *
 * The contrast is weight and letter-spacing rather than colour — "TROPHY"
 * heavy and tight, "TRACKER" light and open, both in the same ink. A two-tone
 * name where the second half turns accent-blue is the single most recognisable
 * thing about the site this design borrows from, and copying it would make this
 * app look like that one rather than like itself. Gold, not blue, is this app's
 * own colour anyway: it is what a finished game earns.
 */
export const Wordmark: React.FC<WordmarkProps> = ({
  size = 'md',
  markOnly = false,
  className,
}) => {
  const [first, ...rest] = APP_NAME.split(' ');

  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md',
          'border border-trophy-700/35 bg-trophy-700/10',
          'shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_0_12px_-6px_var(--color-trophy-700)]',
          size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        )}
      >
        <TrophyPair size={size === 'sm' ? 15 : 17} />
      </span>

      {markOnly ? null : (
        <span className="min-w-0 truncate leading-none">
          <span
            className={cn(
              'font-bold uppercase tracking-tight text-gray-1000',
              size === 'sm' ? 'text-200' : 'text-300',
            )}
          >
            {first}
          </span>
          {rest.length ? (
            <span
              className={cn(
                'ml-1 font-normal uppercase tracking-[0.18em] text-gray-700',
                size === 'sm' ? 'text-100' : 'text-200',
              )}
            >
              {rest.join(' ')}
            </span>
          ) : null}
        </span>
      )}
    </span>
  );
};
