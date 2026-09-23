import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Bookmark,
  Check,
  Filter,
  KeyRound,
  Loader2,
  WifiOff,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useSync } from '../context/SyncContext';
import {
  CATALOG_SOURCE_LABELS,
  CatalogError,
  CatalogResult,
  CatalogSource,
  ResultSource,
  findInLibrary,
  pickVersion,
  rawgCover,
  searchCatalog,
  steamDetails,
  useCatalogSettings,
} from '../lib/catalog';
import { Platform, PLATFORM_IDS, UserGame } from '../types';
import { PLATFORMS } from '../lib/constants';
import { BACKLOG_COLLECTION_ID, PLAYING_COLLECTION_ID, collectionName } from '../lib/collections';
import { syncFieldsFor } from '../lib/sync';
import { EASE_OUT } from '../lib/motion';
import { cn } from '../lib/cn';
import { CoverArt } from '../components/CoverArt';
import { EditGameModal } from '../components/EditGameModal';
import { PlatformIcon } from '../components/PlatformIcon';
import { RatingValue } from '../components/Rating';
import { IntroNotice } from '../components/IntroNotice';
import {
  Button,
  EmptyState,
  FilterChip,
  OverlayBadge,
  PageHeader,
  SectionRule,
  TextInput,
} from '../components/ui';
import { ResultPlatforms, VersionToggle } from '../components/CatalogVersions';
import { useIsPhone } from '../lib/useMediaQuery';

export const SearchView: React.FC = () => {
  const { games, addGame, collections, platformAccounts } = useGame();
  const { syncGame } = useSync();
  const { source, rawgKey } = useCatalogSettings();
  const steamId = platformAccounts?.steamId;
  const sourceName = CATALOG_SOURCE_LABELS[source];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [error, setError] = useState<CatalogError | undefined>();
  const [recent, setRecent] = useState(false);
  const [rawgSkipped, setRawgSkipped] = useState<CatalogError | undefined>();
  /** Which version of a found-twice game each card will add. Steam by default. */
  const [versions, setVersions] = useState<Record<string, ResultSource>>({});
  const [loading, setLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [addedKeys, setAddedKeys] = useState<Record<string, boolean>>({});
  /** A game you already have, opened from its result rather than re-added. */
  const [editing, setEditing] = useState<UserGame | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const phone = useIsPhone();

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await searchCatalog(query, { source, rawgKey, steamId });
      if (cancelled) return;
      setResults(res.results);
      setError(res.error);
      setRecent(Boolean(res.recent));
      setRawgSkipped(res.rawgSkipped);
      setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, source, rawgKey, steamId]);

  /**
   * Adds a result straight to the library.
   *
   * A Steam result reads its store page first, so the game lands with its
   * achievement count, genres and release date, already linked — and then
   * syncs, so your own progress follows a moment later. A game both catalogs
   * found arrives as whichever version its card is set to.
   */
  const handleQuickAdd = async (game: CatalogResult, toBacklog: boolean) => {
    const platform = selectedPlatform !== 'all' ? selectedPlatform : game.platform;
    setAddingKey(game.key);

    // The cover always comes from RAWG. A Steam result the search already
    // matched carries it; anything else is asked for by name on the way in.
    const [details, cover] = await Promise.all([
      game.steamAppId ? steamDetails(game.steamAppId) : null,
      game.image ? game.image : rawgCover(game.title, rawgKey),
    ]);

    const added = addGame(
      {
        rawgId: game.rawgId,
        steamAppId: game.steamAppId,
        title: game.title,
        platform,
        coverImage: cover,
        releaseDate: game.releaseDate ?? details?.releaseDate,
        genres: game.genres.length ? game.genres : (details?.genres ?? []),
        hoursPlayed: 0,
        achievementsUnlocked: 0,
        achievementsTotal: details?.achievementsTotal ?? 0,
        // No rating. This used to write RAWG's community score onto the game as
        // *your* rating, with no user action at all — a number you never gave,
        // on a scale that is not the one the app asks you for. The result card
        // still shows the score, labelled as RAWG's.
        collections: [toBacklog ? BACKLOG_COLLECTION_ID : PLAYING_COLLECTION_ID],
        ...syncFieldsFor({ platform, steamAppId: game.steamAppId }),
      },
      // Adding from here is a run of games — the card says "in your library"
      // and you carry on down the list. A dialog to dismiss after each one
      // would be two clicks apiece for something the card has already said.
      { announce: false },
    );

    setAddingKey(null);
    setAddedKeys((prev) => ({ ...prev, [game.key]: true }));
    void syncGame(added);
  };

  /**
   * The library entry a result already is, on the platform it would be added
   * on. Matching the platform too is what lets a game owned on Steam still be
   * added for the PlayStation, which is two entries here by design.
   */
  const alreadyAdded = (game: CatalogResult) =>
    findInLibrary(games, {
      ...game,
      platform: selectedPlatform !== 'all' ? selectedPlatform : game.platform,
    });

  const heading = query.trim()
    ? `${results.length} result${results.length === 1 ? '' : 's'} for “${query.trim()}”`
    : recent
      ? 'Recently played on Steam'
      : source !== 'steam' && results.length > 0
        ? `${results.length} popular on RAWG now`
        : '';

  return (
    <div className="mx-auto max-w-[1760px] space-y-6 pb-10">
      {/* A plus, matching the Add button and the add dialog — the three ways to
          add a game were a sparkle, a sparkle and a plus. */}
      <PageHeader
        title="Search & add"
        subtitle="Find a game on Steam or PlayStation and put it on a shelf."
      />

      {/* Kept as a note rather than dropped outright: which catalog is being
          searched, and where to change it, is not something the title says. */}
      <IntroNotice id="search">
        Search {sourceName} and add games to your Steam or PlayStation library. The catalog can be
        changed in{' '}
        <Link to="/settings" className="font-semibold text-accent-900 hover:text-accent-1000">
          Settings
        </Link>
        .
      </IntroNotice>

      {phone ? (
      <div className="space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 sm:left-4"
            size={18}
          />
          <TextInput
            type="search"
            aria-label={`Search ${sourceName}`}
            placeholder="Search by title — Elden Ring, Hollow Knight, Balatro…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-11 text-100 sm:h-12 sm:pl-12 sm:text-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1 flex items-center gap-1 text-gray-600">
            <Filter size={13} />
            Add to
          </span>

          <FilterChip
            selected={selectedPlatform === 'all'}
            onClick={() => setSelectedPlatform('all')}
          >
            Auto-detect
          </FilterChip>

          {PLATFORM_IDS.map((p) => (
            <FilterChip
              key={p}
              selected={selectedPlatform === p}
              onClick={() => setSelectedPlatform(p)}
              title={PLATFORMS[p].name}
            >
              <PlatformIcon platform={p} size={15} />
              <span>{PLATFORMS[p].shortName}</span>
            </FilterChip>
          ))}
        </div>
      </div>
      ) : (
        /* One field and the platform a game is added as, in one row. The field
           is the page's reason for being, so it is taller than any other and
           lit before you have typed anything. */
        <section className="flex items-center gap-3">
          <div className="relative w-130 max-w-full min-w-0">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-accent-900"
              size={20}
            />
            <input
              type="search"
              aria-label={`Search ${sourceName}`}
              placeholder="Search by title — Elden Ring, Hollow Knight, Balatro…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="no-spinner h-12 w-full rounded-tile border border-accent-700/50 bg-black/30 pl-12 pr-4 text-150 text-gray-900 shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent-700)_12%,transparent)] placeholder:text-gray-600 focus:border-accent-700 focus:outline-none"
            />
          </div>

          <div
            role="radiogroup"
            aria-label="Add to"
            className="panel-inset flex h-12 shrink-0 items-center gap-0.5 rounded-tile p-1"
          >
            {(['all', ...PLATFORM_IDS] as const).map((option) => {
              const selected = selectedPlatform === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedPlatform(option)}
                  title={option === 'all' ? 'Add each game as the platform it was found on' : `Add as ${PLATFORMS[option].name}`}
                  className={cn(
                    'flex h-10 items-center justify-center gap-2 rounded-md border px-4.5 text-90 font-bold transition-colors',
                    selected
                      ? 'border-gray-500 bg-gray-300 text-gray-1000'
                      : 'border-transparent text-gray-700 hover:text-gray-1000',
                  )}
                >
                  {option === 'all' ? null : <PlatformIcon platform={option} size={15} />}
                  {option === 'all' ? 'Auto-detect' : PLATFORMS[option].name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!phone && (results.length > 0 || loading) ? (
        <SectionRule
          title={query.trim() ? 'Results' : recent ? 'Recently played on Steam' : 'Popular on RAWG now'}
          count={results.length}
          action={
            loading ? (
              <span className="eyebrow shrink-0 animate-pulse text-accent-900">Searching…</span>
            ) : null
          }
        />
      ) : null}

      {phone && (heading || loading) ? (
        <div className="eyebrow flex items-center justify-between text-gray-600">
          <span>{heading}</span>
          {loading && <span className="animate-pulse text-accent-900">Searching…</span>}
        </div>
      ) : null}

      {rawgSkipped && !loading ? (
        <p className="flex items-center gap-1.5 text-75 text-gray-600">
          <KeyRound size={13} />
          {rawgSkipped === 'missing-key' ? (
            <>
              Showing Steam only —{' '}
              <Link to="/settings" className="font-semibold text-accent-900 hover:text-accent-1000">
                add a RAWG key
              </Link>{' '}
              to search both.
            </>
          ) : (
            'Showing Steam only — RAWG could not be reached.'
          )}
        </p>
      ) : null}

      {!loading && results.length === 0 && (
        <CatalogEmptyState error={error} query={query} source={source} linked={Boolean(steamId)} />
      )}

      {/* Rows on a wide screen, two across: a result is read for its name and
          where it came from, and a tile's worth of art for each of twenty was
          a page of pictures to scroll past to find the one you typed. */}
      {!phone ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {results.map((found) => {
            const version = versions[found.key] ?? found.source;
            const game = found.twin ? { ...pickVersion(found, version), key: found.key } : found;
            const owned = alreadyAdded(game);
            const added = Boolean(owned) || addedKeys[game.key];
            const adding = addingKey === game.key;
            const platform = selectedPlatform !== 'all' ? selectedPlatform : game.platform;

            return (
              <div
                key={game.key}
                className="flex items-center gap-3.5 rounded-tile border border-gray-300/80 bg-gray-100/72 p-3"
              >
                <CoverArt
                  src={game.image}
                  title={game.title}
                  className="h-10 w-18 shrink-0 rounded-sm object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex shrink-0" style={{ color: PLATFORMS[platform].color }}>
                      <PlatformIcon platform={platform} size={14} />
                    </span>
                    <h3 className="truncate text-150 font-bold text-gray-1000">{game.title}</h3>
                    {game.rating ? <RatingValue value={game.rating} size="xs" /> : null}
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    {source === 'both' ? <ResultPlatforms result={found} /> : null}
                    <p className="truncate text-75 text-gray-700">
                      {added
                        ? `${PLATFORMS[platform].name} · In your library`
                        : game.subtitle}
                    </p>
                  </div>
                  {found.twin && !added ? (
                    <div className="mt-2">
                      <VersionToggle
                        result={found}
                        value={version}
                        onChange={(next) => setVersions((prev) => ({ ...prev, [found.key]: next }))}
                      />
                    </div>
                  ) : null}
                </div>

                {added ? (
                  // Not a dead end: the game is already tracked, so this opens
                  // the one you have rather than offering to add it twice.
                  <button
                    type="button"
                    disabled={!owned}
                    onClick={() => owned && setEditing(owned)}
                    title={owned ? `Edit ${owned.title}` : undefined}
                    className="flex h-9 shrink-0 items-center justify-center gap-1.75 rounded-md border border-gray-300 px-3.5 text-90 font-bold text-gray-600 transition-colors enabled:hover:text-gray-1000"
                  >
                    <Check size={15} />
                    In library
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={adding}
                      onClick={() => void handleQuickAdd(game, false)}
                      title={`Add to ${collectionName(PLAYING_COLLECTION_ID, collections)}`}
                      className="flex h-9 items-center justify-center gap-1.75 rounded-md border border-accent-700/50 bg-accent-700/16 px-3.5 text-90 font-bold text-accent-900 transition-colors hover:border-accent-700 disabled:opacity-40"
                    >
                      {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                      Add
                    </button>
                    <button
                      type="button"
                      disabled={adding}
                      onClick={() => void handleQuickAdd(game, true)}
                      title={`Add to ${collectionName(BACKLOG_COLLECTION_ID, collections)}`}
                      aria-label={`Add ${game.title} to ${collectionName(BACKLOG_COLLECTION_ID, collections)}`}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-1000 disabled:opacity-40"
                    >
                      <Bookmark size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {phone ? (
      <div className="grid-cards">
        {results.map((found) => {
          const version = versions[found.key] ?? found.source;
          // The card previews the version it will add.
          const game = found.twin ? { ...pickVersion(found, version), key: found.key } : found;
          const owned = alreadyAdded(game);
          const added = Boolean(owned) || addedKeys[game.key];
          const adding = addingKey === game.key;
          const platform = selectedPlatform !== 'all' ? selectedPlatform : game.platform;
          const cfg = PLATFORMS[platform];

          return (
            <motion.div
              key={game.key}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="panel group flex flex-col justify-between overflow-hidden rounded-lg transition-colors hover:border-gray-400"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-25">
                <CoverArt
                  src={game.image}
                  title={game.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-gray-25/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-25 via-gray-25/50 to-transparent" />

                <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                  <OverlayBadge tint={cfg.tint} title={cfg.name}>
                    <PlatformIcon platform={platform} size={13} className="text-gray-1000" />
                    <span className="text-gray-1000">{cfg.shortName}</span>
                  </OverlayBadge>
                </div>

                {game.rating ? (
                  <div className="absolute right-2.5 top-2.5">
                    <OverlayBadge>
                      <RatingValue value={game.rating} size="xs" />
                    </OverlayBadge>
                  </div>
                ) : null}

                <div className="absolute inset-x-3 bottom-2">
                  <h3 className="truncate text-100 font-bold text-gray-1000">{game.title}</h3>
                  <div className="flex min-w-0 items-center gap-1.5">
                    {source === 'both' ? <ResultPlatforms result={found} /> : null}
                    <p className="truncate text-50 text-gray-700">{game.subtitle}</p>
                  </div>
                </div>
              </div>

              {found.twin && !added ? (
                <div className="border-t border-gray-200 px-3 pt-3">
                  <VersionToggle
                    result={found}
                    value={version}
                    onChange={(next) => setVersions((prev) => ({ ...prev, [found.key]: next }))}
                  />
                </div>
              ) : null}

              <div
                className={cn(
                  'flex items-center gap-2 p-3',
                  // The version toggle above already draws the divider.
                  !(found.twin && !added) && 'border-t border-gray-200',
                )}
              >
                {added ? (
                  // Not a dead end: the game is already tracked, so this opens the
                  // one you have rather than offering to add it twice.
                  <button
                    type="button"
                    disabled={!owned}
                    onClick={() => owned && setEditing(owned)}
                    title={owned ? `Edit ${owned.title}` : undefined}
                    className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-positive-700/60 bg-positive-700/16 py-1.5 text-75 font-semibold text-positive-900 transition-colors enabled:hover:bg-positive-700/24"
                  >
                    <Check size={14} />
                    In your library
                  </button>
                ) : (
                  <>
                    <Button
                      variant="accent"
                      size="s"
                      className="flex-1"
                      disabled={adding}
                      onClick={() => void handleQuickAdd(game, false)}
                    >
                      {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      {collectionName(PLAYING_COLLECTION_ID, collections)}
                    </Button>
                    <Button
                      variant="secondary"
                      size="s"
                      disabled={adding}
                      onClick={() => void handleQuickAdd(game, true)}
                      title={`Add to ${collectionName(BACKLOG_COLLECTION_ID, collections)}`}
                    >
                      <Bookmark size={14} />
                      {collectionName(BACKLOG_COLLECTION_ID, collections)}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      ) : null}

      {/* The game a result turned out to be, opened from its own card. */}
      <EditGameModal
        game={editing}
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
      />
    </div>
  );
};

/** Explains an empty catalog grid — no key, a failed call, or no matches. */
const CatalogEmptyState: React.FC<{
  error?: CatalogError;
  query: string;
  source: CatalogSource;
  linked: boolean;
}> = ({ error, query, source, linked }) => {
  const name = CATALOG_SOURCE_LABELS[source];

  if (error === 'missing-key') {
    return (
      <EmptyState
        icon={<KeyRound size={20} />}
        title="No RAWG key configured"
        description="Searching RAWG needs an API key of your own. Add one in Settings, or switch the catalog back to Steam."
        action={
          <Link
            to="/settings"
            className="inline-flex h-8 items-center rounded-sm border border-accent-700 px-4 text-100 font-semibold text-accent-900 transition-colors hover:bg-accent-700/16"
          >
            Open Settings
          </Link>
        }
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<WifiOff size={20} />}
        title={`Could not reach ${name}`}
        description="The catalog request failed. Check your connection and try the search again."
      />
    );
  }

  const trimmed = query.trim();
  return (
    <EmptyState
      icon={<Search size={20} />}
      title={trimmed ? 'No matches' : 'Search for a game'}
      description={
        trimmed
          ? `${name} has no games matching “${trimmed}”. Try a shorter or differently spelled search.`
          : source === 'steam' && !linked
            ? 'Type a title to search Steam. Link your Steam account in Settings to see your recently played games here.'
            : `Type a title to search ${name}.`
      }
    />
  );
};
