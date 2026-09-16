import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Link2,
  PlayCircle,
  RefreshCw,
  Search,
  Users,
  WifiOff,
} from 'lucide-react';
import { UserGame } from '../types';
import { PLATFORMS } from '../lib/constants';
import { useGame } from '../context/GameContext';
import { useSync } from '../context/SyncContext';
import { syncFieldsFor } from '../lib/sync';
import { completionPercent, isPerfect } from '../lib/completion';
import { formatCount, relativeTime } from '../lib/format';
import { statusLabel, STATUS_TONE } from '../lib/status';
import { oneOf } from '../lib/usePersistentState';
import { useSyncedPreference } from '../lib/useSyncedPreference';
import {
  PLAYER_RANGES,
  PLAYER_RANGE_LABELS,
  PlayerRange,
  PlayerSeries,
  SteamAppInfo,
  SteamError,
  SteamSearchResult,
  getPlayerSeries,
  getSteamApp,
  playstationStoreSearchUrl,
  searchSteam,
  steamCommunityUrl,
  steamDbUrl,
  steamStoreUrl,
} from '../lib/steam';
import { CoverArt } from './CoverArt';
import { PsnSyncStatus } from './PsnSyncStatus';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun } from './TrophyBadge';
import { RatingValue } from './Rating';
import {
  Badge,
  Button,
  Dialog,
  FilterChip,
  Meter,
  SectionTitle,
  StatTile,
  Sparkline,
  TextInput,
} from './ui';
import { cn } from '../lib/cn';

interface GameInfoModalProps {
  game: UserGame | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Plain-language versions of the failures the client can report. */
const ERROR_TEXT: Record<SteamError, string> = {
  'not-configured': 'Supabase is not configured, so live data cannot be fetched.',
  'not-signed-in': 'Your session expired. Sign in again to load live data.',
  'not-linked': 'This game is not linked to a Steam app yet.',
  'not-found': 'Steam has nothing for this app id.',
  'private-profile': 'Your Steam profile hides its game details, so progress cannot be read.',
  'request-failed': 'Could not reach Steam. The game-data function may not be deployed yet.',
};

const formatPrice = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
};

const formatDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export const GameInfoModal: React.FC<GameInfoModalProps> = ({ game, isOpen, onClose }) => {
  if (typeof document === 'undefined' || !game) return null;

  // Keyed on the game, so opening a second card is a fresh load rather than the
  // previous game's chart with a new title over it.
  return createPortal(
    <GameInfo key={game.id} game={game} isOpen={isOpen} onClose={onClose} />,
    document.body,
  );
};

const GameInfo: React.FC<{ game: UserGame; isOpen: boolean; onClose: () => void }> = ({
  game,
  isOpen,
  onClose,
}) => {
  const { profile, updateGame } = useGame();
  const platform = PLATFORMS[game.platform] ?? PLATFORMS.steam;

  const [info, setInfo] = useState<SteamAppInfo | null>(null);
  const [infoError, setInfoError] = useState<SteamError | null>(null);
  const [loading, setLoading] = useState(false);

  const [series, setSeries] = useState<PlayerSeries | null>(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [range, setRange] = useSyncedPreference<PlayerRange>(
    'game-info-range',
    '30d',
    oneOf(PLAYER_RANGES),
  );

  const [mediaIndex, setMediaIndex] = useState(0);

  const appId = game.steamAppId;

  /**
   * Trailers first, then screenshots, as one list the strip walks through.
   *
   * The store page this comes from puts the video at the front because it is
   * the thing you actually want first, and everything after it is the same kind
   * of tile — so they are one sequence here rather than a video above a grid.
   */
  const media = useMemo(
    () => [
      ...(info?.videos ?? []).map((video) => ({ kind: 'video' as const, ...video })),
      ...(info?.screenshots ?? []).map((shot) => ({
        kind: 'shot' as const,
        ...shot,
        name: '',
      })),
    ],
    [info],
  );

  const active = media[mediaIndex] ?? media[0];

  /* -- Live data --------------------------------------------------------- */

  useEffect(() => {
    if (!isOpen || !appId) return;
    let cancelled = false;

    setLoading(true);
    void getSteamApp(appId).then((result) => {
      if (cancelled) return;
      setInfo(result.data ?? null);
      setInfoError(result.error ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, appId]);

  useEffect(() => {
    if (!isOpen || !appId) return;
    let cancelled = false;

    setSeriesLoading(true);
    void getPlayerSeries(appId, range).then((result) => {
      if (cancelled) return;
      setSeries(result.data ?? null);
      setSeriesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, appId, range]);

  const points = useMemo(
    () => (series?.points ?? []).map((p) => ({ ts: p.ts, value: p.players })),
    [series],
  );

  /**
   * The catalog details a hand-entered game usually lacks.
   *
   * Worked out rather than assumed, because the button that applies them was
   * offered even when there was nothing to apply — it wrote the same values
   * back over themselves and looked, fairly, like it had done nothing at all.
   * Now it is disabled when the game is already complete, and says what it
   * filled in when it is not.
   */
  const missingDetails = useMemo(() => {
    if (!info) return [] as string[];
    const missing: string[] = [];
    if (!game.coverImage && info.headerImage) missing.push('cover');
    if (!game.releaseDate && info.releaseDate) missing.push('release date');
    if (game.genres.length === 0 && info.genres.length > 0) missing.push('genres');
    return missing;
  }, [info, game.coverImage, game.releaseDate, game.genres]);

  const [filled, setFilled] = useState<string | null>(null);

  const applyDetails = () => {
    if (!info || missingDetails.length === 0) return;

    updateGame(game.id, {
      coverImage: game.coverImage || info.headerImage || undefined,
      releaseDate: game.releaseDate || info.releaseDate || undefined,
      genres: game.genres.length ? game.genres : info.genres,
    });

    setFilled(`Filled in the ${missingDetails.join(', ')}`);
    window.setTimeout(() => setFilled(null), 2500);
  };

  const progress = completionPercent(game);
  const perfect = isPerfect(game);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="l"
      title={game.title}
      description={`${platform.name} • ${statusLabel(game.status, profile)}`}
      icon={<PlatformIcon platform={game.platform} size={18} />}
      footer={
        <>
          {appId ? (
            <span className="mr-auto flex items-center gap-1.5 text-50 text-gray-600">
              <Link2 size={12} />
              Linked to Steam app {appId}
            </span>
          ) : null}

          {filled ? (
            <span className="flex items-center gap-1.5 text-75 font-semibold text-positive-900">
              <Check size={14} />
              {filled}
            </span>
          ) : info ? (
            <Button
              buttonStyle="outline"
              onClick={applyDetails}
              disabled={missingDetails.length === 0}
              title={
                missingDetails.length === 0
                  ? 'Cover, release date and genres are already set'
                  : `Takes the ${missingDetails.join(', ')} from Steam`
              }
            >
              <RefreshCw size={14} />
              {missingDetails.length === 0 ? 'Details complete' : 'Fill in missing details'}
            </Button>
          ) : null}

          <Button variant="accent" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Hero ------------------------------------------------------------ */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <CoverArt
            src={info?.headerImage || game.coverImage}
            title={game.title}
            className="h-28 w-full shrink-0 rounded-md object-cover sm:w-52"
          />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[game.status]}>{statusLabel(game.status, profile)}</Badge>
              {perfect ? <Badge tone="trophy">100%</Badge> : null}
              {game.rating ? <RatingValue value={game.rating} size="xs" label="Game rated" /> : null}
            </div>

            {info?.description ? (
              <p className="line-clamp-3 text-75 leading-relaxed text-gray-700">
                {info.description}
              </p>
            ) : null}

            {/* Your own figures, beside whatever Steam says — this dialog is
                where a drift between the two becomes visible. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-75 text-gray-700">
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                {game.hoursPlayed}h played
              </span>
              <span className="flex items-center gap-1.5">
                <TrophyBadge platform={game.platform} size={14} muted={!perfect} />
                {game.achievementsUnlocked} / {game.achievementsTotal}{' '}
                {awardNoun(game.platform).toLowerCase()} ({progress}%)
              </span>
              {game.lastUnlockedAt ? (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  Last {game.platform === 'ps5' ? 'trophy' : 'achievement'}{' '}
                  {formatDate(game.lastUnlockedAt)}
                </span>
              ) : null}
              {game.completedAt ? (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  Finished {formatDate(game.completedAt)}
                </span>
              ) : null}
            </div>

            <Meter
              value={progress}
              tone={perfect ? 'trophy' : 'accent'}
              label={`${game.title} progress`}
            />
          </div>
        </div>

        {/* PlayStation sync ----------------------------------------------- */}
        {/* Every PS5 game, linked to a Steam app or not: this is where you can
            see whether its trophies and playtime are actually coming through. */}
        {game.platform === 'ps5' ? (
          <section className="panel-inset space-y-3 rounded-md p-4">
            <SectionTitle
              action={
                <a
                  href={playstationStoreSearchUrl(game.title)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="eyebrow inline-flex shrink-0 items-center gap-1 text-accent-900 hover:text-accent-1000"
                >
                  PlayStation Store
                  <ArrowUpRight size={12} />
                </a>
              }
            >
              PlayStation sync
            </SectionTitle>
            <PsnSyncStatus game={game} />
            {!appId ? (
              <p className="text-50 text-gray-600">
                PlayStation has no public catalog, so charts and media appear only for games
                that are also on Steam.
              </p>
            ) : null}
          </section>
        ) : !appId ? (
          <LinkToSteam game={game} />
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-600">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-75">Loading live data…</span>
          </div>
        ) : null}

        {infoError && appId ? (
          <div className="panel-inset flex items-start gap-3 rounded-md p-4 text-75 text-gray-700">
            <WifiOff size={16} className="mt-0.5 shrink-0 text-notice-900" />
            <span>{ERROR_TEXT[infoError]}</span>
          </div>
        ) : null}

        {info ? (
          <>
            {/* Players ---------------------------------------------------- */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    <Users size={13} className="text-accent-900" />
                    Concurrent players
                  </span>
                </SectionTitle>

                <div className="flex flex-wrap items-center gap-1.5">
                  {PLAYER_RANGES.map((option) => (
                    <FilterChip
                      key={option}
                      selected={range === option}
                      onClick={() => setRange(option)}
                    >
                      {PLAYER_RANGE_LABELS[option]}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile
                  label="Playing now"
                  value={info.players.now === null ? '—' : formatCount(info.players.now)}
                  caption={info.players.rank ? `#${info.players.rank} on Steam` : undefined}
                />
                <StatTile
                  label="24 hour peak"
                  value={info.players.peak24h === null ? '—' : formatCount(info.players.peak24h)}
                />
                <StatTile
                  label="All-time peak"
                  value={
                    info.players.peakAllTime === null ? '—' : formatCount(info.players.peakAllTime)
                  }
                />
              </div>

              {seriesLoading ? (
                <div className="panel-inset flex h-[132px] items-center justify-center rounded-md text-gray-600">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : (
                <Sparkline
                  points={points}
                  color="var(--color-accent-800)"
                  formatValue={formatCount}
                  label={`${info.name} concurrent players over ${PLAYER_RANGE_LABELS[range]}`}
                />
              )}
            </section>

            {/* Reviews ---------------------------------------------------- */}
            {info.reviews ? (
              <section className="space-y-3">
                <SectionTitle
                  action={
                    info.reviews.label ? (
                      <Badge
                        tone={
                          (info.reviews.positivePercent ?? 0) >= 70
                            ? 'positive'
                            : (info.reviews.positivePercent ?? 0) >= 40
                              ? 'notice'
                              : 'negative'
                        }
                      >
                        {info.reviews.label}
                      </Badge>
                    ) : null
                  }
                >
                  Reviews
                </SectionTitle>

                <div className="panel-inset space-y-3 rounded-md p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-75">
                    <span className="font-bold tabular-nums text-gray-1000">
                      {info.reviews.positivePercent ?? 0}% positive
                    </span>
                    <span className="tabular-nums text-gray-600">
                      {formatCount(info.reviews.positive)} positive ·{' '}
                      {formatCount(info.reviews.negative)} negative ·{' '}
                      {formatCount(info.reviews.total)} total
                    </span>
                  </div>
                  <Meter
                    value={info.reviews.positivePercent ?? 0}
                    tone="positive"
                    label="Positive reviews"
                  />
                </div>
              </section>
            ) : null}

            {/* Media ------------------------------------------------------ */}
            {media.length > 0 ? (
              <section className="space-y-3">
                <SectionTitle
                  action={
                    <span className="eyebrow shrink-0 text-gray-600">
                      {info.videos.length > 0
                        ? `${info.videos.length} video${info.videos.length === 1 ? '' : 's'} · `
                        : ''}
                      {info.screenshots.length} screenshot
                      {info.screenshots.length === 1 ? '' : 's'}
                    </span>
                  }
                >
                  Media
                </SectionTitle>

                {/* One stage with a strip of thumbnails under it, the way the
                    store page this data comes from does it: trailers first,
                    then screenshots, and the strip scrolls sideways rather than
                    growing a grid down the dialog. */}
                <div className="overflow-hidden rounded-md border border-gray-300/70 bg-gray-25">
                  {active?.kind === 'video' ? (
                    <video
                      key={active.id}
                      controls
                      autoPlay
                      preload="metadata"
                      poster={active.thumbnail}
                      className="aspect-[16/9] w-full bg-gray-25"
                    >
                      {active.webm ? <source src={active.webm} type="video/webm" /> : null}
                      {active.mp4 ? <source src={active.mp4} type="video/mp4" /> : null}
                    </video>
                  ) : active ? (
                    <img
                      src={active.full}
                      alt=""
                      className="aspect-[16/9] w-full bg-gray-25 object-contain"
                    />
                  ) : null}
                </div>

                <WheelScrollStrip className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {media.map((item, index) => (
                    <button
                      key={`${item.kind}-${item.id}`}
                      type="button"
                      onClick={() => setMediaIndex(index)}
                      title={item.kind === 'video' ? item.name : 'Screenshot'}
                      aria-current={index === mediaIndex}
                      className={cn(
                        'relative w-36 shrink-0 overflow-hidden rounded-sm border transition-all',
                        index === mediaIndex
                          ? 'border-accent-700/60 shadow-[0_0_14px_-5px_var(--color-accent-700)]'
                          : 'border-gray-300/70 opacity-70 hover:opacity-100',
                      )}
                    >
                      <img
                        src={item.thumbnail}
                        alt=""
                        loading="lazy"
                        className="aspect-[16/9] w-full object-cover"
                      />
                      {item.kind === 'video' ? (
                        <span className="overlay-scrim absolute bottom-1 left-1 flex h-5 items-center gap-1 rounded-sm px-1.5 text-50 font-bold text-gray-1000">
                          <PlayCircle size={11} />
                          Trailer
                        </span>
                      ) : null}
                    </button>
                  ))}
                </WheelScrollStrip>
              </section>
            ) : null}

            {/* Details ---------------------------------------------------- */}
            <section className="space-y-3">
              <SectionTitle>Details</SectionTitle>

              <div className="grid gap-3 sm:grid-cols-2">
                <StatTile label="Released" value={info.releaseDateLabel || formatDate(info.releaseDate)} />
                <StatTile
                  label="Last updated on Steam"
                  value={info.lastUpdatedAt ? relativeTime(info.lastUpdatedAt) : '—'}
                  caption={info.lastUpdatedAt ? formatDate(info.lastUpdatedAt) : undefined}
                />
                <StatTile label="Developer" value={info.developer || '—'} />
                <StatTile label="Publisher" value={info.publisher || '—'} />
                <StatTile
                  label="Price"
                  value={
                    info.price.isFree
                      ? 'Free'
                      : info.price.cents !== null
                        ? formatPrice(info.price.cents, info.price.currency)
                        : '—'
                  }
                  caption={
                    info.price.discountPercent > 0
                      ? `${info.price.discountPercent}% off right now`
                      : undefined
                  }
                />
                <StatTile
                  label="Achievements on Steam"
                  value={info.achievements > 0 ? String(info.achievements) : 'None'}
                  caption={
                    info.achievements > 0 && info.achievements !== game.achievementsTotal
                      ? `You are tracking ${game.achievementsTotal}`
                      : undefined
                  }
                />
              </div>

              {info.genres.length > 0 || info.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {info.genres.map((genre) => (
                    <Badge key={genre} tone="accent">
                      {genre}
                    </Badge>
                  ))}
                  {info.tags
                    .filter((tag) => !info.genres.includes(tag))
                    .map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                </div>
              ) : null}
            </section>

            {/* Links ------------------------------------------------------ */}
            <section className="space-y-3">
              <SectionTitle>Links</SectionTitle>
              <div className="flex flex-wrap gap-2">
                <OutboundLink href={steamStoreUrl(info.appid)}>Steam store page</OutboundLink>
                <OutboundLink href={steamDbUrl(info.appid)}>SteamDB</OutboundLink>
                <OutboundLink href={steamCommunityUrl(info.appid)}>Community hub</OutboundLink>
                {info.website ? (
                  <OutboundLink href={info.website}>Official site</OutboundLink>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </Dialog>
  );
};

/**
 * A sideways-scrolling row that a mouse wheel can move.
 *
 * A wheel only scrolls vertically, so over a horizontal strip it did nothing
 * at all. The vertical movement is turned into horizontal scroll while the
 * strip still has somewhere to go; at either end it is let through, so the
 * dialog keeps scrolling rather than the pointer becoming a dead zone.
 * Registered by hand because React's own wheel listener is passive and cannot
 * cancel the page scroll.
 */
const WheelScrollStrip: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = ref.current;
    if (!strip) return;

    const onWheel = (event: WheelEvent) => {
      // A trackpad already scrolls sideways on its own.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const max = strip.scrollWidth - strip.clientWidth;
      if (max <= 0) return;

      const atStart = strip.scrollLeft <= 0 && event.deltaY < 0;
      const atEnd = strip.scrollLeft >= max - 1 && event.deltaY > 0;
      if (atStart || atEnd) return;

      event.preventDefault();
      strip.scrollLeft += event.deltaY;
    };

    strip.addEventListener('wheel', onWheel, { passive: false });
    return () => strip.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

const OutboundLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer noopener"
    className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-gray-300 bg-white/3 px-3 text-75 font-bold text-gray-800 transition-colors hover:border-gray-400 hover:bg-white/6 hover:text-gray-1000"
  >
    {children}
    <ExternalLink size={12} />
  </a>
);

/**
 * Matching a tracked game to its store entry.
 *
 * Offered here as well as in the edit dialog, because this is where the absence
 * is felt: the page you opened for charts and screenshots is the natural place
 * to say which game it should be showing them for.
 */
const LinkToSteam: React.FC<{ game: UserGame }> = ({ game }) => {
  const { updateGame } = useGame();
  const { syncGame } = useSync();

  // Linking is what makes a game sync, so it fetches the moment it is linked.
  const link = (appid: number) => {
    const linked = { ...game, steamAppId: appid };
    const patch = { steamAppId: appid, ...syncFieldsFor(linked) };
    updateGame(game.id, patch);
    void syncGame({ ...linked, ...patch });
  };
  const [query, setQuery] = useState(game.title);
  const [results, setResults] = useState<SteamSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<SteamError | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const result = await searchSteam(query);
      if (cancelled) return;
      setResults(result.data ?? []);
      setError(result.error ?? null);
      setSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <section className="panel-inset space-y-3 rounded-md p-4">
      <SectionTitle>Find on Steam</SectionTitle>
      <p className="text-75 text-gray-700">
        Link this game to its Steam app to see players, screenshots and reviews here — and to keep
        its achievements and playtime current from your Steam account.
      </p>

      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
        />
        <TextInput
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search Steam"
          placeholder="Search the Steam catalog"
          className="pl-9"
        />
      </div>

      {searching ? (
        <div className="flex items-center gap-2 py-4 text-75 text-gray-600">
          <Loader2 size={16} className="animate-spin" />
          Searching Steam…
        </div>
      ) : error ? (
        <p className="text-75 text-gray-700">{ERROR_TEXT[error]}</p>
      ) : results.length === 0 ? (
        <p className="text-75 text-gray-600">No Steam app matches that name.</p>
      ) : (
        <ul className="space-y-2">
          {results.map((result) => (
            <li key={result.appid}>
              <button
                type="button"
                onClick={() => link(result.appid)}
                className="flex w-full items-center gap-3 rounded-sm border border-gray-200 bg-black/25 p-2 text-left transition-colors hover:border-gray-300 hover:bg-gray-200"
              >
                <CoverArt
                  src={result.image ?? undefined}
                  title={result.name}
                  className="h-10 w-20 shrink-0 rounded-sm object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-75 font-bold text-gray-1000">
                    {result.name}
                  </span>
                  <span className="block text-50 text-gray-600">
                    App {result.appid}
                    {result.players_now !== null
                      ? ` · ${formatCount(result.players_now)} playing now`
                      : ''}
                  </span>
                </span>
                <Link2 size={14} className="shrink-0 text-accent-900" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
