import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Award, Sparkles } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { PlatformIcon } from '../components/PlatformIcon';
import { PlatformCompletionBadge } from '../components/PlatformCompletionBadge';
import { PLATFORMS, comparePlatformOrder } from '../lib/constants';
import { Platform } from '../types';

export const AchievementsView: React.FC = () => {
  const { games, profile } = useGame();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');

  // Games where the user has 100% of all achievements & trophies
  const completedGames = games.filter(
    g => g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal
  );

  // Filter by platform if selected, and sort by platform: first Steam, then PS5, then Android
  const displayedGames = completedGames
    .filter(g => {
      if (selectedPlatform !== 'all' && g.platform !== selectedPlatform) return false;
      return true;
    })
    .sort((a, b) => {
      const pDiff = comparePlatformOrder(a.platform, b.platform, profile?.platformOrder);
      if (pDiff !== 0) return pDiff;
      return a.title.localeCompare(b.title);
    });

  const totalCompletedAchievements = completedGames.reduce(
    (acc, g) => acc + (g.achievementsUnlocked || 0),
    0
  );

  const steamPerfectCount = completedGames.filter(g => g.platform === 'steam').length;
  const ps5PlatinumCount = completedGames.filter(
    g => g.platform === 'ps5' || (g.platform as string) === 'playstation'
  ).length;
  const androidCompletedCount = completedGames.filter(g => g.platform === 'android').length;

  // Platform list ordered: Steam, PS5, Android, followed by others
  const platformList: Platform[] = ['steam', 'ps5', 'android', 'xbox', 'epic', 'nintendo'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Trophy size={18} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              100% Achievements & Platinum Trophies
            </h1>
          </div>
          <p className="text-xs text-zinc-400">
            Showcase of all games where you have unlocked every single achievement and platinum trophy.
          </p>
        </div>
      </div>

      {/* Completion Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
            <Award size={14} className="text-amber-400" />
            <span>100% Finished Titles</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {completedGames.length}{' '}
            <span className="text-xs font-normal text-zinc-400">games 100% completed</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Games with all achievements & platinum trophies fully unlocked
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
            <Sparkles size={14} className="text-blue-400" />
            <span>Total Achievements Unlocked</span>
          </div>
          <div className="text-3xl font-extrabold text-blue-400">
            {totalCompletedAchievements}{' '}
            <span className="text-xs font-normal text-zinc-400">trophies & achievements</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Earned across your completed game catalog
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
            <Trophy size={14} className="text-emerald-400" />
            <span>Platform Honors Breakdown</span>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5" title="Steam Perfect Games">
              <PlatformCompletionBadge platform="steam" size={20} />
              <span className="text-sm font-bold text-white">{steamPerfectCount}</span>
            </div>
            <div className="w-px h-5 bg-zinc-800" />
            <div className="flex items-center gap-1.5" title="PS5 Platinum Trophies">
              <PlatformCompletionBadge platform="ps5" size={20} />
              <span className="text-sm font-bold text-white">{ps5PlatinumCount}</span>
            </div>
            <div className="w-px h-5 bg-zinc-800" />
            <div className="flex items-center gap-1.5" title="Android Completed">
              <PlatformCompletionBadge platform="android" size={20} />
              <span className="text-sm font-bold text-white">{androidCompletedCount}</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            Steam Perfect ribbons, PS5 Platinum cups & mobile clears
          </p>
        </div>
      </div>

      {/* Platform Filter & Sorting Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/60">
        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <span className="font-semibold text-zinc-300">Sorted by Platform:</span>
          <span className="inline-flex items-center gap-1 text-zinc-400">
            <span>Steam</span>
            <span>&rarr;</span>
            <span>PS5</span>
            <span>&rarr;</span>
            <span>Android</span>
          </span>
          <span className="text-zinc-600">•</span>
          <span>{displayedGames.length} 100% completed games</span>
        </div>

        {/* Platform Icons Filter (Steam -> PS5 -> Android -> etc.) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedPlatform('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              selectedPlatform === 'all'
                ? 'bg-zinc-200 text-zinc-950 border-zinc-200 font-bold'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            title="All Platforms"
          >
            All Platforms
          </button>

          {platformList.map(p => {
            const isSelected = selectedPlatform === p;
            const count = completedGames.filter(g => g.platform === p).length;
            return (
              <button
                key={p}
                onClick={() => setSelectedPlatform(p)}
                style={{
                  color: isSelected ? PLATFORMS[p]?.textColor : undefined,
                  borderColor: isSelected ? PLATFORMS[p]?.color : undefined,
                  backgroundColor: isSelected ? PLATFORMS[p]?.bgColor : undefined,
                }}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs transition-all ${
                  isSelected
                    ? 'shadow-sm font-semibold'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
                title={`${PLATFORMS[p]?.name} (${count} 100% completed)`}
              >
                <PlatformIcon platform={p} size={15} />
                <span className="hidden sm:inline">{PLATFORMS[p]?.shortName}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Games List (Only 100% Completed Games, Sorted Steam -> PS5 -> Android) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        <AnimatePresence>
          {displayedGames.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </AnimatePresence>
      </div>

      {displayedGames.length === 0 && (
        <div className="py-16 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 p-8 space-y-3 max-w-md mx-auto">
          <Trophy size={28} className="text-zinc-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No 100% completed games found</h3>
          <p className="text-xs text-zinc-400">
            {selectedPlatform !== 'all'
              ? `You haven't unlocked 100% of achievements for any ${PLATFORMS[selectedPlatform]?.name} games yet.`
              : 'Complete all achievements for a game to earn your Steam Perfect Game badge or PS5 Platinum Trophy here!'}
          </p>
        </div>
      )}
    </div>
  );
};
