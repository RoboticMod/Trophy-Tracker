import React from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Store } from 'lucide-react';
import { UserGame } from '../types';
import { DEFAULT_COLLECTION_COLOR, PLATFORMS } from '../lib/constants';
import { useGame } from '../context/GameContext';
import { completionPercent, isPerfect } from '../lib/completion';
import { formatDate, formatHours, relativeTime } from '../lib/format';
import {
  PERMANENT_TONE,
  collectionName,
  isPermanentCollection,
  permanentOf,
} from '../lib/collections';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun } from './TrophyBadge';
import { RatingValue } from './Rating';
import { Badge, Button, Dialog, Meter, SectionTitle, StatTile } from './ui';

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
  const { collections } = useGame();

  const platform = PLATFORMS[game.platform] ?? PLATFORMS.steam;
  const progress = completionPercent(game);
  const perfect = isPerfect(game);
  const shelf = permanentOf(game.collections);
  const noun = awardNoun(game.platform);

  const memberships = collections.filter(
    (c) => !isPermanentCollection(c.id) && game.collections?.includes(c.id),
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={game.title}
      description={
        shelf ? `${platform.name} • ${collectionName(shelf, collections)}` : platform.name
      }
      icon={<PlatformIcon platform={game.platform} size={18} />}
      footer={
        <>
          {/* Closes this and opens that, rather than stacking one dialog over
              another — the same step-through the edit button below makes. */}
          <Button buttonStyle="outline" onClick={onOpenStore}>
            <Store size={14} />
            Store details
          </Button>

          {onEdit ? (
            <Button
              buttonStyle="outline"
              onClick={() => {
                onClose();
                onEdit();
              }}
            >
              <Pencil size={14} />
              Edit
            </Button>
          ) : null}

          <Button variant="accent" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* What it is ------------------------------------------------------ */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <CoverArt
            src={game.coverImage}
            title={game.title}
            className="h-28 w-full shrink-0 rounded-md object-cover sm:h-20 sm:w-36"
          />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {shelf ? (
                <Badge tone={PERMANENT_TONE[shelf]}>{collectionName(shelf, collections)}</Badge>
              ) : null}
              {perfect ? <Badge tone="trophy">100%</Badge> : null}

              {/* Each list in its own colour, the identity the library filter
                  chips carry. */}
              {memberships.map((collection) => {
                const color = collection.color || DEFAULT_COLLECTION_COLOR;
                return (
                  <span
                    key={collection.id}
                    className="flex items-center gap-1.5 rounded-full border border-gray-300 px-2 py-0.5 text-50 text-gray-800"
                    title={collection.description || collection.name}
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {collection.name}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-75 font-bold tabular-nums text-gray-900">
              <TrophyBadge platform={game.platform} size={15} muted={!perfect} />
              <span>
                {game.achievementsUnlocked} / {game.achievementsTotal}{' '}
                <span className="font-normal text-gray-600">
                  {noun.toLowerCase()} ({progress}%)
                </span>
              </span>
            </div>

            <Meter
              value={progress}
              tone={perfect ? 'trophy' : 'accent'}
              label={`${game.title} ${noun.toLowerCase()} progress`}
            />
          </div>
        </div>

        {/* Your figures ---------------------------------------------------- */}
        <section className="space-y-3">
          <SectionTitle>Your record</SectionTitle>

          <div className="grid-metrics">
            <StatTile
              label="Hours played"
              value={`${formatHours(game.hoursPlayed)}h`}
              caption={game.lastPlayedAt ? `Last played ${relativeTime(game.lastPlayedAt)}` : undefined}
            />
            <StatTile
              label={`Last ${noun.toLowerCase().replace(/s$/, '')}`}
              value={formatDate(game.lastUnlockedAt)}
              caption={game.lastUnlockedAt ? relativeTime(game.lastUnlockedAt) : 'Nothing unlocked yet'}
            />
            {/* Only once it is finished: a completion date on a game still in
                progress would be a date for something that has not happened. */}
            {game.completedAt ? (
              <StatTile
                label="Finished"
                value={formatDate(game.completedAt)}
                caption={relativeTime(game.completedAt)}
              />
            ) : null}
          </div>
        </section>

        {/* Your verdict ---------------------------------------------------- */}
        <section className="space-y-3">
          <SectionTitle>Your verdict</SectionTitle>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <span className="eyebrow text-gray-600">Game</span>
              {game.rating ? (
                <RatingValue value={game.rating} size="md" label="Game rated" />
              ) : (
                <span className="text-75 text-gray-600">Not rated</span>
              )}
            </div>

            {/* Mirroring where it can be set: an achievement rating is a
                verdict on a whole list, and cannot honestly be given — or
                shown — part-way through one. */}
            {perfect ? (
              <div className="flex items-center gap-2">
                <span className="eyebrow text-gray-600">{noun}</span>
                {game.achievementRating ? (
                  <RatingValue
                    value={game.achievementRating}
                    size="md"
                    label={`${noun} rated`}
                  />
                ) : (
                  <span className="text-75 text-gray-600">Not rated</span>
                )}
              </div>
            ) : null}
          </div>
        </section>

        {/* Your notes ------------------------------------------------------ */}
        <section className="space-y-3">
          <SectionTitle>Notes</SectionTitle>

          {game.notes ? (
            // Whitespace kept: a note written as a few lines was written that
            // way on purpose, and reflowing it into a paragraph loses the list
            // someone typed.
            <p className="panel-inset whitespace-pre-wrap rounded-md p-3 text-75 leading-relaxed text-gray-800">
              {game.notes}
            </p>
          ) : (
            <p className="text-75 text-gray-600">
              Nothing written down yet — Edit adds a note.
            </p>
          )}
        </section>
      </div>
    </Dialog>
  );
};
