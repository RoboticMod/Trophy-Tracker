import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { PLATFORMS } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { navLabel, orderedNavDestinations } from '../lib/navigation';
import { ChevronRightIcon, SearchIcon } from './icons';
import { cn } from '../lib/cn';

interface PaletteRow {
  key: string;
  /** Two- or three-letter classifier: GO, ACT, or the game's platform. */
  tag: string;
  tagColor: string;
  label: string;
  hint: string;
  run: () => void;
}

const MAX_ROWS = 24;

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Cmd/Ctrl+K. One list over destinations, actions and the library itself, so
 * "where is Hades" and "take me to the backlog" are the same gesture.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { games, profile, sidebarConfig, ui, setCardLayout, setIsQuickAddOpen } = useGame();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Each opening starts clean; a stale query from last time reads as a bug.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const rows = useMemo<PaletteRow[]>(() => {
    const go = (path: string) => () => {
      navigate(path);
      onClose();
    };

    const destinations: PaletteRow[] = orderedNavDestinations(sidebarConfig).map((d) => ({
      key: `go:${d.path}`,
      tag: 'GO',
      tagColor: 'var(--tt-accent, #45c8ea)',
      label: navLabel(d, sidebarConfig),
      hint: d.description,
      run: go(d.path),
    }));

    const actions: PaletteRow[] = [
      {
        key: 'go:/settings',
        tag: 'GO',
        tagColor: 'var(--tt-accent, #45c8ea)',
        label: 'Settings',
        hint: 'Profile, naming, navigation and data',
        run: go('/settings'),
      },
      {
        key: 'act:add',
        tag: 'ACT',
        tagColor: 'var(--tt-gold-hi, #ffd36b)',
        label: 'Add a game',
        hint: 'Create a new library entry',
        run: () => {
          setIsQuickAddOpen(true);
          onClose();
        },
      },
      {
        key: 'act:layout',
        tag: 'ACT',
        tagColor: 'var(--tt-gold-hi, #ffd36b)',
        label: ui.cardLayout === 'wide' ? 'Switch to poster cards' : 'Switch to wide cards',
        hint: 'Change library card shape',
        run: () => {
          setCardLayout(ui.cardLayout === 'wide' ? 'poster' : 'wide');
          onClose();
        },
      },
    ];

    // A game row goes to the view its status belongs to, so picking one lands
    // somewhere it is actually on screen rather than on a page that filters it
    // straight back out.
    const routeForGame = (status: string) =>
      status === 'playing' ? '/playing' : status === 'backlog' ? '/backlog' : '/';

    const library: PaletteRow[] = games.map((g) => {
      const platform = PLATFORMS[g.platform] ?? PLATFORMS.steam;
      return {
        key: `game:${g.id}`,
        tag: g.platform === 'ps5' ? 'PS5' : 'STM',
        tagColor: platform.color,
        label: g.title,
        hint: `${statusLabel(g.status, profile)} · ${g.achievementsUnlocked}/${g.achievementsTotal} · ${g.hoursPlayed}h`,
        run: go(routeForGame(g.status)),
      };
    });

    return [...destinations, ...actions, ...library];
  }, [
    games,
    profile,
    sidebarConfig,
    ui.cardLayout,
    navigate,
    onClose,
    setCardLayout,
    setIsQuickAddOpen,
  ]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => !q || r.label.toLowerCase().includes(q)).slice(0, MAX_ROWS);
  }, [rows, query]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className={cn(
        'tt-fade fixed inset-0 z-100 flex items-start justify-center',
        'bg-[rgb(8_7_6_/_.78)] px-4 pb-4 pt-[clamp(16px,8vh,96px)] backdrop-blur-[6px]',
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'tt-rise flex max-h-[70vh] w-full max-w-[560px] flex-col overflow-hidden rounded-panel bg-surface',
          'shadow-[inset_0_0_0_1px_var(--tt-line-2),0_32px_80px_-24px_rgb(0_0_0_/_.9)]',
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-[11px] px-4 shadow-[inset_0_-1px_0_var(--tt-line)]">
          <SearchIcon size={17} color="#9a9082" className="shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games, views and actions"
            aria-label="Search games, views and actions"
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none"
          />
          <kbd className="shrink-0 rounded-control bg-surface-3 px-1.5 py-0.5 font-display text-[11px] font-semibold not-italic text-muted">
            ESC
          </kbd>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={row.run}
              className={cn(
                'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-control border-0',
                'bg-transparent px-2.5 py-2 text-left transition-colors hover:bg-surface-2',
              )}
            >
              <span
                style={{ color: row.tagColor }}
                className="flex h-7 w-[34px] shrink-0 items-center justify-center rounded-control bg-surface-2 font-display text-[9px] font-bold tracking-[0.06em]"
              >
                {row.tag}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">
                  {row.label}
                </span>
                <span className="block truncate text-[11px] text-subtle">{row.hint}</span>
              </span>
              <ChevronRightIcon size={14} color="#8a8175" className="shrink-0" />
            </button>
          ))}

          {results.length === 0 ? (
            <p className="m-0 px-3 py-8 text-center text-[13px] text-subtle">
              No matches. Try a game title or a view name.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
