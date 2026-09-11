import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Sparkles, Plus, Bookmark, Check, Filter, KeyRound, WifiOff } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { searchGames, detectPlatformFromRawg, CatalogError } from '../lib/rawg';
import { RawgGameResult, Platform, PLATFORM_IDS } from '../types';
import { PLATFORMS } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { CoverArt } from '../components/CoverArt';
import { PlatformIcon } from '../components/PlatformIcon';
import { RatingValue } from '../components/Rating';
import { snapRating } from '../lib/rating';
import { Button, EmptyState, OverlayBadge, TextInput } from '../components/ui';
import { cn } from '../lib/cn';

export const SearchView: React.FC = () => {
  const { games, addGame, profile } = useGame();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RawgGameResult[]>([]);
  const [error, setError] = useState<CatalogError | undefined>();
  const [loading, setLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [addedIds, setAddedIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await searchGames(query);
      if (cancelled) return;
      setResults(res.results);
      setError(res.error);
      setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handleQuickAdd = (game: RawgGameResult, toBacklog: boolean) => {
    const platform = selectedPlatform !== 'all' ? selectedPlatform : detectPlatformFromRawg(game);
    // RAWG scores out of 5; this app stores out of 100.
    const rating = game.rating ? snapRating(Math.min(5, Math.max(0, game.rating)) * 2) : undefined;

    addGame({
      rawgId: game.id,
      title: game.name,
      platform,
      status: toBacklog ? 'backlog' : 'playing',
      coverImage: game.background_image,
      releaseDate: game.released,
      genres: game.genres?.map((g) => g.name) ?? [],
      hoursPlayed: 0,
      achievementsUnlocked: 0,
      achievementsTotal: 0,
      rating,
      collections: toBacklog ? ['col-backlog'] : [],
    });

    setAddedIds((prev) => ({ ...prev, [game.id]: true }));
  };

  const isAlreadyAdded = (title: string) =>
    games.some((g) => g.title.toLowerCase() === title.toLowerCase());

  return (
    <div className="mx-auto max-w-[1760px] space-y-6 pb-10">
      <div className="space-y-2 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-100 text-accent-900">
            <Sparkles size={18} />
          </div>
          <h1 className="text-600 font-bold tracking-tight text-gray-1000">Search &amp; add</h1>
        </div>
        <p className="text-75 text-gray-700">
          Search the RAWG catalog and add titles to your Steam or PlayStation library.
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
            aria-label="Search the game catalog"
            placeholder="Search by title or genre — Elden Ring, roguelike, Resident Evil…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-12 text-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1 text-75 font-semibold text-gray-700">
            <Filter size={13} />
            Add to
          </span>

          <Chip selected={selectedPlatform === 'all'} onClick={() => setSelectedPlatform('all')}>
            Auto-detect
          </Chip>

          {PLATFORM_IDS.map((p) => (
            <Chip
              key={p}
              selected={selectedPlatform === p}
              onClick={() => setSelectedPlatform(p)}
              title={PLATFORMS[p].name}
            >
              <PlatformIcon platform={p} size={15} />
              <span>{PLATFORMS[p].shortName}</span>
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-75 text-gray-700">
        <span>
          {results.length} result{results.length === 1 ? '' : 's'}{' '}
          {query.trim() ? `for “${query}”` : 'from what RAWG ranks as popular now'}
        </span>
        {loading && <span className="animate-pulse font-semibold text-accent-900">Searching…</span>}
      </div>

      {!loading && results.length === 0 && (
        <CatalogEmptyState error={error} query={query} />
      )}

      <div className="grid-cards">
        {results.map((game) => {
          const added = isAlreadyAdded(game.name) || addedIds[game.id];
          const platform =
            selectedPlatform !== 'all' ? selectedPlatform : detectPlatformFromRawg(game);
          const cfg = PLATFORMS[platform];

          return (
            <motion.div
              key={game.id}
              whileHover={{ y: -3 }}
              className="group flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-gray-100 transition-colors hover:border-gray-300"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-25">
                <CoverArt
                  src={game.background_image}
                  title={game.name}
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
                      <RatingValue value={snapRating(game.rating * 2)} size="xs" />
                    </OverlayBadge>
                  </div>
                ) : null}

                <div className="absolute inset-x-3 bottom-2">
                  <h3 className="truncate text-100 font-bold text-gray-1000">{game.name}</h3>
                  <p className="text-50 text-gray-700">
                    {game.released?.split('-')[0] || 'TBA'} •{' '}
                    {game.genres?.[0]?.name || 'Video game'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-gray-200 p-3">
                {added ? (
                  <div className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-positive-700 bg-positive-100 py-1.5 text-75 font-semibold text-positive-900">
                    <Check size={14} />
                    In your library
                  </div>
                ) : (
                  <>
                    <Button
                      variant="accent"
                      size="s"
                      className="flex-1"
                      onClick={() => handleQuickAdd(game, false)}
                    >
                      <Plus size={14} />
                      {statusLabel('playing', profile)}
                    </Button>
                    <Button
                      variant="secondary"
                      size="s"
                      onClick={() => handleQuickAdd(game, true)}
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
const CatalogEmptyState: React.FC<{ error?: CatalogError; query: string }> = ({ error, query }) => {
  if (error === 'missing-key') {
    return (
      <EmptyState
        icon={<KeyRound size={20} />}
        title="No RAWG key configured"
        description="Catalog search runs on the RAWG API. Set VITE_RAWG_API_KEY to search real titles, or add a game by hand from the library."
        action={
          <a
            href="https://rawg.io/apidocs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center rounded-sm border border-accent-700 px-4 text-100 font-semibold text-accent-900 transition-colors hover:bg-accent-100"
          >
            Get a free key
          </a>
        }
      />
    );
  }

  if (error === 'request-failed') {
    return (
      <EmptyState
        icon={<WifiOff size={20} />}
        title="Could not reach RAWG"
        description="The catalog request failed. Check your connection and try the search again."
      />
    );
  }

  return (
    <EmptyState
      icon={<Search size={20} />}
      title={query.trim() ? 'No matches' : 'Nothing to show yet'}
      description={
        query.trim()
          ? `RAWG has no titles matching “${query.trim()}”. Try a shorter or differently spelled search.`
          : 'Type a title or genre to search the RAWG catalog.'
      }
    />
  );
};

const Chip: React.FC<{
  selected: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}> = ({ selected, onClick, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={selected}
    className={cn(
      'inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-75 font-semibold transition-colors',
      selected
        ? 'border-accent-700 bg-accent-100 text-accent-900'
        : 'border-gray-200 bg-gray-100 text-gray-700 hover:border-gray-300 hover:text-gray-900',
    )}
  >
    {children}
  </button>
);
