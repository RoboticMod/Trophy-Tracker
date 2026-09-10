import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Trash2, Plus, Minus } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { UserGame, Platform, GameStatus, PLATFORM_IDS } from '../types';
import { PLATFORMS, DEFAULT_COLLECTION_COLOR } from '../lib/constants';
import { statusLabel, STATUS_SELECTED_CLASS } from '../lib/status';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun } from './TrophyBadge';
import { RatingControl } from './Rating';
import { Button, Dialog, Field, TextArea, TextInput } from './ui';
import { cn } from '../lib/cn';

const STATUS_CHOICES: GameStatus[] = ['playing', 'backlog', 'completed', 'mastered', 'dropped'];

/**
 * A pair of nudge buttons under a count field, so ticking a single unlock off
 * does not mean selecting the number and retyping it.
 */
const CountStepper: React.FC<{
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
}> = ({ label, onDecrement, onIncrement, canDecrement, canIncrement }) => (
  <div className="flex gap-1.5">
    <Button
      buttonStyle="outline"
      size="s"
      onClick={onDecrement}
      disabled={!canDecrement}
      aria-label={`Decrease ${label}`}
      className="flex-1"
    >
      <Minus size={14} />
    </Button>
    <Button
      buttonStyle="outline"
      size="s"
      onClick={onIncrement}
      disabled={!canIncrement}
      aria-label={`Increase ${label}`}
      className="flex-1"
    >
      <Plus size={14} />
    </Button>
  </div>
);

interface EditGameModalProps {
  game: UserGame | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditGameModal: React.FC<EditGameModalProps> = ({ game, isOpen, onClose }) => {
  if (typeof document === 'undefined' || !game) return null;

  return createPortal(
    // Keyed on the game id so switching cards resets the form state.
    <EditGameForm key={game.id} game={game} isOpen={isOpen} onClose={onClose} />,
    document.body,
  );
};

const EditGameForm: React.FC<{ game: UserGame; isOpen: boolean; onClose: () => void }> = ({
  game,
  isOpen,
  onClose,
}) => {
  const { updateGame, deleteGame, collections, profile } = useGame();

  const [title, setTitle] = useState(game.title);
  const [platform, setPlatform] = useState<Platform>(game.platform);
  const [status, setStatus] = useState<GameStatus>(game.status);
  const [coverImage, setCoverImage] = useState(game.coverImage || '');
  const [hoursPlayed, setHoursPlayed] = useState(game.hoursPlayed || 0);
  const [rating, setRating] = useState(game.rating || 0);
  const [achievementRating, setAchievementRating] = useState(game.achievementRating || 0);
  const [achievementsUnlocked, setAchievementsUnlocked] = useState(game.achievementsUnlocked || 0);
  const [achievementsTotal, setAchievementsTotal] = useState(game.achievementsTotal || 0);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(game.collections || []);
  const [notes, setNotes] = useState(game.notes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Follows the platform picker above, so switching a game to PS5 relabels this
  // section to trophies straight away.
  const noun = awardNoun(platform);
  const nounLower = noun.toLowerCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    updateGame(game.id, {
      title: title.trim(),
      platform,
      status,
      coverImage: coverImage.trim() || undefined,
      hoursPlayed,
      rating: rating || undefined,
      achievementRating: achievementRating || undefined,
      achievementsUnlocked: Math.min(achievementsUnlocked, achievementsTotal),
      achievementsTotal,
      collections: selectedCollections,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={game.title}
      description={`${PLATFORMS[platform].name} • edit tracked details`}
      icon={<PlatformIcon platform={platform} size={18} />}
      footer={
        <>
          {confirmDelete ? (
            <div className="mr-auto flex items-center gap-2">
              <span className="text-75 text-gray-800">Delete this game permanently?</span>
              <Button
                variant="negative"
                size="s"
                onClick={() => {
                  deleteGame(game.id);
                  onClose();
                }}
              >
                Delete
              </Button>
              <Button buttonStyle="subtle" size="s" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button
              variant="negative"
              buttonStyle="subtle"
              className="mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} />
              Delete game
            </Button>
          )}

          <Button buttonStyle="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" type="submit" form="edit-game-form" disabled={!title.trim()}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-game-form" onSubmit={handleSubmit} className="space-y-5">
        <Field label="Title">
          {(props) => (
            <TextInput
              {...props}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-1.5 text-75 font-semibold text-gray-800">Platform</legend>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORM_IDS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  aria-pressed={platform === p}
                  className={cn(
                    'flex h-9 items-center justify-center gap-2 rounded-sm border text-75 font-semibold transition-colors',
                    platform === p
                      ? 'border-accent-700 bg-accent-100 text-accent-900'
                      : 'border-gray-300 bg-gray-75 text-gray-700 hover:border-gray-400 hover:text-gray-900',
                  )}
                >
                  <PlatformIcon platform={p} size={15} />
                  {PLATFORMS[p].shortName}
                </button>
              ))}
            </div>
          </fieldset>

          <Field label="Cover image URL" description="Optional">
            {(props) => (
              <TextInput
                {...props}
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://…"
              />
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-75 font-semibold text-gray-800">Status</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {STATUS_CHOICES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                className={cn(
                  'rounded-sm border px-3 py-2 text-75 font-semibold transition-colors',
                  status === s
                    ? STATUS_SELECTED_CLASS[s]
                    : 'border-gray-300 bg-gray-75 text-gray-700 hover:border-gray-400 hover:text-gray-900',
                )}
              >
                {statusLabel(s, profile)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Hours played">
            {(props) => (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Clock
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                  />
                  <TextInput
                    {...props}
                    type="number"
                    min={0}
                    step={0.5}
                    value={hoursPlayed}
                    onChange={(e) => setHoursPlayed(Math.max(0, Number(e.target.value)))}
                    className="pl-9"
                  />
                </div>
                <Button size="m" variant="secondary" onClick={() => setHoursPlayed((h) => h + 1)}>
                  +1h
                </Button>
                <Button size="m" variant="secondary" onClick={() => setHoursPlayed((h) => h + 5)}>
                  +5h
                </Button>
              </div>
            )}
          </Field>

          <div className="space-y-1.5">
            <span className="text-75 font-semibold text-gray-800">Game rating</span>
            <RatingControl value={rating} onChange={setRating} />
            <p className="text-50 text-gray-600">
              The game itself, scored out of 100. The colour runs red at the bottom through to
              gold at 100.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-gray-200 bg-gray-75 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-75 font-semibold text-gray-800">
              <TrophyBadge platform={platform} size={15} />
              {noun}
            </span>
            <Button
              buttonStyle="subtle"
              size="s"
              disabled={achievementsTotal === 0}
              onClick={() => setAchievementsUnlocked(achievementsTotal)}
            >
              Set to 100%
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Field label="Unlocked">
                {(props) => (
                  <TextInput
                    {...props}
                    type="number"
                    min={0}
                    max={achievementsTotal}
                    value={achievementsUnlocked}
                    onChange={(e) => setAchievementsUnlocked(Math.max(0, Number(e.target.value)))}
                  />
                )}
              </Field>
              <CountStepper
                label={`${nounLower} unlocked`}
                canDecrement={achievementsUnlocked > 0}
                canIncrement={achievementsUnlocked < achievementsTotal}
                onDecrement={() => setAchievementsUnlocked((n) => Math.max(0, n - 1))}
                onIncrement={() =>
                  setAchievementsUnlocked((n) => Math.min(achievementsTotal, n + 1))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Field label="Total available">
                {(props) => (
                  <TextInput
                    {...props}
                    type="number"
                    min={0}
                    value={achievementsTotal}
                    onChange={(e) => setAchievementsTotal(Math.max(0, Number(e.target.value)))}
                  />
                )}
              </Field>
              <CountStepper
                label={`total ${nounLower}`}
                canDecrement={achievementsTotal > 0}
                canIncrement
                onDecrement={() => {
                  const next = Math.max(0, achievementsTotal - 1);
                  setAchievementsTotal(next);
                  // Lowering the total can strand the unlocked count above it.
                  setAchievementsUnlocked((n) => Math.min(n, next));
                }}
                onIncrement={() => setAchievementsTotal((n) => n + 1)}
              />
            </div>
          </div>

          <div className="space-y-1.5 border-t border-gray-200 pt-3">
            <span className="text-75 font-semibold text-gray-800">
              {noun} rating
            </span>
            <RatingControl value={achievementRating} onChange={setAchievementRating} />
            <p className="text-50 text-gray-600">
              How good the {nounLower} were to earn — separate from how good the game is.
            </p>
          </div>
        </div>

        {collections.length > 0 && (
          <fieldset>
            <legend className="mb-1.5 text-75 font-semibold text-gray-800">Collections</legend>
            <div className="flex flex-wrap gap-2">
              {collections.map((col) => {
                const selected = selectedCollections.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() =>
                      setSelectedCollections((prev) =>
                        selected ? prev.filter((c) => c !== col.id) : [...prev, col.id],
                      )
                    }
                    aria-pressed={selected}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-75 font-medium transition-colors',
                      selected
                        ? 'border-accent-700 bg-accent-100 text-accent-900'
                        : 'border-gray-300 bg-gray-75 text-gray-700 hover:border-gray-400',
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: col.color || DEFAULT_COLLECTION_COLOR }}
                    />
                    {col.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <Field label="Notes" description="Optional">
          {(props) => (
            <TextArea
              {...props}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Where you got to, what is left, anything worth remembering."
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
};
