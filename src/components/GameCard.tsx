import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { UserGame, GameStatus, GAME_STATUSES } from '../types';
import { PLATFORMS } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { useGame } from '../context/GameContext';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun, awardProgressLabel } from './TrophyBadge';
import { EditGameModal } from './EditGameModal';
import { Celebration } from './Celebration';
import { RatingValue } from './Rating';
import { Meter, OverlayBadge } from './ui';

interface GameCardProps {
  game: UserGame;
}

const MENU_STATUSES: GameStatus[] = GAME_STATUSES.filter((s) => s !== 'dropped');

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const { updateGame, deleteGame, profile, celebration } = useGame();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!showMenu) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMenu(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showMenu]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={[
        'group relative flex flex-col rounded-lg border transition-colors',
        showMenu ? 'z-40' : 'z-0',
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
          <OverlayBadge square tint={platform.tint} title={platform.name}>
            <PlatformIcon platform={game.platform} size={15} className="text-gray-1000" />
          </OverlayBadge>

          {game.status === 'backlog' && (
            <OverlayBadge className="text-gray-800">
              <Clock size={11} />
              {statusLabel('backlog', profile)}
            </OverlayBadge>
          )}

          {game.status === 'playing' && !isMastered && (
            <OverlayBadge className="text-accent-900">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-900" />
              {statusLabel('playing', profile)}
            </OverlayBadge>
          )}

          {/* One completion chip carrying the platform's own trophy artwork. */}
          {isMastered && (
            <OverlayBadge
              className="text-trophy-900 ring-trophy-700/50"
              title={awardLabel}
            >
              <TrophyBadge platform={game.platform} size={17} />
              100%
            </OverlayBadge>
          )}
        </div>

        {/* Options ----------------------------------------------------------- */}
        <div ref={menuRef} className="absolute right-3 top-3 z-30">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-haspopup="menu"
            aria-expanded={showMenu}
            aria-label={`Options for ${game.title}`}
            className="overlay-scrim flex h-7 w-7 items-center justify-center rounded-sm text-gray-900 transition-colors hover:text-gray-1000"
          >
            <MoreVertical size={15} />
          </button>

          {showMenu && (
            <div
              role="menu"
              className="absolute right-0 top-9 w-48 overflow-hidden rounded-md border border-gray-300 bg-gray-200 py-1 text-75 text-gray-900 shadow-lg"
            >
              <div className="px-3 py-1 text-50 font-bold uppercase tracking-wide text-gray-600">
                Set status
              </div>
              {MENU_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    updateGame(game.id, { status });
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-gray-300"
                >
                  {statusLabel(status, profile)}
                </button>
              ))}

              <div className="my-1 border-t border-gray-300" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsEditOpen(true);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-accent-900 transition-colors hover:bg-accent-100"
              >
                <Pencil size={13} />
                Edit game details
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  deleteGame(game.id);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-negative-900 transition-colors hover:bg-negative-100"
              >
                <Trash2 size={13} />
                Delete game
              </button>
            </div>
          )}
        </div>

        {/* Title ------------------------------------------------------------ */}
        <div className="pointer-events-none absolute inset-x-3.5 bottom-2.5 z-10">
          <h3 className="truncate text-200 font-bold tracking-tight text-gray-1000">{game.title}</h3>
          <div className="mt-1 flex items-center gap-2 text-75 text-gray-700">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {game.hoursPlayed}h played
            </span>
            {game.rating ? (
              <RatingValue value={game.rating} size="xs" label="Game rated" />
            ) : null}
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

      {celebration?.gameId === game.id && (
        <Celebration key={celebration.token} platform={game.platform} />
      )}

      <EditGameModal game={game} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
    </motion.div>
  );
};
