import React from 'react';
import { Collection, GameStatus, Platform, PLATFORM_IDS, UserProfile } from '../types';
import { PLATFORMS, DEFAULT_COLLECTION_COLOR } from '../lib/constants';
import { statusLabel, STATUS_COLOR } from '../lib/status';
import { ratingColor } from '../lib/rating';
import { chipStyle } from '../lib/tone';
import { TrophyBadge, awardNoun, trophySrc } from './TrophyBadge';
import { ClockIcon, PlusIcon } from './icons';
import { Button, Dot, Field, FieldLabel, RangeInput, TextArea, TextInput } from './ui';
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

  const hoursField = useNumericField(hoursPlayed, (n) => onChange({ hoursPlayed: Math.max(0, n) }));
  const unlockedField = useNumericField(achievementsUnlocked, (n) =>
    onChange({ achievementsUnlocked: Math.max(0, n) }),
  );
  const totalField = useNumericField(achievementsTotal, (n) =>
    onChange({ achievementsTotal: Math.max(0, n) }),
  );

  return (
    <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-4">
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

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="p-0">
          <FieldLabel>Platform</FieldLabel>
        </legend>
        <div className="flex gap-2">
          {PLATFORM_IDS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ platform: p })}
              aria-pressed={platform === p}
              style={chipStyle(platform === p, PLATFORMS[p].color)}
              className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-control border-0 font-display text-[13px] font-bold"
            >
              <span
                aria-hidden="true"
                style={{
                  backgroundImage: `url(${trophySrc(p)})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                }}
                className="inline-block h-4 w-4"
              />
              {PLATFORMS[p].name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="p-0">
          <FieldLabel>Status</FieldLabel>
        </legend>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ status: s })}
              aria-pressed={status === s}
              style={chipStyle(status === s, STATUS_COLOR[s])}
              className="inline-flex h-[34px] cursor-pointer items-center gap-[7px] rounded-control border-0 px-3 font-display text-[12px] font-semibold"
            >
              <Dot color={STATUS_COLOR[s]} size={7} />
              {statusLabel(s, profile)}
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

      {/* Counts ------------------------------------------------------------ */}
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,130px),1fr))]">
        <Field label="Hours played">
          {(props) => (
            <div className="relative">
              <ClockIcon
                size={14}
                color="#9a9082"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              />
              <TextInput
                {...props}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.5}
                {...hoursField}
                className="pl-9 font-display tabular-nums"
              />
            </div>
          )}
        </Field>

        <Field label="Unlocked">
          {(props) => (
            <TextInput
              {...props}
              type="number"
              inputMode="numeric"
              min={0}
              max={achievementsTotal}
              {...unlockedField}
              className="font-display tabular-nums"
            />
          )}
        </Field>

        <Field label="Total">
          {(props) => (
            <TextInput
              {...props}
              type="number"
              inputMode="numeric"
              min={0}
              {...totalField}
              className="font-display tabular-nums"
            />
          )}
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="s" variant="neutral" onClick={() => onChange({ hoursPlayed: hoursPlayed + 1 })}>
          <PlusIcon size={12} />
          1h
        </Button>
        <Button size="s" variant="neutral" onClick={() => onChange({ hoursPlayed: hoursPlayed + 5 })}>
          <PlusIcon size={12} />
          5h
        </Button>
        <span className="mx-1 h-4 w-px bg-line" />
        <Button
          size="s"
          variant="neutral"
          disabled={achievementsUnlocked >= achievementsTotal}
          onClick={() =>
            onChange({
              achievementsUnlocked: Math.min(achievementsTotal, achievementsUnlocked + 1),
            })
          }
        >
          <PlusIcon size={12} />
          One {nounLower.replace(/s$/, '')}
        </Button>
        <Button
          size="s"
          variant="neutral"
          disabled={achievementsTotal === 0 || achievementsUnlocked >= achievementsTotal}
          onClick={() => onChange({ achievementsUnlocked: achievementsTotal })}
        >
          <TrophyBadge platform={platform} size={13} />
          Set to 100%
        </Button>
      </div>

      {/* Ratings ----------------------------------------------------------- */}
      <RatingRow
        label="Game rating"
        value={rating}
        accent="var(--tt-gold, #e5a83c)"
        valueColor={ratingColor(rating)}
        description="The game itself, scored out of 100."
        onChange={(next) => onChange({ rating: next })}
      />

      <RatingRow
        label="Grind rating"
        value={achievementRating}
        accent="var(--tt-accent, #45c8ea)"
        valueColor={ratingColor(achievementRating)}
        description={`How good the ${nounLower} were to earn — separate from how good the game is.`}
        onChange={(next) => onChange({ achievementRating: next })}
      />

      {collections.length > 0 ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="p-0">
            <FieldLabel>Collections</FieldLabel>
          </legend>
          <div className="flex flex-wrap gap-2">
            {collections.map((collection) => {
              const tone = collection.color || DEFAULT_COLLECTION_COLOR;
              const selected = selectedCollections.includes(collection.id);
              return (
                <button
                  key={collection.id}
                  type="button"
                  aria-pressed={selected}
                  style={chipStyle(selected, tone)}
                  onClick={() =>
                    onChange({
                      collections: selected
                        ? selectedCollections.filter((c) => c !== collection.id)
                        : [...selectedCollections, collection.id],
                    })
                  }
                  className="inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-control border-0 px-3 font-display text-[12px] font-semibold"
                >
                  <Dot color={tone} />
                  {collection.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

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

/** Label, live value, and a slider whose thumb carries the section's colour. */
const RatingRow: React.FC<{
  label: string;
  value: number;
  accent: string;
  valueColor: string;
  description: string;
  onChange: (next: number) => void;
}> = ({ label, value, accent, valueColor, description, onChange }) => (
  <div className="flex flex-col gap-2.5">
    <div className="flex items-center justify-between gap-2">
      <FieldLabel>{label}</FieldLabel>
      <span
        style={{ color: value ? valueColor : '#9a9082' }}
        className={cn('font-display text-[15px] font-bold tabular-nums')}
      >
        {value || '—'}
      </span>
    </div>
    <RangeInput
      accent={accent}
      value={value}
      aria-label={`${label} out of 100`}
      onChange={(e) => onChange(Number(e.target.value))}
    />
    <p className="m-0 text-[11px] text-faint [text-wrap:pretty]">{description}</p>
  </div>
);
