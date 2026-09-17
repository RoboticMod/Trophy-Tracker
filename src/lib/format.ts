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

/* -------------------------------------------------------------------------- */
/* Playtime                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Hours, to a tenth — the precision playtime is actually kept in.
 *
 * A tenth is not a number binary floating point can hold exactly, so adding
 * them up drifts: 12.4 + 6.4 comes to 18.799999999999997, and a total that
 * went straight into a template string rendered every one of those digits.
 * Every sum and every nudge of the hours field comes back through here.
 */
export const roundHours = (hours: number): number => Math.round(hours * 10) / 10;

/** Total playtime across a set of games, without the arithmetic showing. */
export const sumHours = (games: { hoursPlayed?: number }[]): number =>
  roundHours(games.reduce((total, game) => total + (game.hoursPlayed || 0), 0));

/**
 * "18.8", "1,204" — a figure in hours, ready to have an "h" put after it.
 *
 * Rounded rather than truncated, separated once it is long enough to need it,
 * and with no trailing ".0", which reads as precision that is not there.
 */
export const formatHours = (hours: number): string =>
  roundHours(hours).toLocaleString(undefined, { maximumFractionDigits: 1 });

/**
 * A date input speaks yyyy-mm-dd in local time, while the app stores instants.
 *
 * Both conversions go through the local calendar rather than through
 * toISOString, which would shift the date by a day for anyone west of UTC —
 * finishing a game at eight in the evening in New York would be recorded, and
 * then shown back, as the following morning.
 */
export function toDateInput(iso: string | undefined | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Today, in the form a date input wants. */
export const today = (): string => toDateInput(new Date().toISOString());

/**
 * A yyyy-mm-dd back to an instant, at midday local time.
 *
 * Midday rather than midnight: a date-only value has no time in it, and midday
 * is the one hour of the day that no timezone offset can push onto a different
 * date.
 */
export function fromDateInput(value: string): string | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;

  const date = new Date(year, month - 1, day, 12, 0, 0);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
