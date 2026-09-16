import React, { useEffect, useState } from 'react';
import { Check, Link2, Loader2, Search, Unlink } from 'lucide-react';
import { SteamError, SteamSearchResult, searchSteam, steamStoreUrl } from '../lib/steam';
import { formatCount } from '../lib/format';
import { CoverArt } from './CoverArt';
import { Button, TextInput } from './ui';
import { cn } from '../lib/cn';

interface SteamLinkFieldProps {
  title: string;
  appId?: number;
  onChange: (patch: { steamAppId?: number }) => void;
}

/**
 * Matching a game to its Steam app.
 *
 * Linking is the whole decision: a linked game gets the charts, screenshots and
 * reviews in its info dialog, and your Steam account keeps its achievements and
 * playtime current from then on. A game left unlinked stays exactly as typed.
 */
export const SteamLinkField: React.FC<SteamLinkFieldProps> = ({ title, appId, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(title);
  const [results, setResults] = useState<SteamSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<SteamError | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    // The same quarter-second the catalog search waits, so typing a title does
    // not fire a request per keystroke.
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
  }, [open, query]);

  return (
    <fieldset className="space-y-3 rounded-md border border-gray-200 bg-black/25 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="eyebrow flex items-center gap-2 text-gray-700">
          <Link2 size={14} />
          Steam
        </legend>

        {appId ? (
          <div className="flex items-center gap-2">
            <a
              href={steamStoreUrl(appId)}
              target="_blank"
              rel="noreferrer noopener"
              className="text-50 font-bold text-accent-900 hover:text-accent-1000"
            >
              App {appId}
            </a>
            <Button
              buttonStyle="subtle"
              size="s"
              onClick={() => onChange({ steamAppId: undefined })}
            >
              <Unlink size={13} />
              Unlink
            </Button>
          </div>
        ) : (
          <Button buttonStyle="outline" size="s" onClick={() => setOpen((value) => !value)}>
            <Search size={13} />
            {open ? 'Cancel' : 'Find on Steam'}
          </Button>
        )}
      </div>

      {appId ? (
        <p className="text-50 text-gray-600">
          Achievements, playtime and last played update on their own from your Steam account. Your
          rating, notes, status and collections are never touched.
        </p>
      ) : (
        <p className="text-50 text-gray-600">
          Optional. Linking adds player charts, screenshots and reviews to this game, and keeps its
          achievements and playtime current. Unlinked, everything stays hand-entered.
        </p>
      )}

      {open && !appId ? (
        <div className="space-y-2">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
            />
            <TextInput
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search the Steam catalog"
              placeholder="Search the Steam catalog"
              className="pl-9"
            />
          </div>

          {searching ? (
            <div className="flex items-center gap-2 py-3 text-75 text-gray-600">
              <Loader2 size={15} className="animate-spin" />
              Searching Steam…
            </div>
          ) : error ? (
            <p className="text-50 text-gray-600">
              Could not reach Steam. The game-data function may not be deployed yet — the game can
              still be added by hand.
            </p>
          ) : results.length === 0 ? (
            <p className="text-50 text-gray-600">No Steam app matches that name.</p>
          ) : (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {results.map((result) => (
                <li key={result.appid}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ steamAppId: result.appid });
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-sm border border-gray-200 p-2 text-left',
                      'bg-black/25 transition-colors hover:border-gray-300 hover:bg-gray-200',
                    )}
                  >
                    <CoverArt
                      src={result.image ?? undefined}
                      title={result.name}
                      className="h-9 w-16 shrink-0 rounded-sm object-cover"
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
                    <Check size={14} className="shrink-0 text-accent-900" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </fieldset>
  );
};
