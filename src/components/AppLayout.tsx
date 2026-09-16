import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
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
  MoreHorizontal,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { QuickAddModal } from './QuickAddModal';
import { DEFAULT_START_PATH } from '../lib/constants';
import { isPerfect } from '../lib/completion';
import { VOLUME_PREF_KEY, adoptSoundVolume } from '../lib/sound';
import { useSync } from '../context/SyncContext';
import { relativeTime } from '../lib/format';
import { statusLabel } from '../lib/status';
import { Button } from './ui';
import { TrophyPair } from './TrophyBadge';
import { Wordmark } from './Wordmark';
import { cn } from '../lib/cn';
import { EASE_OUT } from '../lib/motion';

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
  const navigate = useNavigate();
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
  const perfectCount = games.filter(isPerfect).length;

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

  /**
   * The destination the app opens on.
   *
   * Once per mount, and only from the root: the start page is where a session
   * begins, not a place you are sent back to. Without the ref, clicking Library
   * would bounce straight off it again. Waits for the profile to arrive so a
   * saved choice is not overtaken by the default on a cold load, and falls back
   * to Library when the chosen destination has since been hidden.
   */
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current || loading) return;
    redirected.current = true;

    if (location.pathname !== '/') return;
    const start = sidebarConfig?.startPath ?? DEFAULT_START_PATH;
    if (start === '/' || !navItems.some((item) => item.path === start)) return;

    navigate(start, { replace: true });
  });

  /**
   * The completion-sound level saved on the profile, for a device that has none
   * of its own — a new browser, or one that clears site data when it closes.
   *
   * Applied here rather than in Settings: a level that only takes effect once
   * you happen to open Settings is no use to the celebration that fires before
   * you ever go there.
   */
  useEffect(() => {
    if (loading) return;
    adoptSoundVolume(sidebarConfig?.prefs?.[VOLUME_PREF_KEY]);
  }, [loading, sidebarConfig]);

  const sync = useSync();
  const syncing = sync.running || loading;

  const syncTitle = !isOnline
    ? 'Offline — changes are queued'
    : syncing
      ? 'Syncing…'
      : `${pendingWrites > 0 ? `${pendingWrites} change(s) waiting · ` : ''}Sync everything now${
          sync.lastRunAt ? ` — last synced ${relativeTime(sync.lastRunAt)}` : ''
        }`;

  const runSync = () => {
    if (!syncing && isOnline) void sync.syncEverything();
  };

  // The mobile bar has room for four destinations. Everything past them lives
  // in the "More" sheet, so no enabled page is unreachable on a phone.
  const mobilePrimary = navItems.slice(0, 4);
  const mobileOverflow = navItems.slice(4);
  const [moreOpen, setMoreOpen] = useState(false);
  const overflowActive =
    location.pathname === '/settings' ||
    mobileOverflow.some((item) => item.path === location.pathname);

  useEffect(() => setMoreOpen(false), [location.pathname]);

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
          {/* The one sync control: the cloud, Steam and PlayStation, all at
              once. Everything also syncs on its own, so this is for when you
              want it now. */}
          <button
            type="button"
            onClick={runSync}
            disabled={!isOnline || syncing}
            title={syncTitle}
            aria-label={syncTitle}
            className="panel-inset flex h-8 items-center gap-2 rounded-sm px-2.5 text-50 font-semibold text-gray-700 transition-colors hover:text-gray-1000 disabled:cursor-default"
          >
            {!isOnline ? (
              <CloudOff size={13} className="shrink-0 text-notice-900" />
            ) : syncing || pendingWrites > 0 ? (
              <RefreshCw
                size={13}
                className={cn('shrink-0 text-accent-900', syncing && 'animate-spin')}
              />
            ) : (
              <Cloud
                size={13}
                className="shrink-0 text-positive-900 drop-shadow-[0_0_5px_currentColor]"
              />
            )}
            <span className="hidden truncate xl:inline">
              {!isOnline
                ? 'Offline'
                : syncing
                  ? 'Syncing…'
                  : pendingWrites > 0
                    ? `${pendingWrites} pending`
                    : 'Synced'}
            </span>
          </button>

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
        <div className="flex items-center gap-2">
          <Button
            buttonStyle="outline"
            size="s"
            iconOnly
            onClick={runSync}
            disabled={!isOnline || syncing}
            title={syncTitle}
            aria-label={syncTitle}
          >
            {isOnline ? (
              <RefreshCw size={15} className={cn(syncing && 'animate-spin')} />
            ) : (
              <CloudOff size={15} className="text-notice-900" />
            )}
          </Button>
          <Button variant="accent" size="s" onClick={() => setIsQuickAddOpen(true)}>
            <Plus size={15} />
            <span>Add</span>
          </Button>
        </div>
      </header>

      {/* Content ------------------------------------------------------------ */}
      {/* min-h-0, not h-full: the top bar is a flex sibling now, so a main
          claiming the full viewport height would push its own scroll past the
          bottom of the window by exactly the height of the bar. */}
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-32 sm:px-6 md:py-8 2xl:px-10">
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

      {/* Mobile "More" sheet: the destinations the bar has no room for ------ */}
      <AnimatePresence>
        {moreOpen ? (
          <>
            <motion.button
              key="more-scrim"
              type="button"
              aria-label="Close menu"
              onClick={() => setMoreOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
            />
            <motion.nav
              key="more-sheet"
              aria-label="More destinations"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="panel fixed inset-x-3 bottom-20 z-40 space-y-1 rounded-lg bg-gray-100/95 p-2 md:hidden"
            >
              {mobileOverflow.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex h-11 items-center gap-3 rounded-md px-3 text-100 font-semibold transition-colors',
                      isActive
                        ? 'bg-accent-700/16 text-accent-900'
                        : 'text-gray-800 hover:bg-white/5',
                    )}
                  >
                    <span className="flex w-5 justify-center">
                      {Icon ? <Icon size={18} /> : item.art}
                    </span>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge !== undefined ? (
                      <span className="text-75 font-bold tabular-nums text-gray-600">
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  cn(
                    'flex h-11 items-center gap-3 rounded-md px-3 text-100 font-semibold transition-colors',
                    mobileOverflow.length > 0 && 'border-t border-gray-200',
                    isActive ? 'bg-accent-700/16 text-accent-900' : 'text-gray-800 hover:bg-white/5',
                  )
                }
              >
                <span className="flex w-5 justify-center">
                  <Settings size={18} />
                </span>
                <span className="flex-1">Settings</span>
              </NavLink>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>

      {/* Mobile bottom bar: four destinations plus "More" -------------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-gray-200 bg-gray-100/85 px-2 py-2 backdrop-blur-xl md:hidden">
        {mobilePrimary.map((item) => {
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
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          className={cn(
            'flex flex-col items-center gap-0.5 rounded-sm px-2.5 py-1 text-50 font-bold uppercase tracking-wide transition-colors',
            moreOpen || overflowActive ? 'text-accent-900' : 'text-gray-600',
          )}
        >
          <MoreHorizontal size={18} />
          <span className="text-50">More</span>
        </button>
      </nav>

      <QuickAddModal />
    </div>
  );
};
