import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { CATALOG_SOURCE_LABELS, CatalogResult, ResultSource, pickVersion } from '../lib/catalog';
import { CoverArt } from './CoverArt';
import { Button } from './ui';
import { cn } from '../lib/cn';

/**
 * Which catalog a result came from — both, for a game found twice. Only shown
 * while searching both, where it is the one thing telling two lists apart.
 */
export const SourceBadge: React.FC<{ result: CatalogResult; className?: string }> = ({
  result,
  className,
}) => (
  <span
    className={cn(
      'eyebrow inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5',
      result.twin
        ? 'border-accent-700/50 text-accent-900'
        : 'border-gray-300 text-gray-700',
      className,
    )}
  >
    {result.twin ? 'Steam · RAWG' : CATALOG_SOURCE_LABELS[result.source]}
  </span>
);

const ORDER: ResultSource[] = ['steam', 'rawg'];

const WHAT_YOU_GET: Record<ResultSource, string> = {
  steam: 'Store art, genres and the achievement count',
  rawg: 'RAWG’s art, genres, release date and score',
};

/**
 * The choice for a game both catalogs know about: whose details to use.
 *
 * Both versions are laid side by side with their own art and summary line, so
 * the pick is made on what each one actually looks like rather than on a name.
 */
export const VersionChooser: React.FC<{
  result: CatalogResult;
  onPick: (version: CatalogResult) => void;
  onCancel: () => void;
}> = ({ result, onPick, onCancel }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="eyebrow text-gray-600">Found on Steam and RAWG</p>
        <h4 className="mt-1 truncate text-100 font-bold text-gray-1000">{result.title}</h4>
      </div>
      <Button buttonStyle="subtle" size="s" onClick={onCancel}>
        <ArrowLeft size={13} />
        Back
      </Button>
    </div>

    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {ORDER.map((source) => {
        const version = pickVersion(result, source);
        return (
          <button
            key={source}
            type="button"
            onClick={() => onPick(version)}
            className="group flex flex-col overflow-hidden rounded-md border border-gray-300 bg-black/25 text-left transition-colors hover:border-accent-700/60 hover:bg-accent-700/8"
          >
            <CoverArt
              src={version.image}
              title={version.title}
              className="aspect-[16/9] w-full object-cover"
            />
            <span className="space-y-1 p-3">
              <span className="flex items-center justify-between gap-2">
                <span className="eyebrow text-accent-900">
                  Use {CATALOG_SOURCE_LABELS[source]}
                </span>
                <Check
                  size={13}
                  className="text-accent-900 opacity-0 transition-opacity group-hover:opacity-100"
                />
              </span>
              <span className="block truncate text-75 font-semibold text-gray-1000">
                {version.title}
              </span>
              <span className="block truncate text-50 text-gray-600">{version.subtitle}</span>
              <span className="block text-50 text-gray-600">{WHAT_YOU_GET[source]}</span>
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * The same choice, compact, for a result card that adds without a dialog.
 */
export const VersionToggle: React.FC<{
  value: ResultSource;
  onChange: (source: ResultSource) => void;
}> = ({ value, onChange }) => (
  <div
    role="radiogroup"
    aria-label="Which details to use"
    className="flex w-full gap-1 rounded-sm bg-black/25 p-0.5"
  >
    {ORDER.map((source) => (
      <button
        key={source}
        type="button"
        role="radio"
        aria-checked={value === source}
        onClick={() => onChange(source)}
        className={cn(
          'flex-1 rounded-sm py-1 text-50 font-bold uppercase tracking-wide transition-colors',
          value === source
            ? 'bg-accent-700/20 text-accent-900'
            : 'text-gray-600 hover:text-gray-900',
        )}
      >
        {CATALOG_SOURCE_LABELS[source]}
      </button>
    ))}
  </div>
);
