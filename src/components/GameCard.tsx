import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Clock, MoreVertical, Plus, Minus, Trash2, FolderPlus, Star, Check, Pencil } from 'lucide-react';
import { UserGame, GameStatus } from '../types';
import { PLATFORMS } from '../lib/constants';
import { useGame } from '../context/GameContext';
import { PlatformIcon } from './PlatformIcon';
import { PlatformCompletionBadge } from './PlatformCompletionBadge';
import { EditGameModal } from './EditGameModal';
import { StarRating } from './StarRating';

interface GameCardProps {
  game: UserGame;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const { updateGame, deleteGame, collections, profile } = useGame();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const platformCfg = PLATFORMS[game.platform] || PLATFORMS.steam;
  const progress = game.achievementsTotal > 0
    ? Math.min(100, Math.round((game.achievementsUnlocked / game.achievementsTotal) * 100))
    : 0;

  const isMastered = game.status === 'mastered' || (game.achievementsTotal > 0 && game.achievementsUnlocked >= game.achievementsTotal);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const incrementAchievement = () => {
    if (game.achievementsUnlocked < game.achievementsTotal) {
      updateGame(game.id, { achievementsUnlocked: game.achievementsUnlocked + 1 });
    }
  };

  const decrementAchievement = () => {
    if (game.achievementsUnlocked > 0) {
      updateGame(game.id, { achievementsUnlocked: game.achievementsUnlocked - 1 });
    }
  };

  const handleStatusChange = (newStatus: GameStatus) => {
    updateGame(game.id, { status: newStatus });
    setShowMenu(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={`group relative flex flex-col rounded-2xl border transition-all ${
        showMenu ? 'z-40' : 'z-0'
      } ${
        isMastered
          ? 'bg-gradient-to-b from-amber-950/25 via-zinc-900 to-zinc-900 border-amber-400/80 hover:border-amber-300 shadow-lg shadow-amber-500/10'
          : game.status === 'playing'
          ? 'bg-gradient-to-b from-blue-950/25 via-zinc-900 to-zinc-900 border-blue-500/70 hover:border-blue-400 shadow-md shadow-blue-500/10'
          : game.status === 'backlog'
          ? 'bg-zinc-900/90 border-zinc-700/80 hover:border-zinc-500 shadow-sm'
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Cover Image Header */}
      <div className="relative h-36 w-full bg-zinc-950 rounded-t-2xl">
        {/* Isolated image overflow so dropdowns and action elements are never clipped */}
        <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
          <img
            src={game.coverImage || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80'}
            alt={game.title}
            className={`w-full h-full object-cover object-center group-hover:scale-105 transition-all duration-500 ${
              game.status === 'backlog'
                ? 'grayscale contrast-95 opacity-85 group-hover:grayscale-0 group-hover:opacity-100'
                : ''
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        </div>

        {/* Platform Icon Badge & Status Indicators */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <div 
            className="relative w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm overflow-hidden"
            style={{ borderColor: platformCfg.borderColor, color: platformCfg.textColor }}
            title={platformCfg.name}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <div className="absolute inset-0" style={{ backgroundColor: platformCfg.bgColor }} />
            <div className="relative z-10">
              <PlatformIcon platform={game.platform} size={16} />
            </div>
          </div>

          {game.status === 'backlog' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-zinc-800/90 text-zinc-300 border border-zinc-600/70 shadow-sm flex items-center gap-1">
              <Clock size={10} className="text-zinc-400" />
              Backlog
            </span>
          )}

          {game.status === 'playing' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-blue-500/25 text-blue-300 border border-blue-500/60 shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Playing
            </span>
          )}

          {isMastered && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-amber-500/25 text-amber-300 border border-amber-400/60 shadow-sm flex items-center gap-1">
              <Trophy size={10} className="text-amber-400" />
              100%
            </span>
          )}
        </div>

        {/* 100% Completion Badge Showcase in Header & Options Menu */}
        <div ref={menuRef} className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          {isMastered && (
            <div className="p-1 rounded-xl bg-zinc-900/90 border border-yellow-400/50 backdrop-blur-md shadow-md">
              <PlatformCompletionBadge platform={game.platform} size={20} />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-xl bg-zinc-900/85 backdrop-blur-md text-zinc-300 hover:text-white flex items-center justify-center transition-colors border border-white/10 shadow-sm"
            title="Options"
          >
            <MoreVertical size={15} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 w-44 rounded-xl bg-zinc-800 border border-zinc-700 shadow-2xl py-1 z-50 text-xs text-zinc-200">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-zinc-400">Set Status</div>
              <button
                type="button"
                onClick={() => handleStatusChange('playing')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-700 flex items-center gap-2"
              >
                🎮 {profile.statusNames?.playing || 'Playing'}
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('backlog')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-700 flex items-center gap-2"
              >
                ⏳ {profile.statusNames?.backlog || 'Backlog'}
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('completed')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-700 flex items-center gap-2"
              >
                🏆 {profile.statusNames?.completed || 'Completed'}
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('mastered')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-700 flex items-center gap-2"
              >
                👑 {profile.statusNames?.mastered || '100% Mastered'}
              </button>

              <div className="my-1 border-t border-zinc-700/60" />

              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sky-400 hover:bg-sky-500/20 flex items-center gap-2"
              >
                <Pencil size={13} />
                Edit Game Details
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteGame(game.id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/20 flex items-center gap-2"
              >
                <Trash2 size={13} />
                Delete Game
              </button>
            </div>
          )}
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-2.5 left-3.5 right-3.5 z-10 pointer-events-none">
          <h3 className="text-base font-bold text-white truncate tracking-tight drop-shadow-md">
            {game.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-zinc-500" />
              {game.hoursPlayed}h played
            </span>
            {game.rating ? (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <StarRating value={game.rating} readOnly size="xs" showLabel={false} />
                <span>{game.rating % 1 === 0 ? game.rating : game.rating.toFixed(1)}/5</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Card Content & Achievement Tracker */}
      <div className="p-3.5 flex flex-col gap-2.5">
        {/* Achievements Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-zinc-300">
              {isMastered ? (
                <PlatformCompletionBadge platform={game.platform} size={15} />
              ) : (
                <Trophy size={14} className="text-zinc-400" />
              )}
              <span>{isMastered ? '100% Completed' : 'Achievements'}</span>
            </span>
            <span className="font-semibold text-zinc-200">
              {game.achievementsUnlocked} / {game.achievementsTotal}{' '}
              <span className="text-zinc-500 font-normal">({progress}%)</span>
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                progress === 100
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                  : 'bg-blue-500'
              }`}
            />
          </div>

          {/* Quick Counter Buttons */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={decrementAchievement}
                disabled={game.achievementsUnlocked <= 0}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-xs"
                title="Decrease unlocked achievements"
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                onClick={incrementAchievement}
                disabled={game.achievementsUnlocked >= game.achievementsTotal}
                className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-xs shadow-sm"
                title="Increase unlocked achievements"
              >
                <Plus size={13} />
              </button>
              <span className="text-[11px] text-zinc-500 ml-1">Log</span>
            </div>

            {/* Status Pill */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                game.status === 'playing'
                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                  : game.status === 'backlog'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : game.status === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
              }`}
            >
              {profile.statusNames?.[game.status] || (
                game.status === 'playing' ? 'Playing' :
                game.status === 'backlog' ? 'Backlog' :
                game.status === 'completed' ? 'Completed' :
                game.status === 'mastered' ? 'Mastered' : 'Dropped'
              )}
            </span>
          </div>
        </div>

        {/* Collections Tags & Notes Preview */}
        {((game.collections && game.collections.length > 0) || Boolean(game.notes)) && (
          <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
            {game.collections && game.collections.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {game.collections.map(colId => {
                  const col = collections.find(c => c.id === colId);
                  if (!col) return null;
                  return (
                    <span
                      key={col.id}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium"
                    >
                      #{col.name}
                    </span>
                  );
                })}
              </div>
            )}

            {game.notes ? (
              <p className="text-[11px] text-zinc-400 italic line-clamp-1">
                "{game.notes}"
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Edit Game Modal */}
      <EditGameModal
        game={game}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </motion.div>
  );
};
