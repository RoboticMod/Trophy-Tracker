import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Library,
  BarChart3,
  Settings,
  Search,
  Plus,
  FolderKanban,
  Play,
  Gamepad2,
  CloudOff,
  Cloud,
  RefreshCw,
  X,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { QuickAddModal } from './QuickAddModal';
import { APP_NAME } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { Button } from './ui';
import { TrophyPair } from './TrophyBadge';
import { cn } from '../lib/cn';

interface NavItem {
  name: string;
  /** Short form for the mobile bar, which has no room for a full label. */
  short: string;
  path: string;
  /** Either a lucide component or ready-made artwork. */
  icon: React.ElementType | null;
  art?: React.ReactNode;
  badge?: number;
  badgeTone?: 'accent' | 'trophy';
  enabled: boolean;
}

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const {
    sidebarConfig,
    setIsQuickAddOpen,
    games,
    profile,
    isOnline,
    pendingWrites,
    error,
    dismissError,
    loading,
  } = useGame();

  const playingCount = games.filter((g) => g.status === 'playing').length;
  const backlogCount = games.filter((g) => g.status === 'backlog').length;
  const perfectCount = games.filter(
    (g) =>
      g.status === 'mastered' ||
      (g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal),
  ).length;

  const rawNavItems: NavItem[] = [
    { name: 'Dashboard', short: 'Library', path: '/', icon: Library, enabled: true },
    {
      name: statusLabel('playing', profile),
      short: 'Playing',
      path: '/playing',
      icon: Play,
      badge: playingCount || undefined,
      badgeTone: 'accent',
      enabled: sidebarConfig?.showCurrentlyPlaying ?? true,
    },
    {
      name: 'Achievements & Trophies',
      short: 'Trophies',
      path: '/achievements',
      icon: null,
      art: <TrophyPair size={15} />,
      badge: perfectCount || undefined,
      badgeTone: 'trophy',
      enabled: sidebarConfig?.showAchievements ?? true,
    },
    {
      name: 'Search & Add',
      short: 'Search',
      path: '/search',
      icon: Search,
      enabled: sidebarConfig?.showSearch ?? true,
    },
    {
      name: statusLabel('backlog', profile),
      short: 'Backlog',
      path: '/backlog',
      icon: Gamepad2,
      badge: backlogCount || undefined,
      badgeTone: 'trophy',
      enabled: sidebarConfig?.showBacklog ?? true,
    },
    {
      name: 'Collections',
      short: 'Lists',
      path: '/collections',
      icon: FolderKanban,
      enabled: sidebarConfig?.showCollections ?? true,
    },
    {
      name: 'Statistics',
      short: 'Stats',
      path: '/stats',
      icon: BarChart3,
      enabled: sidebarConfig?.showStats ?? true,
    },
  ];

  // A user-supplied label always wins over the built-in name.
  const navNames = sidebarConfig?.navNames;
  const named = (item: NavItem): NavItem => {
    const custom = navNames?.[item.path]?.trim();
    return custom ? { ...item, name: custom, short: custom.split(' ')[0] } : item;
  };

  const navOrder = sidebarConfig?.navOrder;
  const navItems = rawNavItems.map(named)
    .sort((a, b) => {
      if (!Array.isArray(navOrder)) return 0;
      const idxA = navOrder.indexOf(a.path);
      const idxB = navOrder.indexOf(b.path);
      return (idxA === -1 ? navOrder.length : idxA) - (idxB === -1 ? navOrder.length : idxB);
    })
    .filter((item) => item.enabled);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-gray-50 text-gray-900">
      {/* Sidebar: icon rail from md, full labels from lg ------------------- */}
      <aside className="hidden w-16 shrink-0 flex-col justify-between border-r border-gray-200 bg-gray-100 p-2 md:flex lg:w-64 lg:p-4 2xl:w-72">
        <div className="space-y-5">
          <div className="flex items-center gap-3 px-1 pt-1 lg:px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-200">
              <TrophyPair size={17} />
            </div>
            <div className="hidden min-w-0 lg:block">
              <h1 className="truncate text-200 font-bold tracking-tight text-gray-1000">
                {APP_NAME}
              </h1>
              <p className="truncate text-50 text-gray-700">Steam & PlayStation progress</p>
            </div>
          </div>

          <Button
            variant="accent"
            size="l"
            onClick={() => setIsQuickAddOpen(true)}
            className="w-full px-0 lg:px-5"
            aria-label="Add game"
          >
            <Plus size={16} />
            <span className="hidden lg:inline">Add game</span>
          </Button>

          <nav className="space-y-1">
            <div className="hidden px-3 pb-1.5 text-50 font-bold uppercase tracking-wide text-gray-600 lg:block">
              Navigation
            </div>

            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.name}
                  className={cn(
                    'flex h-9 items-center justify-between gap-2.5 rounded-sm px-3 text-75 font-medium transition-colors',
                    isActive
                      ? 'bg-accent-100 font-semibold text-accent-900'
                      : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {Icon ? <Icon size={16} className="shrink-0" /> : item.art}
                    <span className="hidden truncate lg:inline">{item.name}</span>
                  </span>

                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'hidden rounded-full px-2 py-0.5 text-50 font-bold lg:inline',
                        item.badgeTone === 'accent'
                          ? 'bg-accent-200 text-accent-900'
                          : 'bg-trophy-100 text-trophy-900',
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 border-t border-gray-200 pt-3">
          <NavLink
            to="/settings"
            title="Settings and account"
            className={({ isActive }) =>
              cn(
                'flex h-9 items-center justify-between gap-2.5 rounded-sm px-3 text-75 font-medium transition-colors',
                isActive
                  ? 'bg-accent-100 font-semibold text-accent-900'
                  : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900',
              )
            }
          >
            <span className="flex min-w-0 items-center gap-2.5">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-5 w-5 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-50 font-bold text-gray-700">
                  {profile.username?.charAt(0)?.toUpperCase() || 'P'}
                </span>
              )}
              <span className="hidden truncate lg:inline">{profile.username || 'Account'}</span>
            </span>
            <Settings size={15} className="hidden shrink-0 text-gray-600 lg:block" />
          </NavLink>

          <div
            title={
              !isOnline
                ? 'Offline — changes are queued'
                : pendingWrites > 0
                  ? `${pendingWrites} change(s) waiting to sync`
                  : 'Synced with Supabase'
            }
            className="flex h-9 items-center gap-2 rounded-sm bg-gray-75 px-3 text-50 text-gray-700"
          >
            {!isOnline ? (
              <CloudOff size={13} className="shrink-0 text-notice-900" />
            ) : loading || pendingWrites > 0 ? (
              <RefreshCw size={13} className="shrink-0 animate-spin text-accent-900" />
            ) : (
              <Cloud size={13} className="shrink-0 text-positive-900" />
            )}
            <span className="hidden truncate lg:inline">
              {!isOnline
                ? 'Offline'
                : pendingWrites > 0
                  ? `${pendingWrites} pending`
                  : loading
                    ? 'Loading…'
                    : 'Synced'}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile header ------------------------------------------------------ */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-gray-100/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-gray-200">
            <TrophyPair size={15} />
          </div>
          <span className="text-100 font-bold text-gray-1000">{APP_NAME}</span>
        </div>
        <Button variant="accent" size="s" onClick={() => setIsQuickAddOpen(true)}>
          <Plus size={15} />
          <span>Add</span>
        </Button>
      </header>

      {/* Content ------------------------------------------------------------ */}
      <main className="h-full flex-1 overflow-y-auto px-4 pb-24 pt-16 sm:px-6 md:py-8 2xl:px-10">
        {error ? (
          <div
            role="alert"
            className="mx-auto mb-5 flex max-w-[1760px] items-start gap-3 rounded-md border border-notice-700 bg-notice-100 p-3 text-75 text-notice-900"
          >
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={dismissError}
              aria-label="Dismiss message"
              className="rounded-sm p-0.5 hover:bg-notice-700/20"
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        <Outlet />
      </main>

      {/* Mobile bottom bar: four destinations plus settings ------------------ */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-gray-200 bg-gray-100/95 px-2 py-2 backdrop-blur-xl md:hidden">
        {navItems.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-sm px-2.5 py-1 transition-colors',
                isActive ? 'font-bold text-accent-900' : 'text-gray-700',
              )}
            >
              {Icon ? <Icon size={18} /> : item.art}
              <span className="text-50">{item.short}</span>
            </NavLink>
          );
        })}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 rounded-sm px-2.5 py-1 transition-colors',
              isActive ? 'font-bold text-accent-900' : 'text-gray-700',
            )
          }
        >
          <Settings size={18} />
          <span className="text-50">More</span>
        </NavLink>
      </nav>

      <QuickAddModal />
    </div>
  );
};
