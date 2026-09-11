import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Sparkles,
  Plus,
  Clock,
  Loader2,
  KeyRound,
  WifiOff,
  Eraser,
  Minimize2,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameStatus, RawgGameResult } from '../types';
import { searchGames, detectPlatformFromRawg, CatalogError } from '../lib/rawg';
import { snapRating } from '../lib/rating';
import { CoverArt } from './CoverArt';
import { GameDetailsFields, GameDetailsValues } from './GameDetailsFields';
import { Button, Dialog, TextInput } from './ui';
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

  const searchRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<GameDetailsValues>(EMPTY_GAME);
  const [releaseDate, setReleaseDate] = useState<string | undefined>();
  const [genres, setGenres] = useState<string[]>([]);
  const [rawgId, setRawgId] = useState<number | undefined>();

  useEffect(() => {
    if (!isQuickAddOpen) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchGames(searchQuery);
      if (cancelled) return;
      setSearchResults(res.results);
      setSearchError(res.error);
      setIsSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isQuickAddOpen]);

  const clearAll = () => {
    setSearchQuery('');
    setValues(EMPTY_GAME);
    setReleaseDate(undefined);
    setGenres([]);
    setRawgId(undefined);
  };

  /**
   * Hides the dialog without touching the draft, so browsing the library and
   * coming back does not mean filling the form in again. The draft only clears
   * on an explicit "Clear all" or once the game has actually been added.
   */
  const minimize = () => setIsQuickAddOpen(false);

  const close = () => {
    setIsQuickAddOpen(false);
    setTab('search');
    clearAll();
  };

  const hasDraft =
    values.title.trim() !== '' ||
    values.notes.trim() !== '' ||
    values.hoursPlayed > 0 ||
    values.achievementsTotal > 0 ||
    values.rating > 0 ||
    values.achievementRating > 0 ||
    values.collections.length > 0 ||
    searchQuery.trim() !== '';

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
      // RAWG scores out of 5; this app scores out of 10.
      rating: game.rating ? snapRating(Math.min(5, Math.max(0, game.rating)) * 2) : v.rating,
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
      title="Add a game"
      description="Search the catalog, or enter the details yourself"
      icon={<Sparkles size={18} />}
      onClose={minimize}
      initialFocusRef={tab === 'search' ? searchRef : undefined}
      footer={
        <>
          <Button
            buttonStyle="subtle"
            className="mr-auto"
            onClick={clearAll}
            disabled={!hasDraft}
          >
            <Eraser size={14} />
            Clear all
          </Button>

          <Button buttonStyle="subtle" onClick={minimize} title="Keeps what you have entered">
            <Minimize2 size={14} />
            Minimize
          </Button>

          {tab === 'custom' && (
            <Button
              variant="accent"
              onClick={handleSubmit}
              disabled={!values.title.trim()}
              type="submit"
              form="quick-add-form"
            >
              <Plus size={15} />
              Add to library
            </Button>
          )}
        </>
      }
    >
      <div className="mb-5 flex gap-1 rounded-sm bg-gray-75 p-1">
        <TabButton active={tab === 'search'} onClick={() => setTab('search')}>
          <Search size={15} />
          Search catalog
        </TabButton>
        <TabButton active={tab === 'custom'} onClick={() => setTab('custom')}>
          <Plus size={15} />
          Enter details
        </TabButton>
      </div>

      {tab === 'search' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600"
              size={16}
            />
            <TextInput
              ref={searchRef}
              type="search"
              aria-label="Search the game catalog"
              placeholder="Elden Ring, Hollow Knight, Balatro…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isSearching ? (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-700">
              <Loader2 size={22} className="animate-spin" />
              <p className="text-75">Searching…</p>
            </div>
          ) : searchResults.length === 0 ? (
            <SearchEmptyState error={searchError} query={searchQuery} />
          ) : (
            <div className="grid max-h-[380px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {searchResults.map((game) => (
                <motion.button
                  key={game.id}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => selectGameFromSearch(game)}
                  className="group flex items-center gap-3 rounded-sm border border-gray-200 bg-gray-75 p-2.5 text-left transition-colors hover:border-gray-300 hover:bg-gray-200"
                >
                  <CoverArt
                    src={game.background_image}
                    title={game.name}
                    className="h-14 w-14 shrink-0 rounded-sm object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-100 font-semibold text-gray-900 group-hover:text-accent-900">
                      {game.name}
                    </h4>
                    <p className="mt-0.5 text-75 text-gray-700">
                      {game.released?.split('-')[0] || 'Unknown'} •{' '}
                      {game.genres?.[0]?.name || 'Game'}
                    </p>
                  </div>
                </motion.button>
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
          <p className="flex items-center gap-1.5 text-50 text-gray-600">
            <Clock size={12} />
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
          <KeyRound size={20} key="k" />,
          'No RAWG key configured',
          'Catalog search runs on the RAWG API. Set VITE_RAWG_API_KEY, or use “Enter details” to add the game yourself.',
        ]
      : error === 'request-failed'
        ? [
            <WifiOff size={20} key="w" />,
            'Could not reach RAWG',
            'The catalog request failed. Check your connection, or use “Enter details” to add the game yourself.',
          ]
        : [
            <Search size={20} key="s" />,
            trimmed ? 'No matches' : 'Nothing to show yet',
            trimmed
              ? `RAWG has no titles matching “${trimmed}”.`
              : 'Type a title or genre to search the RAWG catalog.',
          ];

  return (
    <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-gray-300 bg-gray-75/60 px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-200 text-gray-700">
        {icon}
      </div>
      <h4 className="text-100 font-bold text-gray-1000">{title}</h4>
      <p className="max-w-sm text-75 text-gray-700">{body}</p>
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
      'flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-2 text-100 font-medium transition-colors',
      active ? 'bg-accent-700 text-gray-1000' : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900',
    )}
  >
    {children}
  </button>
);
