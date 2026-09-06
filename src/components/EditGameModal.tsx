import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Trophy, Check, Trash2, FolderPlus } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { UserGame, Platform, GameStatus } from '../types';
import { PLATFORMS } from '../lib/constants';
import { PlatformIcon } from './PlatformIcon';
import { StarRating } from './StarRating';

interface EditGameModalProps {
  game: UserGame | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditGameModal: React.FC<EditGameModalProps> = ({ game, isOpen, onClose }) => {
  const { updateGame, deleteGame, collections } = useGame();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && game && (
        <EditGameModalContent
          key={game.id}
          game={game}
          onClose={onClose}
          updateGame={updateGame}
          deleteGame={deleteGame}
          collections={collections}
        />
      )}
    </AnimatePresence>,
    document.body
  );
};

interface EditGameModalContentProps {
  game: UserGame;
  onClose: () => void;
  updateGame: (id: string, updates: Partial<UserGame>) => void;
  deleteGame: (id: string) => void;
  collections: Array<{ id: string; name: string }>;
}

const EditGameModalContent: React.FC<EditGameModalContentProps> = ({
  game,
  onClose,
  updateGame,
  deleteGame,
  collections,
}) => {
  const [title, setTitle] = useState(game.title);
  const [platform, setPlatform] = useState<Platform>(game.platform);
  const [status, setStatus] = useState<GameStatus>(game.status);
  const [coverImage, setCoverImage] = useState(game.coverImage || '');
  const [hoursPlayed, setHoursPlayed] = useState(game.hoursPlayed || 0);
  const [rating, setRating] = useState(game.rating || 0);
  const [achievementsUnlocked, setAchievementsUnlocked] = useState(game.achievementsUnlocked || 0);
  const [achievementsTotal, setAchievementsTotal] = useState(game.achievementsTotal || 50);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(game.collections || []);
  const [notes, setNotes] = useState(game.notes || '');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    updateGame(game.id, {
      title: title.trim(),
      platform,
      status,
      coverImage: coverImage.trim() || game.coverImage,
      hoursPlayed: Math.max(0, Number(hoursPlayed) || 0),
      rating: Math.min(5, Math.max(0, Number(rating) || 0)),
      achievementsUnlocked: Math.max(0, Number(achievementsUnlocked) || 0),
      achievementsTotal: Math.max(1, Number(achievementsTotal) || 1),
      collections: selectedCollections,
      notes: notes.trim(),
    });

    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove "${game.title}" from your library?`)) {
      deleteGame(game.id);
      onClose();
    }
  };

  const toggleCollection = (colId: string) => {
    setSelectedCollections((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  return (
    <motion.div
      id="edit-game-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center">
              <PlatformIcon platform={platform} size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Edit Game Details</h2>
              <p className="text-xs text-zinc-400">Update progress, achievements, and metadata</p>
            </div>
          </div>
          <button
            id="close-edit-modal-button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

          <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
            {/* Title & Platform */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Game Title
                </label>
                <input
                  id="edit-game-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Platform
                </label>
                <div className="relative">
                  <select
                    id="edit-game-platform-select"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                  >
                    {(Object.keys(PLATFORMS) as Platform[]).map((p) => (
                      <option key={p} value={p}>
                        {PLATFORMS[p].name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Status Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Play Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'playing', label: profile.statusNames?.playing || 'Currently Playing', color: 'border-emerald-500/60 text-emerald-400 bg-emerald-950/20' },
                  { id: 'backlog', label: profile.statusNames?.backlog || 'In Backlog', color: 'border-amber-500/60 text-amber-400 bg-amber-950/20' },
                  { id: 'completed', label: profile.statusNames?.completed || 'Completed', color: 'border-sky-500/60 text-sky-400 bg-sky-950/20' },
                  { id: 'mastered', label: profile.statusNames?.mastered || '100% Mastered', color: 'border-purple-500/60 text-purple-400 bg-purple-950/20' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id as GameStatus)}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all text-center ${
                      status === s.id
                        ? `${s.color} ring-1 ring-white/20 shadow-sm`
                        : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours & Rating */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Hours Played
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="edit-game-hours-input"
                      type="number"
                      min="0"
                      step="0.5"
                      value={hoursPlayed}
                      onChange={(e) => setHoursPlayed(Number(e.target.value))}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-sky-500 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setHoursPlayed((h) => Number((h + 1).toFixed(1)))}
                    className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 rounded-xl border border-zinc-700/60"
                  >
                    +1h
                  </button>
                  <button
                    type="button"
                    onClick={() => setHoursPlayed((h) => Number((h + 5).toFixed(1)))}
                    className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 rounded-xl border border-zinc-700/60"
                  >
                    +5h
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Rating (Half & Full Stars)
                </label>
                <div className="pt-1">
                  <StarRating
                    value={rating}
                    onChange={(newVal) => setRating(newVal)}
                    size="lg"
                    showSteppers={true}
                    showLabel={true}
                  />
                  <div className="text-[11px] text-zinc-400 mt-1.5">
                    Click left half of any star for half-star (e.g. 4.5), or right half for full star. Click again or use Reset to clear.
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements Section */}
            <div className="p-4 bg-zinc-800/40 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  <Trophy size={14} className="text-amber-400" />
                  Achievements & Trophies Progress
                </label>
                <button
                  type="button"
                  onClick={() => setAchievementsUnlocked(achievementsTotal)}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Set to 100%
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs text-zinc-400 mb-1">Unlocked</span>
                  <input
                    id="edit-game-achievements-unlocked"
                    type="number"
                    min="0"
                    max={achievementsTotal}
                    value={achievementsUnlocked}
                    onChange={(e) => setAchievementsUnlocked(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700/60 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="block text-xs text-zinc-400 mb-1">Total Available</span>
                  <input
                    id="edit-game-achievements-total"
                    type="number"
                    min="1"
                    value={achievementsTotal}
                    onChange={(e) => setAchievementsTotal(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700/60 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Progress Bar Preview */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Completion</span>
                  <span>
                    {achievementsTotal > 0
                      ? Math.round((achievementsUnlocked / achievementsTotal) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-700/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((achievementsUnlocked / achievementsTotal) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Cover Image URL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Cover Image URL
              </label>
              <input
                id="edit-game-cover-url"
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>

            {/* Collections */}
            {collections.length > 0 && (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  <FolderPlus size={14} />
                  Assigned Collections
                </label>
                <div className="flex flex-wrap gap-2">
                  {collections.map((col) => {
                    const isSelected = selectedCollections.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => toggleCollection(col.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-purple-950/40 border-purple-500/60 text-purple-300'
                            : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        {col.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Personal Notes & Strategy
              </label>
              <textarea
                id="edit-game-notes-textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Builds, difficult trophies, backlog notes..."
                className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-sky-500 transition-all resize-none"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
              <button
                id="delete-game-button"
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 border border-rose-900/30 transition-colors"
              >
                <Trash2 size={15} />
                Delete Game
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="save-edit-game-button"
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-zinc-950 rounded-xl shadow-md transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
  );
};
