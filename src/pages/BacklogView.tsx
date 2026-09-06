import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Hourglass, Plus, Play, Filter } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { Platform } from '../types';
import { PLATFORMS, comparePlatformOrder } from '../lib/constants';

export const BacklogView: React.FC = () => {
  const { games, setIsQuickAddOpen, updateGame, profile } = useGame();
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

  const backlogGames = games.filter(g => g.status === 'backlog');

  const filtered = backlogGames
    .filter(g => {
      if (platformFilter !== 'all' && g.platform !== platformFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const pDiff = comparePlatformOrder(a.platform, b.platform, profile?.platformOrder);
      if (pDiff !== 0) return pDiff;
      return a.title.localeCompare(b.title);
    });

  const totalBacklogAchievements = backlogGames.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);

  const startPlayingNext = () => {
    const nextGame = backlogGames[0];
    if (nextGame) {
      updateGame(nextGame.id, { status: 'playing' });
    }
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Hourglass size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Backlog Queue
            </h1>
            <p className="text-xs text-zinc-400">
              Queue of unplayed games
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {backlogGames.length > 0 && (
            <button
              onClick={startPlayingNext}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Play size={14} className="fill-white" />
              <span>Start Next Game</span>
            </button>
          )}

          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} />
            <span>Add to Backlog</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="text-2xl font-bold text-white">{backlogGames.length}</div>
          <div className="text-[11px] font-medium text-zinc-400">Total Games in Queue</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="text-2xl font-bold text-amber-400">{totalBacklogAchievements}</div>
          <div className="text-[11px] font-medium text-zinc-400">Potential Achievements to Unlock</div>
        </div>
      </div>

      {/* Platform Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-medium text-zinc-400 flex items-center gap-1 mr-1">
          <Filter size={13} />
          Platform:
        </span>

        <button
          onClick={() => setPlatformFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            platformFilter === 'all'
              ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          All ({backlogGames.length})
        </button>

        {Object.entries(PLATFORMS).map(([id, cfg]) => {
          const count = backlogGames.filter(g => g.platform === id).length;
          if (count === 0) return null;
          return (
            <button
              key={id}
              onClick={() => setPlatformFilter(id as Platform)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                platformFilter === id
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {cfg.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Games List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        <AnimatePresence>
          {filtered.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="py-16 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 p-8 space-y-3 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Hourglass size={24} />
          </div>
          <h3 className="text-sm font-bold text-white">Your backlog is caught up</h3>
          <p className="text-xs text-zinc-400">
            No games currently waiting in this filter. Add new games to your backlog queue from the catalog.
          </p>
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} />
            Add Game to Backlog
          </button>
        </div>
      )}
    </div>
  );
};
