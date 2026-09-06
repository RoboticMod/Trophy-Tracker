import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Clock,
  Gamepad2,
  Hourglass,
  Plus,
  Search,
  Flame,
  Layers,
  Award,
  Star,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { PLATFORMS, comparePlatformOrder } from '../lib/constants';
import { Platform, GameStatus } from '../types';
import { PlatformIcon } from '../components/PlatformIcon';

type SortOption = 'platform' | 'recent' | 'rating-desc' | 'hours-desc' | 'completion-desc' | 'title-asc';
type RatingFilterOption = 'all' | '5' | '4.5+' | '4+' | '3+' | 'unrated';

export const DashboardView: React.FC = () => {
  const {
    games,
    profile,
    activePlatformFilter,
    setActivePlatformFilter,
    activeStatusFilter,
    setActiveStatusFilter,
    setIsQuickAddOpen,
  } = useGame();

  const [localSearch, setLocalSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('platform');
  const [ratingFilter, setRatingFilter] = useState<RatingFilterOption>('all');

  // Computations
  const totalGames = games.length;
  const totalHours = games.reduce((acc, g) => acc + (g.hoursPlayed || 0), 0);
  const totalAchievements = games.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);
  const totalMaxAchievements = games.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);
  const backlogCount = games.filter(g => g.status === 'backlog').length;
  const currentlyPlaying = games.filter(g => g.status === 'playing');
  const perfectGamesCount = games.filter(
    g => g.status === 'mastered' || (g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal)
  ).length;

  const overallProgress = totalMaxAchievements > 0
    ? Math.round((totalAchievements / totalMaxAchievements) * 100)
    : 0;

  // Filtered and Sorted games
  const processedGames = useMemo(() => {
    const result = games.filter(g => {
      if (activePlatformFilter !== 'all' && g.platform !== activePlatformFilter) return false;
      if (activeStatusFilter !== 'all' && g.status !== activeStatusFilter) return false;

      // Rating Filter
      if (ratingFilter !== 'all') {
        const r = g.rating || 0;
        if (ratingFilter === '5' && r < 5) return false;
        if (ratingFilter === '4.5+' && r < 4.5) return false;
        if (ratingFilter === '4+' && r < 4) return false;
        if (ratingFilter === '3+' && r < 3) return false;
        if (ratingFilter === 'unrated' && r > 0) return false;
      }

      if (localSearch.trim()) {
        const q = localSearch.toLowerCase();
        const matchTitle = g.title.toLowerCase().includes(q);
        const matchGenre = g.genres.some(genre => genre.toLowerCase().includes(q));
        if (!matchTitle && !matchGenre) return false;
      }
      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'platform') {
        const pDiff = comparePlatformOrder(a.platform, b.platform, profile?.platformOrder);
        if (pDiff !== 0) return pDiff;
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'rating-desc') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'hours-desc') {
        return (b.hoursPlayed || 0) - (a.hoursPlayed || 0);
      }
      if (sortBy === 'completion-desc') {
        const compA = a.achievementsTotal > 0 ? a.achievementsUnlocked / a.achievementsTotal : 0;
        const compB = b.achievementsTotal > 0 ? b.achievementsUnlocked / b.achievementsTotal : 0;
        return compB - compA;
      }
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      // 'recent'
      const timeA = new Date(a.lastPlayedAt || a.addedAt || 0).getTime();
      const timeB = new Date(b.lastPlayedAt || b.addedAt || 0).getTime();
      return timeB - timeA;
    });

    return result;
  }, [games, activePlatformFilter, activeStatusFilter, ratingFilter, localSearch, sortBy]);

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-10">
      {/* Spectrum Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Gaming Profile Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Tracking game progress and achievement unlocks across your connected platforms.
          </p>
        </div>

        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 self-start sm:self-auto transition-colors"
        >
          <Plus size={16} />
          <span>Add Game</span>
        </button>
      </div>

      {/* Spectrum Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: 100%'ed Games */}
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Trophy size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{perfectGamesCount}</div>
            <div className="text-[11px] font-medium text-zinc-400">100% Completed Games</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
            <Award size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalAchievements}</div>
            <div className="text-[11px] font-medium text-zinc-400">Achievements ({overallProgress}%)</div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalHours}h</div>
            <div className="text-[11px] font-medium text-zinc-400">Total Playtime</div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center flex-shrink-0">
            <Hourglass size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{backlogCount}</div>
            <div className="text-[11px] font-medium text-zinc-400">Backlog Queue</div>
          </div>
        </div>
      </div>

      {/* Currently Playing Spotlight */}
      {currentlyPlaying.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="text-amber-400" size={18} />
            <h2 className="text-base font-bold text-white">Currently Playing</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
              {currentlyPlaying.length} active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {currentlyPlaying.slice(0, 3).map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}

      {/* Platform & Status Filters */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Game Library</h2>

          {/* Search inside Library */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-zinc-400" size={15} />
            <input
              type="text"
              placeholder="Filter library..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Platform Icons Pills (Replaced Platform Names with Icons) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActivePlatformFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activePlatformFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All Platforms ({games.length})
          </button>

          {(Object.keys(PLATFORMS) as Platform[]).map((p) => {
            const cfg = PLATFORMS[p];
            const count = games.filter(g => g.platform === p).length;
            const isSelected = activePlatformFilter === p;
            return (
              <button
                key={p}
                onClick={() => setActivePlatformFilter(p)}
                style={{
                  borderColor: isSelected ? cfg.color : undefined,
                  backgroundColor: isSelected ? cfg.bgColor : undefined,
                  color: isSelected ? cfg.textColor : undefined,
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? 'border-current shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
                title={cfg.name}
              >
                <PlatformIcon platform={p} size={15} />
                <span className="text-[11px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Status' },
            { id: 'playing', label: `🎮 ${profile.statusNames?.playing || 'Playing'}` },
            { id: 'backlog', label: `⏳ ${profile.statusNames?.backlog || 'Backlog'}` },
            { id: 'completed', label: `🏆 ${profile.statusNames?.completed || 'Completed'}` },
            { id: 'mastered', label: `👑 ${profile.statusNames?.mastered || '100% Mastered'}` },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setActiveStatusFilter(st.id as GameStatus | 'all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeStatusFilter === st.id
                  ? 'bg-zinc-200 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 border border-zinc-800/60'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Sort & Half-Star Rating Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-800/50">
          {/* Rating Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1 mr-1">
              <Star size={12} className="text-amber-400" />
              Rating:
            </span>
            {(['all', '5', '4.5+', '4+', '3+', 'unrated'] as RatingFilterOption[]).map((r) => (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                  ratingFilter === r
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 border border-zinc-800'
                }`}
              >
                {r === 'all' ? 'All' : r === 'unrated' ? 'Unrated' : `★ ${r}`}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
              <ArrowUpDown size={12} className="text-blue-400" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="platform">Platform (Steam → PS5 → Android)</option>
              <option value="recent">Recently Played</option>
              <option value="rating-desc">Rating: Highest First</option>
              <option value="hours-desc">Playtime: Most Hours</option>
              <option value="completion-desc">Completion %: Highest</option>
              <option value="title-asc">Title: A to Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Game Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        <AnimatePresence>
          {processedGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {processedGames.length === 0 && (
        <div className="py-16 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 p-8 space-y-3 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
            <Gamepad2 size={24} />
          </div>
          <h3 className="text-sm font-bold text-white">No games found</h3>
          <p className="text-xs text-zinc-400">
            Try adjusting your filters or search keywords, or add a new game to your profile.
          </p>
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} />
            Add Game
          </button>
        </div>
      )}
    </div>
  );
};
