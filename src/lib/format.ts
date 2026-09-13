/**
 * Short, glanceable formatting for the activity timeline, where a full date on
 * every row would out-weigh the thing the row is actually about.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "just now" / "4h ago" / "3d ago", falling back to a calendar date once the
 * relative form stops being informative — past a few weeks "31d ago" tells you
 * less than "12 Aug" does.
 */
export function relativeTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const elapsed = Date.now() - then;
  // A row written by a clock that is slightly ahead must not read "-1m ago".
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 28 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;

  return new Date(then).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "1,204" — thousands separators for counts large enough to need scanning. */
export const formatCount = (value: number): string => value.toLocaleString();
