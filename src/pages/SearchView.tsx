import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { searchGames, detectPlatformFromRawg, CatalogError } from '../lib/rawg';
import { RawgGameResult, Platform, PLATFORM_IDS } from '../types';
import { PLATFORMS } from '../lib/constants';
import { statusLabel } from '../lib/status';
import { ratingColor } from '../lib/rating';
import { navLabel, NAV_DESTINATIONS } from '../lib/navigation';
import { CoverArt } from '../components/CoverArt';
import { Button, Chip, ChipRowLabel, EmptyState, Eyebrow } from '../components/ui';
import { CheckIcon, CloudOffIcon, SearchIcon, StarIcon, UnlinkIcon } from '../components/icons';

const SEARCH = NAV_DESTINATIONS.find((d) => d.path === '/search')!;

export const SearchView: React.FC = () => {
  const { games, addGame, profile, sidebarConfig, setIsQuickAddOpen } = useGame();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RawgGameResult[]>([]);
  const [error, setError] = useState<CatalogError | undefined>();
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<Platform | 'all'>('all');
  const [addedIds, setAddedIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const response = await searchGames(query);
      if (cancelled) return;
      setResults(response.results);
      setError(response.error);
      setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const quickAdd = (game: RawgGameResult, toBacklog: boolean) => {
    const platform = target !== 'all' ? target : detectPlatformFromRawg(game);
    // RAWG scores out of 5; this app stores out of 100.
    const rating = game.rating ? Math.round(Math.min(5, Math.max(0, game.rating)) * 20) : undefined;

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

  const alreadyAdded = (title: string) =>
    games.some((g) => g.title.toLowerCase() === title.toLowerCase());

  return (
    <section className="tt-rise flex flex-col gap-[clamp(20px,2.6vw,28px)]">
      <div>
        <Eyebrow>RAWG catalog</Eyebrow>
        <h1 className="m-0 mt-1 font-display text-[clamp(28px,4.2vw,42px)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
          {navLabel(SEARCH, sidebarConfig)}
        </h1>
        <p className="m-0 mt-2 max-w-[56ch] text-[14px] text-muted [text-wrap:pretty]">
          Find a title in the catalog and file it under Steam or PlayStation.
        </p>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="relative">
          <SearchIcon
            size={18}
            color="#9a9082"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the game catalog"
            placeholder="Elden Ring, roguelike, Resident Evil…"
            className="h-13 w-full rounded-control border-0 bg-surface pl-[46px] pr-4 text-[16px] text-ink shadow-[inset_0_0_0_1px_var(--tt-line)] transition-shadow focus:shadow-[inset_0_0_0_1px_var(--tt-accent)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ChipRowLabel>Add to</ChipRowLabel>
          <Chip size="md" selected={target === 'all'} onClick={() => setTarget('all')}>
            Auto-detect
          </Chip>
          {PLATFORM_IDS.map((p) => (
            <Chip
              key={p}
              size="md"
              tone={PLATFORMS[p].color}
              title={PLATFORMS[p].name}
              selected={target === p}
              onClick={() => setTarget(p)}
            >
              {PLATFORMS[p].shortName}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-[12px] text-subtle">
        <span>
          {results.length} result{results.length === 1 ? '' : 's'}{' '}
          {query.trim() ? `for “${query.trim()}”` : 'from what RAWG ranks as popular now'}
        </span>
        {loading ? (
          <span className="animate-pulse font-display font-semibold text-accent">Searching…</span>
        ) : null}
      </div>

      {!loading && results.length === 0 ? (
        <CatalogEmptyState error={error} query={query} onAddManually={() => setIsQuickAddOpen(true)} />
      ) : null}

      <div className="grid-cards">
        {results.map((game) => {
          const added = alreadyAdded(game.name) || addedIds[game.id];
          const platform = target !== 'all' ? target : detectPlatformFromRawg(game);
          const config = PLATFORMS[platform];
          const score = game.rating ? Math.round(game.rating * 20) : 0;

          return (
            <div
              key={game.id}
              className="group flex h-full flex-col overflow-hidden rounded-panel bg-surface hairline transition-[transform,box-shadow] duration-200 ease-tt hover:-translate-y-[3px] hover:shadow-[0_12px_32px_-12px_rgb(0_0_0_/_.8)]"
            >
              <div className="relative aspect-[16/9] w-full bg-bg">
                <CoverArt
                  src={game.background_image}
                  title={game.name}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,#080706_2%,rgb(8_7_6_/_.82)_26%,rgb(8_7_6_/_.1)_58%,rgb(8_7_6_/_.45))]" />

                <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                  <span
                    style={{ boxShadow: `inset 0 0 0 1px ${config.line}`, color: config.color }}
                    className="inline-flex h-6 items-center gap-[5px] rounded-control bg-[rgb(8_7_6_/_.78)] px-2 font-display text-[10px] font-bold tracking-[0.1em] backdrop-blur-[6px]"
                  >
                    <span
                      aria-hidden="true"
                      style={{ background: config.color }}
                      className="h-1.5 w-1.5 rounded-full"
                    />
                    {config.mark}
                  </span>

                  {score > 0 ? (
                    <span
                      style={{ color: ratingColor(score) }}
                      title={`RAWG score ${score} out of 100`}
                      className="inline-flex h-6 shrink-0 items-center gap-1 rounded-control bg-[rgb(8_7_6_/_.78)] px-2 font-display text-[11px] font-bold tabular-nums backdrop-blur-[6px] hairline"
                    >
                      <StarIcon size={10} />
                      {score}
                    </span>
                  ) : null}
                </div>

                <div className="pointer-events-none absolute inset-x-3.5 bottom-3">
                  <h3 className="m-0 line-clamp-2 font-display text-[16px] font-bold leading-[1.15] tracking-[-0.01em] text-ink">
                    {game.name}
                  </h3>
                  <p className="m-0 mt-1 text-[12px] text-muted">
                    {game.released?.split('-')[0] || 'TBA'} &middot;{' '}
                    {game.genres?.[0]?.name || 'Video game'}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 items-center gap-2 px-3.5 pb-3.5 pt-3">
                {added ? (
                  <span className="flex w-full items-center justify-center gap-1.5 rounded-control bg-positive-wash py-2 font-display text-[12px] font-bold text-positive shadow-[inset_0_0_0_1px_rgb(79_195_138_/_.35)]">
                    <CheckIcon size={14} />
                    In your library
                  </span>
                ) : (
                  <>
                    <Button
                      variant="accent"
                      size="m"
                      className="flex-1"
                      onClick={() => quickAdd(game, false)}
                    >
                      {statusLabel('playing', profile)}
                    </Button>
                    <Button
                      variant="neutral"
                      size="m"
                      onClick={() => quickAdd(game, true)}
                      title={`Add to ${statusLabel('backlog', profile)}`}
                    >
                      {statusLabel('backlog', profile)}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

/** Explains an empty catalog grid — no key, a failed call, or no matches. */
const CatalogEmptyState: React.FC<{
  error?: CatalogError;
  query: string;
  onAddManually: () => void;
}> = ({ error, query, onAddManually }) => {
  if (error === 'missing-key') {
    return (
      <EmptyState
        icon={<UnlinkIcon size={20} />}
        title="No RAWG key configured"
        description="Catalog search runs on the RAWG API. Set VITE_RAWG_API_KEY to search real titles, or add a game by hand."
        action={
          <>
            <a
              href="https://rawg.io/apidocs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center rounded-control bg-accent px-4 font-display text-[13px] font-bold text-accent-on hover:bg-accent-ink hover:text-accent-on"
            >
              Get a free key
            </a>
            <Button variant="neutral" size="l" onClick={onAddManually}>
              Add manually
            </Button>
          </>
        }
      />
    );
  }

  if (error === 'request-failed') {
    return (
      <EmptyState
        icon={<CloudOffIcon size={20} />}
        title="Could not reach RAWG"
        description="The catalog request failed. Check your connection and try the search again."
      />
    );
  }

  return (
    <EmptyState
      icon={<SearchIcon size={20} />}
      title={query.trim() ? 'No matches' : 'Nothing to show yet'}
      description={
        query.trim()
          ? `RAWG has no titles matching “${query.trim()}”. Try a shorter or differently spelled search.`
          : 'Type a title or genre to search the RAWG catalog.'
      }
    />
  );
};
