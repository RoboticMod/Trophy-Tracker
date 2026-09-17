import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Search,
  Sparkles,
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
  pickVersion,
  rawgCover,
  searchCatalog,
  steamDetails,
  useCatalogSettings,
} from '../lib/catalog';
import { Platform, PLATFORM_IDS } from '../types';
import { PLATFORMS } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { syncFieldsFor } from '../lib/sync';
import { EASE_OUT } from '../lib/motion';
import { cn } from '../lib/cn';
import { CoverArt } from '../components/CoverArt';
import { PlatformIcon } from '../components/PlatformIcon';
import { RatingValue } from '../components/Rating';
import { Button, EmptyState, FilterChip, OverlayBadge, TextInput } from '../components/ui';
import { ResultPlatforms, VersionToggle } from '../components/CatalogVersions';

export const SearchView: React.FC = () => {
  const { games, addGame, profile, platformAccounts } = useGame();
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
  const [addingKey, setAddingKey] = useState<string | null>(null);

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
        status: toBacklog ? 'backlog' : 'playing',
        coverImage: cover,
        releaseDate: game.releaseDate ?? details?.releaseDate,
        genres: game.genres.length ? game.genres : (details?.genres ?? []),
        hoursPlayed: 0,
        achievementsUnlocked: 0,
        achievementsTotal: details?.achievementsTotal ?? 0,
        rating: game.rating,
        collections: toBacklog ? ['col-backlog'] : [],
        ...syncFieldsFor({ platform, steamAppId: game.steamAppId }),
      },
      // Adding from here is a run of games — the card says "in your library"
      // and you carry on down the list. Being taken to the library after each
      // one would take the search, and the query behind it, with it.
      { follow: false },
    );

    setAddingKey(null);
    setAddedKeys((prev) => ({ ...prev, [game.key]: true }));
    void syncGame(added);
  };

  const isAlreadyAdded = (game: CatalogResult) =>
    games.some(
      (g) =>
        (game.steamAppId !== undefined && g.steamAppId === game.steamAppId) ||
        g.title.toLowerCase() === game.title.toLowerCase(),
    );

  const heading = query.trim()
    ? `${results.length} result${results.length === 1 ? '' : 's'} for “${query.trim()}”`
    : recent
      ? 'Recently played on Steam'
      : source !== 'steam' && results.length > 0
        ? `${results.length} popular on RAWG now`
        : '';

  return (
    <div className="mx-auto max-w-[1760px] space-y-6 pb-10">
      <div className="space-y-2 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-700/16 text-accent-900">
            <Sparkles size={18} />
          </div>
          <h1 className="text-600 font-bold tracking-tight text-gray-1000">Search &amp; add</h1>
        </div>
        <p className="text-75 text-gray-700">
          Search {sourceName} and add games to your Steam or PlayStation library. The catalog can be
          changed in{' '}
          <Link to="/settings" className="font-semibold text-accent-900 hover:text-accent-1000">
            Settings
          </Link>
          .
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
            size={18}
          />
          <TextInput
            type="search"
            aria-label={`Search ${sourceName}`}
            placeholder="Search by title — Elden Ring, Hollow Knight, Balatro…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-12 text-200"
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

      {heading || loading ? (
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

      <div className="grid-cards">
        {results.map((found) => {
          const version = versions[found.key] ?? found.source;
          // The card previews the version it will add.
          const game = found.twin ? { ...pickVersion(found, version), key: found.key } : found;
          const added = isAlreadyAdded(game) || addedKeys[game.key];
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
                  <div className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-positive-700/60 bg-positive-700/16 py-1.5 text-75 font-semibold text-positive-900">
                    <Check size={14} />
                    In your library
                  </div>
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
                      {statusLabel('playing', profile)}
                    </Button>
                    <Button
                      variant="secondary"
                      size="s"
                      disabled={adding}
                      onClick={() => void handleQuickAdd(game, true)}
                      title={`Add to ${statusLabel('backlog', profile)}`}
                    >
                      <Bookmark size={14} />
                      {statusLabel('backlog', profile)}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
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
