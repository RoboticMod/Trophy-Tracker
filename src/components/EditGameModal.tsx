import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { UserGame, GameStatus } from '../types';
import { PLATFORMS } from '../lib/constants';
import { PlatformIcon } from './PlatformIcon';
import { GameDetailsFields, GameDetailsValues } from './GameDetailsFields';
import { Button, Dialog } from './ui';

const STATUS_CHOICES: GameStatus[] = ['playing', 'backlog', 'completed', 'mastered', 'dropped'];

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
      title={game.title}
      description={`${PLATFORMS[values.platform].name} • edit tracked details`}
      icon={<PlatformIcon platform={values.platform} size={18} />}
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
          <Button
            variant="accent"
            type="submit"
            form="edit-game-form"
            disabled={!values.title.trim()}
          >
            Save changes
          </Button>
        </>
      }
    >
      <GameDetailsFields
        formId="edit-game-form"
        onSubmit={handleSubmit}
        values={values}
        onChange={patch => setValues(v => ({ ...v, ...patch }))}
        statuses={STATUS_CHOICES}
        collections={collections}
        profile={profile}
      />
    </Dialog>
  );
};
