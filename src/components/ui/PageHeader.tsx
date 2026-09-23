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
  /**
   * One line of figures under the title, on a wide screen — "10 games tracked ·
   * 241 of 429 awards · 486h played". Where a page gives one, it stands in for
   * the pills there: a sentence under a 24px title reads as its caption, where
   * pills beside it read as a second heading. A phone keeps the pills.
   */
  subtitle?: React.ReactNode;
  /** Controls pushed to the trailing edge, above the fold on a wide screen. */
  action?: React.ReactNode;
  className?: string;
}> = ({
  title,
  badge,
  subtitle,
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
  // The figures go too: a phone's fixed header carries the count beside the
  // page's name, where it stays in view however far down the page you are.
  if (phone && !action) return null;

  /** One wrapping row, whether a page passes a single pill or three. */
  const pills = badge ? (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">{badge}</div>
  ) : null;

  /**
   * A wide screen: the title at 24 with its figures as a line underneath, and
   * the page's own control level with the bottom of that line. No mark and no
   * rule — the top bar already names the page with both, and the 28px to the
   * first section is what separates the header from it.
   */
  if (!phone) {
    return (
      <div className={cn('flex items-end gap-4', className)}>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <h1 className="min-w-0 text-550 font-bold tracking-tight text-gray-1000">{title}</h1>
            {subtitle ? null : pills}
          </div>
          {subtitle ? (
            <p className="mt-1.5 text-90 tabular-nums text-gray-700">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
    );
  }

  return <div className={cn('flex flex-wrap items-center gap-3', className)}>{action}</div>;
};
