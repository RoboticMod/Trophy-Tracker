import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BellOff, ChevronRight } from 'lucide-react';
import { UserGame } from '../types';
import { useGame } from '../context/GameContext';
import { useNotifications } from '../context/NotificationsContext';
import { ProgressNotification } from '../lib/localCache';
import { completionPercent } from '../lib/completion';
import { relativeTime } from '../lib/format';
import { playAwardSound } from '../lib/sound';
import { EASE_OUT } from '../lib/motion';
import { cn } from '../lib/cn';
import { CELEBRATION_DELAY_MS, CELEBRATION_MS, Celebration } from './Celebration';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun, awardNounFor, awardProgressLabel } from './TrophyBadge';
import { Button, Meter } from './ui';

/** A notification with its game, for one that still exists in the library. */
interface Entry {
  note: ProgressNotification;
  game: UserGame;
  gained: number;
}

/** Finished first, then whatever moved furthest, then the newest. */
const byProgress = (a: Entry, b: Entry) =>
  Number(b.note.completed) - Number(a.note.completed) ||
  b.gained - a.gained ||
  new Date(b.note.at).getTime() - new Date(a.note.at).getTime();

/** How long a finished game holds the panel before the list comes in. */
const SPOTLIGHT_MS = CELEBRATION_DELAY_MS + CELEBRATION_MS + 900;

/**
 * A game that was finished, on its own, before anything else.
 *
 * The one piece of news worth stopping for, so it is not one row of several:
 * the art, the award, the burst and the sound, then the rest of the list.
 */
const Spotlight: React.FC<{
  entry: Entry;
  step: number;
  steps: number;
  onNext: () => void;
}> = ({ entry, step, steps, onNext }) => {
  const { game } = entry;
  const [burst, setBurst] = useState<number | null>(null);

  useEffect(() => {
    const start = window.setTimeout(() => {
      playAwardSound(game.platform);
      setBurst(Date.now());
    }, CELEBRATION_DELAY_MS);
    const next = window.setTimeout(onNext, SPOTLIGHT_MS);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(next);
    };
  }, [game.id, game.platform, onNext]);

  return (
    <motion.div
      key={game.id}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className="relative overflow-hidden rounded-lg border border-trophy-700/60 bg-trophy-100/30"
    >
      <span aria-hidden className="gold-ring rounded-lg" />
      <div className="relative aspect-video">
        <CoverArt
          src={game.coverImage}
          title={game.title}
          className="h-full w-full object-cover"
        />
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-gray-25 via-gray-25/40 to-transparent"
        />
        <div className="absolute inset-x-4 bottom-3.5 flex items-end gap-3">
          <TrophyBadge platform={game.platform} size={44} />
          <div className="min-w-0 flex-1">
            <div className="eyebrow text-trophy-900">
              100% · {awardProgressLabel(game.platform, true)}
            </div>
            <div className="truncate text-250 font-bold tracking-tight text-gray-1000">
              {game.title}
            </div>
          </div>
        </div>
        {burst !== null ? <Celebration key={burst} platform={game.platform} scale="large" /> : null}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-75 tabular-nums text-gray-700">
          {game.achievementsTotal} of {game.achievementsTotal}{' '}
          {awardNoun(game.platform).toLowerCase()}
          {steps > 1 ? ` · ${step} of ${steps}` : ''}
        </span>
        <Button variant="accent" size="s" onClick={onNext}>
          {step < steps ? 'Next' : 'Continue'}
          <ChevronRight size={14} />
        </Button>
      </div>
    </motion.div>
  );
};

/** One game's progress, and the way to it. */
const Row: React.FC<{ entry: Entry; unread: boolean; onOpen: () => void }> = ({
  entry,
  unread,
  onOpen,
}) => {
  const { note, game, gained } = entry;
  const percent = completionPercent(game);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md border p-2.5 text-left transition-colors',
        note.completed
          ? 'border-trophy-700/50 bg-trophy-100/40 hover:border-trophy-700/80'
          : 'border-gray-200 bg-black/25 hover:border-gray-300 hover:bg-gray-200',
      )}
    >
      <span className="relative shrink-0">
        <CoverArt
          src={game.coverImage}
          title={game.title}
          className="h-11 w-[4.9rem] rounded-sm object-cover"
        />
        {unread ? (
          <span
            aria-label="New"
            className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-gray-100 bg-accent-800"
          />
        ) : null}
      </span>

      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex min-w-0 items-center gap-2">
          <PlatformIcon platform={game.platform} size={13} className="shrink-0 text-gray-600" />
          <span className="truncate text-90 font-bold text-gray-900 group-hover:text-accent-900">
            {game.title}
          </span>
          <span
            className={cn(
              'ml-auto shrink-0 text-75 font-bold tabular-nums',
              note.completed ? 'text-trophy-900' : 'text-accent-900',
            )}
          >
            +{gained}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-50 tabular-nums text-gray-600">
          <TrophyBadge platform={game.platform} size={12} muted={!note.completed} />
          {note.from} → <span className="font-bold text-gray-900">{note.to}</span> / {note.total}{' '}
          {awardNounFor(game.platform, note.total).toLowerCase()}
          <span className="ml-auto">{relativeTime(note.at)}</span>
        </span>
        <Meter
          value={percent}
          tone={note.completed ? 'trophy' : 'accent'}
          label={`${game.title} progress`}
        />
      </span>
    </button>
  );
};

/**
 * What the bell opens: any game finished since you last looked, one at a
 * time with its celebration, then everything that moved, furthest first.
 *
 * What is shown is taken once, as it opens. Opening marks it all read, and a
 * list that reshuffled itself under you as that happened would lose your
 * place in it.
 */
export const NotificationsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { games, goToGame } = useGame();
  const { notifications, markAllRead, clear } = useNotifications();

  const [shown] = useState(notifications);
  const [cleared, setCleared] = useState(false);

  const entries = useMemo(() => {
    const byId = new Map(games.map((g) => [g.id, g]));
    return shown.flatMap<Entry>((note) => {
      const game = byId.get(note.gameId);
      return game ? [{ note, game, gained: note.to - note.from }] : [];
    });
  }, [shown, games]);

  const fresh = useMemo(() => entries.filter((e) => !e.note.read).sort(byProgress), [entries]);
  const earlier = useMemo(() => entries.filter((e) => e.note.read).sort(byProgress), [entries]);
  const finished = useMemo(() => fresh.filter((e) => e.note.completed), [fresh]);

  const [step, setStep] = useState(0);
  const spotlight = step < finished.length ? finished[step] : null;

  // Read once the list is in view — a spotlight dismissed by closing the
  // panel is still waiting next time.
  const marked = useRef(false);
  useEffect(() => {
    if (spotlight || marked.current) return;
    marked.current = true;
    markAllRead();
  }, [spotlight, markAllRead]);

  const next = useRef(() => setStep((s) => s + 1));

  const open = (gameId: string) => {
    onClose();
    goToGame(gameId);
  };

  if (cleared || entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <BellOff size={22} className="text-gray-600" />
        <p className="text-90 font-bold text-gray-800">You’re all caught up</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait" initial={false}>
        {spotlight ? (
          <Spotlight
            key={spotlight.game.id}
            entry={spotlight}
            step={step + 1}
            steps={finished.length}
            onNext={next.current}
          />
        ) : (
          <motion.div
            key="list"
            initial="hidden"
            animate="shown"
            variants={{ shown: { transition: { staggerChildren: 0.04 } } }}
            className="space-y-2"
          >
            {fresh.map((entry) => (
              <motion.div
                key={entry.note.id}
                variants={{ hidden: { opacity: 0, y: 6 }, shown: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
              >
                <Row entry={entry} unread onOpen={() => open(entry.game.id)} />
              </motion.div>
            ))}

            {earlier.length > 0 ? (
              <motion.div
                variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
                className={cn('eyebrow text-gray-600', fresh.length > 0 && 'pt-2')}
              >
                Earlier
              </motion.div>
            ) : null}

            {earlier.map((entry) => (
              <motion.div
                key={entry.note.id}
                variants={{ hidden: { opacity: 0, y: 6 }, shown: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
              >
                <Row entry={entry} unread={false} onOpen={() => open(entry.game.id)} />
              </motion.div>
            ))}

            <div className="flex justify-end pt-1">
              <Button
                buttonStyle="subtle"
                size="s"
                onClick={() => {
                  clear();
                  setCleared(true);
                }}
              >
                Clear all
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
