import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Plus, Clock, Trophy, Sparkles, Filter } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { PlatformIcon } from '../components/PlatformIcon';
import { PLATFORMS, comparePlatformOrder } from '../lib/constants';

export const CurrentlyPlayingView: React.FC = () => {
  const { games, setIsQuickAddOpen, updateGame, profile } = useGame();

  const playingGames = games
    .filter(g => g.status === 'playing')
    .sort((a, b) => {
      const pDiff = comparePlatformOrder(a.platform, b.platform, profile?.platformOrder);
      if (pDiff !== 0) return pDiff;
      return a.title.localeCompare(b.title);
    });
  const totalPlayingHours = playingGames.reduce((acc, g) => acc + (g.hoursPlayed || 0), 0);
  const totalAchievements = playingGames.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);
  const totalPossible = playingGames.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Play size={18} className="fill-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Currently Playing
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {playingGames.length} Active
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Games you are actively exploring right now. Log progress, hours, and achievements.
          </p>
        </div>

        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md flex items-center gap-2 self-start sm:self-auto transition-colors"
        >
          <Plus size={16} />
          <span>Add Playing Game</span>
        </button>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Play size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{playingGames.length}</div>
            <div className="text-[11px] text-zinc-400">Active Titles</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Clock size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{totalPlayingHours}h</div>
            <div className="text-[11px] text-zinc-400">Logged in Active Games</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Trophy size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-white">
              {totalAchievements} / {totalPossible}
            </div>
            <div className="text-[11px] text-zinc-400">
              Active Unlocks ({totalPossible > 0 ? Math.round((totalAchievements / totalPossible) * 100) : 0}%)
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        <AnimatePresence>
          {playingGames.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {playingGames.length === 0 && (
        <div className="py-16 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 p-8 space-y-3 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
            <Play size={24} />
          </div>
          <h3 className="text-sm font-bold text-white">No games currently in play</h3>
          <p className="text-xs text-zinc-400">
            Pick a game from your backlog or library and set its status to "Playing".
          </p>
        </div>
      )}
    </div>
  );
};
