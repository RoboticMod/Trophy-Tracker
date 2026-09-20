import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Search,
  Plus,
  Clock,
  Loader2,
  KeyRound,
  WifiOff,
  Eraser,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { UserGame } from '../types';
import {
  CATALOG_SOURCE_LABELS,
  CatalogError,
  CatalogResult,
  CatalogSource,
  findInLibrary,
  rawgCover,
  searchCatalog,
  steamDetails,
  useCatalogSettings,
} from '../lib/catalog';
import { fromDateInput } from '../lib/format';
import { syncFieldsFor } from '../lib/sync';
import { useSync } from '../context/SyncContext';
import { ResultPlatforms, VersionChooser } from './CatalogVersions';
import { CoverArt } from './CoverArt';
import { EditGameModal } from './EditGameModal';
import { GameDetailsFields, GameDetailsValues } from './GameDetailsFields';
import { Button, Dialog, TextInput } from './ui';
import { cn } from '../lib/cn';
import { PLAYING_COLLECTION_ID } from '../lib/collections';

const EMPTY_GAME: GameDetailsValues = {
  title: '',
  platform: 'steam',
  coverImage: '',
  hoursPlayed: 0,
  rating: 0,
  achievementRating: 0,
  achievementsUnlocked: 0,
  achievementsTotal: 0,
  // A game you are adding is one you are about to play, which is the shelf
  // the form opens on. Re-clicking it in the picker takes it back off.
  collections: [PLAYING_COLLECTION_ID],
  notes: '',
  completedAt: '',
};

export const QuickAddModal: React.FC = () => {
  const {
    isQuickAddOpen,
    setIsQuickAddOpen,
    addGame,
    games,
    collections,
    platformAccounts,
  } = useGame();
  const { syncGame } = useSync();
  const { source, rawgKey } = useCatalogSettings();
  const steamId = platformAccounts?.steamId;

  const [tab, setTab] = useState<'search' | 'custom'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogResult[]>([]);
  const [searchError, setSearchError] = useState<CatalogError | undefined>();
  const [showingRecent, setShowingRecent] = useState(false);
  const [rawgSkipped, setRawgSkipped] = useState<CatalogError | undefined>();
  /** A result both catalogs returned, waiting on which version to use. */
  const [choosing, setChoosing] = useState<CatalogResult | null>(null);
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
      setRawgSkipped(res.rawgSkipped);
      setChoosing(null);
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
   *
   * This is what the X, Esc and a backdrop click all do. It used to have a
   * "Minimize" button of its own saying so, which is a window-manager verb for
   * something that is not a window — the behaviour is worth keeping, the
   * button was not.
   */
  const hide = () => setIsQuickAddOpen(false);

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
  const selectGameFromSearch = useCallback((game: CatalogResult) => {
    setReleaseDate(game.releaseDate);
    setGenres(game.genres);
    setRawgId(game.rawgId);
    setValues((v) => ({
      ...v,
      title: game.title,
      coverImage: game.image || '',
      platform: game.platform,
      steamAppId: game.steamAppId,
      // Deliberately not `rating`. A catalog result carries RAWG's community
      // score, and pre-filling the slider with it made someone else's average
      // look like a rating you had given.
    }));
    setTab('custom');

    // A result the search could not find art for — a Steam game whose name RAWG
    // spells differently — gets one more look, by name.
    if (!game.image) {
      void rawgCover(game.title, rawgKey).then((cover) => {
        if (!cover) return;
        setValues((v) => (v.title === game.title && !v.coverImage ? { ...v, coverImage: cover } : v));
      });
    }

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
          : { ...v, achievementsTotal: v.achievementsTotal || details.achievementsTotal },
      );
      setReleaseDate((d) => d ?? details.releaseDate);
      setGenres((g) => (g.length ? g : details.genres));
    });
  }, [rawgKey]);

  /**
   * The game this result already is, if the library has it.
   *
   * Held in a ref so the click handler can consult the current library without
   * the memoized rows below having to re-render every time it changes.
   */
  const library = useRef(games);
  library.current = games;

  /** Open on an existing game rather than adding a second copy of it. */
  const [editing, setEditing] = useState<UserGame | null>(null);

  /** Which results the library already has, so the rows can say so. */
  const ownedKeys = useMemo(() => {
    const keys = new Set<string>();
    searchResults.forEach((result) => {
      if (findInLibrary(games, result)) keys.add(result.key);
    });
    return keys;
  }, [searchResults, games]);

  /**
   * Clicking a result: the game you already have, the version choice, or
   * straight into the form. Stable, so the rows below it can skip a render
   * while the query changes.
   */
  const pickResult = useCallback(
    (game: CatalogResult) => {
      // A game already tracked is not added twice. Its own dialog opens
      // instead, which is what you wanted from it anyway — the counts, the
      // status, the notes — and the add dialog steps out of the way.
      const owned = findInLibrary(library.current, game);
      if (owned) {
        setIsQuickAddOpen(false);
        setEditing(owned);
        return;
      }

      if (game.twin) setChoosing(game);
      else selectGameFromSearch(game);
    },
    [selectGameFromSearch, setIsQuickAddOpen],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return;

    // The same check the result rows make, for a title typed rather than
    // picked — and for the pick that was already in the library before the
    // details were adjusted.
    const owned = findInLibrary(games, {
      platform: values.platform,
      title: values.title.trim(),
      steamAppId: values.steamAppId,
      rawgId,
    });
    if (owned) {
      close();
      setEditing(owned);
      return;
    }

    const added = addGame({
      rawgId,
      title: values.title.trim(),
      platform: values.platform,
      coverImage: values.coverImage.trim() || undefined,
      coverPortrait: values.coverPortrait,
      logoImage: values.logoImage,
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
    <>
    <Dialog
      isOpen={isQuickAddOpen}
      title="Add a game"
      icon={<Plus size={18} />}
      onClose={hide}
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
      <div className="mb-3 flex gap-1 rounded-sm bg-black/25 p-1 sm:mb-5">
        {/* "Search games", not the catalogs it happens to be searching: which
            database a title comes out of is a setting, not a choice being made
            here, and naming both of them made the tab the longest label in the
            dialog. The catalog in use is still named in the line above. */}
        <TabButton active={tab === 'search'} onClick={() => setTab('search')}>
          <Search size={15} />
          Search games
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
              aria-label="Search games"
              placeholder="Elden Ring, Hollow Knight, Balatro…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {rawgSkipped && !isSearching ? (
            <p className="flex items-center gap-1.5 text-50 text-gray-600">
              <KeyRound size={12} />
              {rawgSkipped === 'missing-key'
                ? 'Showing Steam only — add a RAWG key in Settings to search both.'
                : 'Showing Steam only — RAWG could not be reached.'}
            </p>
          ) : null}

          {choosing ? (
            <VersionChooser
              result={choosing}
              onPick={(version) => {
                setChoosing(null);
                selectGameFromSearch(version);
              }}
              onCancel={() => setChoosing(null)}
            />
          ) : isSearching ? (
            <div className="flex flex-col items-center gap-2 py-8 text-gray-700 sm:py-12">
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
              {/* Capped against the viewport on a phone, where a fixed 380px
                  of results pushes the footer buttons off the screen. */}
              <div className="grid max-h-[46dvh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:max-h-[380px] sm:grid-cols-2">
                {searchResults.map((game) => (
                  <ResultRow
                    key={game.key}
                    game={game}
                    showPlatforms={source === 'both'}
                    owned={ownedKeys.has(game.key)}
                    onPick={pickResult}
                  />
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
          collections={collections}
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

    {/* A game you already have opens here rather than being added again. It
        lives beside the dialog rather than inside it, so it survives the add
        dialog closing on the way. */}
    <EditGameModal
      game={editing}
      isOpen={editing !== null}
      onClose={() => setEditing(null)}
    />
    </>
  );
};

/**
 * One row of the result list.
 *
 * Memoized, and plain rather than animated. Every keystroke re-renders the
 * dialog, and sixteen motion components — each with its own hover and tap
 * springs — were re-rendered with it, which is what made typing in the search
 * box feel like wading. Given stable props these rows now sit still while the
 * query changes, and the hover treatment they had is a border and a background
 * the CSS was already transitioning.
 */
const ResultRow = React.memo<{
  game: CatalogResult;
  /** The platform marks, which only mean anything when both catalogs ran. */
  showPlatforms: boolean;
  /** Already tracked: the row opens that game rather than adding another. */
  owned: boolean;
  onPick: (game: CatalogResult) => void;
}>(({ game, showPlatforms, owned, onPick }) => (
  <button
    type="button"
    onClick={() => onPick(game)}
    title={owned ? `${game.title} is already in your library — open it` : undefined}
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
      <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
        {owned ? (
          <span className="eyebrow inline-flex shrink-0 items-center gap-1 rounded-sm border border-positive-700/50 px-1.5 py-1 text-positive-900">
            <Check size={11} />
            In library
          </span>
        ) : showPlatforms ? (
          <ResultPlatforms result={game} />
        ) : null}
        <p className="truncate text-75 text-gray-700">{game.subtitle}</p>
      </div>
    </div>
  </button>
));

ResultRow.displayName = 'ResultRow';

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
    <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-gray-300 bg-black/25 px-6 py-6 text-center sm:py-10">
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
      'flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-1.5 text-100 font-medium transition-colors sm:py-2',
      active ? 'bg-accent-700 text-gray-1000' : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900',
    )}
  >
    {children}
  </button>
);
