import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { UserGame } from '../types';
import { DEFAULT_COLLECTION_COLOR, PLATFORMS } from '../lib/constants';
import {
  BACKLOG_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  collectionName,
  isPermanentCollection,
  permanentOf,
} from '../lib/collections';
import { useGame } from '../context/GameContext';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun, awardProgressLabel } from './TrophyBadge';
import { EditGameModal } from './EditGameModal';
import { GameInfoModal } from './GameInfoModal';
import { GamePersonalModal } from './GamePersonalModal';
import { Celebration } from './Celebration';
import { RatingValue } from './Rating';
import { Meter, OverlayBadge } from './ui';
import { formatRating, ratingColor } from '../lib/rating';
import { completionPercent, isPerfect } from '../lib/completion';
import { formatHours, relativeTime } from '../lib/format';
import { useCelebration } from '../lib/useCelebration';
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

/**
 * A tile in a grid, or a full-width row. A section of fewer than three games
 * is laid out as rows on a wide screen: one card stranded in a five-column
 * track is the alignment fault rows exist to avoid. A phone is always tiles.
 */
export type CardLayout = 'card' | 'row';

interface GameCardProps {
  game: UserGame;
  /** Rendered below the progress row, for actions specific to one view. */
  action?: React.ReactNode;
  /** Drops the platform chip where a surrounding heading already states it. */
  hidePlatform?: boolean;
  meta?: CardMeta;
  layout?: CardLayout;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  action,
  hidePlatform = false,
  meta = 'lists',
  layout = 'card',
}) => {
  const { profile, collections, added, follow } = useGame();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  /**
   * Your own record of the game, which a card opens at every width — a sheet
   * below 1024, a two-column dialog above it. The store page's window is a
   * button inside it.
   */
  const [isPersonalOpen, setIsPersonalOpen] = useState(false);

  const [cardRef, onScreen] = useInView<HTMLDivElement>(0.5);

  /** The follow this card is currently ringed for, so a repeat re-lights it. */
  const [found, setFound] = useState<number | null>(null);

  const followToken = follow?.gameId === game.id ? follow.token : null;

  /**
   * This card plays a waiting celebration once it is actually being looked at —
   * unless the dialog announcing this very game is open over it, which is the
   * surface in front of someone and plays it instead.
   */
  const burst = useCelebration(game, onScreen && added?.gameId !== game.id);

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
  // A finished game is handled by the turning gold rim below instead of a
  // border, so its stroke variant asks only for the glow.
  //
  // A wide card lays its shelf tint down as a wash over the card's own ground
  // rather than an outer glow: the strip below the art is solid now, and a
  // bloom around a panel that size lit the gap between two cards.
  const filled = profile.highlightStyle === 'fill';
  const highlight = isMastered
    ? filled
      ? 'trophy-glow border-transparent bg-trophy-100'
      : phone
        ? 'trophy-glow border-transparent bg-gradient-to-b from-trophy-100/45 to-gray-100/70'
        : 'trophy-glow border-transparent bg-gradient-to-b from-trophy-100/40 to-gray-100/72'
    : shelf === PLAYING_COLLECTION_ID
      ? filled
        ? 'glow-ring border-accent-700/50 bg-accent-100'
        : phone
          ? 'glow-ring border-accent-700/40 bg-gray-100/70 hover:border-accent-700'
          : 'border-accent-700/30 bg-gray-100/72 bg-gradient-to-b from-accent-700/16 to-accent-700/8 hover:border-accent-700/60'
      : phone
        ? 'border-gray-300/70 bg-gray-100/70 hover:border-gray-400'
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

      <EditGameModal game={game} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />

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

      <GameInfoModal
        game={game}
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        onEdit={() => setIsEditOpen(true)}
      />
    </>
  );

  const motionProps = {
    ref: cardRef,
    'data-game-id': game.id,
    layout: true,
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.2, ease: EASE_OUT } },
    // Entrances and re-flows share the app's easing; a re-sorted grid glides
    // to its new places rather than springing there.
    transition: { duration: 0.45, ease: EASE_OUT, layout: { duration: 0.45, ease: EASE_OUT } },
  } as const;

  // Row ------------------------------------------------------------------------
  // For a section too sparse to fill a grid row: the art at 200 × 112, the name
  // at a heading's size, and the view's own action on the right where a hand
  // expects it, rather than a card standing alone at the left of an empty
  // track.
  if (layout === 'row' && !phone) {
    const rowMeta = [
      shelf === BACKLOG_COLLECTION_ID
        ? 'Queued'
        : shelf === PLAYING_COLLECTION_ID
          ? collectionName(PLAYING_COLLECTION_ID, collections)
          : null,
      game.hoursPlayed > 0
        ? `${formatHours(game.hoursPlayed)}h played`
        : 'not started · no playtime recorded',
      game.lastPlayedAt ? `last played ${relativeTime(game.lastPlayedAt)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <motion.div
        {...motionProps}
        className={cn(
          'group relative flex items-center gap-4.5 rounded-lg border p-3.5 transition-colors',
          highlight,
        )}
      >
        <button
          type="button"
          onClick={openDetails}
          aria-label={`Game info for ${game.title}`}
          title="Open game info"
          className="absolute inset-0 z-20 rounded-lg"
        />
        {isMastered && <span aria-hidden className="gold-ring z-30 rounded-lg" />}

        <div className="relative h-28 w-50 shrink-0 overflow-hidden rounded-md bg-gray-25">
          <CoverArt
            src={game.coverImage}
            title={game.title}
            className={cn(
              'h-full w-full object-cover object-center transition-all duration-500',
              shelf === BACKLOG_COLLECTION_ID &&
                'opacity-85 grayscale group-hover:opacity-100 group-hover:grayscale-0',
            )}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.75">
          <h3 className="truncate text-250 font-bold tracking-tight text-gray-1000">
            {game.title}
          </h3>
          <div className="flex items-center gap-2.5 text-90 tabular-nums text-gray-700">
            <TrophyBadge platform={game.platform} size={15} muted={!isMastered} />
            <span className="font-bold text-gray-900">
              {game.achievementsUnlocked} / {game.achievementsTotal}
            </span>
            <span>
              {game.achievementsUnlocked === 0
                ? `${awardNoun(game.platform).toLowerCase()} waiting`
                : `${progress}%`}
            </span>
          </div>
          <p className="truncate text-75 text-gray-600">
            {rowMeta.charAt(0).toUpperCase() + rowMeta.slice(1)}
          </p>
        </div>

        {/* Lifted above the info button, so a view's own action stays
            clickable rather than opening the dialog. */}
        {action ? <div className="relative z-30 shrink-0">{action}</div> : null}

        {extras}
      </motion.div>
    );
  }

  return (
    <motion.div
      {...motionProps}
      whileHover={{ y: -3, transition: { duration: 0.2, ease: EASE_OUT } }}
      // A playing card lights its own edge in the accent; every other state
      // leaves --glow unset and glow-ring goes unused.
      style={{ '--glow': 'var(--color-accent-700)' } as React.CSSProperties}
      className={cn(
        // Full height of its grid row, so a row of cards always ends level.
        'group relative flex h-full flex-col rounded-lg border shadow-lg backdrop-blur-sm transition-colors',
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
          and two highlights travelling around the rim. The rim is drawn over
          the card rather than behind it, because a card paints its own
          background before any child and would hide a ring drawn underneath. */}
      {isMastered && (
        <>
          <span aria-hidden className="trophy-spot z-0 rounded-lg" />
          <span aria-hidden className="gold-ring z-30 rounded-lg" />
        </>
      )}

      {/* Cover ------------------------------------------------------------- */}
      {/* On a phone the artwork is the whole card, so it is rounded on all four
          corners rather than opening a panel below it — and it is given a
          taller box than 16:9, because half of a 16:9 phone card was overlay
          and the picture had nowhere left to be. `object-cover` trims a little
          off a landscape still to fill it; that is the price of the height, and
          a far milder one than the portrait tile this repo tried and removed,
          which cropped the same art roughly in half. */}
      <div
        className={cn(
          'relative w-full bg-gray-25',
          phone ? 'aspect-[3/2] rounded-lg' : 'aspect-[16/9] rounded-t-lg',
        )}
      >
        <div
          className={cn('absolute inset-0 overflow-hidden', phone ? 'rounded-lg' : 'rounded-t-lg')}
        >
          <CoverArt
            src={game.coverImage}
            title={game.title}
            className={[
              'h-full w-full object-cover object-center transition-all duration-500',
              'group-hover:scale-105',
              shelf === BACKLOG_COLLECTION_ID
                ? phone
                  ? 'opacity-80 grayscale group-hover:opacity-100 group-hover:grayscale-0'
                  : 'opacity-85 grayscale group-hover:opacity-100 group-hover:grayscale-0'
                : '',
            ].join(' ')}
          />
          {/* Scrims top and bottom guarantee overlay legibility over any art.

              A share of the box, not a pixel height. They were `h-20` and
              `h-24`, measured against a wide card — on a phone, whose cover box
              is barely taller than the bottom scrim alone, the two overlapped
              and darkened the whole picture twice over. As fractions they cover
              the same part of the art whatever size the card is.

              A wide card carries only a title and two marks over its art, so
              its bottom scrim is shorter than a phone's, which holds the whole
              progress block. */}
          {phone ? (
            <>
              <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-gray-25/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-gray-25/95 via-gray-25/45 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-x-0 top-0 h-[34%] bg-gradient-to-b from-gray-25/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-gray-25/92 via-gray-25/55 via-45% to-transparent" />
            </>
          )}

          {/* Completion celebration: a slow specular sweep across the art. */}
          {isMastered && <div aria-hidden className="trophy-sweep" />}
        </div>

        {phone ? (
          <>
            {/* Kept on a phone even inside a platform section: that heading is
                the only other thing saying which platform a game is on, and on
                a phone it has scrolled off the top long before the cards below
                it have.

                The mark stands on the artwork rather than in a chip. A phone
                card is down to four things, and a tinted box around a logo that
                is already a recognisable silhouette was chrome around chrome.
                It keeps a shadow, which is what the box's scrim was really
                for — legibility over a bright picture. No `title`: a phone has
                no hover to show one, and the mark already carries its platform
                as an aria-label. */}
            <div className="absolute left-2 top-2 z-10 flex items-center">
              <PlatformIcon
                platform={game.platform}
                size={17}
                className="text-white drop-shadow-[0_1px_3px_rgb(3_5_10/0.95)]"
              />
            </div>

            {/* A compact rectangle ringed in the score's own colour, one width
                whatever the score — "10" and "8.5" side by side did not line
                up. */}
            {game.rating ? (
              <div className="absolute right-2 top-2 z-30">
                <OverlayBadge
                  compact
                  className="min-w-9"
                  style={{
                    boxShadow: `inset 0 0 0 1px ${ratingColor(game.rating)}, 0 0 9px -5px ${ratingColor(game.rating)}`,
                  }}
                >
                  <RatingValue value={game.rating} size="xs" label="Game rated" bare />
                </OverlayBadge>
              </div>
            ) : null}

            {/* Progress, on the art ------------------------------------------
                The name, then what is being counted and how much of it, then
                the meter — all on the artwork's own scrim, with no panel behind
                them.

                The count needs the word beside it: on its own, `23 / 44` in the
                corner of a picture does not say what was counted, and the two
                platforms do not count the same thing. The percentage is gone
                from a phone — the mark, the word and the figure fill this line
                at 166px, and the meter directly below draws the same number.
                Its own shadow, so the scrim behind it can be lighter. */}
            <div className="pointer-events-none absolute inset-x-2.5 bottom-2 z-10 space-y-1 [text-shadow:0_1px_3px_rgb(3_5_10/0.9)]">
              <h3 className="truncate text-75 font-bold tracking-tight text-gray-1000">
                {game.title}
              </h3>

              <div className="flex items-center gap-1.5 text-50 font-semibold text-gray-800">
                <TrophyBadge platform={game.platform} size={12} muted={!isMastered} />
                <span className="min-w-0 truncate">{awardNoun(game.platform)}:</span>
                <span className="ml-auto shrink-0 font-bold tabular-nums text-gray-1000">
                  {game.achievementsUnlocked} / {game.achievementsTotal}
                </span>
              </div>

              <Meter
                value={progress}
                tone={progress === 100 ? 'trophy' : 'accent'}
                label={`${game.title} ${awardNoun(game.platform).toLowerCase()} progress`}
              />
            </div>
          </>
        ) : (
          <>
            {/* The score, top left: a scrim with a hairline ring in the score's
                own colour, so the verdict reads from across the grid before
                the digits do. White figures inside it — the ring already says
                how good. */}
            {game.rating ? (
              <span
                title={`Game rated ${formatRating(game.rating)} out of 10`}
                className="absolute left-3 top-3 z-10 inline-flex h-6 min-w-9 items-center justify-center rounded-sm bg-gray-25/55 px-1.5 text-90 font-bold tabular-nums text-gray-1000"
                style={{ boxShadow: `inset 0 0 0 1px ${ratingColor(game.rating)}` }}
              >
                {formatRating(game.rating)}
              </span>
            ) : null}

            {/* Only outside a platform section, where nothing else says which
                platform this is. The opposite corner from the score. */}
            {!hidePlatform ? (
              <div className="absolute right-3 top-3 z-10">
                <OverlayBadge square tint={platform.tint} title={platform.name}>
                  <PlatformIcon platform={game.platform} size={15} className="text-gray-1000" />
                </OverlayBadge>
              </div>
            ) : null}

            {/* Completion emblem: a disc carrying the platform's own award
                artwork, ringed in gold so it reads as an award rather than a
                chip. Below the card-wide info button rather than above it: a
                medal in the corner of a clickable card should not be the one
                patch of it that does nothing when clicked. */}
            {isMastered && (
              <div className="absolute bottom-2.5 right-3 z-10">
                <OverlayBadge
                  circle
                  size={36}
                  title={awardLabel}
                  // The shine needs a clipped box to travel across, so the disc
                  // hides its own overflow rather than letting the band escape.
                  className="trophy-emblem badge-shine overflow-hidden ring-1 ring-trophy-700/60"
                >
                  <TrophyBadge platform={game.platform} size={22} />
                </OverlayBadge>
              </div>
            )}

            {/* One line, and an ellipsis: a title that wrapped made its card
                taller than the rest of its row, which is the thing a fixed-
                height card exists to prevent. The full name is the button's
                label and this line's tooltip. Clear of the emblem on a finished
                game. */}
            <h3
              title={game.title}
              className={cn(
                'pointer-events-none absolute inset-x-3 bottom-2.5 z-10 truncate text-150 font-bold tracking-tight text-gray-1000 [text-shadow:0_1px_3px_rgb(3_5_10/0.9)]',
                isMastered && 'pr-10',
              )}
            >
              {game.title}
            </h3>
          </>
        )}
      </div>

      {/* Strip ------------------------------------------------------------- */}
      {/* Solid, below the art: the count and the percentage, the meter, then
          playtime and one list. Always these three lines, whatever the state,
          so a row of cards ends level.

          A phone gets none of this: its figures are over the artwork above. */}
      {phone ? null : (
        <div className="flex flex-1 flex-col gap-2.25 p-3">
          <div className="flex items-center gap-2 text-90 tabular-nums">
            {/* The platform's own award, dimmed until it is actually earned. */}
            <TrophyBadge platform={game.platform} size={15} muted={!isMastered} />
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
        </div>
      )}

      {/* Lifted above the info button, so a view's own action — starting a
          backlog game — stays clickable rather than opening the dialog. */}
      {action ? (
        <div className="relative z-30 border-t border-gray-200 p-3">{action}</div>
      ) : null}

      {extras}
    </motion.div>
  );
};
