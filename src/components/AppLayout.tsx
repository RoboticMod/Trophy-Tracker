import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Home,
  BarChart3,
  Settings,
  Search,
  Plus,
  CloudOff,
  RefreshCw,
  X,
  MoreHorizontal,
  ChevronLeft,
  Crosshair,
  Library,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameAddedDialog } from './GameAddedDialog';
import { GameMovedDialog } from './GameMovedDialog';
import { QuickAddModal, prefetchDialogs } from '../lib/lazyDialogs';
import { NotificationBell } from './NotificationBell';
import { UserGame } from '../types';
import { APP_NAME } from '../lib/constants';
import { isPerfect } from '../lib/completion';
import { VOLUME_PREF_KEY, adoptSoundVolume } from '../lib/sound';
import { useSync } from '../context/SyncContext';
import { relativeTime } from '../lib/format';
import {
  BACKLOG_COLLECTION_ID,
  BEATEN_COLLECTION_ID,
  PLAYING_COLLECTION_ID,
  collectionName,
  permanentOf,
} from '../lib/collections';
import { Button } from './ui';
import { LISTS_ICON, SHELF_ICONS } from './CollectionIcon';
import { cn } from '../lib/cn';
import { useMediaQuery } from '../lib/useMediaQuery';
import { Wordmark } from './Wordmark';
import { ProfileMenu } from './ProfileMenu';
import { EASE_OUT } from '../lib/motion';
import { PhoneHeaderContext } from '../lib/phoneHeader';
import { MainFillContext } from '../lib/mainFill';
import { PHONE_BAR_SLOTS, isShown, navRank, resolveNavOrder } from '../lib/navigation';

/**
 * How long a followed game is given to turn up on the current page before the
 * app decides this page is not where it went.
 *
 * Past the card exit animation, and this is the whole reason for the wait: a
 * game that has just been re-filed is still in the document for the 200ms its
 * old card spends fading out. Looking any sooner found that departing card,
 * concluded the game was already here, and stayed put — which is exactly the
 * case this is for.
 */
const FOLLOW_LOOKUP_MS = 300;

/**
 * Pages with a route but no tab, and the name the phone header gives them.
 * 100% is opened from Lists and from Home.
 */
const UNTABBED_TITLES: Record<string, string> = {
  '/achievements': '100%',
  '/settings': 'Settings',
  '/setup': 'Set up your library',
};

/**
 * Always a place to send someone, tab or not: 100% and Library are pages
 * whether or not they are tabs.
 */
const ALWAYS_REACHABLE = new Set(['/library', '/achievements']);

/**
 * The page a game can actually be seen on.
 *
 * A finished, in-progress or queued game has a shelf of its own and that is
 * where the eye should be sent; everything else falls back to Library, which
 * shows the lot. Not Home: Home is a summary and has no grid.
 */
const shelfFor = (game: UserGame): string => {
  if (isPerfect(game)) return '/achievements';
  switch (permanentOf(game.collections)) {
    case PLAYING_COLLECTION_ID:
      return '/playing';
    case BACKLOG_COLLECTION_ID:
      return '/backlog';
    // No page of its own; it is kept in Lists.
    case BEATEN_COLLECTION_ID:
      return '/collections';
    default:
      return '/library';
  }
};

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

/** The lit rule along the top edge of the current bottom-bar item. */
const ActiveRule: React.FC = () => (
  <span
    aria-hidden
    className="absolute inset-x-3.5 top-0 h-0.5 rounded-full bg-accent-800 shadow-[0_0_9px_-1px_var(--color-accent-700)]"
  />
);

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    sidebarConfig,
    isQuickAddOpen,
    setIsQuickAddOpen,
    games,
    collections,
    isOnline,
    pendingWrites,
    error,
    needsSetup,
    dismissError,
    loading,
    follow,
  } = useGame();

  // Nothing to go back to on the first screen of a fresh tab. History has no
  // public "can I" — the length is the closest thing, and it only ever
  // undercounts, which is the safe direction for greying a control out.
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

  const playingCount = games.filter((g) => g.collections?.includes(PLAYING_COLLECTION_ID)).length;
  const backlogCount = games.filter((g) => g.collections?.includes(BACKLOG_COLLECTION_ID)).length;

  const rawNavItems: NavItem[] = [
    { name: 'Home', short: 'Home', path: '/', icon: Home, enabled: true },
    {
      name: 'Library',
      short: 'Library',
      path: '/library',
      icon: Library,
      enabled: isShown(sidebarConfig, 'showLibrary'),
    },
    {
      name: collectionName(PLAYING_COLLECTION_ID, collections),
      short: 'Playing',
      path: '/playing',
      icon: SHELF_ICONS[PLAYING_COLLECTION_ID],
      badge: playingCount || undefined,
      badgeTone: 'accent',
      enabled: isShown(sidebarConfig, 'showCurrentlyPlaying'),
    },
    {
      name: 'Call of Duty',
      short: 'CoD',
      path: '/call-of-duty',
      icon: Crosshair,
      enabled: isShown(sidebarConfig, 'showCallOfDuty'),
    },
    {
      name: 'Search & Add',
      short: 'Search',
      path: '/search',
      icon: Search,
      enabled: isShown(sidebarConfig, 'showSearch'),
    },
    {
      name: collectionName(BACKLOG_COLLECTION_ID, collections),
      short: 'Backlog',
      path: '/backlog',
      icon: SHELF_ICONS[BACKLOG_COLLECTION_ID],
      badge: backlogCount || undefined,
      // Neutral, not gold: gold is what a finished game earns, and a queue of
      // games you have not started yet has earned nothing. This matches how the
      // backlog shelf is toned everywhere else in the app.
      badgeTone: 'neutral',
      enabled: isShown(sidebarConfig, 'showBacklog'),
    },
    {
      name: 'Lists',
      short: 'Lists',
      path: '/collections',
      icon: LISTS_ICON,
      enabled: isShown(sidebarConfig, 'showCollections'),
    },
    {
      name: 'Statistics',
      short: 'Stats',
      path: '/stats',
      icon: BarChart3,
      enabled: isShown(sidebarConfig, 'showStats'),
    },
  ];

  // A user-supplied label always wins over the built-in name.
  const navNames = sidebarConfig?.navNames;
  const named = (item: NavItem): NavItem => {
    const custom = navNames?.[item.path]?.trim();
    // The page was renamed Lists. A label that still reads "Collections" is
    // the old name carried along by the rename field, not a name anyone chose.
    if (item.path === '/collections' && custom?.toLowerCase() === 'collections') return item;
    return custom ? { ...item, name: custom, short: custom.split(' ')[0] } : item;
  };

  // One list for every width. A phone's bar is the first four of it and More
  // holds the rest, which is what the divider in Settings › Navigation says —
  // nothing is folded away on a phone any more, so that divider stays true.
  const navOrder = resolveNavOrder(sidebarConfig?.navOrder);
  const navItems = rawNavItems
    .map(named)
    .sort((a, b) => navRank(navOrder, a.path) - navRank(navOrder, b.path))
    .filter((item) => item.enabled);

  /**
   * Following a game onto the shelf it actually landed on.
   *
   * A game that is added — or re-filed by a status change — often belongs
   * somewhere other than the page you are reading: finish one while looking at
   * the playing shelf and its card is now on the 100% shelf instead. Rather
   * than restating every page's filters here to work that out, the app asks the
   * document whether the card turned up; if it did not, this is not where the
   * game went, and the page it did go to is opened. The card's own scroll then
   * brings it into view, and its celebration waits until it is.
   *
   * Read through a ref so the lookup sees the current library and route without
   * the effect re-running — and cancelling its own timer — on every render in
   * between.
   */
  const followContext = useRef({ games, navItems, pathname: location.pathname, navigate });
  followContext.current = { games, navItems, pathname: location.pathname, navigate };

  useEffect(() => {
    if (!follow) return;

    const timer = window.setTimeout(() => {
      const { games: library, navItems: nav, pathname, navigate: go } = followContext.current;
      if (document.querySelector(`[data-game-id="${CSS.escape(follow.gameId)}"]`)) return;

      const game = library.find((g) => g.id === follow.gameId);
      if (!game) return;

      // A shelf hidden in Settings is not somewhere to send anyone; Library
      // shows every game and is always a page, so it is where that falls back.
      const shelf = shelfFor(game);
      const destination =
        ALWAYS_REACHABLE.has(shelf) || nav.some((item) => item.path === shelf) ? shelf : '/library';
      if (destination !== pathname) go(destination);
    }, FOLLOW_LOOKUP_MS);

    return () => window.clearTimeout(timer);
  }, [follow]);

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

  /**
   * The page being looked at, by name, for the phone header — with its count
   * beside it where it has one: the shelves say how many games are on them in
   * the one place a phone can always see, rather than in a pill at the top of a
   * page that scrolls away.
   *
   * Read from the full named list rather than from `navItems`, which drops
   * hidden tabs — a hidden tab's page can still be opened (Backlog from Lists),
   * and a page you can open is a page whose name the header has to be able to
   * say. Pages that are never tabs take their name from UNTABBED_TITLES. A
   * custom label from Settings comes with it, since `named` has already been
   * applied.
   *
   * No mark beside it any more: the bottom bar already lights the tab you are
   * on, and a glyph ahead of a 17px title was a second way of saying it.
   */
  const currentNavItem = rawNavItems.map(named).find((item) => item.path === location.pathname);

  const pageTitle = currentNavItem?.name ?? UNTABBED_TITLES[location.pathname] ?? APP_NAME;

  /** A page's own control in the header, rendered there by the page. */
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);

  // Statistics puts its reorder toggle where Add would be: nothing is added
  // from a page of figures, and three controls crowded the title.
  const headerAddHidden = location.pathname === '/stats';

  // The mobile bar has room for four destinations. Everything past them lives
  // in the "More" sheet, so no enabled page is unreachable on a phone.
  const mobilePrimary = navItems.slice(0, PHONE_BAR_SLOTS);
  const mobileOverflow = navItems.slice(PHONE_BAR_SLOTS);
  const [moreOpen, setMoreOpen] = useState(false);
  const overflowActive =
    location.pathname === '/settings' ||
    mobileOverflow.some((item) => item.path === location.pathname);

  useEffect(() => setMoreOpen(false), [location.pathname]);

  // The add dialog, mounted on first use; the game windows warmed on idle.
  const [addMounted, setAddMounted] = useState(false);
  useEffect(() => {
    if (isQuickAddOpen) setAddMounted(true);
  }, [isQuickAddOpen]);
  useEffect(() => prefetchDialogs(), []);

  /** Where the bar has room for the lockup's name as well as its mark. */
  const wideBar = useMediaQuery('(min-width: 80rem)');

  /**
   * Every page opens at its top. The page scrolls inside <main>, not the
   * window, so the browser's own reset on navigation never reached it and a
   * tab opened wherever the last one had been left.
   *
   * A layout effect so it lands before any page's own effects — Settings
   * scrolling to the group a link asked for would otherwise be undone by it.
   */
  const mainRef = useRef<HTMLElement>(null);

  /** Pages holding main to the window's height; see mainFill. */
  const [fillClaims, setFillClaims] = useState(0);
  const claimFill = useCallback(() => {
    setFillClaims((n) => n + 1);
    return () => setFillClaims((n) => n - 1);
  }, []);

  /**
   * Where each history entry was left, by its key — so back returns to the
   * place you scrolled to, rather than the top of the page. A new entry (a
   * push or a replace) still opens at the top.
   */
  const navigationType = useNavigationType();
  const scrollPositions = useRef(new Map<string, number>());
  const currentKey = useRef(location.key);
  currentKey.current = location.key;

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    let frame = 0;
    const save = () => {
      frame = 0;
      scrollPositions.current.set(currentKey.current, main.scrollTop);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(save);
    };
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      main.removeEventListener('scroll', onScroll);
    };
  }, []);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const saved = navigationType === 'POP' ? scrollPositions.current.get(location.key) : undefined;
    if (saved === undefined) {
      main.scrollTo({ top: 0 });
      return;
    }

    // The page being returned to may still be mounting its grid, and a scroll
    // past the end of what exists is clamped short. Try again each frame until
    // it lands, the user scrolls themselves, or enough time has passed.
    const until = performance.now() + 600;
    let frame = 0;
    const restore = () => {
      main.scrollTop = saved;
      if (Math.abs(main.scrollTop - saved) > 1 && performance.now() < until) {
        frame = requestAnimationFrame(restore);
      }
    };
    restore();
    const stop = () => cancelAnimationFrame(frame);
    main.addEventListener('wheel', stop, { once: true, passive: true });
    main.addEventListener('touchstart', stop, { once: true, passive: true });
    return () => {
      stop();
      main.removeEventListener('wheel', stop);
      main.removeEventListener('touchstart', stop);
    };
  }, [location.key, navigationType]);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-gray-50 text-gray-900">
      {/* The lit ground every translucent surface in the app sits on. Fixed, so
          it stays put while the content scrolls over it. */}
      <div aria-hidden className="app-ambient" />

      {/* Desktop top bar ----------------------------------------------------
          64px, one row, from md up. The bar itself is full-bleed; what is on
          it sits in the same 1440 container as the page, so the lockup lines
          up with the first card rather than with the edge of the window.
          Destinations are marks alone below xl, except the one you are on,
          which keeps its label; at 1024-1279 seven labelled tabs, their
          badges and the controls on the right needed ~966 of ~976px, and one
          more pushed the row into a hidden sideways scroll. The lockup's
          name, the sync word and "Add game" wait for xl too.

          No backdrop blur: nothing scrolls under this bar (it is a flex
          sibling of <main>), so a blur cost a layer and changed nothing. */}
      <header className="relative z-20 hidden h-16 shrink-0 border-b border-gray-200 bg-gray-100/88 md:block">
        <div className="page-container flex h-full items-center gap-3 xl:gap-4.5">
          {/* The lockup is the way home, as it is on most sites. */}
          <NavLink
            to="/"
            aria-label={`${APP_NAME} home`}
            className="flex shrink-0 items-center rounded-md transition-opacity hover:opacity-80"
          >
            {/* Both award marks in a gold-lit well, the name beside them once
                the bar has the width for it. */}
            <Wordmark size="sm" markOnly={!wideBar} />
          </NavLink>

          <nav className="scroll-row flex min-w-0 flex-1 items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.name}
                  // Most tabs are a mark alone below xl; the name has to be
                  // somewhere a screen reader finds it.
                  aria-label={item.name}
                  // The full bar height is the hit area.
                  className={cn(
                    'relative flex h-16 shrink-0 items-center gap-2 px-1.5 text-90 font-bold transition-colors xl:px-3.25',
                    isActive ? 'text-accent-900' : 'text-gray-700 hover:text-gray-1000',
                  )}
                >
                  {/* A lit rule along the bottom edge of the tab — the same mark
                      a phone puts along the top edge of its bottom bar. */}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent-800 shadow-[0_0_9px_-1px_var(--color-accent-700)]"
                    />
                  )}

                  {Icon ? <Icon size={17} className="shrink-0" /> : item.art}
                  {/* The short label, not the full name: every destination plus
                      the brand and the actions have to share one row. The full
                      name stays as the tooltip. */}
                  <span
                    className={cn(
                      'whitespace-nowrap',
                      isActive ? 'inline' : 'hidden xl:inline',
                    )}
                  >
                    {item.short}
                  </span>

                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'inline-flex h-5 items-center rounded-full border px-1.75 text-75 font-bold tabular-nums',
                        item.badgeTone === 'accent'
                          ? 'border-accent-700/45 bg-accent-700/16 text-accent-900'
                          : item.badgeTone === 'trophy'
                            ? 'border-trophy-700/50 bg-trophy-700/16 text-trophy-900'
                            : 'border-gray-500/50 bg-gray-700/12 text-gray-700',
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            {/* The one sync control: the cloud, Steam and PlayStation, all at
                once. Everything also syncs on its own, so this is for when you
                want it now. A lit dot when all is well; the word joins it at
                xl. */}
            <button
              type="button"
              onClick={runSync}
              disabled={!isOnline || syncing}
              title={syncTitle}
              aria-label={syncTitle}
              className="flex h-11 items-center gap-2 rounded-control border border-gray-300 bg-black/25 px-3 text-75 font-bold text-gray-700 transition-colors hover:text-gray-1000 disabled:cursor-default lg:h-9"
            >
              {!isOnline ? (
                <CloudOff size={13} className="shrink-0 text-notice-900" />
              ) : syncing || pendingWrites > 0 ? (
                <RefreshCw
                  size={13}
                  className={cn('shrink-0 text-accent-900', syncing && 'animate-spin')}
                />
              ) : (
                <span className="h-2 w-2 shrink-0 rounded-full bg-positive-900 shadow-[0_0_8px_-1px_var(--color-positive-900)]" />
              )}
              <span className="hidden whitespace-nowrap xl:inline">
                {!isOnline
                  ? 'Offline'
                  : syncing
                    ? 'Syncing…'
                    : pendingWrites > 0
                      ? `${pendingWrites} pending`
                      : 'Synced'}
              </span>
            </button>

            <NotificationBell variant="bar" />

            <button
              type="button"
              onClick={() => setIsQuickAddOpen(true)}
              aria-label="Add game"
              className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-control bg-gradient-to-br from-accent-600 to-accent-500 px-3.5 text-90 font-bold whitespace-nowrap text-gray-1000 shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_16px_-6px_var(--color-accent-700)] transition-colors hover:from-accent-650 hover:to-accent-600 lg:h-9 lg:min-w-9"
            >
              <Plus size={16} className="shrink-0" />
              <span className="hidden xl:inline">Add game</span>
            </button>

            <ProfileMenu />
          </div>
        </div>
      </header>

      {/* Mobile header ------------------------------------------------------
          56px plus the safe area, fixed. Every control in it is a 44px target:
          the back chevron, the page's name, then sync and add. */}
      {/* Near-opaque rather than frosted: a backdrop blur over content that
          scrolls under it is recomputed on every scroll frame, and on a phone
          that was the single most expensive thing on the screen. */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-gray-200 bg-gray-100/96 pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex h-14 items-center justify-between gap-2 pl-1 pr-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* Screens here go two and three deep — a list, then a game. The
                platform back gesture exists but is not visible, and a control
                you can see is the one people reach for. Held open rather than
                shown conditionally, so the title never moves under a thumb. */}
            {/* Not on Home, which is where the bar's own first tab goes and
                has nowhere of its own to go back to. */}
            {location.pathname === '/' ? null : (
              <button
                type="button"
                aria-label="Go back"
                disabled={!canGoBack}
                onClick={() => navigate(-1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-800 transition-colors hover:bg-white/5 disabled:text-gray-500"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <h1
              className={cn(
                'min-w-0 truncate text-250 font-bold tracking-tight text-gray-1000',
                location.pathname === '/' && 'pl-3',
              )}
            >
              {pageTitle}
            </h1>

            {currentNavItem?.badge !== undefined &&
            (currentNavItem.badgeTone === 'accent' || currentNavItem.badgeTone === 'neutral') ? (
              <span
                className={cn(
                  'inline-flex h-5.5 shrink-0 items-center rounded-full border px-2.25 text-75 font-bold tabular-nums',
                  currentNavItem.badgeTone === 'accent'
                    ? 'border-accent-700/45 bg-accent-700/16 text-accent-900'
                    : 'border-gray-500/50 bg-gray-700/12 text-gray-700',
                )}
              >
                {currentNavItem.badge}
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <span ref={setHeaderSlot} className="contents" />

            <NotificationBell variant="phone" />

            <button
              type="button"
              onClick={runSync}
              disabled={!isOnline || syncing}
              title={syncTitle}
              aria-label={syncTitle}
              className="flex h-11 w-11 items-center justify-center rounded-md text-gray-800 transition-colors hover:bg-white/5"
            >
              {isOnline ? (
                <RefreshCw size={19} className={cn(syncing && 'animate-spin')} />
              ) : (
                <CloudOff size={19} className="text-notice-900" />
              )}
            </button>

            {headerAddHidden ? null : (
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                aria-label="Add game"
                className="flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br from-accent-600 to-accent-500 text-gray-1000 shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_0_14px_-5px_var(--color-accent-700)]"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content ------------------------------------------------------------ */}
      {/* min-h-0, not h-full: the top bar is a flex sibling now, so a main
          claiming the full viewport height would push its own scroll past the
          bottom of the window by exactly the height of the bar. */}
      {/* pt-20 below md is the fixed phone header's own height plus a little
          air. It used to be pt-32, which cleared the header twice over and
          started every page a third of a screen down. */}
      {/* From md the gutters belong to the container inside, not to main, so
          the page and the bar above it share one box and one left edge. */}
      <main ref={mainRef} data-fill={fillClaims > 0 ? '' : undefined} className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[calc(4.25rem+env(safe-area-inset-top))] md:px-0 md:pb-12 md:pt-8">
        <div className="md:page-container">
        {/* An account with nothing saved yet is not a failure, and saying so
            was alarming and untrue. A genuine network problem still gets
            today's wording; a first sign-in gets a way forward instead. */}
        {needsSetup && !error && location.pathname !== '/setup' ? (
          <div className="mx-auto mb-5 flex max-w-[1760px] flex-wrap items-center gap-3 rounded-md border border-accent-700/45 bg-accent-700/12 p-3 text-75 font-semibold text-accent-900">
            <span className="flex-1">Your library isn’t set up yet.</span>
            <Button variant="accent" size="s" onClick={() => navigate('/setup')}>
              Go to setup
            </Button>
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mx-auto mb-5 flex max-w-[1760px] items-start gap-3 rounded-md border border-notice-700/50 bg-notice-700/12 p-3 text-75 font-semibold text-notice-900"
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

        <PhoneHeaderContext.Provider value={headerSlot}>
          <MainFillContext.Provider value={claimFill}>
            <Outlet />
          </MainFillContext.Provider>
        </PhoneHeaderContext.Provider>
        </div>
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
              className="panel fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 space-y-1 rounded-lg bg-gray-100/95 p-2 md:hidden"
            >
              {mobileOverflow.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex h-11 items-center gap-3 rounded-md px-3 text-150 font-bold transition-colors',
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
                    'flex h-11 items-center gap-3 rounded-md px-3 text-150 font-bold transition-colors',
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

      {/* Mobile bottom bar: four destinations plus "More" --------------------
          60px plus the safe area. Each item is a full-height column, so the
          whole slot is the target, and the current one is marked by a lit
          rule along the top edge — the same mark the desktop bar draws along
          its bottom. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-gray-100/96 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-15 items-stretch justify-between px-1">
          {mobilePrimary.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.75 text-50 font-bold uppercase tracking-[0.06em] transition-colors',
                  isActive ? 'text-accent-900' : 'text-gray-600',
                )}
              >
                {isActive ? <ActiveRule /> : null}
                {Icon ? <Icon size={21} /> : item.art}
                <span>{item.short}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.75 text-50 font-bold uppercase tracking-[0.06em] transition-colors',
              moreOpen || overflowActive ? 'text-accent-900' : 'text-gray-600',
            )}
          >
            {overflowActive ? <ActiveRule /> : null}
            <MoreHorizontal size={21} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Mounted the first time it is asked for, then kept — it holds the
          draft of a game you had started adding. */}
      {addMounted ? <QuickAddModal /> : null}

      {/* What the app says once a game has landed, and the offer to go and see
          it. Mounted here rather than in the add dialog, because a game can be
          added from more than one place and the announcement outlives the form
          that produced it. */}
      <GameAddedDialog />
      <GameMovedDialog />

    </div>
  );
};
