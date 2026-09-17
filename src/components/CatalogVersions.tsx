import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import {
  CATALOG_SOURCE_LABELS,
  CatalogResult,
  ResultSource,
  pickVersion,
  resultPlatforms,
} from '../lib/catalog';
import { PLATFORMS } from '../lib/constants';
import { CoverArt } from './CoverArt';
import { PlatformIcon } from './PlatformIcon';
import { Button, OverlayBadge } from './ui';
import { cn } from '../lib/cn';

/** "Steam and PlayStation 5", for a title attribute. */
const platformNames = (result: CatalogResult) =>
  resultPlatforms(result)
    .map((platform) => PLATFORMS[platform].name)
    .join(' and ');

/**
 * The platforms a result is on, as their own marks.
 *
 * This used to name the catalog a result came from — "Steam · RAWG" for a game
 * found in both — which answered a question nobody was asking. Which databases
 * replied is plumbing; what a game runs on is the thing you are scanning the
 * list for, and a game both catalogs know is usually the one that is on the
 * console as well as the PC. Lit in the accent when there is more than one.
 */
export const ResultPlatforms: React.FC<{ result: CatalogResult; className?: string }> = ({
  result,
  className,
}) => (
  <span
    title={
      result.twin
        ? `On ${platformNames(result)} — both catalogs have it, so there is a version to pick`
        : `On ${platformNames(result)}`
    }
    className={cn(
      'inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-1',
      // Lit for a result found twice, whatever it runs on: the accent is what
      // says this one opens a choice rather than adding straight away.
      result.twin ? 'border-accent-700/50 text-accent-900' : 'border-gray-300 text-gray-700',
      className,
    )}
  >
    {resultPlatforms(result).map((platform) => (
      <PlatformIcon key={platform} platform={platform} size={11} />
    ))}
  </span>
);

const ORDER: ResultSource[] = ['steam', 'rawg'];

const WHAT_YOU_GET: Record<ResultSource, string> = {
  steam: 'Steam’s name, genres and the achievement count',
  rawg: 'RAWG’s name, genres, release date and score',
};

/** The platform mark a version will add the game on, over its own artwork. */
const PlatformOverlay: React.FC<{ version: CatalogResult }> = ({ version }) => {
  const platform = PLATFORMS[version.platform];

  return (
    <span className="absolute left-2 top-2">
      <OverlayBadge tint={platform.tint} title={platform.name}>
        <PlatformIcon platform={version.platform} size={13} className="text-gray-1000" />
        <span className="text-gray-1000">{platform.shortName}</span>
      </OverlayBadge>
    </span>
  );
};

/**
 * The choice for a game both catalogs know about: whose details to use.
 *
 * Both versions are laid side by side with their own art and summary line, so
 * the pick is made on what each one actually looks like rather than on a name —
 * and each carries the platform mark it will be added on, because that is the
 * half of this choice that outlives the dialog.
 */
export const VersionChooser: React.FC<{
  result: CatalogResult;
  onPick: (version: CatalogResult) => void;
  onCancel: () => void;
}> = ({ result, onPick, onCancel }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="eyebrow flex items-center gap-1.5 text-gray-600">
          Found on
          <ResultPlatforms result={result} />
        </p>
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
            <span className="relative block">
              <CoverArt
                src={version.image}
                title={version.title}
                className="aspect-[16/9] w-full object-cover"
              />
              <PlatformOverlay version={version} />
            </span>
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
 * The same choice, compact, for a result card that adds without a dialog. Each
 * option carries the platform it would add the game on, so the consequence of
 * the toggle is visible without reading the card above it change.
 */
export const VersionToggle: React.FC<{
  result: CatalogResult;
  value: ResultSource;
  onChange: (source: ResultSource) => void;
}> = ({ result, value, onChange }) => (
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
          'flex flex-1 items-center justify-center gap-1.5 rounded-sm py-1 text-50 font-bold uppercase tracking-wide transition-colors',
          value === source
            ? 'bg-accent-700/20 text-accent-900'
            : 'text-gray-600 hover:text-gray-900',
        )}
      >
        <PlatformIcon platform={pickVersion(result, source).platform} size={12} />
        {CATALOG_SOURCE_LABELS[source]}
      </button>
    ))}
  </div>
);
