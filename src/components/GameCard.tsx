import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Clock, MoreVertical } from 'lucide-react';
import { UserGame } from '../types';
import { PLATFORMS } from '../lib/constants';
import { statusLabel, STATUS_OVERLAY_CLASS } from '../lib/status';
import { useGame } from '../context/GameContext';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun, awardProgressLabel } from './TrophyBadge';
import { EditGameModal } from './EditGameModal';
import { GameInfoModal } from './GameInfoModal';
import { Celebration } from './Celebration';
import { RatingValue } from './Rating';
import { Meter, OverlayBadge } from './ui';
import { ratingColor } from '../lib/rating';
import { completionPercent, isPerfect } from '../lib/completion';
import { cn } from '../lib/cn';

interface GameCardProps {
  game: UserGame;
  /** Rendered below the progress row, for actions specific to one view. */
  action?: React.ReactNode;
  /** Drops the platform chip where a surrounding heading already states it. */
  hidePlatform?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ game, action, hidePlatform = false }) => {
  const { profile, celebration, follow } = useGame();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const celebrating = celebration?.gameId === game.id;

  const followToken = follow?.gameId === game.id ? follow.token : null;

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

    // Deferred past layout and past the exit animation of any copy leaving the
    // page — the spotlight tile of a game that just stopped being played. Read
    // too early and that departing copy still counts as visible, so the scroll
    // to the copy that actually remains never happens.
    const timer = window.setTimeout(() => {
      const copies = [
        ...document.querySelectorAll<HTMLElement>(`[data-game-id="${CSS.escape(game.id)}"]`),
      ];
      if (copies.length === 0) return;

      const onScreen = copies.some((node) => {
        const { top, bottom } = node.getBoundingClientRect();
        return top >= 0 && bottom <= window.innerHeight;
      });
      if (onScreen) return;

      const target = copies[0];
      const startedAt = window.scrollY;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Smooth scrolling is silently ignored in some engines, which would leave
      // the new game exactly as unfindable as before. If nothing has moved by
      // the time a smooth scroll would have started, jump there instead.
      fallback = window.setTimeout(() => {
        if (window.scrollY === startedAt) target.scrollIntoView({ block: 'center' });
      }, 250);
    }, 400);

    return () => {
      window.clearTimeout(timer);
      if (fallback !== undefined) window.clearTimeout(fallback);
    };
  }, [followToken, game.id]);

  const platform = PLATFORMS[game.platform] ?? PLATFORMS.steam;
  const progress = completionPercent(game);

  // Earned, not declared: the gold treatment follows the unlock counts alone.
  // It used to accept the "mastered" status as proof on its own, which meant a
  // card kept its rim and its emblem after an unlock was taken back, while the
  // meter underneath honestly read 95%.
  const isMastered = isPerfect(game);

  // "Achievements"/"Trophies" while there is more to unlock, then the platform's
  // own completion announcement.
  const awardLabel = awardProgressLabel(game.platform, isMastered);

  // Stroke draws the status as a coloured edge; fill tints the whole surface.
  // A finished game is handled by the turning gold rim below instead of a
  // border, so its stroke variant asks only for the glow.
  const filled = profile.highlightStyle === 'fill';
  const highlight = isMastered
    ? filled
      ? 'trophy-glow border-transparent bg-trophy-100'
      : 'trophy-glow border-transparent bg-gradient-to-b from-trophy-100/45 to-gray-100/70'
    : game.status === 'playing'
      ? filled
        ? 'glow-ring border-accent-700/50 bg-accent-100'
        : 'glow-ring border-accent-700/40 bg-gray-100/70 hover:border-accent-700'
      : 'border-gray-300/70 bg-gray-100/70 hover:border-gray-400';

  return (
    <motion.div
      data-game-id={game.id}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      // A playing card lights its own edge in the accent; every other state
      // leaves --glow unset and glow-ring goes unused.
      style={{ '--glow': 'var(--color-accent-700)' } as React.CSSProperties}
      className={cn(
        'group relative flex flex-col rounded-lg border shadow-lg backdrop-blur-sm transition-colors',
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

      {/* Cover ------------------------------------------------------------- */}
      <div className="relative aspect-[16/9] w-full rounded-t-lg bg-gray-25">
        <div className="absolute inset-0 overflow-hidden rounded-t-lg">
          <CoverArt
            src={game.coverImage}
            title={game.title}
            className={[
              'h-full w-full object-cover object-center transition-all duration-500',
              'group-hover:scale-105',
              game.status === 'backlog'
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

        {/* Identity + status indicators. Every chip is the same height. */}
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
          {!hidePlatform && (
            <OverlayBadge square tint={platform.tint} title={platform.name}>
              <PlatformIcon platform={game.platform} size={15} className="text-gray-1000" />
            </OverlayBadge>
          )}

          {/* Every game states its status here, in that status's own colour.
              Only an in-progress game pulses. */}
          <OverlayBadge className={STATUS_OVERLAY_CLASS[game.status]}>
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full bg-current',
                game.status === 'playing' && 'animate-pulse',
              )}
            />
            {statusLabel(game.status, profile)}
          </OverlayBadge>
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
            <MoreVertical size={15} />
          </button>
        </div>

        {/* Title ------------------------------------------------------------ */}
        {/* The completion emblem sits in the bottom-right corner, so on a
            finished game the text keeps clear of it and wraps to a second line
            rather than running underneath. */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-3.5 bottom-2.5 z-10',
            isMastered && 'pr-12',
          )}
        >
          <h3
            className={cn(
              'text-200 font-bold tracking-tight text-gray-1000',
              isMastered ? 'line-clamp-2' : 'truncate',
            )}
          >
            {game.title}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-75 text-gray-700">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {game.hoursPlayed}h played
            </span>
          </div>
        </div>
      </div>

      {/* Progress ---------------------------------------------------------- */}
      <div className="space-y-2 p-4">
        {/* The completion announcements are long next to the count, and cards
            can be as narrow as 17rem, so the count drops to its own line rather
            than squeezing the label into an ellipsis. */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-75">
          <span
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
          </span>
          <span className="flex shrink-0 items-center gap-1.5 font-bold tabular-nums text-gray-900">
            {game.achievementRating ? (
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

      {celebrating && <Celebration key={celebration.token} platform={game.platform} />}

      <EditGameModal game={game} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
      <GameInfoModal game={game} isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </motion.div>
  );
};
