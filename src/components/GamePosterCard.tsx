import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { UserGame } from '../types';
import { PERMANENT_COLOR, PLAYING_COLLECTION_ID, permanentOf } from '../lib/collections';
import { useGame } from '../context/GameContext';
import { portraitCoverUrl } from '../lib/image';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardProgressLabel } from './TrophyBadge';
import { Celebration } from './Celebration';
import { RatingValue } from './Rating';
import { EditGameModal } from './EditGameModal';
import { GameInfoModal } from './GameInfoModal';
import { completionPercent, isPerfect } from '../lib/completion';
import { useCelebration } from '../lib/useCelebration';
import { useInView } from '../lib/useInView';
import { cn } from '../lib/cn';
import { EASE_OUT } from '../lib/motion';

interface GamePosterCardProps {
  game: UserGame;
  /** Drops the platform chip where a surrounding heading already states it. */
  hidePlatform?: boolean;
  /** Rendered under the tile, for actions specific to one view. */
  action?: React.ReactNode;
}

/**
 * A game as a phone shows it: box art, and almost nothing else.
 *
 * The wide card carries a title, playtime, a progress label, a count, a meter
 * and two ratings. At 375px that is roughly one game per screenful of reading,
 * and the thing people actually recognise a game by — its cover — is the part
 * squeezed smallest.
 *
 * So the cover becomes the card. Tall box art with the game's own logo on it
 * needs no title set beside it, which buys three tiles across where there was
 * one. What stays is what reads at a glance and could not be guessed from the
 * art: the platform, the score, and how far through the list you are.
 * Everything else — playtime, genres, the achievement rating, and the way to
 * change any of it — is one tap away in the details dialog, where there is room
 * to lay it out properly.
 */
export const GamePosterCard: React.FC<GamePosterCardProps> = ({
  game,
  hidePlatform = false,
  action,
}) => {
  const { added, follow } = useGame();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const [cardRef, onScreen] = useInView<HTMLDivElement>(0.5);
  const [found, setFound] = useState<number | null>(null);
  const followToken = follow?.gameId === game.id ? follow.token : null;

  const burst = useCelebration(game, onScreen && added?.gameId !== game.id);

  useEffect(() => {
    if (followToken === null) return;
    setFound(followToken);
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [followToken, cardRef]);

  const perfect = isPerfect(game);
  const progress = completionPercent(game);
  const shelf = permanentOf(game.collections);
  const awardLabel = awardProgressLabel(game.platform, perfect);

  // The shelf's colour goes into the progress hairline, which is as much room
  // as a tile this size has for it. A named chip would cover the logo the tile
  // exists to let you read.
  const shelfColor = shelf ? PERMANENT_COLOR[shelf] : null;

  return (
    <>
      <motion.div
        ref={cardRef}
        data-game-id={game.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2, ease: EASE_OUT } }}
        transition={{ duration: 0.4, ease: EASE_OUT, layout: { duration: 0.4, ease: EASE_OUT } }}
        className="flex flex-col gap-1.5"
      >
        <button
          type="button"
          onClick={() => setIsInfoOpen(true)}
          aria-label={`${game.title} — ${awardLabel}, ${progress}% complete`}
          className={cn(
            'group relative block w-full overflow-hidden rounded-md border text-left shadow-md transition-colors',
            // 2:3, the shape every storefront cuts its box art to.
            'aspect-[2/3]',
            perfect
              ? 'trophy-glow border-trophy-700/60'
              : shelf === PLAYING_COLLECTION_ID
                ? 'border-accent-700/50'
                : 'border-gray-300/70',
            found !== null && 'ring-2 ring-accent-700',
          )}
        >
          {/* Steam's library capsule first — portrait, and carrying the game's
              own logo by design — then the stored landscape art, then a
              lettered tile. CoverArt walks the list and keeps the first that
              loads, so a PlayStation game, which has no such capsule, simply
              falls through to its cover cropped. */}
          <CoverArt
            src={[portraitCoverUrl(game), game.coverImage]}
            title={game.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          {/* One scrim, at the foot.

              Chips in the top corners were the obvious layout and the wrong
              one: a box-art logo usually sits across the top third, so the
              platform badge and the score landed straight on top of the word
              the tile exists to let you read. Everything moved to the foot,
              where the art is background rather than title. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-25 via-gray-25/75 to-transparent" />

          {perfect && <div aria-hidden className="trophy-sweep" />}

          {/* One row along the foot: whose game it is, how far through, and
              what you made of it. The achievement rating is deliberately not
              here — it is a verdict on the list rather than on the game, and a
              second score on a tile this size is a number too many. */}
          <div className="absolute inset-x-1.5 bottom-1.5 space-y-1">
            <div className="flex items-center gap-1.5">
              {!hidePlatform && (
                <PlatformIcon
                  platform={game.platform}
                  size={12}
                  className="shrink-0 text-gray-700"
                />
              )}
              <TrophyBadge platform={game.platform} size={14} muted={!perfect} />
              <span
                className={cn(
                  'text-50 font-bold tabular-nums',
                  perfect ? 'text-trophy-900' : 'text-gray-900',
                )}
              >
                {game.achievementsUnlocked}/{game.achievementsTotal}
              </span>

              {game.rating ? (
                <RatingValue
                  value={game.rating}
                  size="xs"
                  label="Game rated"
                  bare
                  className="ml-auto"
                />
              ) : null}
            </div>

            <div className="h-1 overflow-hidden rounded-full bg-gray-25/70">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: perfect
                    ? 'var(--color-trophy-700)'
                    : (shelfColor ?? 'var(--color-accent-700)'),
                }}
              />
            </div>
          </div>

          {burst !== null && <Celebration key={burst} platform={game.platform} />}
        </button>

        {action}
      </motion.div>

      <EditGameModal game={game} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
      {/* The tile has no room for an edit control of its own, so changing
          anything starts from the details dialog. */}
      <GameInfoModal
        game={game}
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        onEdit={() => setIsEditOpen(true)}
      />
    </>
  );
};
