import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { GameStatus, RawgGameResult } from '../types';
import { searchGames, detectPlatformFromRawg, CatalogError } from '../lib/rawg';
import { CoverArt } from './CoverArt';
import { GameDetailsFields, GameDetailsValues } from './GameDetailsFields';
import { CloudOffIcon, PlusIcon, RefreshIcon, SearchIcon, UnlinkIcon } from './icons';
import { Button, Dialog } from './ui';
import { cn } from '../lib/cn';

const STATUS_CHOICES: GameStatus[] = ['playing', 'backlog', 'completed', 'mastered'];

const EMPTY_GAME: GameDetailsValues = {
  title: '',
  platform: 'steam',
  status: 'playing',
  coverImage: '',
  hoursPlayed: 0,
  rating: 0,
  achievementRating: 0,
  achievementsUnlocked: 0,
  achievementsTotal: 0,
  collections: [],
  notes: '',
};

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, setIsQuickAddOpen, addGame, collections, profile } = useGame();

  const [tab, setTab] = useState<'search' | 'custom'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RawgGameResult[]>([]);
  const [searchError, setSearchError] = useState<CatalogError | undefined>();
  const [isSearching, setIsSearching] = useState(false);

  const [values, setValues] = useState<GameDetailsValues>(EMPTY_GAME);
  const [releaseDate, setReleaseDate] = useState<string | undefined>();
  const [genres, setGenres] = useState<string[]>([]);
  const [rawgId, setRawgId] = useState<number | undefined>();

  useEffect(() => {
    if (!isQuickAddOpen) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const response = await searchGames(searchQuery);
      if (cancelled) return;
      setSearchResults(response.results);
      setSearchError(response.error);
      setIsSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isQuickAddOpen]);

  const reset = () => {
    setTab('search');
    setSearchQuery('');
    setValues(EMPTY_GAME);
    setReleaseDate(undefined);
    setGenres([]);
    setRawgId(undefined);
  };

  const close = () => {
    setIsQuickAddOpen(false);
    reset();
  };

  /** Pulls a catalog result into the form so details can be adjusted first. */
  const selectGameFromSearch = (game: RawgGameResult) => {
    setReleaseDate(game.released);
    setGenres(game.genres?.map((g) => g.name) ?? []);
    setRawgId(game.id);
    setValues((v) => ({
      ...v,
      title: game.name,
      coverImage: game.background_image || '',
      platform: detectPlatformFromRawg(game),
      // RAWG scores out of 5; this app stores out of 100.
      rating: game.rating ? Math.round(Math.min(5, Math.max(0, game.rating)) * 20) : v.rating,
    }));
    setTab('custom');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return;

    addGame({
      rawgId,
      title: values.title.trim(),
      platform: values.platform,
      status: values.status,
      coverImage: values.coverImage.trim() || undefined,
      releaseDate,
      genres,
      hoursPlayed: values.hoursPlayed,
      achievementsUnlocked: Math.min(values.achievementsUnlocked, values.achievementsTotal),
      achievementsTotal: values.achievementsTotal,
      rating: values.rating || undefined,
      achievementRating: values.achievementRating || undefined,
      collections: values.collections,
      notes: values.notes.trim() || undefined,
    });

    close();
  };

  return (
    <Dialog
      isOpen={isQuickAddOpen}
      onClose={close}
      eyebrow="New entry"
      title="Add a game"
      size="l"
      footer={
        tab === 'custom' ? (
          <>
            <span />
            <span className="flex gap-2">
              <Button variant="outline" size="l" onClick={close}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="quick-add-form"
                variant="accent"
                size="l"
                disabled={!values.title.trim()}
                onClick={handleSubmit}
              >
                Add to library
              </Button>
            </span>
          </>
        ) : undefined
      }
    >
      <div className="flex gap-0.5 rounded-control bg-surface-2 p-[3px]">
        <TabButton active={tab === 'search'} onClick={() => setTab('search')}>
          <SearchIcon size={14} />
          Search catalog
        </TabButton>
        <TabButton active={tab === 'custom'} onClick={() => setTab('custom')}>
          <PlusIcon size={14} />
          Enter details
        </TabButton>
      </div>

      {tab === 'search' ? (
        <div className="flex flex-col gap-3.5">
          <div className="relative">
            <SearchIcon
              size={16}
              color="#9a9082"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
            />
            <input
              type="search"
              aria-label="Search the game catalog"
              placeholder="Elden Ring, Hollow Knight, Balatro…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-control border-0 bg-surface-2 pl-10 pr-3 text-[14px] text-ink shadow-[inset_0_0_0_1px_var(--tt-line)] transition-shadow focus:shadow-[inset_0_0_0_1px_var(--tt-accent)] focus:outline-none"
            />
          </div>

          {isSearching ? (
            <div className="flex flex-col items-center gap-2 py-12 text-subtle">
              <RefreshIcon size={20} className="animate-spin" />
              <p className="m-0 text-[13px]">Searching…</p>
            </div>
          ) : searchResults.length === 0 ? (
            <SearchEmptyState error={searchError} query={searchQuery} />
          ) : (
            <div className="grid max-h-[380px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {searchResults.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => selectGameFromSearch(game)}
                  className="group flex cursor-pointer items-center gap-3 rounded-inset border-0 bg-surface-2 p-2.5 text-left hairline transition-colors hover:bg-surface-3"
                >
                  <CoverArt
                    src={game.background_image}
                    title={game.name}
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-control object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="m-0 truncate font-display text-[13px] font-bold text-ink">
                      {game.name}
                    </h4>
                    <p className="m-0 mt-0.5 text-[11px] text-subtle">
                      {game.released?.split('-')[0] || 'Unknown'} &middot;{' '}
                      {game.genres?.[0]?.name || 'Game'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <GameDetailsFields
          formId="quick-add-form"
          onSubmit={handleSubmit}
          values={values}
          onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
          statuses={STATUS_CHOICES}
          collections={collections}
          profile={profile}
        >
          <p className="m-0 text-[11px] text-faint">
            Added games sync to your account automatically.
          </p>
        </GameDetailsFields>
      )}
    </Dialog>
  );
};

/** Compact in-dialog explanation for an empty catalog result set. */
const SearchEmptyState: React.FC<{ error?: CatalogError; query: string }> = ({ error, query }) => {
  const trimmed = query.trim();

  const [icon, title, body] =
    error === 'missing-key'
      ? [
          <UnlinkIcon size={20} key="k" />,
          'No RAWG key configured',
          'Catalog search runs on the RAWG API. Set VITE_RAWG_API_KEY, or use “Enter details” to add the game yourself.',
        ]
      : error === 'request-failed'
        ? [
            <CloudOffIcon size={20} key="w" />,
            'Could not reach RAWG',
            'The catalog request failed. Check your connection, or use “Enter details” to add the game yourself.',
          ]
        : [
            <SearchIcon size={20} key="s" />,
            trimmed ? 'No matches' : 'Nothing to show yet',
            trimmed
              ? `RAWG has no titles matching “${trimmed}”.`
              : 'Type a title or genre to search the RAWG catalog.',
          ];

  return (
    <div className="flex flex-col items-center gap-2 rounded-inset px-6 py-10 text-center hairline">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-subtle">
        {icon}
      </span>
      <h4 className="m-0 font-display text-[15px] font-bold text-ink">{title}</h4>
      <p className="m-0 max-w-sm text-[12px] text-subtle [text-wrap:pretty]">{body}</p>
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[3px] border-0 py-2',
      'font-display text-[13px] font-bold transition-colors',
      active ? 'bg-surface-3 text-ink' : 'bg-transparent text-subtle hover:text-muted',
    )}
  >
    {children}
  </button>
);
