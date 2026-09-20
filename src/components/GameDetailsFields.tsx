import React from 'react';
import { CalendarCheck, Clock, Minus, Plus } from 'lucide-react';
import { Collection, Platform, PLATFORM_IDS } from '../types';
import { PLATFORMS, DEFAULT_COLLECTION_COLOR } from '../lib/constants';
import {
  COMPLETE_COLLECTION_ID,
  PERMANENT_COLLECTION_IDS,
  PERMANENT_SELECTED_CLASS,
  collectionName,
  isPermanentCollection,
  permanentOf,
  toggleCollection,
} from '../lib/collections';
import { PlatformIcon } from './PlatformIcon';
import { TrophyBadge, awardNoun } from './TrophyBadge';
import { Button, Field, MarqueeText, TextArea, TextInput } from './ui';
import { cn } from '../lib/cn';
import { useNumericField } from '../lib/useNumericField';
import { GuidedRating } from './GuidedRating';
import { SteamLinkField } from './SteamLinkField';
import { ArtworkField } from './ArtworkField';
import { isPerfect } from '../lib/completion';
import { roundHours, today } from '../lib/format';
import { ACHIEVEMENT_RATING_QUESTIONS, GAME_RATING_QUESTIONS } from '../lib/ratingQuestions';

/** Everything both the add and edit dialogs collect about a game. */
export interface GameDetailsValues {
  title: string;
  platform: Platform;
  coverImage: string;
  coverPortrait?: string;
  logoImage?: string;
  hoursPlayed: number;
  rating: number;
  achievementRating: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  collections: string[];
  notes: string;
  /** The day it was finished, as yyyy-mm-dd. Empty until there is one. */
  completedAt: string;
  /** The Steam app this game is, once matched. Linked games sync themselves. */
  steamAppId?: number;
}

interface GameDetailsFieldsProps {
  values: GameDetailsValues;
  onChange: (patch: Partial<GameDetailsValues>) => void;
  /** Ties the form to a submit button living in the dialog footer. */
  formId: string;
  onSubmit: (e: React.FormEvent) => void;
  collections: Collection[];
  /**
   * Shown in the platform panel — the saved game's sync status, whichever
   * platform it is on. Only the edit dialog has one; a game being added has not
   * been synced yet.
   */
  syncStatus?: React.ReactNode;
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
  collections,
  syncStatus,
  children,
}) => {
  const {
    title,
    platform,
    coverImage,
    hoursPlayed,
    rating,
    achievementRating,
    achievementsUnlocked,
    achievementsTotal,
    collections: selectedCollections,
    notes,
    completedAt,
  } = values;

  /** The shelf this game is on, or null when it is only in the library. */
  const shelf = permanentOf(selectedCollections);

  const listCollections = collections.filter((c) => !isPermanentCollection(c.id));

  // The date is only asked for once there is a completion to date — either
  // every award earned, or the game filed on the 100% shelf by hand.
  const finished = isPerfect(values) || shelf === COMPLETE_COLLECTION_ID;

  // Follows the platform picker above, so switching a game to PS5 relabels this
  // section to trophies straight away.
  const noun = awardNoun(platform);
  const nounLower = noun.toLowerCase();

  const awardRatingHint = `How good the ${nounLower} were to earn — separate from how good the game is.`;

  // Rounded to a tenth: hours accept decimals, but float arithmetic would
  // otherwise leave values like 12.300000000000001 in the record.
  const hoursField = useNumericField(hoursPlayed, (n) =>
    onChange({ hoursPlayed: Math.max(0, roundHours(n)) }),
  );
  const unlockedField = useNumericField(achievementsUnlocked, (n) =>
    onChange({ achievementsUnlocked: Math.max(0, n) }),
  );
  const totalField = useNumericField(achievementsTotal, (n) =>
    onChange({ achievementsTotal: Math.max(0, n) }),
  );

  return (
    // Grouped by spacing: what the game is, then where you are with it, then
    // the panels. A wider gap between groups than inside them is what lets the
    // form read as three blocks rather than one long column of equal rows.
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
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
            <legend className="eyebrow mb-1.5 text-gray-700">Platform</legend>
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
                      ? 'border-accent-700/60 bg-accent-700/16 text-accent-900'
                      : 'border-gray-300 bg-black/25 text-gray-700 hover:border-gray-400 hover:text-gray-900',
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
      </div>

      {/* Artwork -----------------------------------------------------------
          Poster and logo kept apart, the same split Steam makes. A catalog has
          one picture per game and no say in which; anyone who cares what their
          library looks like ends up wanting a particular poster for a
          particular game. Setting a poster is also what lets the logo be drawn
          over it — the app cannot tell from a URL whether a picture already has
          the name across it, so choosing one is how you say it does not. */}
      <fieldset className="space-y-3 rounded-md border border-gray-200 bg-black/25 p-4">
        <legend className="eyebrow px-1 text-gray-700">Artwork</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ArtworkField
            label="Poster"
            hint="Tall art, shown on phones."
            value={values.coverPortrait}
            onChange={(coverPortrait) => onChange({ coverPortrait })}
            aspect="portrait"
            maxDimension={600}
          />
          <ArtworkField
            label="Logo"
            hint={
              values.coverPortrait
                ? 'Drawn over the poster.'
                : 'Filled in from Steam where there is one.'
            }
            value={values.logoImage}
            onChange={(logoImage) => onChange({ logoImage })}
            aspect="wide"
            checkered
            maxDimension={512}
            maxBytes={160 * 1024}
          />
        </div>
      </fieldset>

      <div className="space-y-4">
        {/* One control for where a game is filed.

            The three permanent collections lead and behave as a single choice —
            a game is on at most one, and re-clicking the current one takes it
            off. Your own lists follow and stack freely. Exclusivity lives in
            toggleCollection rather than here, so this picker and every other
            write path agree.

            One fieldset rather than two: they were labelled "Shelf" and
            "Collections", which made the first sound like something other than
            a collection when it is exactly that. */}
        <fieldset>
          <legend className="eyebrow mb-1.5 text-gray-700">Collections</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PERMANENT_COLLECTION_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  onChange({ collections: toggleCollection(selectedCollections, id) })
                }
                aria-pressed={shelf === id}
                className={cn(
                  'flex h-9 items-center justify-center rounded-sm border px-3 text-75 font-semibold transition-colors',
                  shelf === id
                    ? PERMANENT_SELECTED_CLASS[id]
                    : 'border-gray-300 bg-black/25 text-gray-700 hover:border-gray-400 hover:text-gray-900',
                )}
              >
                {/* One line that scrolls, rather than a long custom name
                    wrapping to two and throwing the row out of line. */}
                <MarqueeText className="w-full text-center">
                  {collectionName(id, collections)}
                </MarqueeText>
              </button>
            ))}
          </div>

          {listCollections.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {listCollections.map((col) => {
                const selected = selectedCollections.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() =>
                      onChange({ collections: toggleCollection(selectedCollections, col.id) })
                    }
                    aria-pressed={selected}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-75 font-medium transition-colors',
                      selected
                        ? 'border-accent-700/60 bg-accent-700/16 text-accent-900'
                        : 'border-gray-300 bg-black/25 text-gray-700 hover:border-gray-400',
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
          )}
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
                    step={0.1}
                    {...hoursField}
                    className="pl-9"
                  />
                </div>
                {/* Input height, so the row is one even band. */}
                <Button
                  size="m"
                  variant="secondary"
                  className="h-9"
                  onClick={() => onChange({ hoursPlayed: roundHours(hoursPlayed + 1) })}
                >
                  +1h
                </Button>
                <Button
                  size="m"
                  variant="secondary"
                  className="h-9"
                  onClick={() => onChange({ hoursPlayed: roundHours(hoursPlayed + 5) })}
                >
                  +5h
                </Button>
              </div>
            )}
          </Field>

          {/* No explanation under this one: the slider is numbered and the colour
              ramp speaks for itself. The achievement score below keeps its line,
              because what it scores is genuinely not obvious. */}
          <GuidedRating
            label="Game rating"
            questions={GAME_RATING_QUESTIONS}
            value={rating}
            onChange={(next) => onChange({ rating: next })}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-md border border-gray-200 bg-black/25 p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow flex items-center gap-2 text-gray-700">
            <TrophyBadge platform={platform} size={15} />
            {noun}
          </span>
          {/* Styled like the other label-row actions in this form, so the
              panel's heading keeps to one line height. */}
          <button
            type="button"
            disabled={achievementsTotal === 0}
            // Finishing a game here dates it today unless a date is already
            // set, so the common case — unlocking the last one this evening —
            // takes no second step, and a game being entered from memory can
            // still have its real date typed over the top.
            onClick={() =>
              onChange({
                achievementsUnlocked: achievementsTotal,
                completedAt: completedAt || today(),
              })
            }
            className="eyebrow text-accent-900 transition-colors hover:text-accent-1000 disabled:text-gray-500"
          >
            Set to 100%
          </button>
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

        {finished ? (
          <div className="border-t border-gray-200 pt-4">
            <Field
              label="Date completed"
              description={`The day the last of the ${nounLower} was earned. The 100% tab is ordered by this.`}
              action={
                completedAt ? (
                  <Button
                    buttonStyle="subtle"
                    size="s"
                    onClick={() => onChange({ completedAt: '' })}
                  >
                    Clear
                  </Button>
                ) : null
              }
            >
              {(props) => (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <CalendarCheck
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                    />
                    <TextInput
                      {...props}
                      type="date"
                      // A game cannot have been finished tomorrow, and the
                      // field is easy to mistype by a year.
                      max={today()}
                      value={completedAt}
                      onChange={(e) => onChange({ completedAt: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    size="m"
                    variant="secondary"
                    onClick={() => onChange({ completedAt: today() })}
                  >
                    Today
                  </Button>
                </div>
              )}
            </Field>
          </div>
        ) : null}

{/* Asked for only once the list is finished.

            Rating how good a trophy list was to earn is a verdict on the whole
            list, and it cannot honestly be given part-way through — the grind
            you have not reached yet is exactly the part that decides it. Before
            then the field was an invitation to score something unseen. */}
        {finished ? (
          <div className="border-t border-gray-200 pt-4">
            <GuidedRating
              label={`${noun} rating`}
              questions={ACHIEVEMENT_RATING_QUESTIONS}
              value={achievementRating}
              onChange={(next) => onChange({ achievementRating: next })}
              description={awardRatingHint}
            />
          </div>
        ) : null}
      </div>

      {/* Only Steam games can be linked to a Steam app. PlayStation progress
          comes from the account link in Settings, since PSN has no per-title
          catalog to search. */}
      {platform === 'steam' ? (
        <SteamLinkField title={title} appId={values.steamAppId} onChange={onChange}>
          {syncStatus}
        </SteamLinkField>
      ) : (
        <div className="space-y-3 rounded-md border border-gray-200 bg-black/25 p-4">
          <div className="flex items-start gap-3">
            <PlatformIcon
              platform="ps5"
              size={16}
              className="mt-0.5 shrink-0 text-playstation-900"
            />
            <p className="text-75 text-gray-700">
              Trophies, playtime and the date of your latest trophy follow your linked PlayStation
              account and update on their own. The trophy list is matched by title, or chosen
              below. Whether add-on lists count towards the total is set in Settings — by
              default they do not, so a platinum reads as 100%.
            </p>
          </div>
          {syncStatus ? <div className="border-t border-gray-200 pt-3">{syncStatus}</div> : null}
        </div>
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
