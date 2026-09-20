import React, { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { completionPercent } from '../lib/completion';
import { playAwardSound } from '../lib/sound';
import { SessionProgress, useSessionProgress } from '../lib/useSessionProgress';
import { CELEBRATION_DELAY_MS, CELEBRATION_MS, Celebration } from './Celebration';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun, awardNounFor } from './TrophyBadge';
import { Button, Dialog, Meter } from './ui';
import { cn } from '../lib/cn';

/** "+3 trophies" — what a game picked up while you were away. */
const gainedLabel = (entry: SessionProgress) =>
  `+${entry.gained} ${awardNounFor(entry.game.platform, entry.gained).toLowerCase()}`;

/**
 * One game's row: what it was, what it is now, and how far that leaves it.
 * The whole row is the way to the game itself.
 */
const ProgressRow: React.FC<{ entry: SessionProgress; onOpen: (id: string) => void }> = ({
  entry,
  onOpen,
}) => {
  const { game, from, completed } = entry;
  const percent = completionPercent(game);

  return (
    <button
      type="button"
      onClick={() => onOpen(game.id)}
      title={`Go to ${game.title}`}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors',
        completed
          ? 'border-trophy-700/50 bg-trophy-100/40 hover:border-trophy-700/80'
          : 'border-gray-200 bg-black/25 hover:border-gray-300 hover:bg-gray-200',
      )}
    >
      <CoverArt
        src={game.coverImage}
        title={game.title}
        className="h-12 w-[5.5rem] shrink-0 rounded-sm object-cover"
      />

      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="flex min-w-0 items-center gap-2">
          <PlatformIcon platform={game.platform} size={13} className="shrink-0 text-gray-600" />
          <span className="truncate text-100 font-semibold text-gray-900 group-hover:text-accent-900">
            {game.title}
          </span>
          <span
            className={cn(
              'eyebrow ml-auto shrink-0 rounded-sm border px-1.5 py-1',
              completed
                ? 'border-trophy-700/60 text-trophy-900'
                : 'border-accent-700/50 text-accent-900',
            )}
          >
            {gainedLabel(entry)}
          </span>
        </span>

        <span className="flex items-center gap-1.5 text-50 text-gray-600">
          <TrophyBadge platform={game.platform} size={13} muted={!completed} />
          <span className="tabular-nums">
            {from} → <span className="font-bold text-gray-900">{game.achievementsUnlocked}</span> /{' '}
            {game.achievementsTotal}
          </span>
          <span className="tabular-nums">({percent}%)</span>
          {completed ? <span className="font-bold text-trophy-900">· Finished</span> : null}
        </span>

        <Meter
          value={percent}
          tone={completed ? 'trophy' : 'accent'}
          label={`${game.title} ${awardNoun(game.platform).toLowerCase()} progress`}
        />
      </span>
    </button>
  );
};

/**
 * What happened while you were away.
 *
 * Shown once a session, after the opening sync has settled, when the platforms
 * have brought back awards this device had not seen. Without it every trophy
 * earned on the console arrives silently: the counts are simply already higher
 * by the time the library is on screen, and a platinum won yesterday looks
 * exactly like one won years ago.
 *
 * A game finished in that time takes the burst here, since the card that would
 * otherwise carry it is behind this — and the pending request for it is claimed
 * on the way in, so the same completion is not celebrated twice.
 */
export const SessionProgressDialog: React.FC = () => {
  const { progress, dismiss } = useSessionProgress();
  const { goToGame, celebration, celebrationPlayed } = useGame();

  const [burst, setBurst] = useState<number | null>(null);
  const burstTimer = useRef<number | null>(null);

  const open = progress.length > 0;
  const finished = progress.find((entry) => entry.completed);

  useEffect(
    () => () => {
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
    },
    [],
  );

  /**
   * The sync that brought this news has already asked for a celebration on the
   * game that finished. Taking that request here is what stops the card
   * underneath playing the same completion through the scrim.
   */
  useEffect(() => {
    if (!open || !celebration) return;
    if (progress.some((entry) => entry.game.id === celebration.gameId)) {
      celebrationPlayed(celebration.token);
    }
  }, [open, celebration, progress, celebrationPlayed]);

  /** The burst itself, held back the same beat a card holds it. */
  useEffect(() => {
    if (!open || !finished) return;

    const start = window.setTimeout(() => {
      playAwardSound(finished.game.platform);
      setBurst(Date.now());
      burstTimer.current = window.setTimeout(() => setBurst(null), CELEBRATION_MS);
    }, CELEBRATION_DELAY_MS);

    return () => window.clearTimeout(start);
  }, [open, finished]);

  if (!open) return null;

  const total = progress.reduce((sum, entry) => sum + entry.gained, 0);
  const completedCount = progress.filter((entry) => entry.completed).length;

  return (
    <Dialog
      isOpen={open}
      onClose={dismiss}
      title="While you were away"
      description={
        completedCount > 0
          ? `${total} earned across ${progress.length} game${progress.length === 1 ? '' : 's'} — ${completedCount} finished`
          : `${total} earned across ${progress.length} game${progress.length === 1 ? '' : 's'}`
      }
      icon={<FileText size={18} />}
      footer={
        <Button variant="accent" onClick={dismiss}>
          OK
        </Button>
      }
    >
      {/* Nothing clips here. This list used to hide its overflow so the burst
          had a box to play in, and the box was exactly as wide as the rows —
          so the gold a finished row gives off was sliced flat down both sides.
          The burst brings its own clip, on a box that reaches the dialog's own
          edges rather than the rows'. */}
      <div className="relative">
        <div className="space-y-2">
          {progress.map((entry) => (
            <ProgressRow
              key={entry.game.id}
              entry={entry}
              onOpen={(id) => {
                dismiss();
                goToGame(id);
              }}
            />
          ))}
        </div>

        {/* The burst plays over the whole list rather than over one row: a row
            is too short for sparks that climb two hundred pixels, and the gold
            on the finished rows already says which game earned it. The negative
            inset is the dialog body's own padding, so the glow ends where the
            panel does and there is no edge of its own to see. */}
        {burst !== null && finished && (
          <div aria-hidden className="pointer-events-none absolute -inset-5">
            <Celebration key={burst} platform={finished.game.platform} />
          </div>
        )}
      </div>
    </Dialog>
  );
};
