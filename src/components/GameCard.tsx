import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Clock, Pencil } from 'lucide-react';
import { UserGame } from '../types';
import { DEFAULT_COLLECTION_COLOR, PLATFORMS } from '../lib/constants';
import {
  BACKLOG_COLLECTION_ID,
  PERMANENT_OVERLAY_CLASS,
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
import { Celebration } from './Celebration';
import { RatingValue } from './Rating';
import { MarqueeText, Meter, OverlayBadge } from './ui';
import { ratingColor } from '../lib/rating';
import { completionPercent, isPerfect } from '../lib/completion';
import { formatHours } from '../lib/format';
import { useCelebration } from '../lib/useCelebration';
import { useInView } from '../lib/useInView';
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

interface GameCardProps {
  game: UserGame;
  /** Rendered below the progress row, for actions specific to one view. */
  action?: React.ReactNode;
  /** Drops the platform chip where a surrounding heading already states it. */
  hidePlatform?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ game, action, hidePlatform = false }) => {
  const { profile, collections, added, follow } = useGame();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

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

  // "Achievements"/"Trophies" while there is more to unlock, then the platform's
  // own completion announcement.
  const awardLabel = awardProgressLabel(game.platform, isMastered);

  // Stroke draws the shelf as a coloured edge; fill tints the whole surface.
  // A finished game is handled by the turning gold rim below instead of a
  // border, so its stroke variant asks only for the glow.
  const filled = profile.highlightStyle === 'fill';
  const highlight = isMastered
    ? filled
      ? 'trophy-glow border-transparent bg-trophy-100'
      : 'trophy-glow border-transparent bg-gradient-to-b from-trophy-100/45 to-gray-100/70'
    : shelf === PLAYING_COLLECTION_ID
      ? filled
        ? 'glow-ring border-accent-700/50 bg-accent-100'
        : 'glow-ring border-accent-700/40 bg-gray-100/70 hover:border-accent-700'
      : 'border-gray-300/70 bg-gray-100/70 hover:border-gray-400';

  return (
    <motion.div
      ref={cardRef}
      data-game-id={game.id}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2, ease: EASE_OUT } }}
      // Entrances and re-flows share the app's easing; a re-sorted grid glides
      // to its new places rather than springing there.
      transition={{ duration: 0.45, ease: EASE_OUT, layout: { duration: 0.45, ease: EASE_OUT } }}
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
        onClick={() => setIsInfoOpen(true)}
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

      {/* Keyed on the follow, so being sent here twice lights it twice rather
          than leaving a ring that is already part-way through fading. */}
      {found !== null && (
        <span key={found} aria-hidden className="found-ring z-30 rounded-lg" />
      )}

      {/* Cover ------------------------------------------------------------- */}
      <div className="relative aspect-[16/9] w-full rounded-t-lg bg-gray-25">
        <div className="absolute inset-0 overflow-hidden rounded-t-lg">
          <CoverArt
            src={game.coverImage}
            title={game.title}
            className={[
              'h-full w-full object-cover object-center transition-all duration-500',
              'group-hover:scale-105',
              shelf === BACKLOG_COLLECTION_ID
                ? 'opacity-80 grayscale group-hover:opacity-100 group-hover:grayscale-0'
                : '',
            ].join(' ')}
          />
          {/* Scrims top and bottom guarantee overlay legibility over any art. */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-gray-25/75 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-gray-25 via-gray-25/60 to-transparent" />

          {/* Completion celebration: a slow specular sweep across the art. */}
          {isMastered && <div aria-hidden className="trophy-sweep" />}
        </div>

        {/* Identity + shelf indicators. Every chip is the same height. */}
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
          {!hidePlatform && (
            <OverlayBadge square tint={platform.tint} title={platform.name}>
              <PlatformIcon platform={game.platform} size={15} className="text-gray-1000" />
            </OverlayBadge>
          )}

          {/* Every collection this game is in, permanent or not — the card is
              where you look to know where a game is filed, and showing only
              the shelf meant a game's own lists were invisible everywhere
              except the library filter row.

              A permanent shelf keeps its own colour and leads; a custom list
              wears its own dot. Only an in-progress game pulses. */}
          {memberships.map((membership) =>
            membership.permanent ? (
              <OverlayBadge
                key={membership.id}
                className={PERMANENT_OVERLAY_CLASS[membership.permanent]}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full bg-current',
                    membership.permanent === PLAYING_COLLECTION_ID && 'animate-pulse',
                  )}
                />
                {membership.name}
              </OverlayBadge>
            ) : (
              // The list's own colour on the text as well as the dot. A grey
              // label beside a coloured dot made the colour look like
              // decoration rather than the thing identifying the list, which
              // is how it reads everywhere else in the app.
              <OverlayBadge key={membership.id} style={{ color: membership.color }}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {membership.name}
              </OverlayBadge>
            ),
          )}
        </div>

        {/* Completion emblem: a round disc carrying the platform's own trophy
            artwork, ringed in gold so it reads as an award rather than a chip. */}
        {isMastered && (
          // Below the card-wide info button rather than above it: a medal in
          // the corner of a clickable card should not be the one patch of it
          // that does nothing when clicked.
          <div className="absolute bottom-3 right-3 z-10">
            <OverlayBadge
              circle
              size={40}
              title={awardLabel}
              // The shine needs a clipped box to travel across, so the disc
              // hides its own overflow rather than letting the band escape.
              className="trophy-emblem badge-shine overflow-hidden ring-1 ring-trophy-700/60"
            >
              <TrophyBadge platform={game.platform} size={24} />
            </OverlayBadge>
          </div>
        )}

        {/* Options ----------------------------------------------------------- */}
        {/* Status, collections and deletion all live in the edit dialog, so the
            control opens it directly rather than repeating a subset in a menu. */}
        <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5">
          {/* A disc ringed in the score's own colour, so the verdict is legible
              from across the grid before the digits are. Bare inside it: the
              scrim is already the box, and a second outline nested within the
              first only adds clutter. */}
          {game.rating ? (
            <OverlayBadge
              circle
              size={28}
              // Ring and bloom in one inline shadow: the colour is computed from
              // the score, so there is no token class to reach for.
              style={{
                boxShadow: `inset 0 0 0 1px ${ratingColor(game.rating)}, 0 0 9px -5px ${ratingColor(game.rating)}`,
              }}
            >
              <RatingValue value={game.rating} size="xs" label="Game rated" bare />
            </OverlayBadge>
          ) : null}

          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            aria-label={`Edit ${game.title}`}
            title="Edit game details"
            className="overlay-scrim flex h-7 w-7 items-center justify-center rounded-sm text-gray-900 transition-colors hover:text-gray-1000"
          >
            <Pencil size={14} />
          </button>
        </div>

        {/* Title ------------------------------------------------------------ */}
        {/* The completion emblem sits in the bottom-right corner, so on a
            finished game the text keeps clear of it rather than running
            underneath. */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-3.5 bottom-2.5 z-10',
            isMastered && 'pr-12',
          )}
        >
          {/* A long name gets a second line before it gets any movement:
              reading a wrapped title takes no time at all, where reading a
              scrolling one takes as long as the scroll. Only a name too long
              for even two lines scrolls, on hover, to show the rest. The block
              is anchored to the bottom of the artwork, so the extra line grows
              up into the scrim rather than changing the card's height. */}
          <h3 className="text-200 font-bold tracking-tight text-gray-1000">
            <MarqueeText trigger="hover" lines={2}>
              {game.title}
            </MarqueeText>
          </h3>
          <div className="mt-1 flex items-center gap-2 text-75 text-gray-700">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatHours(game.hoursPlayed)}h played
            </span>
          </div>
        </div>
      </div>

      {/* Progress ---------------------------------------------------------- */}
      {/* Always the same three lines — label, count, meter — whatever the
          state. The count used to share the label's line and wrap below it only
          when the long completion announcement needed the room, so finished
          cards stood taller than the rest of their row. */}
      <div className="mt-auto space-y-2 p-4">
        <div
          className={cn(
            'eyebrow flex min-w-0 items-center gap-1.5',
            isMastered ? 'text-trophy-900' : 'text-gray-600',
          )}
        >
          {/* The platform's own award, dimmed until it is actually earned. */}
          <TrophyBadge platform={game.platform} size={16} muted={!isMastered} />
          <span className="truncate" title={awardLabel}>
            {awardLabel}
          </span>
        </div>

        <div className="flex h-4 items-center gap-1.5 text-75 font-bold tabular-nums text-gray-900">
          {/* Only once the list is finished, mirroring where it can be set. A
              score shown on a game still in progress is one from an earlier
              completion, or from before this rule, and either way it is a
              verdict on a list this game is no longer done with. */}
          {isMastered && game.achievementRating ? (
            <RatingValue
              value={game.achievementRating}
              size="xs"
              label={`${awardNoun(game.platform)} rated`}
            />
          ) : null}
          <span>
            {game.achievementsUnlocked} / {game.achievementsTotal}{' '}
            <span className="font-normal text-gray-600">({progress}%)</span>
          </span>
        </div>

        <Meter
          value={progress}
          tone={progress === 100 ? 'trophy' : 'accent'}
          label={`${game.title} ${awardNoun(game.platform).toLowerCase()} progress`}
        />
      </div>

      {/* Lifted above the info button, so a view's own action — starting a
          backlog game — stays clickable rather than opening the dialog. */}
      {action ? (
        <div className="relative z-30 border-t border-gray-200 p-3">{action}</div>
      ) : null}

      {burst !== null && <Celebration key={burst} platform={game.platform} />}

      <EditGameModal game={game} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
      <GameInfoModal game={game} isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </motion.div>
  );
};
