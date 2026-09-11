import React from 'react';
import { Clock, Minus, Plus } from 'lucide-react';
import { Collection, GameStatus, Platform, PLATFORM_IDS, UserProfile } from '../types';
import { PLATFORMS, DEFAULT_COLLECTION_COLOR } from '../lib/constants';
import { statusLabel, STATUS_SELECTED_CLASS } from '../lib/status';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun } from './TrophyBadge';
import { RatingControl } from './Rating';
import { Button, Field, TextArea, TextInput } from './ui';
import { cn } from '../lib/cn';
import { useNumericField } from '../lib/useNumericField';

/** Everything both the add and edit dialogs collect about a game. */
export interface GameDetailsValues {
  title: string;
  platform: Platform;
  status: GameStatus;
  coverImage: string;
  hoursPlayed: number;
  rating: number;
  achievementRating: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  collections: string[];
  notes: string;
}

interface GameDetailsFieldsProps {
  values: GameDetailsValues;
  onChange: (patch: Partial<GameDetailsValues>) => void;
  /** Ties the form to a submit button living in the dialog footer. */
  formId: string;
  onSubmit: (e: React.FormEvent) => void;
  statuses: GameStatus[];
  collections: Collection[];
  profile: UserProfile;
  /** Appended below the fields, e.g. a note about syncing. */
  children?: React.ReactNode;
}

/**
 * A pair of nudge buttons under a count field, so ticking a single unlock off
 * does not mean selecting the number and retyping it.
 */
const CountStepper: React.FC<{
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
}> = ({ label, onDecrement, onIncrement, canDecrement, canIncrement }) => (
  <div className="flex gap-1.5">
    <Button
      buttonStyle="outline"
      size="s"
      onClick={onDecrement}
      disabled={!canDecrement}
      aria-label={`Decrease ${label}`}
      className="flex-1"
    >
      <Minus size={14} />
    </Button>
    <Button
      buttonStyle="outline"
      size="s"
      onClick={onIncrement}
      disabled={!canIncrement}
      aria-label={`Increase ${label}`}
      className="flex-1"
    >
      <Plus size={14} />
    </Button>
  </div>
);

/**
 * The single game form, shared by the add and edit dialogs so the two collect
 * the same details in the same order rather than drifting into two layouts.
 */
export const GameDetailsFields: React.FC<GameDetailsFieldsProps> = ({
  values,
  onChange,
  formId,
  onSubmit,
  statuses,
  collections,
  profile,
  children,
}) => {
  const {
    title,
    platform,
    status,
    coverImage,
    hoursPlayed,
    rating,
    achievementRating,
    achievementsUnlocked,
    achievementsTotal,
    collections: selectedCollections,
    notes,
  } = values;

  // Follows the platform picker above, so switching a game to PS5 relabels this
  // section to trophies straight away.
  const noun = awardNoun(platform);
  const nounLower = noun.toLowerCase();

  const hoursField = useNumericField(hoursPlayed, (n) =>
    onChange({ hoursPlayed: Math.max(0, n) }),
  );
  const unlockedField = useNumericField(achievementsUnlocked, (n) =>
    onChange({ achievementsUnlocked: Math.max(0, n) }),
  );
  const totalField = useNumericField(achievementsTotal, (n) =>
    onChange({ achievementsTotal: Math.max(0, n) }),
  );

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-5">
      <Field label="Title">
        {(props) => (
          <TextInput
            {...props}
            required
            value={title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Enter the game title"
          />
        )}
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-1.5 text-75 font-semibold text-gray-800">Platform</legend>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORM_IDS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChange({ platform: p })}
                aria-pressed={platform === p}
                className={cn(
                  'flex h-9 items-center justify-center gap-2 rounded-sm border text-75 font-semibold transition-colors',
                  platform === p
                    ? 'border-accent-700 bg-accent-100 text-accent-900'
                    : 'border-gray-300 bg-gray-75 text-gray-700 hover:border-gray-400 hover:text-gray-900',
                )}
              >
                <PlatformIcon platform={p} size={15} />
                {PLATFORMS[p].shortName}
              </button>
            ))}
          </div>
        </fieldset>

        <Field label="Cover image URL" description="Optional — blank leaves a plain lettered tile">
          {(props) => (
            <TextInput
              {...props}
              type="url"
              value={coverImage}
              onChange={(e) => onChange({ coverImage: e.target.value })}
              placeholder="https://…"
            />
          )}
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-75 font-semibold text-gray-800">Status</legend>
        <div
          className={cn(
            'grid grid-cols-2 gap-2',
            statuses.length > 4 ? 'sm:grid-cols-5' : 'sm:grid-cols-4',
          )}
        >
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ status: s })}
              aria-pressed={status === s}
              className={cn(
                'rounded-sm border px-3 py-2 text-75 font-semibold transition-colors',
                status === s
                  ? STATUS_SELECTED_CLASS[s]
                  : 'border-gray-300 bg-gray-75 text-gray-700 hover:border-gray-400 hover:text-gray-900',
              )}
            >
              {statusLabel(s, profile)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Hours played">
          {(props) => (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Clock
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                />
                <TextInput
                  {...props}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  {...hoursField}
                  className="pl-9"
                />
              </div>
              <Button
                size="m"
                variant="secondary"
                onClick={() => onChange({ hoursPlayed: hoursPlayed + 1 })}
              >
                +1h
              </Button>
              <Button
                size="m"
                variant="secondary"
                onClick={() => onChange({ hoursPlayed: hoursPlayed + 5 })}
              >
                +5h
              </Button>
            </div>
          )}
        </Field>

        <div className="space-y-1.5">
          <span className="text-75 font-semibold text-gray-800">Game rating</span>
          <RatingControl value={rating} onChange={(next) => onChange({ rating: next })} />
          <p className="text-50 text-gray-600">
            The game itself, scored out of 100. The colour runs red at the bottom through to green
            at 100.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-gray-200 bg-gray-75 p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-75 font-semibold text-gray-800">
            <TrophyBadge platform={platform} size={15} />
            {noun}
          </span>
          <Button
            buttonStyle="subtle"
            size="s"
            disabled={achievementsTotal === 0}
            onClick={() => onChange({ achievementsUnlocked: achievementsTotal })}
          >
            Set to 100%
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Field label="Unlocked">
              {(props) => (
                <TextInput
                  {...props}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={achievementsTotal}
                  {...unlockedField}
                />
              )}
            </Field>
            <CountStepper
              label={`${nounLower} unlocked`}
              canDecrement={achievementsUnlocked > 0}
              canIncrement={achievementsUnlocked < achievementsTotal}
              onDecrement={() =>
                onChange({ achievementsUnlocked: Math.max(0, achievementsUnlocked - 1) })
              }
              onIncrement={() =>
                onChange({
                  achievementsUnlocked: Math.min(achievementsTotal, achievementsUnlocked + 1),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Field label="Total available">
              {(props) => (
                <TextInput
                  {...props}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  {...totalField}
                />
              )}
            </Field>
            <CountStepper
              label={`total ${nounLower}`}
              canDecrement={achievementsTotal > 0}
              canIncrement
              onDecrement={() => {
                const next = Math.max(0, achievementsTotal - 1);
                // Lowering the total can strand the unlocked count above it.
                onChange({
                  achievementsTotal: next,
                  achievementsUnlocked: Math.min(achievementsUnlocked, next),
                });
              }}
              onIncrement={() => onChange({ achievementsTotal: achievementsTotal + 1 })}
            />
          </div>
        </div>

        <div className="space-y-1.5 border-t border-gray-200 pt-3">
          <span className="text-75 font-semibold text-gray-800">{noun} rating</span>
          <RatingControl
            value={achievementRating}
            onChange={(next) => onChange({ achievementRating: next })}
          />
          <p className="text-50 text-gray-600">
            How good the {nounLower} were to earn — separate from how good the game is.
          </p>
        </div>
      </div>

      {collections.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-75 font-semibold text-gray-800">Collections</legend>
          <div className="flex flex-wrap gap-2">
            {collections.map((col) => {
              const selected = selectedCollections.includes(col.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      collections: selected
                        ? selectedCollections.filter((c) => c !== col.id)
                        : [...selectedCollections, col.id],
                    })
                  }
                  aria-pressed={selected}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-75 font-medium transition-colors',
                    selected
                      ? 'border-accent-700 bg-accent-100 text-accent-900'
                      : 'border-gray-300 bg-gray-75 text-gray-700 hover:border-gray-400',
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: col.color || DEFAULT_COLLECTION_COLOR }}
                  />
                  {col.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <Field label="Notes" description="Optional">
        {(props) => (
          <TextArea
            {...props}
            rows={3}
            value={notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Where you got to, what is left, anything worth remembering."
          />
        )}
      </Field>

      {children}
    </form>
  );
};
