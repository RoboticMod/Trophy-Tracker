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
import { statusLabel } from '../lib/status';
import { Button } from './ui';
import { TrophyPair } from './TrophyBadge';
import { Wordmark } from './Wordmark';
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
  badgeTone?: 'accent' | 'trophy' | 'neutral';
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
      // Neutral, not gold: gold is what a finished game earns, and a queue of
      // games you have not started yet has earned nothing. This matches how the
      // backlog status is toned everywhere else in the app.
      badgeTone: 'neutral',
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

  const syncTitle = !isOnline
    ? 'Offline — changes are queued'
    : pendingWrites > 0
      ? `${pendingWrites} change(s) waiting to sync`
      : 'Synced with Supabase';

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-gray-50 text-gray-900">
      {/* The lit ground every translucent surface in the app sits on. Fixed, so
          it stays put while the content scrolls over it. */}
      <div aria-hidden className="app-ambient" />

      {/* Desktop top bar ----------------------------------------------------
          One horizontal row from md up. Labels appear at lg; below that the
          destinations stay as icons so seven of them still fit beside the
          brand and the actions. */}
      <header className="relative z-20 hidden shrink-0 items-center gap-3 border-b border-gray-200 bg-gray-100/70 px-4 backdrop-blur-xl md:flex 2xl:px-8">
        <Wordmark className="shrink-0 py-2.5" />

        <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.name}
                className={cn(
                  'relative flex h-14 shrink-0 items-center gap-2 px-3 text-75 font-semibold transition-colors',
                  isActive ? 'text-accent-900' : 'text-gray-700 hover:text-gray-1000',
                )}
              >
                {/* A lit rule along the bottom edge of the tab, the way a top
                    bar marks its current section — the vertical bar the rail
                    used has no edge to sit on here. */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent-800 shadow-[0_0_9px_-1px_var(--color-accent-700)]"
                  />
                )}

                {Icon ? <Icon size={16} className="shrink-0" /> : item.art}
                {/* The short label, not the full name: seven destinations plus
                    the brand and the actions have to share one row, and
                    "Achievements & Trophies" alone would push two of them off
                    the end of it. The full name stays as the tooltip. */}
                <span className="hidden truncate lg:inline">{item.short}</span>

                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'rounded-full border px-1.5 py-0.5 text-50 font-bold tabular-nums',
                      item.badgeTone === 'accent'
                        ? 'border-accent-700/45 bg-accent-700/16 text-accent-900'
                        : item.badgeTone === 'trophy'
                          ? 'border-trophy-700/50 bg-trophy-700/16 text-trophy-900'
                          : 'border-gray-500/40 bg-gray-700/12 text-gray-700',
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <span
            title={syncTitle}
            className="panel-inset hidden h-8 items-center gap-2 rounded-sm px-2.5 text-50 font-semibold text-gray-700 xl:flex"
          >
            {!isOnline ? (
              <CloudOff size={13} className="shrink-0 text-notice-900" />
            ) : loading || pendingWrites > 0 ? (
              <RefreshCw size={13} className="shrink-0 animate-spin text-accent-900" />
            ) : (
              <Cloud
                size={13}
                className="shrink-0 text-positive-900 drop-shadow-[0_0_5px_currentColor]"
              />
            )}
            <span className="truncate">
              {!isOnline
                ? 'Offline'
                : pendingWrites > 0
                  ? `${pendingWrites} pending`
                  : loading
                    ? 'Loading…'
                    : 'Synced'}
            </span>
          </span>

          <Button variant="accent" onClick={() => setIsQuickAddOpen(true)} aria-label="Add game">
            <Plus size={16} />
            <span className="hidden lg:inline">Add game</span>
          </Button>

          <NavLink
            to="/settings"
            title="Settings and account"
            className={({ isActive }) =>
              cn(
                'flex h-8 items-center gap-2 rounded-sm border px-2 text-75 font-semibold transition-colors',
                isActive
                  ? 'border-accent-700/45 bg-accent-700/12 text-accent-900'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-1000',
              )
            }
          >
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
            <span className="hidden max-w-28 truncate 2xl:inline">
              {profile.username || 'Account'}
            </span>
            <Settings size={14} className="hidden shrink-0 text-gray-600 lg:block" />
          </NavLink>
        </div>
      </header>

      {/* Mobile header ------------------------------------------------------ */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-gray-100/85 px-4 py-3 backdrop-blur-xl md:hidden">
        <Wordmark size="sm" />
        <Button variant="accent" size="s" onClick={() => setIsQuickAddOpen(true)}>
          <Plus size={15} />
          <span>Add</span>
        </Button>
      </header>

      {/* Content ------------------------------------------------------------ */}
      {/* min-h-0, not h-full: the top bar is a flex sibling now, so a main
          claiming the full viewport height would push its own scroll past the
          bottom of the window by exactly the height of the bar. */}
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-16 sm:px-6 md:py-8 2xl:px-10">
        {error ? (
          <div
            role="alert"
            className="mx-auto mb-5 flex max-w-[1760px] items-start gap-3 rounded-md border border-notice-700/50 bg-notice-700/12 p-3 text-75 font-semibold text-notice-900 backdrop-blur-sm"
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
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-gray-200 bg-gray-100/85 px-2 py-2 backdrop-blur-xl md:hidden">
        {navItems.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-sm px-2.5 py-1 text-50 font-bold uppercase tracking-wide transition-colors',
                isActive ? 'text-accent-900' : 'text-gray-600',
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
