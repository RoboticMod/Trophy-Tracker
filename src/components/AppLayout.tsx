import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Gamepad2,
  Library,
  BarChart3,
  Settings,
  Search,
  Plus,
  FolderKanban,
  Play,
  Trophy,
  Cloud,
  Layers
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { QuickAddModal } from './QuickAddModal';
import { PLATFORMS } from '../lib/constants';
import { PlatformIcon } from './PlatformIcon';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { sidebarConfig, setIsQuickAddOpen, supabaseConnected, games, profile } = useGame();

  const playingCount = games.filter(g => g.status === 'playing').length;
  const backlogCount = games.filter(g => g.status === 'backlog').length;
  const perfectGamesCount = games.filter(
    g => g.status === 'mastered' || (g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal)
  ).length;

  // Raw Navigation Items
  const rawNavItems = [
    { name: 'Dashboard', path: '/', icon: Library, enabled: true },
    {
      name: 'Currently Playing',
      path: '/playing',
      icon: Play,
      badge: playingCount > 0 ? playingCount : undefined,
      badgeType: 'blue' as const,
      enabled: sidebarConfig?.showCurrentlyPlaying ?? true
    },
    {
      name: 'All Achievements & Trophies',
      path: '/achievements',
      icon: Trophy,
      badge: perfectGamesCount > 0 ? perfectGamesCount : undefined,
      badgeType: 'amber' as const,
      enabled: sidebarConfig?.showAchievements ?? true
    },
    {
      name: 'Search & Add',
      path: '/search',
      icon: Search,
      enabled: sidebarConfig?.showSearch ?? true
    },
    {
      name: 'My Backlog',
      path: '/backlog',
      icon: Gamepad2,
      badge: backlogCount > 0 ? backlogCount : undefined,
      badgeType: 'amber' as const,
      enabled: sidebarConfig?.showBacklog ?? true
    },
    {
      name: 'Collections',
      path: '/collections',
      icon: FolderKanban,
      enabled: sidebarConfig?.showCollections ?? true
    },
    {
      name: 'Statistics',
      path: '/stats',
      icon: BarChart3,
      enabled: sidebarConfig?.showStats ?? true
    },
  ];

  // Reorder navigation based on user's customizable navOrder
  const navOrder = sidebarConfig?.navOrder;
  const sortedNavItems = [...rawNavItems].sort((a, b) => {
    if (!navOrder || !Array.isArray(navOrder)) return 0;
    const idxA = navOrder.indexOf(a.path);
    const idxB = navOrder.indexOf(b.path);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const navItems = sortedNavItems.filter(item => item.enabled);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#18181b] text-zinc-100 font-sans">
      {/* Desktop Adobe Spectrum-inspired Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-[#27272a] bg-[#1e1e24] p-4 justify-between">
        <div className="space-y-5">
          {/* Adobe Spectrum Header */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Layers size={19} />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white">
                  GameTracker
                </h1>
                <p className="text-[11px] text-zinc-400">Video Game Library</p>
              </div>
            </div>
          </div>

          {/* Spectrum Emphasized Action Button */}
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="w-full py-2 px-3 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={16} />
            <span>Add Game</span>
          </button>

          {/* Navigation Section */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Navigation
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className="block"
                  >
                    <div
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600/15 text-blue-400 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={16} className={isActive ? 'text-blue-400' : 'text-zinc-400'} />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            item.badgeType === 'blue'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer Area: Settings Link + Platform Sync Info */}
        <div className="space-y-3 pt-3 border-t border-[#27272a]">
          {/* Settings Link (Account settings located inside Settings page) */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`
            }
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.username}
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-zinc-700 flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {profile.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="truncate">{profile.username || 'Settings & Account'}</span>
            </div>
            <Settings size={15} className="text-zinc-500 flex-shrink-0" />
          </NavLink>

          {/* Sync & Platform Status */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-[#27272a]">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Cloud size={13} className={supabaseConnected ? 'text-emerald-400' : 'text-zinc-500'} />
                <span>{supabaseConnected ? 'Cloud Synced' : 'Local Storage'}</span>
              </span>
              <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Layers size={17} />
          </div>
          <span className="font-bold text-sm text-white">GameTracker</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white shadow-sm flex items-center gap-1.5 text-xs font-semibold"
          >
            <Plus size={15} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Main Content View */}
      <main className="flex-1 h-full overflow-y-auto pt-16 pb-20 md:py-8 px-4 sm:px-8">
        <Outlet />
      </main>

      {/* Mobile Thumb-Friendly Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 px-2 py-2 flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
                isActive ? 'text-blue-400 font-bold' : 'text-zinc-400'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] mt-0.5">{item.name.split(' ')[0]}</span>
            </NavLink>
          );
        })}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
              isActive ? 'text-blue-400 font-bold' : 'text-zinc-400'
            }`
          }
        >
          <Settings size={18} />
          <span className="text-[10px] mt-0.5">Settings</span>
        </NavLink>
      </nav>

      {/* Quick Add Modal */}
      <QuickAddModal />
    </div>
  );
};
