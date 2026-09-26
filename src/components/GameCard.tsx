import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { Collection, HighlightStyle, UserGame } from '../types';
import { DEFAULT_COLLECTION_COLOR, PLATFORMS } from '../lib/constants';
import {
  BACKLOG_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  collectionName,
  isPermanentCollection,
  permanentOf,
} from '../lib/collections';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun, awardProgressLabel } from './TrophyBadge';
import { EditGameModal, GameInfoModal, GamePersonalModal } from '../lib/lazyDialogs';
import { Celebration } from './Celebration';
import { Meter, OverlayBadge } from './ui';
import { formatRating, ratingColor } from '../lib/rating';
import { completionPercent, isPerfect } from '../lib/completion';
import { formatHours, relativeTime } from '../lib/format';
import { useCelebrationFor } from '../lib/useCelebration';
import { useInView } from '../lib/useInView';
import { useIsPhone } from '../lib/useMediaQuery';
import { cn } from '../lib/cn';
import { EASE_OUT } from '../lib/motion';

/**
 * How long a followed card waits before measuring where it ended up.
 *
 * Past layout, and past the exit animation of any copy leaving the page — the
 * spotlight tile of a game that just stopped being played. Measure any earlier
 * and that departing copy still counts as visible, so the scroll to the copy
 * that actually remains never happens.
 */
const FOLLOW_SETTLE_MS = 400;

/** How long a smooth scroll is given to start before it is written off. */
const SMOOTH_SCROLL_GRACE_MS = 250;

/**
 * How long a card stays ringed after being scrolled to.
 *
 * Long enough to still be lit when the scroll lands — the ring goes up as the
 * page starts moving — and short enough that it reads as the app pointing
 * rather than as something the card now is.
 */
const FOUND_HIGHLIGHT_MS = 2200;

/**
 * The element a card actually scrolls within.
 *
 * The app puts its scroll on `<main>` rather than on the document, so the
 * window's own scroll position never moves and measuring against it reports
 * every card as being in exactly the same place.
 */
const scrollerOf = (node: HTMLElement): HTMLElement | null => {
  for (let element = node.parentElement; element; element = element.parentElement) {
    const { overflowY } = window.getComputedStyle(element);
    if (overflowY === 'auto' || overflowY === 'scroll') return element;
  }
  return null;
};

/**
 * What the right-hand end of a wide card's bottom line says: the one list a
 * game is in beyond its shelf, or — on the playing shelf, where every card is
 * in the same list — when it was last played.
 */
export type CardMeta = 'lists' | 'lastPlayed';

interface GameCardProps {
  game: UserGame;
  /**
   * The shared state a card needs, read once by the grid and handed down —
   * the card itself does not subscribe to the library. With the card memoised,
   * a write to one game re-renders that game's card and not the other 149.
   */
  collections: Collection[];
  highlightStyle?: HighlightStyle;
  /** The add dialog is announcing this game, and plays its burst instead. */
  announcing: boolean;
  /** This game's follow token, when the app has been asked to bring it into view. */
  followToken: number | null;
  /** This game's waiting celebration, if it has one. */
  celebrationToken: number | null;
  celebrationPlayed: (token: number) => void;
  /** Rendered below the progress row, for actions specific to one view. */
  action?: React.ReactNode;
  /** Drops the platform chip where a surrounding heading already states it. */
  hidePlatform?: boolean;
  meta?: CardMeta;
}

const GameCardImpl: React.FC<GameCardProps> = ({
  game,
  action,
  hidePlatform = false,
  meta = 'lists',
  collections,
  highlightStyle,
  announcing,
  followToken,
  celebrationToken,
  celebrationPlayed,
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  /**
   * Your own record of the game, which a card opens at every width — a sheet
   * below 1024, a two-column dialog above it. The store page's window is a
   * button inside it.
   */
  const [isPersonalOpen, setIsPersonalOpen] = useState(false);

  /**
   * Which of the three windows have ever been opened from this card.
   *
   * A window is mounted the first time it is asked for, and not before: a
   * library of 150 cards used to keep 450 closed dialogs mounted — each with
   * its own state, effects and listeners — and re-render every one of them on
   * each sync write. Kept mounted once opened, so a closing window still plays
   * its exit rather than vanishing. Monotonic, so noting it during render is
   * safe: the flag only ever turns on, in the same render that opens it.
   */
  const opened = useRef({ edit: false, info: false, personal: false });
  if (isEditOpen) opened.current.edit = true;
  if (isInfoOpen) opened.current.info = true;
  if (isPersonalOpen) opened.current.personal = true;

  const [cardRef, onScreen] = useInView<HTMLDivElement>(0.5);

  /** The follow this card is currently ringed for, so a repeat re-lights it. */
  const [found, setFound] = useState<number | null>(null);

  /**
   * This card plays a waiting celebration once it is actually being looked at —
   * unless the dialog announcing this very game is open over it, which is the
   * surface in front of someone and plays it instead.
   */
  const burst = useCelebrationFor(
    onScreen && !announcing ? celebrationToken : null,
    game.platform,
    celebrationPlayed,
  );

  /**
   * Sorting and grouping can drop a new game well down the page, so bring it
   * into view — but only when it is genuinely out of sight.
   *
   * A game can be on screen twice, in the spotlight row and again in its
   * platform section. Every copy is considered: if any one of them is already
   * visible the page stays put, and otherwise they all scroll to the same
   * first copy rather than fighting each other to their own.
   */
  useEffect(() => {
    if (followToken === null) return;
    let fallback: number | undefined;
    let clearFound: number | undefined;

    const timer = window.setTimeout(() => {
      const copies = [
        ...document.querySelectorAll<HTMLElement>(`[data-game-id="${CSS.escape(game.id)}"]`),
      ];
      if (copies.length === 0) return;

      // Ringed whether or not the page has to move: being sent to a card that
      // was already on screen is exactly the case where nothing else changes
      // and there is nothing to tell you which one you were sent to.
      setFound(followToken);
      clearFound = window.setTimeout(() => setFound(null), FOUND_HIGHLIGHT_MS);

      // Everything is measured against the scrolling panel, not the window.
      const scroller = scrollerOf(copies[0]);
      const view = scroller
        ? scroller.getBoundingClientRect()
        : { top: 0, bottom: window.innerHeight };
      const scrollTop = () => (scroller ? scroller.scrollTop : window.scrollY);

      const visible = copies.some((node) => {
        const { top, bottom } = node.getBoundingClientRect();
        return top >= view.top && bottom <= view.bottom;
      });
      if (visible) return;

      const target = copies[0];
      const startedAt = scrollTop();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Smooth scrolling is silently ignored in some engines, which would leave
      // the new game exactly as unfindable as before. If nothing has moved by
      // the time a smooth scroll would have started, jump there instead.
      fallback = window.setTimeout(() => {
        if (scrollTop() === startedAt) target.scrollIntoView({ block: 'center' });
      }, SMOOTH_SCROLL_GRACE_MS);
    }, FOLLOW_SETTLE_MS);

    return () => {
      window.clearTimeout(timer);
      if (fallback !== undefined) window.clearTimeout(fallback);
      if (clearFound !== undefined) window.clearTimeout(clearFound);
    };
  }, [followToken, game.id]);

  const platform = PLATFORMS[game.platform] ?? PLATFORMS.steam;
  const progress = completionPercent(game);

  /** The shelf this game is on, or null when it is only in the library. */
  const shelf = permanentOf(game.collections);

  /**
   * Every collection this game is in, shelf first.
   *
   * Ordered rather than filtered: the shelf is the headline, and a card that
   * listed "Soulsborne" before "Playing" would bury the thing you scan for.
   */
  const memberships = useMemo(() => {
    const ids = game.collections ?? [];
    return [...ids]
      .sort((a, b) => Number(isPermanentCollection(b)) - Number(isPermanentCollection(a)))
      .map((id) => ({
        id,
        permanent: isPermanentCollection(id) ? id : null,
        name: collectionName(id, collections),
        color: collections.find((c) => c.id === id)?.color ?? DEFAULT_COLLECTION_COLOR,
      }))
      // A membership naming a collection that no longer exists is not worth a
      // chip reading back its raw id.
      .filter((m) => m.permanent !== null || collections.some((c) => c.id === m.id));
  }, [game.collections, collections]);

  // Earned, not declared: the gold treatment follows the unlock counts alone.
  // It used to accept the "mastered" status as proof on its own, which meant a
  // card kept its rim and its emblem after an unlock was taken back, while the
  // meter underneath honestly read 95%.
  const isMastered = isPerfect(game);

  // No collection chips over the artwork, at any width. A phone has none at
  // all: the card is half a screen wide, one chip already crowded the title,
  // and where a game is filed is a tap away in the details dialog. A wide card
  // names one list on its bottom line instead — never over the art, where a
  // row of them used to clip the title and slide under the score.
  //
  // Lists only, not the shelf: the shelf is already the card's own edge — a
  // lit blue rim, a turning gold one, a greyed picture — and the section it
  // sits in.
  const phone = useIsPhone();
  const lists = memberships.filter((m) => m.permanent === null);
  const firstList = lists[0];
  const moreLists = lists.slice(1);

  // "Achievements"/"Trophies" while there is more to unlock, then the platform's
  // own completion announcement.
  const awardLabel = awardProgressLabel(game.platform, isMastered);

  const hoursLabel =
    game.hoursPlayed > 0 ? `${formatHours(game.hoursPlayed)}h played` : 'Not started';

  // Stroke draws the shelf as a coloured edge; fill tints the whole surface.
  // A finished game has a gold edge and a warm glow in either style.
  //
  // A wide card lays its shelf tint down as a wash over the card's own ground
  // rather than an outer glow: the strip below the art is solid now, and a
  // bloom around a panel that size lit the gap between two cards.
  const filled = highlightStyle === 'fill';
  //
  // A phone keeps its playing card lit with a bloom rather than the wash: on a
  // card that narrow the wash reads as a grey-blue tint, where the ring reads
  // as the shelf.
  const highlight = isMastered
    ? filled
      ? 'trophy-glow border-trophy-700/50 bg-trophy-100'
      : 'trophy-glow border-trophy-700/50 bg-gradient-to-b from-trophy-100/40 to-gray-100/72'
    : shelf === PLAYING_COLLECTION_ID
      ? filled
        ? 'glow-ring border-accent-700/50 bg-accent-100'
        : phone
          ? 'glow-ring border-accent-700/40 bg-gray-100/72'
          : 'border-accent-700/30 bg-gray-100/72 bg-gradient-to-b from-accent-700/16 to-accent-700/8 hover:border-accent-700/60'
      : 'border-gray-300/80 bg-gray-100/72 hover:border-gray-400';

  const openDetails = () => setIsPersonalOpen(true);

  /** Everything a card owns besides what it draws: rings, bursts, dialogs. */
  const extras = (
    <>
      {/* Keyed on the follow, so being sent here twice lights it twice rather
          than leaving a ring that is already part-way through fading. */}
      {found !== null && (
        <span key={found} aria-hidden className="found-ring z-30 rounded-lg" />
      )}

      {burst !== null && <Celebration key={burst} platform={game.platform} />}

      {/* Each window's code is prefetched while the app is idle; on the rare
          first tap before that, it simply arrives a moment later. */}
      {opened.current.edit ? (
        <EditGameModal game={game} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
      ) : null}

      {opened.current.personal ? (
      <GamePersonalModal
        game={game}
        isOpen={isPersonalOpen}
        onClose={() => setIsPersonalOpen(false)}
        // One closes as the other opens. Two dialogs up at once would be safe
        // now that the scroll lock is counted, but a stack of them is not what
        // stepping from your record to the store page is — it is the same move
        // sideways that Edit makes.
        onOpenStore={() => {
          setIsPersonalOpen(false);
          setIsInfoOpen(true);
        }}
        onEdit={() => setIsEditOpen(true)}
      />
      ) : null}

      {opened.current.info ? (
        <GameInfoModal
          game={game}
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          onEdit={() => setIsEditOpen(true)}
        />
      ) : null}
    </>
  );

  /**
   * The card is two boxes. The outer one is what the grid and the page see:
   * it is keyed for its exit, measured for being on screen, and skipped by the
   * browser entirely while it is off screen (`card-shell`, content-visibility)
   * — which is most of a library at any moment. That containment clips at the
   * padding box, so the shell carries a pixel of padding for the gold rim to
   * sit in, and drops the containment while a burst or a ring needs to spill
   * past the card.
   *
   * No `layout` animation and no JS entrance: measuring every card's box on
   * every render was the most expensive thing a sync did, and the entrance is
   * a CSS keyframe on the compositor. A re-sorted grid now settles at once.
   */
  const spilling = burst !== null || found !== null;

  return (
    <motion.div
      ref={cardRef}
      data-game-id={game.id}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2, ease: EASE_OUT } }}
      className={cn('card-enter flex', spilling ? 'card-shell-open' : 'card-shell')}
    >
    <div
      // A playing card lights its own edge in the accent; every other state
      // leaves --glow unset and glow-ring goes unused.
      style={{ '--glow': 'var(--color-accent-700)' } as React.CSSProperties}
      className={cn(
        // Full height of its grid row, so a row of cards always ends level.
        // The lift on hover is CSS, from md, where there is a pointer.
        'group relative flex flex-1 flex-col rounded-lg border transition-[translate,border-color] duration-200 md:hover:-translate-y-0.75',
        highlight,
      )}
    >
      {/* The whole card opens the game's details.
          A transparent button laid over the tile rather than a click handler on
          the card itself: the card contains its own controls and, on the backlog,
          a button in its footer, and a nested button inside a clickable parent is
          neither valid markup nor operable by keyboard. This sits below every
          one of them in the stack, so it catches only the parts of the card that
          do nothing else. */}
      <button
        type="button"
        onClick={openDetails}
        aria-label={`Game info for ${game.title}`}
        title="Open game info"
        className="absolute inset-0 z-20 rounded-lg"
      />
      {/* The finished-game treatment: a warm pool of light in the upper right,
          inside a still gold edge. No light travels around the rim — a pair of
          arcs forever circling every finished card pulled the eye away from
          the rest of the grid. */}
      {isMastered && <span aria-hidden className="trophy-spot z-0 rounded-lg" />}

      {/* Cover ------------------------------------------------------------- */}
      {/* 16:9 at every width, because that is the one image a game has — the
          phone's taller 3:2 box trimmed the sides off every picture to make
          room for an overlay that has since moved to the strip below. */}
      <div className="relative aspect-[16/9] w-full rounded-t-lg bg-gray-25">
        <div className="absolute inset-0 overflow-hidden rounded-t-lg">
          <CoverArt
            src={game.coverImage}
            title={game.title}
            className={cn(
              'h-full w-full object-cover object-center transition-all duration-500',
              'group-hover:scale-105',
              shelf === BACKLOG_COLLECTION_ID &&
                'opacity-85 grayscale group-hover:opacity-100 group-hover:grayscale-0',
            )}
          />
          {/* Scrims keep the overlays legible over any art.

              The top is shaded only in the corners that carry something — the
              score on the left, the award mark and platform on the right — so
              the middle of the picture stays clear. A full-width band there
              hid a third of every cover to lift two small marks. The bottom
              scrim is a share of the box, not a pixel height, so it holds the
              same stretch behind the title whatever size the card is. */}
          {game.rating ? <div aria-hidden className="cover-scrim-tl" /> : null}
          {isMastered || (!phone && !hidePlatform) ? (
            <div aria-hidden className="cover-scrim-tr" />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-gray-25/92 via-gray-25/55 via-45% to-transparent" />

          {/* Completion celebration: a slow specular sweep across the art. */}
          {isMastered && <div aria-hidden className="trophy-sweep" />}
        </div>

        {/* The score, top left, on the same edge as the title and the strip:
            a scrim with a hairline ring in the score's own colour, so the
            verdict reads from across the grid before the digits do. White
            figures inside it — the ring already says how good. */}
        {game.rating ? (
          <span
            title={`Game rated ${formatRating(game.rating)} out of 10`}
            className="absolute left-2.5 top-2.5 z-10 inline-flex h-5.5 min-w-8 items-center justify-center rounded-sm bg-gray-25/55 px-1.5 text-75 font-bold tabular-nums text-gray-1000 md:left-3 md:top-3 md:h-6 md:min-w-9 md:text-90"
            style={{ boxShadow: `inset 0 0 0 1px ${ratingColor(game.rating)}` }}
          >
            {formatRating(game.rating)}
          </span>
        ) : null}

        {/* Top right: the award mark on a finished game, and — on a wide screen
            outside a platform section, where nothing else says which platform
            this is — the platform. A phone never shows the platform: its
            sections already name it, and in the mixed spotlight the award mark
            in the strip does.

            The award mark stands on the art with no disc behind it, lit gold,
            at every width. The corner scrim is what keeps it legible over
            a bright picture — the same job the bottom one does for the title.
            Below the card-wide info button, so a medal is not the one patch of
            a clickable card that does nothing. */}
        {isMastered || (!phone && !hidePlatform) ? (
          <div className="absolute right-2.5 top-2.25 z-10 flex items-center gap-2 md:right-3 md:top-2.75">
            {isMastered ? (
              <span
                title={awardLabel}
                className="flex drop-shadow-[0_0_6px_color-mix(in_srgb,var(--color-trophy-900)_55%,transparent)]"
              >
                <TrophyBadge platform={game.platform} size={phone ? 24 : 28} />
              </span>
            ) : null}
            {!phone && !hidePlatform ? (
              <OverlayBadge square tint={platform.tint} title={platform.name}>
                <PlatformIcon platform={game.platform} size={15} className="text-gray-1000" />
              </OverlayBadge>
            ) : null}
          </div>
        ) : null}

        {/* One line, and an ellipsis: a title that wrapped made its card taller
            than the rest of its row, which is the thing a fixed-height card
            exists to prevent. The full name is the button's label and this
            line's tooltip. */}
        <h3
          title={game.title}
          className={cn(
            'pointer-events-none absolute inset-x-2.5 bottom-2 z-10 truncate text-90 font-bold tracking-tight text-gray-1000 [text-shadow:0_1px_3px_rgb(3_5_10/0.9)]',
            'md:inset-x-3 md:bottom-2.5 md:text-150',
          )}
        >
          {game.title}
        </h3>
      </div>

      {/* Strip ------------------------------------------------------------- */}
      {/* Solid, below the art: the count and the percentage, then the meter.
          A wide card adds playtime and one list; a phone stops there, which is
          what lets its type stay at 12 rather than shrinking to fit a picture.
          Always the same lines whatever the state, so a row of cards ends
          level. */}
      <div className="flex flex-1 flex-col gap-1.75 p-2.5 md:gap-2.25 md:p-3">
        <div className="flex items-center gap-1.75 text-75 tabular-nums md:gap-2 md:text-90">
          {/* The platform's own award, dimmed until it is actually earned. */}
          <TrophyBadge platform={game.platform} size={phone ? 14 : 15} muted={!isMastered} />
          <span className="font-bold text-gray-900">
            {game.achievementsUnlocked} / {game.achievementsTotal}
          </span>
          <span className="ml-auto text-gray-700">{progress}%</span>
        </div>

        <Meter
          value={progress}
          tone={progress === 100 ? 'trophy' : 'accent'}
          label={`${game.title} ${awardNoun(game.platform).toLowerCase()} progress`}
        />

        {phone ? (
          // A phone's per-card action lives in the strip, full width — its own
          // target, lifted above the card's info button.
          action ? <div className="relative z-30 mt-0.25">{action}</div> : null
        ) : (
          <div className="flex h-5.5 min-w-0 items-center gap-2 text-75 tabular-nums text-gray-700">
            <Clock size={13} className="shrink-0 text-gray-600" />
            <span className="shrink-0">{hoursLabel}</span>

            {meta === 'lastPlayed' ? (
              <span className="ml-auto shrink-0 text-gray-600">
                {relativeTime(game.lastPlayedAt)}
              </span>
            ) : firstList ? (
              // The list's own colour on the text as well as the dot — a grey
              // label beside a coloured dot made the colour look like
              // decoration rather than the thing naming the list.
              <span
                className="ml-auto flex min-w-0 items-center gap-1.5"
                title={lists.map((m) => m.name).join(', ')}
              >
                <span
                  className="inline-flex h-5.5 min-w-0 items-center gap-1.5 rounded-full border border-gray-300 px-2.25 font-bold"
                  style={{ color: firstList.color }}
                >
                  <span className="h-1.75 w-1.75 shrink-0 rounded-full bg-current" />
                  <span className="truncate">{firstList.name}</span>
                </span>
                {moreLists.length > 0 ? (
                  <span className="shrink-0 font-bold text-gray-600">+{moreLists.length}</span>
                ) : null}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Lifted above the info button, so a view's own action — starting a
          backlog game — stays clickable rather than opening the dialog. */}
      {action && !phone ? (
        <div className="relative z-30 border-t border-gray-200 p-3">{action}</div>
      ) : null}

      {extras}
    </div>
    </motion.div>
  );
};

/**
 * Memoised: a card re-renders when its game, its action or the shared state it
 * reads changes — not whenever a parent does. With context the card still
 * hears about every library change, but a page filtering or a sort menu
 * opening no longer walks 150 of them.
 */
export const GameCard = memo(GameCardImpl);
