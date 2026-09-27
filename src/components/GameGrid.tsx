import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Platform, PLATFORM_IDS, UserGame } from '../types';
import { PLATFORMS, comparePlatformOrder } from '../lib/constants';
import { useIsPhone } from '../lib/useMediaQuery';
import { cn } from '../lib/cn';
import { PlatformSectionHeader } from './PlatformSectionHeader';
import { PlatformIcon } from './PlatformIcon';
import { CardMeta, GameCard } from './GameCard';
import { FlipGrid } from './FlipGrid';
import { useGame } from '../context/GameContext';

type RenderAction = (game: UserGame) => React.ReactNode;

interface GameListProps {
  games: UserGame[];
  renderAction?: RenderAction;
  hidePlatform?: boolean;
  meta?: CardMeta;
  /** The grid's columns: the page's own, or a half-width platform column's. */
  columns?: 'page' | 'half';
}

/**
 * One section's games, as a grid of cards — however few there are. A section
 * of one or two used to become full-width rows on a wide screen; a card that
 * looks like every other card turned out to matter more than a filled row.
 */
export const GameList: React.FC<GameListProps> = ({
  games,
  renderAction,
  hidePlatform,
  meta,
  columns = 'page',
}) => {
  // Read here, once, and handed to each card as the few values that concern
  // it — so a card only re-renders when its own game or its own slice of this
  // changes. See GameCard's props.
  const { collections, profile, added, follow, celebration, celebrationPlayed } = useGame();

  return (
    <div className={columns === 'half' ? 'grid-cards-half' : 'grid-cards'}>
      <AnimatePresence>
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            meta={meta}
            hidePlatform={hidePlatform}
            action={renderAction?.(game)}
            collections={collections}
            highlightStyle={profile.highlightStyle}
            announcing={added?.gameId === game.id}
            followToken={follow?.gameId === game.id ? follow.token : null}
            celebrationToken={celebration?.gameId === game.id ? celebration.token : null}
            celebrationPlayed={celebrationPlayed}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface GameGridProps {
  games: UserGame[];
  /**
   * False while a single platform is already filtered to, where splitting the
   * list would only produce one section under a heading that repeats the filter.
   */
  grouped?: boolean;
  platformOrder?: Platform[];
  /** Per-card action, e.g. the backlog's start button. */
  renderAction?: RenderAction;
  /** What a wide card's bottom line ends with. */
  meta?: CardMeta;
}

interface Group {
  platform: Platform;
  games: UserGame[];
}

type SectionProps = Pick<GameGridProps, 'renderAction' | 'meta'> & { groups: Group[] };

/**
 * Both platforms side by side, each in a column that scrolls on its own.
 *
 * One long page put every Steam game above every PlayStation one, so the
 * second platform was a scroll past the whole of the first before any of it
 * showed. Side by side, both are in view at once and each is read down its own
 * column, in the page's chosen order. Each column is held to the height of the
 * window, so scrolling one never pushes the other out of sight.
 */
const PlatformColumns: React.FC<SectionProps> = ({ groups, renderAction, meta }) => (
  <div
    className="grid gap-6 lg:gap-8"
    style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}
  >
    {groups.map(({ platform, games }) => (
      <section key={platform} className="flex min-w-0 flex-col gap-3 md:gap-4">
        <PlatformSectionHeader platform={platform} count={games.length} />
        {/* The padding, taken back by the margin, is the room a card's hover
            lift and glow need: a scrolling box clips at its padding edge.
            Positioned, so a card fading out while the list changes is placed
            inside the column it was in. */}
        <div className="relative -mx-2.5 max-h-[max(24rem,calc(100dvh-11.5rem))] overflow-y-auto overscroll-contain px-2.5 pb-3 pt-2.5">
          <GameList
            games={games}
            renderAction={renderAction}
            meta={meta}
            hidePlatform
            columns="half"
          />
        </div>
      </section>
    ))}
  </div>
);

/**
 * Where a stuck heading sits: half a rem clear of the phone's fixed top bar
 * (3.5rem) and bottom bar (3.75rem).
 *
 * Sticky offsets count from <main>'s content edge, not the screen's, and main
 * is padded to clear those same bars (4.25rem above, 5.5rem below) — so the
 * offsets are what is left once that padding is taken off, and the safe-area
 * insets, which are in both, cancel out.
 */
const STICK_TOP = '-0.25rem';
const STICK_BOTTOM = '-1.25rem';
/** Scrolling to a section is measured from the screen's edge, where they do count. */
const JUMP_TOP = 'calc(4rem + env(safe-area-inset-top))';
/** One stuck heading's height plus the gap to the next one stacked on it. */
const STICK_STEP = '2.875rem';

const offset = (base: string, steps: number) =>
  steps === 0 ? base : `calc(${base} + ${steps} * ${STICK_STEP})`;

/** The element a page scrolls in — <main>, not the window. */
function scrollParentOf(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return null;
}

type Stuck = 'top' | 'bottom' | null;

/**
 * A phone's sections, with headings that stay in reach.
 *
 * Every heading is sticky both ways. Scrolled past, it holds under the top bar
 * as a bar pointing back up to where its platform starts; still ahead, it waits
 * above the bottom bar pointing down to it. Tapping either goes there. The
 * headings stack rather than cover one another, so deep into PlayStation the
 * way back to Steam is still on screen above it.
 *
 * The headings are siblings in one box rather than each inside its own
 * section: a sticky element never leaves its parent, and a heading waiting at
 * the bottom of the screen is by definition outside the section it heads.
 */
const PhoneSections: React.FC<SectionProps> = ({ groups, renderAction, meta }) => {
  const count = groups.length;
  const marks = useRef<(HTMLDivElement | null)[]>([]);
  const heads = useRef<(HTMLButtonElement | null)[]>([]);
  const [stuck, setStuck] = useState<Stuck[]>([]);

  // Whether a heading is stuck, and to which edge, is where it sits against
  // where it would sit: an empty mark in the flow just above it keeps the
  // natural position to compare with.
  useEffect(() => {
    const scroller = heads.current[0] ? scrollParentOf(heads.current[0]) : null;
    const target: HTMLElement | Window = scroller ?? window;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const next = Array.from({ length: count }, (_, i): Stuck => {
        const head = heads.current[i];
        const mark = marks.current[i];
        if (!head || !mark) return null;
        const moved = head.getBoundingClientRect().top - mark.getBoundingClientRect().top;
        return moved > 1 ? 'top' : moved < -1 ? 'bottom' : null;
      });
      setStuck((prev) =>
        prev.length === next.length && prev.every((s, i) => s === next[i]) ? prev : next,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    target.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      target.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [count, groups]);

  return (
    <>
      {groups.map(({ platform, games }, i) => {
        const state = stuck[i] ?? null;
        const top = offset(STICK_TOP, i);
        const Arrow = state === 'bottom' ? ArrowDown : ArrowUp;
        return (
          <React.Fragment key={platform}>
            <div
              ref={(node) => {
                marks.current[i] = node;
              }}
              aria-hidden
              className={i > 0 ? 'mt-6' : undefined}
              style={{ scrollMarginTop: offset(JUMP_TOP, i) }}
            />
            <button
              type="button"
              ref={(node) => {
                heads.current[i] = node;
              }}
              onClick={() =>
                marks.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              aria-label={`Go to ${PLATFORMS[platform].name}`}
              style={{ top, bottom: offset(STICK_BOTTOM, count - 1 - i) }}
              className={cn(
                'sticky z-40 flex h-10 w-full items-center gap-2.5 rounded-md border text-left',
                'transition-[background-color,border-color,padding,box-shadow] duration-200',
                state
                  ? 'border-gray-300 bg-gray-100/95 px-3 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.7)] backdrop-blur-md'
                  : 'border-transparent px-0',
              )}
            >
              <span
                style={{ color: PLATFORMS[platform].color }}
                className="flex shrink-0 items-center drop-shadow-[0_0_5px_currentColor]"
              >
                <PlatformIcon platform={platform} size={17} />
              </span>
              <span className="eyebrow shrink-0 text-gray-900">{PLATFORMS[platform].name}</span>
              <span
                aria-hidden
                className={cn('h-px min-w-4 flex-1', state ? 'bg-transparent' : 'bg-gray-200')}
              />
              <span className="shrink-0 text-75 font-bold tabular-nums text-gray-600">
                {games.length}
              </span>
              {state ? <Arrow size={15} className="shrink-0 text-accent-900" /> : null}
            </button>
            <div className="mt-3">
              <GameList games={games} renderAction={renderAction} meta={meta} hidePlatform />
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

/**
 * The library grid, optionally split into per-platform sections.
 *
 * When grouped, the section heading states the platform, so the cards inside
 * drop their own platform chip rather than repeating it on every tile. With
 * both platforms present, a wide screen puts them in columns side by side and
 * a phone keeps their headings in reach; with one, it is the one section.
 */
export const GameGrid: React.FC<GameGridProps> = ({
  games,
  grouped = true,
  platformOrder,
  renderAction,
  meta,
}) => {
  const phone = useIsPhone();

  const groups = useMemo(() => {
    if (!grouped) return null;
    return [...PLATFORM_IDS]
      .sort((a, b) => comparePlatformOrder(a, b, platformOrder))
      .map((platform) => ({ platform, games: games.filter((g) => g.platform === platform) }))
      .filter((group) => group.games.length > 0);
  }, [games, grouped, platformOrder]);

  // In the order they are drawn: grouped, that is section by section.
  const ids = useMemo(
    () => (groups ? groups.flatMap((group) => group.games) : games).map((game) => game.id),
    [groups, games],
  );

  if (!groups) {
    return (
      <FlipGrid ids={ids}>
        <GameList games={games} renderAction={renderAction} meta={meta} />
      </FlipGrid>
    );
  }

  if (groups.length > 1) {
    return (
      <FlipGrid ids={ids}>
        {phone ? (
          <PhoneSections groups={groups} renderAction={renderAction} meta={meta} />
        ) : (
          <PlatformColumns groups={groups} renderAction={renderAction} meta={meta} />
        )}
      </FlipGrid>
    );
  }

  return (
    <FlipGrid ids={ids} className="space-y-6 md:space-y-7">
      {groups.map(({ platform, games: list }) => (
        <section key={platform} className="space-y-3 md:space-y-4">
          <PlatformSectionHeader platform={platform} count={list.length} />
          <GameList games={list} renderAction={renderAction} meta={meta} hidePlatform />
        </section>
      ))}
    </FlipGrid>
  );
};
