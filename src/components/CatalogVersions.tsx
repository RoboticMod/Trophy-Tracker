import React from 'react';
import {
  CATALOG_SOURCE_LABELS,
  CatalogResult,
  ResultSource,
  pickVersion,
  resultPlatforms,
} from '../lib/catalog';
import { PLATFORMS } from '../lib/constants';
import { PlatformIcon } from './PlatformIcon';
import { cn } from '../lib/cn';

/** "Steam and PlayStation", for a title attribute. */
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
        ? `On ${platformNames(result)} — pick the platform in the form, and its details come with it`
        : `On ${platformNames(result)}`
    }
    className={cn(
      'inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-1',
      // Lit for a result found twice, whatever it runs on: the accent is what
      // says this one comes in two versions, one for each platform.
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

/**
 * Which version of a result found in both catalogs to add, for a result card
 * that adds without a dialog. Each
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
