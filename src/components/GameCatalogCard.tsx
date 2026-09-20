import React, { useEffect, useState } from 'react';
import { Key, Trash2 } from 'lucide-react';
import { getRawgCacheCount, clearRawgCache, hasRawgKey } from '../lib/rawg';
import { clearSteamCache, getSteamCacheCount } from '../lib/steam';
import {
  CATALOG_SOURCES,
  CATALOG_SOURCE_LABELS,
  CatalogSource,
  useCatalogSettings,
  usesRawg,
} from '../lib/catalog';
import { Button, Card, Field, SectionHeader, TextInput } from './ui';
import { cn } from '../lib/cn';


const CATALOG_HINTS: Record<CatalogSource, string> = {
  steam: 'The Steam store. Picks arrive linked, with their achievement count, and sync on their own.',
  rawg: 'RAWG’s cross-platform database. Needs a free API key of your own.',
  both: 'Both at once — finds PlayStation games Steam does not sell. A game on both asks which details to use.',
};

/**
 * Where search finds games.
 *
 * Steam by default, since it is already the source of truth for linking and
 * sync. RAWG stays available for anyone who prefers its metadata; its key is
 * saved with your profile, so it follows you to other devices.
 */
export const GameCatalogCard: React.FC = () => {
  const { source, setSource, rawgKey, setRawgKey } = useCatalogSettings();
  const [draftKey, setDraftKey] = useState(rawgKey);
  const [cacheCount, setCacheCount] = useState(() => getRawgCacheCount() + getSteamCacheCount());

  useEffect(() => setDraftKey(rawgKey), [rawgKey]);

  const saveKey = () => {
    const next = draftKey.trim();
    if (next !== rawgKey) setRawgKey(next);
  };

  return (
    <Card className="space-y-4">
      <SectionHeader
        icon={<Key size={18} />}
        title="Game catalog"
        description="Where search looks for games to add"
        action={
          <span className="rounded-full border border-gray-300 bg-gray-200 px-3 py-1 text-75 font-semibold text-gray-800">
            {cacheCount} cached
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CATALOG_SOURCES.map((option) => {
          const selected = source === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setSource(option)}
              aria-pressed={selected}
              className={cn(
                'rounded-md border p-3 text-left transition-colors',
                selected
                  ? 'border-accent-700/60 bg-accent-700/16'
                  : 'border-gray-300 bg-black/25 hover:border-gray-400 hover:bg-black/40',
              )}
            >
              <span className="block text-100 font-semibold text-gray-1000">
                {CATALOG_SOURCE_LABELS[option]}
                {option === 'steam' ? (
                  <span className="ml-2 text-50 font-bold uppercase tracking-wide text-gray-600">
                    Default
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-50 text-gray-700">{CATALOG_HINTS[option]}</span>
            </button>
          );
        })}
      </div>

      {usesRawg(source) ? (
        <Field
          label="RAWG API key"
          description={
            draftKey.trim() || !hasRawgKey()
              ? 'Saved when you leave the field.'
              : 'Blank uses the key this app was built with.'
          }
          action={
            <a
              href="https://rawg.io/apidocs"
              target="_blank"
              rel="noreferrer"
              className="eyebrow text-accent-900 hover:text-accent-1000"
            >
              Get a free key
            </a>
          }
        >
          {(props) => (
            <TextInput
              {...props}
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              onBlur={saveKey}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveKey();
              }}
              placeholder="Paste your RAWG key"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </Field>
      ) : null}

      <Button
        variant="secondary"
        buttonStyle="outline"
        disabled={cacheCount === 0}
        onClick={() => {
          clearRawgCache();
          clearSteamCache();
          setCacheCount(0);
        }}
      >
        <Trash2 size={13} />
        <span>Clear search cache</span>
      </Button>
    </Card>
  );
};

