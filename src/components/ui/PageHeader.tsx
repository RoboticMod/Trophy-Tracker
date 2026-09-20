import React from 'react';
import { cn } from '../../lib/cn';
import { useIsPhone } from '../../lib/useMediaQuery';

/**
 * The title block every library page opens with.
 *
 * Five pages hand-rolled the same shape — one of them said so in a comment —
 * which is five places to change when the shape does. They also each carried a
 * paragraph under the title restating what the title already said; that text
 * now lives in a dismissable `IntroNotice` instead, so it can be read once and
 * then be gone for good.
 */
export const PageHeader: React.FC<{
  /** The tinted square to the left of the title. */
  icon: React.ReactNode;
  /** Token classes for that square — its background, and its ink. */
  iconClassName?: string;
  title: React.ReactNode;
  /**
   * The page's headline figures, as `Badge` pills beside the title.
   *
   * One pill or several — they are laid out in a wrapping row either way, so a
   * page with three cannot drift into a different shape from a page with one.
   *
   * These were a strip of large figures under the title, and before that a band
   * of cards below the header. Both restated the title: a page called Playing,
   * with a pill reading "6 active" next to it, then said "6 ACTIVE TITLES" on a
   * line of its own underneath. The pill was always the better of the two, and
   * it is the one that fits beside the name.
   */
  badge?: React.ReactNode;
  /** Controls pushed to the trailing edge, above the fold on a wide screen. */
  action?: React.ReactNode;
  className?: string;
}> = ({
  icon,
  iconClassName = 'bg-gray-300 text-gray-800',
  title,
  badge,
  action,
  className,
}) => {
  /**
   * A phone reads its page title from the app header, which is fixed and so
   * says where you are however far down the page you have scrolled. Repeating
   * it here would state the same thing twice, a line apart, and cost a phone
   * the top of every page to do it.
   *
   * The figures and the controls stay: neither is a title, and neither is
   * anywhere else.
   */
  const phone = useIsPhone();
  if (phone && !badge && !action) return null;

  /** One wrapping row, whether a page passes a single pill or three. */
  const pills = badge ? (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">{badge}</div>
  ) : null;

  return (
    <div className={cn('border-b border-gray-200 pb-5', className)}>
      {phone ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {pills}
          {action}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                iconClassName,
              )}
            >
              {icon}
            </div>
            <h1 className="min-w-0 text-600 font-bold tracking-tight text-gray-1000">{title}</h1>
            {pills}
          </div>

          {action}
        </div>
      )}
    </div>
  );
};
