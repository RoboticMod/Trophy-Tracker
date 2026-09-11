import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { UserGame, GameStatus } from '../types';
import { GameDetailsFields, GameDetailsValues } from './GameDetailsFields';
import { TrashIcon } from './icons';
import { Button, Dialog } from './ui';

const STATUS_CHOICES: GameStatus[] = ['backlog', 'playing', 'completed', 'mastered', 'dropped'];

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

  const [values, setValues] = useState<GameDetailsValues>({
    title: game.title,
    platform: game.platform,
    status: game.status,
    coverImage: game.coverImage || '',
    hoursPlayed: game.hoursPlayed || 0,
    rating: game.rating || 0,
    achievementRating: game.achievementRating || 0,
    achievementsUnlocked: game.achievementsUnlocked || 0,
    achievementsTotal: game.achievementsTotal || 0,
    collections: game.collections || [],
    notes: game.notes || '',
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return;

    updateGame(game.id, {
      title: values.title.trim(),
      platform: values.platform,
      status: values.status,
      coverImage: values.coverImage.trim() || undefined,
      hoursPlayed: values.hoursPlayed,
      rating: values.rating || undefined,
      achievementRating: values.achievementRating || undefined,
      achievementsUnlocked: Math.min(values.achievementsUnlocked, values.achievementsTotal),
      achievementsTotal: values.achievementsTotal,
      collections: values.collections,
      notes: values.notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Edit entry"
      title={game.title}
      size="l"
      footer={
        confirmDelete ? (
          <>
            <span className="text-[13px] text-body">Delete this game permanently?</span>
            <span className="flex gap-2">
              <Button variant="ghost" size="l" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
              <Button
                variant="danger"
                size="l"
                onClick={() => {
                  deleteGame(game.id);
                  onClose();
                }}
              >
                Delete
              </Button>
            </span>
          </>
        ) : (
          <>
            <Button variant="danger" size="l" onClick={() => setConfirmDelete(true)}>
              <TrashIcon size={14} />
              Remove
            </Button>
            <span className="flex gap-2">
              <Button variant="outline" size="l" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-game-form"
                variant="accent"
                size="l"
                disabled={!values.title.trim()}
              >
                Save changes
              </Button>
            </span>
          </>
        )
      }
    >
      <GameDetailsFields
        formId="edit-game-form"
        onSubmit={handleSubmit}
        values={values}
        onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
        statuses={STATUS_CHOICES}
        collections={collections}
        profile={profile}
      />
    </Dialog>
  );
};
