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
import { Celebration } from './Celebration';
import { RatingValue } from './Rating';
import { Meter, OverlayBadge } from './ui';
import { cn } from '../lib/cn';

interface GameCardProps {
  game: UserGame;
  /** Rendered below the progress row, for actions specific to one view. */
  action?: React.ReactNode;
  /** Drops the platform chip where a surrounding heading already states it. */
  hidePlatform?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ game, action, hidePlatform = false }) => {
  const { profile, celebration, recentlyAddedId } = useGame();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const celebrating = celebration?.gameId === game.id;

  const justAdded = recentlyAddedId === game.id;

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
    if (!justAdded) return;
    let fallback: number | undefined;

    // Deferred past layout: grouping and the card's own entrance both move
    // things, and a rect read too early scrolls to where nothing ended up.
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
    }, 150);

    return () => {
      window.clearTimeout(timer);
      if (fallback !== undefined) window.clearTimeout(fallback);
    };
  }, [justAdded, game.id]);

  const platform = PLATFORMS[game.platform] ?? PLATFORMS.steam;
  const progress =
    game.achievementsTotal > 0
      ? Math.min(100, Math.round((game.achievementsUnlocked / game.achievementsTotal) * 100))
      : 0;

  const isMastered =
    game.status === 'mastered' ||
    (game.achievementsTotal > 0 && game.achievementsUnlocked >= game.achievementsTotal);

  // "Achievements"/"Trophies" while there is more to unlock, then the platform's
  // own completion announcement.
  const awardLabel = awardProgressLabel(game.platform, isMastered);

  // Stroke draws the status as a coloured edge; fill tints the whole surface.
  const filled = profile.highlightStyle === 'fill';
  const highlight = isMastered
    ? filled
      ? 'trophy-glow border-trophy-700/60 bg-trophy-100'
      : 'trophy-glow border-trophy-700 bg-gradient-to-b from-trophy-100/50 to-gray-100 hover:border-trophy-900'
    : game.status === 'playing'
      ? filled
        ? 'border-accent-200 bg-accent-100'
        : 'border-accent-400 bg-gray-100 hover:border-accent-700'
      : 'border-gray-200 bg-gray-100 hover:border-gray-300';

  return (
    <motion.div
      data-game-id={game.id}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={[
        'group relative flex flex-col rounded-lg border transition-colors',
        highlight,
      ].join(' ')}
    >
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
          <div className="absolute bottom-3 right-3 z-20">
            <OverlayBadge
              circle
              size={40}
              title={awardLabel}
              className="trophy-emblem ring-1 ring-trophy-700/60"
            >
              <TrophyBadge platform={game.platform} size={24} />
            </OverlayBadge>
          </div>
        )}

        {/* Options ----------------------------------------------------------- */}
        {/* Status, collections and deletion all live in the edit dialog, so the
            control opens it directly rather than repeating a subset in a menu. */}
        <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5">
          {/* The scrim keeps the score legible over bright cover art; the chip
              inside carries its own colour and tooltip. */}
          {game.rating ? (
            <OverlayBadge className="px-1.5">
              <RatingValue value={game.rating} size="xs" label="Game rated" />
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
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-75">
          <span className="flex min-w-0 items-center gap-1.5 font-medium text-gray-800">
            {/* The platform's own award, dimmed until it is actually earned. */}
            <TrophyBadge platform={game.platform} size={16} muted={!isMastered} />
            <span className="truncate" title={awardLabel}>
              {awardLabel}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 font-semibold text-gray-900">
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

      {action ? <div className="border-t border-gray-200 p-3">{action}</div> : null}

      {celebrating && <Celebration key={celebration.token} platform={game.platform} />}

      <EditGameModal game={game} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
    </motion.div>
  );
};
