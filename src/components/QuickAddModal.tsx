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
import { GameStatus } from '../types';
import {
  CATALOG_SOURCE_LABELS,
  CatalogError,
  CatalogResult,
  CatalogSource,
  searchCatalog,
  steamDetails,
  useCatalogSettings,
} from '../lib/catalog';
import { fromDateInput } from '../lib/format';
import { syncFieldsFor } from '../lib/sync';
import { useSync } from '../context/SyncContext';
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
  completedAt: '',
};

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, setIsQuickAddOpen, addGame, collections, profile, platformAccounts } =
    useGame();
  const { syncGame } = useSync();
  const { source, rawgKey } = useCatalogSettings();
  const steamId = platformAccounts?.steamId;

  const [tab, setTab] = useState<'search' | 'custom'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogResult[]>([]);
  const [searchError, setSearchError] = useState<CatalogError | undefined>();
  const [showingRecent, setShowingRecent] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

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
      const res = await searchCatalog(searchQuery, { source, rawgKey, steamId });
      if (cancelled) return;
      setSearchResults(res.results);
      setSearchError(res.error);
      setShowingRecent(Boolean(res.recent));
      setIsSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isQuickAddOpen, source, rawgKey, steamId]);

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
    values.steamAppId !== undefined ||
    searchQuery.trim() !== '';

  /**
   * Pulls a catalog result into the form so details can be adjusted first.
   *
   * A Steam pick comes already linked, and its store page is read on the way
   * in for the details search does not carry — above all the achievement
   * count, so the form does not open at 0 / 0.
   */
  const selectGameFromSearch = (game: CatalogResult) => {
    setReleaseDate(game.releaseDate);
    setGenres(game.genres);
    setRawgId(game.rawgId);
    setValues((v) => ({
      ...v,
      title: game.title,
      coverImage: game.image || '',
      platform: game.platform,
      steamAppId: game.steamAppId,
      rating: game.rating ?? v.rating,
    }));
    setTab('custom');

    const appid = game.steamAppId;
    if (!appid) return;
    setFetchingDetails(true);
    void steamDetails(appid).then((details) => {
      setFetchingDetails(false);
      if (!details) return;
      // Only onto the same pick: a second result chosen meanwhile wins.
      setValues((v) =>
        v.steamAppId !== appid
          ? v
          : {
              ...v,
              coverImage: details.image || v.coverImage,
              achievementsTotal: v.achievementsTotal || details.achievementsTotal,
            },
      );
      setReleaseDate((d) => d ?? details.releaseDate);
      setGenres((g) => (g.length ? g : details.genres));
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return;

    const added = addGame({
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
      completedAt: fromDateInput(values.completedAt),
      steamAppId: values.steamAppId,
      ...syncFieldsFor(values),
    });

    // A linked game fetches immediately, rather than sitting on whatever was
    // typed until the next timed pass.
    void syncGame(added);

    close();
  };

  return (
    <Dialog
      isOpen={isQuickAddOpen}
      title="Add a game"
      description={`Search ${CATALOG_SOURCE_LABELS[source]}, or enter the details yourself`}
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
      <div className="mb-5 flex gap-1 rounded-sm bg-black/25 p-1">
        <TabButton active={tab === 'search'} onClick={() => setTab('search')}>
          <Search size={15} />
          Search {CATALOG_SOURCE_LABELS[source]}
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
              aria-label={`Search ${CATALOG_SOURCE_LABELS[source]}`}
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
            <SearchEmptyState error={searchError} query={searchQuery} source={source} />
          ) : (
            <div className="space-y-2">
              {showingRecent ? (
                <p className="eyebrow text-gray-600">Recently played on Steam</p>
              ) : null}
              <div className="grid max-h-[380px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {searchResults.map((game) => (
                  <motion.button
                    key={game.key}
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => selectGameFromSearch(game)}
                    className="group flex items-center gap-3 rounded-sm border border-gray-200 bg-black/25 p-2.5 text-left transition-colors hover:border-gray-300 hover:bg-gray-200"
                  >
                    <CoverArt
                      src={game.image}
                      title={game.title}
                      className="h-12 w-[5.5rem] shrink-0 rounded-sm object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-100 font-semibold text-gray-900 group-hover:text-accent-900">
                        {game.title}
                      </h4>
                      <p className="mt-0.5 truncate text-75 text-gray-700">{game.subtitle}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
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
            {fetchingDetails ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Clock size={12} />
            )}
            {fetchingDetails
              ? 'Reading the Steam store page…'
              : 'Added games sync to your account automatically.'}
          </p>
        </GameDetailsFields>
      )}
    </Dialog>
  );
};

/** Compact in-dialog explanation for an empty catalog result set. */
const SearchEmptyState: React.FC<{
  error?: CatalogError;
  query: string;
  source: CatalogSource;
}> = ({ error, query, source }) => {
  const trimmed = query.trim();
  const name = CATALOG_SOURCE_LABELS[source];

  const [icon, title, body] =
    error === 'missing-key'
      ? [
          <KeyRound size={20} key="k" />,
          'No RAWG key configured',
          'Add a RAWG API key in Settings, switch the catalog back to Steam, or use “Enter details” to add the game yourself.',
        ]
      : error
        ? [
            <WifiOff size={20} key="w" />,
            `Could not reach ${name}`,
            'The catalog request failed. Check your connection, or use “Enter details” to add the game yourself.',
          ]
        : [
            <Search size={20} key="s" />,
            trimmed ? 'No matches' : 'Search for a game',
            trimmed
              ? `${name} has no games matching “${trimmed}”.`
              : `Type a title to search ${name}.`,
          ];

  return (
    <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-gray-300 bg-black/25 px-6 py-10 text-center">
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
