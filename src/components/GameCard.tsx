import React, { useState } from 'react';
import { CardLayout, HighlightStyle, UserGame } from '../types';
import { PLATFORMS } from '../lib/constants';
import { statusOverlayLabel, STATUS_COLOR } from '../lib/status';
import { ratingColor } from '../lib/rating';
import { softEdge } from '../lib/tone';
import { useGame } from '../context/GameContext';
import { CoverArt } from './CoverArt';
import { TrophyBadge, awardNoun, awardProgressLabel } from './TrophyBadge';
import { EditGameModal } from './EditGameModal';
import { Celebration } from './Celebration';
import { ClockIcon, MoreVerticalIcon, StarIcon } from './icons';
import { Meter } from './ui';
import { cn } from '../lib/cn';

interface GameCardProps {
  game: UserGame;
  /** Overrides the user's layout, for a row that is always one shape. */
  layout?: CardLayout;
}

const isComplete = (game: UserGame) =>
  game.status === 'mastered' ||
  (game.achievementsTotal > 0 && game.achievementsUnlocked >= game.achievementsTotal);

/**
 * The card frame's edge, painted on a dedicated overlay above the cover so the
 * hairline draws over the artwork rather than being clipped by it. A completed
 * game also gets an inner glow, which a plain border cannot carry.
 */
function frameShadow(game: UserGame, complete: boolean): string {
  if (complete) {
    return `inset 0 0 0 1px ${softEdge('var(--tt-gold, #e5a83c)', 62)}, inset 0 0 24px -8px ${softEdge('var(--tt-gold-hi, #ffd36b)', 35)}`;
  }
  if (game.status === 'playing') {
    return `inset 0 0 0 1px ${softEdge('var(--tt-accent, #45c8ea)', 50)}`;
  }
  return 'inset 0 0 0 1px var(--tt-line, #35302a)';
}

/**
 * "Filled" tints the card body in the status colour; "Stroke" leaves the body
 * neutral and lets the frame carry the state on its own.
 */
function bodyBackground(
  game: UserGame,
  complete: boolean,
  highlight: HighlightStyle,
): string | undefined {
  if (highlight !== 'fill') return undefined;
  if (complete) {
    return 'linear-gradient(165deg, var(--color-gold-wash, #2a2013), var(--tt-surface, #1a1714) 70%)';
  }
  if (game.status === 'playing') {
    return 'linear-gradient(165deg, var(--tt-accent-soft, #12313c), var(--tt-surface, #1a1714) 70%)';
  }
  return undefined;
}

/**
 * The repeated library unit.
 *
 * Column flex at full height, so every card in a grid row bottom-aligns however
 * long its title wraps — the meters across a row line up rather than stepping.
 */
export const GameCard: React.FC<GameCardProps> = ({ game, layout }) => {
  const { profile, ui, celebration } = useGame();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const poster = (layout ?? ui.cardLayout) === 'poster';
  const celebrating = celebration?.gameId === game.id;
  const platform = PLATFORMS[game.platform] ?? PLATFORMS.steam;

  const complete = isComplete(game);
  const progress =
    game.achievementsTotal > 0
      ? Math.min(100, Math.round((game.achievementsUnlocked / game.achievementsTotal) * 100))
      : 0;

  // A finished game already says so through its gold frame, medallion and award
  // line; repeating "100%" in the overlay chip would say it a fourth time.
  const showStatusChip = !complete && game.status !== 'completed';
  const awardLabel = awardProgressLabel(game.platform, complete);
  const statusColor = STATUS_COLOR[game.status];

  return (
    <div
      style={{ background: bodyBackground(game, complete, ui.highlight) }}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-panel',
        'shadow-[0_1px_2px_rgb(0_0_0_/_.5)] transition-[transform,box-shadow] duration-200 ease-tt',
        'hover:-translate-y-[3px] hover:shadow-[0_12px_32px_-12px_rgb(0_0_0_/_.8)]',
        !bodyBackground(game, complete, ui.highlight) && 'bg-surface',
      )}
    >
      {/* The frame sits above the cover so its hairline is never clipped. */}
      <div
        aria-hidden="true"
        style={{ boxShadow: frameShadow(game, complete) }}
        className="pointer-events-none absolute inset-0 z-3 rounded-panel"
      />

      {/* Cover ------------------------------------------------------------- */}
      <div
        style={{ aspectRatio: poster ? '2 / 3' : '16 / 9' }}
        className="relative w-full bg-bg"
      >
        <CoverArt
          src={game.coverImage}
          title={game.title}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* One scrim, weighted to the bottom where the title sits, with just
            enough at the top to hold the chips off bright artwork. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#080706_2%,rgb(8_7_6_/_.82)_26%,rgb(8_7_6_/_.1)_58%,rgb(8_7_6_/_.45))]" />

        <div className="absolute inset-x-3 top-3 z-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* The platform mark never truncates: it is short, and it is the
                identity the card cannot do without. A narrow poster takes its
                width out of the status chip instead. */}
            <OverlayChip color={platform.color} edge={platform.line} fixed>
              {platform.mark}
            </OverlayChip>

            {showStatusChip ? (
              <OverlayChip color={statusColor} edge={softEdge(statusColor, 40)} uppercase>
                {statusOverlayLabel(game.status, profile)}
              </OverlayChip>
            ) : null}
          </div>

          {/* Status, collections and deletion all live in the edit dialog, so
              this opens it directly rather than repeating a subset in a menu. */}
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            aria-label={`Edit ${game.title}`}
            title="Edit game details"
            className={cn(
              'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-control border-0',
              'bg-[rgb(8_7_6_/_.78)] text-body backdrop-blur-[6px] hairline',
              'transition-colors hover:text-ink hover:shadow-[inset_0_0_0_1px_var(--tt-line-2)]',
            )}
          >
            <MoreVerticalIcon size={15} />
          </button>
        </div>

        {/* The award medallion, in the platform's own metal. */}
        {complete ? (
          <div
            title={awardLabel}
            style={{
              background: `radial-gradient(circle at 50% 35%, ${softEdge('var(--tt-gold-hi, #ffd36b)', 30)}, rgb(8 7 6 / .85) 70%)`,
              boxShadow: `inset 0 0 0 1px ${softEdge('var(--tt-gold, #e5a83c)', 55)}, 0 0 20px -4px ${softEdge('var(--tt-gold-hi, #ffd36b)', 40)}`,
            }}
            className="absolute bottom-3 right-3 z-2 flex h-11 w-11 items-center justify-center rounded-full"
          >
            <TrophyBadge platform={game.platform} size={26} />
          </div>
        ) : null}

        {/* Title. On a finished card the medallion holds the bottom-right
            corner, so the text reserves that width and wraps instead of
            running underneath it. */}
        <div
          style={{ paddingRight: complete ? 48 : 0 }}
          className="pointer-events-none absolute inset-x-3.5 bottom-3 z-1"
        >
          <h3
            style={{ fontSize: poster ? 17 : 16 }}
            className="m-0 line-clamp-2 font-display font-bold leading-[1.15] tracking-[-0.01em] text-ink [text-wrap:pretty]"
          >
            {game.title}
          </h3>
          <div className="mt-[5px] flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="inline-flex items-center gap-1 font-display text-[12px] font-semibold tabular-nums text-muted">
              <ClockIcon size={12} />
              {game.hoursPlayed}h
            </span>
            {game.rating ? (
              <span
                style={{ color: ratingColor(game.rating) }}
                title={`Game rated ${game.rating} out of 100`}
                className="inline-flex items-center gap-1 font-display text-[12px] font-bold tabular-nums"
              >
                <StarIcon size={11} />
                {game.rating}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Progress ---------------------------------------------------------- */}
      <div className="flex flex-1 flex-col gap-[9px] px-3.5 pb-3.5 pt-3">
        <div className="flex items-baseline justify-between gap-2.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <TrophyBadge platform={game.platform} size={15} muted={!complete} />
            <span
              title={awardLabel}
              style={{ color: complete ? 'var(--tt-gold-hi, #ffd36b)' : '#b8ae9f' }}
              className="truncate font-display text-[10px] font-semibold uppercase tracking-[0.14em]"
            >
              {awardLabel}
            </span>
          </span>
          <span className="shrink-0 font-display text-[13px] font-bold tabular-nums text-ink">
            {game.achievementsUnlocked}
            <span className="text-subtle">/{game.achievementsTotal}</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Meter
            value={progress}
            complete={complete}
            className="flex-1"
            label={`${game.title} ${awardNoun(game.platform).toLowerCase()} progress`}
          />
          <span
            style={{ color: complete ? 'var(--tt-gold-hi, #ffd36b)' : '#b8ae9f' }}
            className="min-w-[34px] text-right font-display text-[11px] font-bold tabular-nums"
          >
            {progress}%
          </span>
        </div>

        {/* Pinned to the bottom so it lines up across a row of cards whose
            titles wrapped to different heights. */}
        {game.achievementRating ? (
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2">
            <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
              Grind rating
            </span>
            <span
              style={{ color: ratingColor(game.achievementRating) }}
              title={`${awardNoun(game.platform)} rated ${game.achievementRating} out of 100`}
              className="font-display text-[12px] font-bold tabular-nums"
            >
              {game.achievementRating}
            </span>
          </div>
        ) : null}
      </div>

      {celebrating && <Celebration key={celebration.token} platform={game.platform} />}

      <EditGameModal game={game} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
    </div>
  );
};

/** A 24px chip sitting on cover art: a frosted plate, a dot, and a caps label. */
const OverlayChip: React.FC<{
  color: string;
  edge: string;
  uppercase?: boolean;
  /** Keeps the chip at its natural width when the row runs out of room. */
  fixed?: boolean;
  children: React.ReactNode;
}> = ({ color, edge, uppercase = false, fixed = false, children }) => (
  <span
    style={{ boxShadow: `inset 0 0 0 1px ${edge}` }}
    className={cn(
      'inline-flex h-6 min-w-0 items-center gap-[5px] rounded-control bg-[rgb(8_7_6_/_.78)] px-2 backdrop-blur-[6px]',
      fixed && 'shrink-0',
    )}
  >
    <span
      aria-hidden="true"
      style={{ background: color }}
      className="h-1.5 w-1.5 shrink-0 rounded-full"
    />
    <span
      style={{ color }}
      className={cn(
        'truncate font-display text-[10px] font-bold tracking-[0.1em]',
        uppercase && 'uppercase',
      )}
    >
      {children}
    </span>
  </span>
);
