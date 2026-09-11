import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { QuickAddModal } from './QuickAddModal';
import { CommandPalette } from './CommandPalette';
import { BrandMark } from './TrophyBadge';
import {
  NAV_ICONS,
  CloseIcon,
  CloudOffIcon,
  MoreHorizontalIcon,
  PlusIcon,
  PosterCardsIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  WideCardsIcon,
} from './icons';
import {
  NAV_GROUP_LABEL,
  NavDestination,
  navLabel,
  navShortLabel,
  orderedNavDestinations,
} from '../lib/navigation';
import { Button, CountPill, SyncPill } from './ui';
import { cn } from '../lib/cn';

/** Destinations the mobile tab bar shows; the rest live behind "More". */
const TAB_COUNT = 4;

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    games,
    profile,
    sidebarConfig,
    ui,
    setCardLayout,
    setIsQuickAddOpen,
    isOnline,
    pendingWrites,
    error,
    dismissError,
    loading,
  } = useGame();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const destinations = orderedNavDestinations(sidebarConfig);
  const tabs = destinations.slice(0, TAB_COUNT);
  const overflow = destinations.slice(TAB_COUNT);

  const playingCount = games.filter((g) => g.status === 'playing').length;
  const backlogCount = games.filter((g) => g.status === 'backlog').length;
  const perfectCount = games.filter(
    (g) =>
      g.status === 'mastered' ||
      (g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal),
  ).length;

  const COUNTS: Record<string, { value: number; color: string; background: string } | undefined> = {
    '/playing': {
      value: playingCount,
      color: 'var(--tt-accent, #45c8ea)',
      background: 'var(--tt-accent-soft, #12313c)',
    },
    '/achievements': {
      value: perfectCount,
      color: 'var(--tt-gold-hi, #ffd36b)',
      background: 'var(--color-gold-wash, #2a2013)',
    },
    '/backlog': { value: backlogCount, color: '#d98b3a', background: '#2e2114' },
  };

  // Cmd/Ctrl+K anywhere; Escape closes whichever overlay is open. Registered on
  // the window so it works with focus anywhere, including inside a card.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // A route change closes every overlay, so navigating from the palette or the
  // More sheet never leaves one of them hanging over the new page.
  useEffect(() => {
    setPaletteOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  const avatarInitial = (profile.username || 'P').trim().charAt(0).toUpperCase() || 'P';
  const settingsActive = location.pathname === '/settings';

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* Sidebar — desktop only ------------------------------------------- */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col justify-between gap-5 bg-bg-2 px-3.5 py-5 shadow-[inset_-1px_0_0_var(--tt-line)] lg:flex">
        <div className="flex min-h-0 flex-col gap-[18px]">
          <div className="flex items-center gap-[11px] px-1.5 py-0.5">
            <BrandMark size={17} />
            <span className="min-w-0">
              <span className="block truncate font-display text-[15px] font-bold tracking-[-0.01em] text-ink">
                {ui.appName}
              </span>
              <span className="block font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                Steam &middot; PS5
              </span>
            </span>
          </div>

          <Button variant="accent" size="xl" className="w-full" onClick={() => setIsQuickAddOpen(true)}>
            <PlusIcon size={16} />
            Add game
          </Button>

          <nav className="flex min-h-0 flex-col gap-[3px] overflow-y-auto">
            {destinations.map((destination, index) => {
              // The catalog and the metrics are a different kind of destination
              // from the shelves, so each group announces itself the first time
              // it appears — which survives the user reordering the list.
              const firstOfGroup =
                destinations.findIndex((d) => d.group === destination.group) === index;

              return (
                <React.Fragment key={destination.path}>
                  {firstOfGroup ? (
                    <NavGroupLabel className={index > 0 ? 'pt-3.5' : undefined}>
                      {NAV_GROUP_LABEL[destination.group]}
                    </NavGroupLabel>
                  ) : null}
                  <SidebarRow
                    destination={destination}
                    label={navLabel(destination, sidebarConfig)}
                    active={location.pathname === destination.path}
                    count={COUNTS[destination.path]}
                  />
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <NavLink
            to="/settings"
            style={{
              background: settingsActive ? 'var(--tt-accent-soft, #12313c)' : 'transparent',
              boxShadow: settingsActive ? 'inset 2px 0 0 var(--tt-accent, #45c8ea)' : 'none',
            }}
            className="flex h-[46px] items-center gap-2.5 rounded-control px-2.5 text-left transition-colors duration-100 ease-tt hover:bg-surface-2"
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 font-display text-[12px] font-bold text-muted">
                {avatarInitial}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span
                style={{ color: settingsActive ? 'var(--tt-accent-ink, #a9ecfb)' : '#b8ae9f' }}
                className="block truncate text-[13px] font-semibold"
              >
                {profile.username || 'Account'}
              </span>
              <span className="block text-[11px] text-subtle">Profile &amp; settings</span>
            </span>
            <SettingsIcon size={15} color="#9a9082" className="shrink-0" />
          </NavLink>

          <SyncStatus isOnline={isOnline} pendingWrites={pendingWrites} loading={loading} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar --------------------------------------------------------- */}
        <header className="sticky top-0 z-40 flex h-15 items-center gap-2.5 bg-[rgb(16_14_12_/_.92)] px-[clamp(14px,2.4vw,32px)] shadow-[inset_0_-1px_0_var(--tt-line)] backdrop-blur-[12px] lg:h-[68px]">
          <span className="lg:hidden">
            <BrandMark size={16} />
          </span>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cn(
              'flex h-[38px] min-w-0 max-w-[520px] flex-1 cursor-pointer items-center gap-2.5',
              'rounded-control border-0 bg-surface px-3 text-left hairline',
              'transition-shadow duration-100 ease-tt hover:shadow-[inset_0_0_0_1px_var(--tt-line-2)]',
            )}
          >
            <SearchIcon size={15} color="#9a9082" className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[13px] text-subtle">
              Jump to a game, view or action
            </span>
            <kbd className="hidden shrink-0 items-center rounded-control bg-surface-3 px-1.5 py-0.5 font-display text-[11px] font-semibold not-italic text-muted hairline-2 lg:inline-flex">
              &#8984;K
            </kbd>
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-0.5 rounded-control bg-surface p-[3px] hairline min-[620px]:flex">
              <LayoutToggle
                label="Wide cards"
                active={ui.cardLayout === 'wide'}
                onClick={() => setCardLayout('wide')}
              >
                <WideCardsIcon size={15} />
              </LayoutToggle>
              <LayoutToggle
                label="Poster cards"
                active={ui.cardLayout === 'poster'}
                onClick={() => setCardLayout('poster')}
              >
                <PosterCardsIcon size={15} />
              </LayoutToggle>
            </div>

            <Button variant="accent" size="l" onClick={() => setIsQuickAddOpen(true)} aria-label="Add game">
              <PlusIcon size={16} />
              <span className="hidden min-[620px]:inline">Add game</span>
            </Button>
          </div>
        </header>

        {/* Content --------------------------------------------------------- */}
        <main className="min-w-0 flex-1 px-[clamp(14px,2.4vw,32px)] pb-6 pt-[clamp(20px,3vw,36px)] lg:pb-[clamp(32px,4vw,56px)]">
          <div className="mx-auto flex max-w-[1680px] flex-col gap-[clamp(24px,3vw,36px)]">
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-inset bg-queued-wash p-3 text-[13px] text-queued shadow-[inset_0_0_0_1px_color-mix(in_srgb,#d98b3a_35%,transparent)]"
              >
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={dismissError}
                  aria-label="Dismiss message"
                  className="shrink-0 cursor-pointer rounded-control border-0 bg-transparent p-0.5 text-queued"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            ) : null}

            {/* Keyed on the path so each view re-mounts and plays its own
                entrance, rather than the shell cross-fading in place. */}
            <Outlet key={location.pathname} />
          </div>
        </main>

        {/* Mobile tab bar --------------------------------------------------- */}
        <nav className="sticky bottom-0 z-40 flex h-16 items-stretch bg-[color-mix(in_srgb,var(--tt-bg-2)_96%,transparent)] shadow-[inset_0_1px_0_var(--tt-line)] backdrop-blur-[12px] lg:hidden">
          {tabs.map((destination) => {
            const active = location.pathname === destination.path;
            const Icon = NAV_ICONS[destination.path];
            return (
              <button
                key={destination.path}
                type="button"
                onClick={() => navigate(destination.path)}
                style={{
                  color: active ? 'var(--tt-accent-ink, #a9ecfb)' : '#b8ae9f',
                  boxShadow: active ? 'inset 0 2px 0 var(--tt-accent, #45c8ea)' : 'none',
                }}
                className="flex min-w-11 flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] border-0 bg-transparent"
              >
                {Icon ? <Icon size={19} /> : null}
                <span className="block max-w-full truncate font-display text-[10px] font-semibold tracking-[0.04em]">
                  {navShortLabel(destination, sidebarConfig)}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            style={{ color: moreOpen ? 'var(--tt-accent-ink, #a9ecfb)' : '#b8ae9f' }}
            className="flex min-w-11 flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] border-0 bg-transparent"
          >
            <MoreHorizontalIcon size={19} />
            <span className="block font-display text-[10px] font-semibold tracking-[0.04em]">
              More
            </span>
          </button>
        </nav>
      </div>

      {moreOpen ? (
        <MoreSheet
          destinations={overflow}
          onNavigate={(path) => {
            navigate(path);
            setMoreOpen(false);
          }}
          onClose={() => setMoreOpen(false)}
          label={(d) => navLabel(d, sidebarConfig)}
        />
      ) : null}

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <QuickAddModal />
    </div>
  );
};

/* -------------------------------------------------------------------------- */

const NavGroupLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span
    className={cn(
      'px-2.5 pb-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-faint',
      className,
    )}
  >
    {children}
  </span>
);

const SidebarRow: React.FC<{
  destination: NavDestination;
  label: string;
  active: boolean;
  count?: { value: number; color: string; background: string };
}> = ({ destination, label, active, count }) => {
  const Icon = NAV_ICONS[destination.path];
  return (
    <NavLink
      to={destination.path}
      title={label}
      style={{
        background: active ? 'var(--tt-accent-soft, #12313c)' : 'transparent',
        color: active ? 'var(--tt-accent-ink, #a9ecfb)' : '#b8ae9f',
        boxShadow: active ? 'inset 2px 0 0 var(--tt-accent, #45c8ea)' : 'none',
      }}
      className="flex h-10 items-center gap-[11px] rounded-control px-2.5 text-[13px] font-semibold transition-colors duration-100 ease-tt hover:bg-surface-2"
    >
      {Icon ? <Icon size={17} className="shrink-0" /> : null}
      <span className="flex-1 truncate">{label}</span>
      {count && count.value > 0 ? (
        <CountPill color={count.color} background={count.background}>
          {count.value}
        </CountPill>
      ) : null}
    </NavLink>
  );
};

const LayoutToggle: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, active, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active}
    onClick={onClick}
    style={{
      background: active ? 'var(--tt-surface-3, #2b2620)' : 'transparent',
      color: active ? '#f7f3ec' : '#9a9082',
    }}
    className="flex h-[30px] w-[34px] cursor-pointer items-center justify-center rounded-[3px] border-0"
  >
    {children}
  </button>
);

/** Offline and queued writes both mean the same thing to a user: not saved yet. */
const SyncStatus: React.FC<{ isOnline: boolean; pendingWrites: number; loading: boolean }> = ({
  isOnline,
  pendingWrites,
  loading,
}) => {
  if (!isOnline) {
    return (
      <div
        title="Offline — changes are queued"
        className="flex h-8 items-center gap-2 rounded-control bg-queued-wash px-2.5 text-queued shadow-[inset_0_0_0_1px_color-mix(in_srgb,#d98b3a_28%,transparent)]"
      >
        <CloudOffIcon size={13} className="shrink-0" />
        <span className="truncate font-display text-[10px] font-semibold uppercase tracking-[0.14em]">
          Offline
        </span>
      </div>
    );
  }

  if (loading || pendingWrites > 0) {
    return (
      <div
        title={pendingWrites > 0 ? `${pendingWrites} change(s) waiting to sync` : 'Loading'}
        className="flex h-8 items-center gap-2 rounded-control bg-surface-2 px-2.5 text-muted hairline"
      >
        <RefreshIcon size={13} className="shrink-0 animate-spin" />
        <span className="truncate font-display text-[10px] font-semibold uppercase tracking-[0.14em]">
          {pendingWrites > 0 ? `${pendingWrites} pending` : 'Loading'}
        </span>
      </div>
    );
  }

  return <SyncPill size="sm" className="h-8 w-full justify-start rounded-control">Cloud synced</SyncPill>;
};

const MoreSheet: React.FC<{
  destinations: NavDestination[];
  onNavigate: (path: string) => void;
  onClose: () => void;
  label: (destination: NavDestination) => string;
}> = ({ destinations, onNavigate, onClose, label }) => (
  <div
    onClick={onClose}
    className="tt-fade fixed inset-0 z-90 flex items-end bg-[rgb(8_7_6_/_.72)] backdrop-blur-[4px]"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="More destinations"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'flex w-full flex-col gap-1 rounded-t-panel bg-surface px-3 pb-6 pt-3',
        'shadow-[inset_0_1px_0_var(--tt-line-2),0_-32px_80px_-24px_rgb(0_0_0_/_.9)]',
      )}
    >
      <span aria-hidden="true" className="mx-auto mb-3 mt-1 h-1 w-11 rounded-full bg-line-2" />

      {destinations.map((destination) => {
        const Icon = NAV_ICONS[destination.path];
        return (
          <button
            key={destination.path}
            type="button"
            onClick={() => onNavigate(destination.path)}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control border-0 bg-transparent px-3 text-left text-[14px] font-semibold text-body transition-colors hover:bg-surface-2"
          >
            {Icon ? <Icon size={18} color="#9a9082" /> : null}
            {label(destination)}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onNavigate('/settings')}
        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control border-0 bg-transparent px-3 text-left text-[14px] font-semibold text-body transition-colors hover:bg-surface-2"
      >
        <SettingsIcon size={18} color="#9a9082" />
        Settings
      </button>
    </div>
  </div>
);
