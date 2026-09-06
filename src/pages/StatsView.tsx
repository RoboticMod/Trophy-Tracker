import React from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  Trophy,
  Clock,
  Gamepad2,
  Calendar,
  Percent,
  TrendingUp,
  Award
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { PLATFORMS } from '../lib/constants';
import { Platform } from '../types';
import { PlatformIcon } from '../components/PlatformIcon';
import { PlatformCompletionBadge } from '../components/PlatformCompletionBadge';

export const StatsView: React.FC = () => {
  const { games } = useGame();

  // Pure Utility Statistics Computations
  const totalGames = games.length;
  const totalHours = games.reduce((acc, g) => acc + (g.hoursPlayed || 0), 0);
  const totalAchievements = games.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);
  const totalMaxAchievements = games.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);
  const completedGames = games.filter(g => g.status === 'completed' || g.status === 'mastered');
  const perfectGames = games.filter(
    g => g.status === 'mastered' || (g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal)
  );
  const backlogGames = games.filter(g => g.status === 'backlog');
  const activePlaying = games.filter(g => g.status === 'playing');

  const overallCompletionRate = totalMaxAchievements > 0
    ? Math.round((totalAchievements / totalMaxAchievements) * 100)
    : 0;

  // Platform Distribution with Icons and completion metrics
  const platformStats = (Object.keys(PLATFORMS) as Platform[]).map(p => {
    const pGames = games.filter(g => g.platform === p);
    const pHours = pGames.reduce((acc, g) => acc + (g.hoursPlayed || 0), 0);
    const pAchievements = pGames.reduce((acc, g) => acc + (g.achievementsUnlocked || 0), 0);
    const pMaxAchievements = pGames.reduce((acc, g) => acc + (g.achievementsTotal || 0), 0);
    const pCompletion = pMaxAchievements > 0 ? Math.round((pAchievements / pMaxAchievements) * 100) : 0;
    const pPerfect = pGames.filter(g => g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal).length;

    return {
      platform: p,
      config: PLATFORMS[p],
      count: pGames.length,
      hours: pHours,
      achievements: pAchievements,
      maxAchievements: pMaxAchievements,
      completionRate: pCompletion,
      perfectCount: pPerfect,
      percentOfLibrary: totalGames > 0 ? Math.round((pGames.length / totalGames) * 100) : 0,
    };
  }).filter(s => s.count > 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Statistics & Analytics
            </h1>
            <p className="text-xs text-zinc-400">
              Objective analytics tracking your game progress, achievements, and hours played across platforms.
            </p>
          </div>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Games */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Tracked Games</span>
            <Gamepad2 size={16} className="text-blue-400" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-bold text-white">{totalGames}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Across {platformStats.length} platform{platformStats.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="text-[11px] text-zinc-400">
            {activePlaying.length} currently active in play
          </div>
        </div>

        {/* Metric 2: Achievements Completion Rate */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Achievement Completion</span>
            <Percent size={16} className="text-amber-400" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-bold text-white">{overallCompletionRate}%</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {totalAchievements} / {totalMaxAchievements} unlocked
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallCompletionRate}%` }}
              transition={{ duration: 0.6 }}
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
            />
          </div>
        </div>

        {/* Metric 3: Total Playtime */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Playtime Logged</span>
            <Clock size={16} className="text-purple-400" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-bold text-white">{totalHours}h</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              ~{(totalHours / 24).toFixed(1)} days cumulative
            </div>
          </div>
          <div className="text-[11px] text-purple-400 truncate">
            Longest played: {games[0]?.title || 'None'} ({games[0]?.hoursPlayed || 0}h)
          </div>
        </div>

        {/* Metric 4: 100% Completed Games */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>100% Perfect Games</span>
            <Trophy size={16} className="text-emerald-400" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-bold text-emerald-400">{perfectGames.length}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Steam Perfect & PS Platinum
            </div>
          </div>
          <div className="text-[11px] text-zinc-400">
            {completedGames.length} total titles finished
          </div>
        </div>
      </div>

      {/* Platform Breakdown (Using Platform Icons) */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Gamepad2 size={16} className="text-blue-400" />
          Platform Tracking Breakdown
        </h2>

        <div className="space-y-4">
          {platformStats.map(stat => (
            <div key={stat.platform} className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div
                    style={{ color: stat.config.color }}
                    className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700"
                  >
                    <PlatformIcon platform={stat.platform} size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-white">{stat.config.name}</span>
                    <span className="text-zinc-500 ml-2">({stat.count} games • {stat.hours}h)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-zinc-400 font-medium">
                  {stat.perfectCount > 0 && (
                    <div className="flex items-center gap-1 text-amber-300">
                      <PlatformCompletionBadge platform={stat.platform} size={15} />
                      <span className="text-[11px]">{stat.perfectCount} 100%</span>
                    </div>
                  )}
                  <span>{stat.achievements}/{stat.maxAchievements} ({stat.completionRate}%)</span>
                </div>
              </div>

              {/* Progress Bar for Platform */}
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.completionRate}%` }}
                  style={{ backgroundColor: stat.config.color }}
                  className="h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 100% Completed Games Showcase (Perfect Ribbon & Platinum Icons) */}
      {perfectGames.length > 0 && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Award size={16} className="text-amber-400" />
              100% Completion Showcase
            </h2>
            <span className="text-xs text-zinc-400">{perfectGames.length} Total Titles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {perfectGames.map(game => (
              <div
                key={game.id}
                className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center gap-3"
              >
                <img
                  src={game.coverImage}
                  alt={game.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform={game.platform} size={14} className="text-zinc-400" />
                    <h4 className="text-xs font-semibold text-white truncate">{game.title}</h4>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {game.achievementsUnlocked}/{game.achievementsTotal} Achievements (100%)
                  </div>
                  <div className="mt-1">
                    <PlatformCompletionBadge platform={game.platform} size={18} showLabel />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Library Status Breakdown & History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            Library Status Distribution
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700/40">
              <div className="text-xl font-bold text-blue-400">{activePlaying.length}</div>
              <div className="text-xs text-zinc-400 font-medium">🎮 Playing</div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700/40">
              <div className="text-xl font-bold text-amber-400">{backlogGames.length}</div>
              <div className="text-xs text-zinc-400 font-medium">⏳ Backlog</div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700/40">
              <div className="text-xl font-bold text-emerald-400">{completedGames.length}</div>
              <div className="text-xs text-zinc-400 font-medium">🏆 Completed</div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700/40">
              <div className="text-xl font-bold text-purple-400">{perfectGames.length}</div>
              <div className="text-xs text-zinc-400 font-medium">👑 100% Mastered</div>
            </div>
          </div>
        </div>

        {/* Activity History Log */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar size={16} className="text-blue-400" />
            Recent Tracking History
          </h2>

          <div className="divide-y divide-zinc-800/80">
            {games.slice(0, 5).map(g => (
              <div key={g.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded-md bg-zinc-800 text-zinc-400">
                    <PlatformIcon platform={g.platform} size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">{g.title}</h4>
                    <p className="text-[10px] text-zinc-400">
                      {g.hoursPlayed}h • {g.achievementsUnlocked}/{g.achievementsTotal} unlocks
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 capitalize">
                  {g.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
