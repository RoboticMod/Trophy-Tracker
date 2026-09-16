import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Link2, ListChecks, Loader2, Search, X } from 'lucide-react';
import { UserGame } from '../types';
import { useGame } from '../context/GameContext';
import { useSync } from '../context/SyncContext';
import { PsnError, PsnTitle, matchByTitle, normalizeTitle } from '../lib/psn';
import { syncFieldsFor } from '../lib/sync';
import { formatCount, relativeTime } from '../lib/format';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { Button, TextInput } from './ui';
import { cn } from '../lib/cn';

type Tone = 'good' | 'busy' | 'warn' | 'bad';

const TONE_DOT: Record<Tone, string> = {
  good: 'bg-positive-700 shadow-[0_0_8px_var(--color-positive-700)]',
  busy: 'bg-accent-800 shadow-[0_0_8px_var(--color-accent-700)] animate-pulse',
  warn: 'bg-notice-700 shadow-[0_0_8px_var(--color-notice-700)]',
  bad: 'bg-negative-700 shadow-[0_0_8px_var(--color-negative-700)]',
};

const TONE_TEXT: Record<Tone, string> = {
  good: 'text-positive-900',
  busy: 'text-accent-900',
  warn: 'text-notice-900',
  bad: 'text-negative-900',
};

const ERROR_TEXT: Partial<Record<PsnError, string>> = {
  'psn-not-linked': 'Your PlayStation sign-in has expired. Link the account again in Settings.',
  'not-signed-in': 'Your session expired. Sign in again to sync.',
  'not-configured': 'Supabase is not configured, so PlayStation cannot be reached.',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Whether a PS5 game is actually being kept current, and if not, why.
 *
 * Sync runs quietly in the background, which is right until it is not: a game
 * whose title matches no trophy list simply never changed, with nothing to say
 * so. This states the outcome for the one game — synced and when, still
 * syncing, not matched, or failed — and offers the fix for each.
 */
export const PsnSyncStatus: React.FC<{ game: UserGame; className?: string }> = ({
  game,
  className,
}) => {
  const { psn } = useSync();
  const [picking, setPicking] = useState(false);

  const outcome = psn.state.outcomes[game.id];
  const error = outcome?.state === 'failed' ? outcome.error : undefined;
  const matchedList =
    outcome?.trophyList ??
    psn.state.titles.find((title) => title.npCommunicationId === game.psnCommunicationId)?.name;

  let tone: Tone;
  let heading: string;
  let detail: React.ReactNode = null;

  if (!psn.isLinked) {
    tone = 'warn';
    heading = 'PlayStation account not linked';
    detail = (
      <>
        Link it in{' '}
        <Link to="/settings" className="font-semibold text-accent-900 hover:text-accent-1000">
          Settings
        </Link>{' '}
        to sync trophies and playtime.
      </>
    );
  } else if (psn.state.running && !game.lastSyncedAt) {
    tone = 'busy';
    heading = 'Syncing with PlayStation…';
  } else if (error) {
    tone = 'bad';
    heading = 'Last sync failed';
    detail = ERROR_TEXT[error] ?? 'PlayStation could not be reached. It will try again shortly.';
  } else if (outcome?.state === 'unmatched' || (!game.psnCommunicationId && !game.lastSyncedAt)) {
    tone = 'warn';
    heading = outcome ? 'No trophy list matches this title' : 'Not synced yet';
    detail = outcome
      ? 'Choose the right one below, and it will sync from then on.'
      : 'Waiting for the first sync to match it to a trophy list.';
  } else {
    tone = psn.state.running ? 'busy' : 'good';
    heading = psn.state.running ? 'Syncing with PlayStation…' : 'Synced with PlayStation';
    detail = game.lastSyncedAt ? `Checked ${relativeTime(game.lastSyncedAt)}` : null;
  }

  const facts: { label: string; value: string }[] = [];
  if (matchedList) facts.push({ label: 'Trophy list', value: matchedList });
  if (game.psnCommunicationId || game.lastSyncedAt) {
    facts.push({
      label: 'Playtime',
      value:
        outcome?.hasPlaytime === false
          ? 'Not reported by PSN'
          : `${formatCount(game.hoursPlayed)}h`,
    });
    facts.push({
      label: 'Last trophy',
      value: game.lastUnlockedAt ? formatDate(game.lastUnlockedAt) : '—',
    });
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start gap-3">
        <span aria-hidden className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[tone])} />
        <div className="min-w-0 flex-1" role="status" aria-live="polite">
          <div className={cn('flex items-center gap-1.5 text-75 font-bold', TONE_TEXT[tone])}>
            {tone === 'busy' ? <Loader2 size={13} className="animate-spin" /> : null}
            {tone === 'good' ? <Check size={13} /> : null}
            {heading}
          </div>
          {detail ? <p className="mt-0.5 text-50 text-gray-600">{detail}</p> : null}
        </div>

        {psn.isLinked ? (
          <Button buttonStyle="subtle" size="s" onClick={() => setPicking((open) => !open)}>
            {picking ? <X size={13} /> : <ListChecks size={13} />}
            {picking ? 'Cancel' : game.psnCommunicationId ? 'Change list' : 'Choose list'}
          </Button>
        ) : null}
      </div>

      {facts.length > 0 ? (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0 rounded-sm bg-black/25 px-3 py-2">
              <dt className="eyebrow text-gray-600">{fact.label}</dt>
              <dd className="mt-1 truncate text-75 font-semibold text-gray-1000" title={fact.value}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {picking ? <TrophyListPicker game={game} onDone={() => setPicking(false)} /> : null}
    </div>
  );
};

/**
 * Choosing a game's trophy list by hand, for a title the name match misses.
 * Opens on the closest match, and the choice is remembered by id.
 */
const TrophyListPicker: React.FC<{ game: UserGame; onDone: () => void }> = ({ game, onDone }) => {
  const { updateGame } = useGame();
  const { psn, loadPsnTitles, syncGame } = useSync();
  const [titles, setTitles] = useState<PsnTitle[]>(psn.state.titles);
  const [loading, setLoading] = useState(psn.state.titles.length === 0);
  const [error, setError] = useState<PsnError | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (psn.state.titles.length > 0) return;
    let cancelled = false;
    void loadPsnTitles().then((result) => {
      if (cancelled) return;
      if (Array.isArray(result)) setTitles(result);
      else setError(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // Loaded once, when the picker opens — the list does not change under it.
  }, []);

  const shown = useMemo(() => {
    const key = normalizeTitle(query);
    const filtered = key
      ? titles.filter((title) => normalizeTitle(title.name).includes(key))
      : titles;
    // The best guess first, so the common case is one click.
    const guess = query ? undefined : matchByTitle(game.title, titles, (title) => title.name);
    const ordered = guess ? [guess, ...filtered.filter((title) => title !== guess)] : filtered;
    return ordered.slice(0, 40);
  }, [titles, query, game.title]);

  const choose = (title: PsnTitle) => {
    const patch = {
      psnCommunicationId: title.npCommunicationId,
      ...syncFieldsFor(game),
    };
    updateGame(game.id, patch);
    void syncGame({ ...game, ...patch });
    onDone();
  };

  return (
    <div className="space-y-2 rounded-md border border-gray-300 bg-black/25 p-3">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
        />
        <TextInput
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // The edit dialog wraps this in its form; Enter must not save it.
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          aria-label="Search your trophy lists"
          placeholder="Search your trophy lists"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-75 text-gray-600">
          <Loader2 size={15} className="animate-spin" />
          Loading your trophy lists…
        </div>
      ) : error ? (
        <p className="text-50 text-notice-900">
          {ERROR_TEXT[error] ?? 'PlayStation could not be reached. Try again in a moment.'}
        </p>
      ) : shown.length === 0 ? (
        <p className="text-50 text-gray-600">No trophy list on your account matches that.</p>
      ) : (
        <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {shown.map((title) => {
            const current = title.npCommunicationId === game.psnCommunicationId;
            return (
              <li key={title.npCommunicationId}>
                <button
                  type="button"
                  onClick={() => choose(title)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-sm border p-2 text-left transition-colors',
                    current
                      ? 'border-accent-700/60 bg-accent-700/12'
                      : 'border-gray-200 bg-black/25 hover:border-gray-300 hover:bg-gray-200',
                  )}
                >
                  <CoverArt
                    src={title.icon ?? undefined}
                    title={title.name}
                    className="h-9 w-9 shrink-0 rounded-sm object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-75 font-bold text-gray-1000">
                      {title.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-50 text-gray-600">
                      <PlatformIcon platform="ps5" size={11} />
                      {title.platform ?? 'PlayStation'} · {title.earned} / {title.total} trophies
                    </span>
                  </span>
                  {current ? (
                    <Check size={14} className="shrink-0 text-accent-900" />
                  ) : (
                    <Link2 size={14} className="shrink-0 text-gray-600" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
