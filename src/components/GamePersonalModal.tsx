import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Store, Trash2 } from 'lucide-react';
import { UserGame } from '../types';
import { DEFAULT_COLLECTION_COLOR, PLATFORMS } from '../lib/constants';
import { useGame } from '../context/GameContext';
import { completionPercent, isPerfect } from '../lib/completion';
import { formatDate, formatHours, relativeTime } from '../lib/format';
import { formatRating, ratingColor } from '../lib/rating';
import { useMediaQuery } from '../lib/useMediaQuery';
import { cn } from '../lib/cn';
import {
  COMPLETE_COLLECTION_ID,
  PERMANENT_SELECTED_CLASS,
  collectionName,
  isPermanentCollection,
  permanentOf,
} from '../lib/collections';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun } from './TrophyBadge';
import { Button, Dialog, Meter, SectionRule } from './ui';

interface GamePersonalModalProps {
  game: UserGame | null;
  isOpen: boolean;
  onClose: () => void;
  /** Steps through to the store page's own window. */
  onOpenStore: () => void;
  /** Opens the edit dialog — a phone card has no edit control of its own. */
  onEdit?: () => void;
}

/**
 * What a game is *to you*: the hours, the dates, the two scores and the notes.
 *
 * The one dialog a game used to open held this and the store page's concurrent
 * players, reviews, screenshots and links in a single column. They answer
 * different questions and are wanted at different moments — "how far through
 * this am I?" is not "is this worth playing?" — and on a phone the first was
 * always below the fold of the second. So a tap opens this, and the store page
 * is a button away.
 *
 * `notes` appears here and nowhere else. The model has carried the field all
 * along and the edit dialog has always written it, but nothing has ever read it
 * back — you could write yourself a note and never see it again.
 *
 * From 1024 it is a two-column dialog rather than a sheet: the art, where it is
 * filed and how far through it you are on the left; your record and your notes
 * on the right. Nothing scrolls until the dialog reaches its 720 cap, and then
 * only the right column does — the picture and the progress stay put.
 */
export const GamePersonalModal: React.FC<GamePersonalModalProps> = ({
  game,
  isOpen,
  onClose,
  onOpenStore,
  onEdit,
}) => {
  if (typeof document === 'undefined' || !game) return null;

  return createPortal(
    <GamePersonal
      key={game.id}
      game={game}
      isOpen={isOpen}
      onClose={onClose}
      onOpenStore={onOpenStore}
      onEdit={onEdit}
    />,
    document.body,
  );
};

const GamePersonal: React.FC<{
  game: UserGame;
  isOpen: boolean;
  onClose: () => void;
  onOpenStore: () => void;
  onEdit?: () => void;
}> = ({ game, isOpen, onClose, onOpenStore, onEdit }) => {
  const { collections, deleteGame } = useGame();

  const platform = PLATFORMS[game.platform] ?? PLATFORMS.steam;
  const progress = completionPercent(game);
  const perfect = isPerfect(game);
  const shelf = permanentOf(game.collections);
  const noun = awardNoun(game.platform);

  const memberships = collections.filter(
    (c) => !isPermanentCollection(c.id) && game.collections?.includes(c.id),
  );

  const split = useMediaQuery('(min-width: 64rem)');

  const edit = onEdit
    ? () => {
        onClose();
        onEdit();
      }
    : undefined;

  /**
   * Deleting from here, behind one confirming click — the same two steps the
   * edit dialog asks for. Reset whenever the dialog opens again, so a confirm
   * left hanging is never the first thing the next visit shows.
   */
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (isOpen) setConfirmDelete(false);
  }, [isOpen]);
  const left = Math.max(0, game.achievementsTotal - game.achievementsUnlocked);

  if (split) {
    const tile = (label: string, value: string, caption: string, color?: string) => (
      <div className="panel-inset rounded-md px-3.5 py-3">
        <div className="eyebrow truncate text-gray-600">{label}</div>
        <div
          className="mt-2.25 truncate text-550 font-bold leading-none tabular-nums text-gray-1000"
          style={color ? { color } : undefined}
        >
          {value}
        </div>
        <div className="mt-1.5 truncate text-75 text-gray-700">{caption}</div>
      </div>
    );

    return (
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        size="split"
        title={game.title}
        icon={<PlatformIcon platform={game.platform} size={14} className="shrink-0" />}
        description={[
          platform.name,
          shelf ? collectionName(shelf, collections) : null,
          `Added ${formatDate(game.addedAt)}`,
        ]
          .filter(Boolean)
          .join(' · ')}
        footer={
          <>
            {confirmDelete ? (
              <div className="mr-auto flex min-w-0 items-center gap-2">
                <span className="min-w-0 text-75 leading-tight text-gray-800">
                  Delete this game permanently?
                </span>
                <Button
                  variant="negative"
                  size="l"
                  className="shrink-0"
                  onClick={() => {
                    onClose();
                    deleteGame(game.id);
                  }}
                >
                  Delete
                </Button>
                <Button
                  buttonStyle="subtle"
                  size="l"
                  className="shrink-0"
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep
                </Button>
              </div>
            ) : (
              <Button
                variant="negative"
                buttonStyle="subtle"
                size="l"
                className="mr-auto"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} />
                Delete game
              </Button>
            )}

            {/* Closes this and opens that, rather than stacking one dialog
                over another — the same step-through Edit makes. */}
            <Button buttonStyle="outline" size="l" onClick={onOpenStore}>
              <Store size={16} />
              Store details
            </Button>

            {edit ? (
              <Button buttonStyle="outline" size="l" onClick={edit}>
                <Pencil size={16} />
                Edit
              </Button>
            ) : null}

            {/* One primary, on the right. The phone's full-width primary is a
                rule for a thumb, not for a pointer. */}
            <Button variant="accent" size="l" onClick={onClose}>
              Done
            </Button>
          </>
        }
      >
        <div className="grid min-h-0 w-full grid-cols-[26.25rem_minmax(0,1fr)] gap-7">
          {/* What it is, and how far through it you are ------------------- */}
          <div className="flex flex-col gap-4">
            <CoverArt
              src={game.coverImage}
              title={game.title}
              className="aspect-video w-full rounded-tile object-cover"
            />

            <div className="flex flex-wrap items-center gap-2">
              {shelf ? (
                <span
                  className={cn(
                    'inline-flex h-7 items-center rounded-full border px-3.25 text-75 font-bold uppercase tracking-[0.04em]',
                    PERMANENT_SELECTED_CLASS[shelf],
                  )}
                >
                  {collectionName(shelf, collections)}
                </span>
              ) : null}
              {perfect && shelf !== COMPLETE_COLLECTION_ID ? (
                <span className="inline-flex h-7 items-center rounded-full border border-trophy-700/50 bg-trophy-700/16 px-3.25 text-75 font-bold uppercase tracking-[0.04em] text-trophy-900">
                  100%
                </span>
              ) : null}
              {memberships.map((collection) => {
                const color = collection.color || DEFAULT_COLLECTION_COLOR;
                return (
                  <span
                    key={collection.id}
                    className="inline-flex h-7 items-center gap-1.75 rounded-full border border-gray-300 px-3.25 text-75 font-bold"
                    style={{ color }}
                    title={collection.description || collection.name}
                  >
                    <span aria-hidden className="h-1.75 w-1.75 rounded-full bg-current" />
                    {collection.name}
                  </span>
                );
              })}
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5 text-150 tabular-nums">
                <TrophyBadge platform={game.platform} size={18} muted={!perfect} />
                <span className="font-bold text-gray-1000">
                  {game.achievementsUnlocked} / {game.achievementsTotal} {noun.toLowerCase()}
                </span>
                <span className="ml-auto text-gray-700">{progress}%</span>
              </div>
              <Meter
                size="l"
                value={progress}
                tone={perfect ? 'trophy' : 'accent'}
                label={`${game.title} ${noun.toLowerCase()} progress`}
              />
              <p className="text-75 text-gray-600">
                {perfect
                  ? `Every one of them earned${game.completedAt ? `, finished ${formatDate(game.completedAt)}` : ''}.`
                  : `${left} left.`}
              </p>
            </div>
          </div>

          {/* Yours ---------------------------------------------------------- */}
          <div className="flex min-h-0 flex-col gap-5.5 overflow-y-auto">
            <section className="flex flex-col gap-3.5">
              <SectionRule title="Your record" />
              <div className="grid grid-cols-2 gap-2.5">
                {tile(
                  'Hours',
                  `${formatHours(game.hoursPlayed)}h`,
                  game.lastPlayedAt ? `Played ${relativeTime(game.lastPlayedAt)}` : 'Not played yet',
                )}
                {tile(
                  `Last ${noun.toLowerCase().replace(/s$/, '')}`,
                  game.lastUnlockedAt
                    ? new Date(game.lastUnlockedAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })
                    : '—',
                  game.lastUnlockedAt ? relativeTime(game.lastUnlockedAt) : 'Nothing unlocked yet',
                )}
                {tile(
                  'Game rating',
                  game.rating ? formatRating(game.rating) : '—',
                  game.rating ? 'Out of 10' : 'Not rated',
                  game.rating ? ratingColor(game.rating) : 'var(--color-gray-600)',
                )}
                {/* Mirroring where it can be set: an award rating is a verdict
                    on a whole list, and cannot honestly be given — or shown —
                    part-way through one. */}
                {tile(
                  noun,
                  perfect && game.achievementRating ? formatRating(game.achievementRating) : '—',
                  perfect ? (game.achievementRating ? 'Out of 10' : 'Not rated') : 'Rated at 100%',
                  perfect && game.achievementRating
                    ? ratingColor(game.achievementRating)
                    : 'var(--color-gray-600)',
                )}
              </div>
            </section>

            <section className="flex flex-col gap-3.5">
              <SectionRule title="Notes" />
              {game.notes ? (
                // Whitespace kept: a note written as a few lines was written
                // that way on purpose.
                <p className="panel-inset whitespace-pre-wrap rounded-md p-3.5 text-90 leading-[1.1875rem] text-gray-800">
                  {game.notes}
                </p>
              ) : (
                <p className="text-90 text-gray-600">
                  Nothing written down yet — Edit adds a note.
                </p>
              )}
            </section>
          </div>
        </div>
      </Dialog>
    );
  }

  /* -- Below 1024: the same content as a bottom sheet, stacked --------------- */

  const tile = (label: string, value: string, caption: string, color?: string) => (
    <div className="panel-inset rounded-md px-3 py-2.5">
      <div className="eyebrow truncate text-gray-600">{label}</div>
      <div
        className="mt-1.75 truncate text-400 font-bold leading-none tabular-nums text-gray-1000"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="mt-1.25 truncate text-75 text-gray-700">{caption}</div>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      sheetBelow="lg"
      title={game.title}
      icon={<PlatformIcon platform={game.platform} size={13} className="shrink-0" />}
      description={[platform.name, shelf ? collectionName(shelf, collections) : null]
        .filter(Boolean)
        .join(' · ')}
      footer={
        // Two secondaries side by side, then one primary across the full
        // width — the bottom of the sheet is where a thumb rests, and one
        // wide target is the one it should find.
        <div className="flex w-full flex-col gap-2">
          <div className="flex gap-2">
            {/* Closes this and opens that, rather than stacking one sheet over
                another — the same step-through Edit makes. */}
            <button
              type="button"
              onClick={onOpenStore}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-gray-300 text-90 font-bold text-gray-800 transition-colors hover:border-gray-400 hover:text-gray-1000"
            >
              <Store size={16} />
              Store details
            </button>
            {edit ? (
              <button
                type="button"
                onClick={edit}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-gray-300 text-90 font-bold text-gray-800 transition-colors hover:border-gray-400 hover:text-gray-1000"
              >
                <Pencil size={16} />
                Edit
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-md bg-gradient-to-br from-accent-700 to-accent-600 text-100 font-bold text-gray-1000 shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_16px_-6px_var(--color-accent-700)]"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* What it is, and how far through it you are ----------------------- */}
        <div className="flex flex-col gap-3">
          <CoverArt
            src={game.coverImage}
            title={game.title}
            className="aspect-video w-full rounded-tile object-cover"
          />

          <div className="flex flex-wrap items-center gap-2">
            {shelf ? (
              <span
                className={cn(
                  'inline-flex h-6.5 items-center rounded-full border px-3 text-75 font-bold uppercase tracking-[0.04em]',
                  PERMANENT_SELECTED_CLASS[shelf],
                )}
              >
                {collectionName(shelf, collections)}
              </span>
            ) : null}
            {perfect && shelf !== COMPLETE_COLLECTION_ID ? (
              <span className="inline-flex h-6.5 items-center rounded-full border border-trophy-700/50 bg-trophy-700/16 px-3 text-75 font-bold uppercase tracking-[0.04em] text-trophy-900">
                100%
              </span>
            ) : null}
            {/* Each list in its own colour, the identity the library filter
                chips carry. */}
            {memberships.map((collection) => {
              const color = collection.color || DEFAULT_COLLECTION_COLOR;
              return (
                <span
                  key={collection.id}
                  className="inline-flex h-6.5 items-center gap-1.75 rounded-full border border-gray-300 px-3 text-75 text-gray-800"
                  title={collection.description || collection.name}
                >
                  <span
                    aria-hidden
                    className="h-1.75 w-1.75 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {collection.name}
                </span>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-90 tabular-nums">
              <TrophyBadge platform={game.platform} size={16} muted={!perfect} />
              <span className="font-bold text-gray-1000">
                {game.achievementsUnlocked} / {game.achievementsTotal} {noun.toLowerCase()}
              </span>
              <span className="ml-auto text-gray-700">{progress}%</span>
            </div>
            <Meter
              size="l"
              value={progress}
              tone={perfect ? 'trophy' : 'accent'}
              label={`${game.title} ${noun.toLowerCase()} progress`}
            />
          </div>
        </div>

        {/* Your record ------------------------------------------------------ */}
        <section className="flex flex-col gap-3">
          <SectionRule title="Your record" />
          <div className="grid grid-cols-2 gap-2">
            {tile(
              'Hours',
              `${formatHours(game.hoursPlayed)}h`,
              game.lastPlayedAt ? `Played ${relativeTime(game.lastPlayedAt)}` : 'Not played yet',
            )}
            {tile(
              `Last ${noun.toLowerCase().replace(/s$/, '')}`,
              game.lastUnlockedAt
                ? new Date(game.lastUnlockedAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                  })
                : '—',
              game.lastUnlockedAt ? relativeTime(game.lastUnlockedAt) : 'Nothing unlocked yet',
            )}
            {tile(
              'Game rating',
              game.rating ? formatRating(game.rating) : '—',
              game.rating ? 'Out of 10' : 'Not rated',
              game.rating ? ratingColor(game.rating) : 'var(--color-gray-600)',
            )}
            {/* Mirroring where it can be set: an award rating is a verdict on
                a whole list, and cannot honestly be given — or shown — part-way
                through one. */}
            {tile(
              noun,
              perfect && game.achievementRating ? formatRating(game.achievementRating) : '—',
              perfect ? (game.achievementRating ? 'Out of 10' : 'Not rated') : 'Rated at 100%',
              perfect && game.achievementRating
                ? ratingColor(game.achievementRating)
                : 'var(--color-gray-600)',
            )}
          </div>
        </section>

        {/* Your notes ------------------------------------------------------- */}
        <section className="flex flex-col gap-3">
          <SectionRule title="Notes" />
          {game.notes ? (
            // Whitespace kept: a note written as a few lines was written that
            // way on purpose, and reflowing it into a paragraph loses the list
            // someone typed.
            <p className="panel-inset whitespace-pre-wrap rounded-md p-3 text-90 leading-[1.1875rem] text-gray-800">
              {game.notes}
            </p>
          ) : (
            <p className="text-90 text-gray-600">Nothing written down yet — Edit adds a note.</p>
          )}
        </section>
      </div>
    </Dialog>
  );
};
