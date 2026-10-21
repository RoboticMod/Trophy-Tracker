import React from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  CamoClass,
  CamoMode,
  CamoWeapon,
  classHasTier,
  clearWeapon,
  completeWeapon,
  setWeaponMilitary,
  setWeaponTier,
  startsTierGroup,
} from '../../lib/camo';
import { cn } from '../../lib/cn';
import { Button, Meter } from '../ui';
import { TierCell, TierSwatch } from './CamoBits';

interface GridProps {
  mode: CamoMode;
  cls: CamoClass;
  editable: boolean;
  /** Replaces one weapon in this class; the label is what the change was. */
  onWeapon: (next: CamoWeapon, label: string) => void;
  /** A tier for every weapon in the class, or off for all when all have it. */
  onToggleTier: (index: number) => void;
}

type OnWeapon = GridProps['onWeapon'];

/** Ticking or clearing one cell, by the chain rule, with what it did. */
const toggleCell = (weapon: CamoWeapon, mode: CamoMode, index: number, onWeapon: OnWeapon) => {
  const on = !weapon.done[index];
  onWeapon(
    setWeaponTier(weapon, index, on),
    `${on ? 'Ticked' : 'Cleared'} ${mode.tiers[index].name} on ${weapon.name}`,
  );
};

/** "3 / 9", or a dash while the mode's military count is not set. */
const MilitaryFigure: React.FC<{ weapon: CamoWeapon; max: number; large?: boolean }> = ({
  weapon,
  max,
  large = false,
}) => (
  <span className={cn('font-bold tabular-nums text-gray-900', large ? 'text-90' : 'text-75')}>
    {max > 0 ? (
      <>
        {weapon.military}
        <span className="font-semibold text-gray-600"> / {max}</span>
      </>
    ) : (
      <span className="text-gray-600">—</span>
    )}
  </span>
);

/** − and + for one weapon's military count, Edit mode only. */
const MilitaryStepper: React.FC<{
  weapon: CamoWeapon;
  max: number;
  onWeapon: OnWeapon;
  large?: boolean;
}> = ({ weapon, max, onWeapon, large = false }) => (
  <span className="flex shrink-0 items-center gap-1">
    <Button
      iconOnly
      size={large ? 'm' : 's'}
      buttonStyle="outline"
      disabled={weapon.military <= 0}
      aria-label={`One fewer military camo on ${weapon.name}`}
      onClick={() => onWeapon(setWeaponMilitary(weapon, weapon.military - 1, max), `Military on ${weapon.name}: ${weapon.military - 1}`)}
    >
      <Minus size={13} />
    </Button>
    <Button
      iconOnly
      size={large ? 'm' : 's'}
      buttonStyle="outline"
      disabled={weapon.military >= max}
      aria-label={`One more military camo on ${weapon.name}`}
      onClick={() => onWeapon(setWeaponMilitary(weapon, weapon.military + 1, max), `Military on ${weapon.name}: ${weapon.military + 1}`)}
    >
      <Plus size={13} />
    </Button>
  </span>
);

/** "All" and "Clear" for one weapon, Edit mode only. */
const RowActions: React.FC<{
  weapon: CamoWeapon;
  max: number;
  onWeapon: OnWeapon;
  large?: boolean;
}> = ({ weapon, max, onWeapon, large = false }) => (
  <span className="flex items-center gap-1.5">
    <Button size={large ? 'm' : 's'} buttonStyle="outline" onClick={() => onWeapon(completeWeapon(weapon, max), `All on ${weapon.name}`)}>
      All
    </Button>
    <Button size={large ? 'm' : 's'} buttonStyle="subtle" onClick={() => onWeapon(clearWeapon(weapon), `Cleared ${weapon.name}`)}>
      Clear
    </Button>
  </span>
);

const militaryPercent = (weapon: CamoWeapon, max: number) =>
  max > 0 ? (weapon.military / max) * 100 : 0;

/**
 * A wide screen's grid: weapon, military, then one column per tier with a 56px
 * cell — specials, a gap, then mastery — and in Edit mode All / Clear at the
 * end. A real table, so the columns line up by construction and a screen
 * reader can walk it by row and column. Tier names wrap rather than truncate.
 */
export const CamoTable: React.FC<GridProps> = ({ mode, cls, editable, onWeapon, onToggleTier }) => {
  // Fixed-width tier columns, so the weapon column takes what is left; the
  // first tier of a new group (special → mastery) gets a rule and room.
  const gap = (i: number) =>
    cn('w-21 pr-1.5', startsTierGroup(mode.tiers, i) ? 'border-l border-gray-300 pl-5' : 'pl-1.5');
  return (
    <div className="panel overflow-x-auto rounded-lg">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className="eyebrow min-w-48 px-5 py-4 text-left align-bottom text-gray-600">
              Weapon
            </th>
            <th scope="col" className="eyebrow w-64 min-w-56 px-4 py-4 text-left align-bottom text-gray-600">
              Military
            </th>
            {mode.tiers.map((tier, i) => {
              // Name only: the cells below already show each tier's camo.
              const head = (
                <span className="line-clamp-2 block w-[4.75rem] text-center text-75 font-bold leading-tight text-gray-800">
                  {i + 1}. {tier.name}
                </span>
              );
              // In Edit mode a header marks its tier for the whole class, and
              // clears it again once every weapon has it.
              const all = classHasTier(cls, i);
              return (
                <th key={tier.id} scope="col" className={cn('py-4 align-bottom', gap(i))} title={tier.name}>
                  {editable ? (
                    <button
                      type="button"
                      disabled={cls.weapons.length === 0}
                      onClick={() => onToggleTier(i)}
                      aria-pressed={all}
                      aria-label={`${all ? 'Clear' : 'Mark'} ${tier.name} for every weapon in ${cls.name}`}
                      title={`${all ? 'Clear' : 'Mark'} ${tier.name} for every weapon in ${cls.name}`}
                      className={cn(
                        'mx-auto block rounded-md px-1 py-1.5 transition-colors hover:bg-accent-700/12',
                        all && 'bg-accent-700/16',
                      )}
                    >
                      {head}
                    </button>
                  ) : (
                    head
                  )}
                </th>
              );
            })}
            {editable ? (
              <th scope="col" className="w-0 px-5 py-4">
                <span className="sr-only">Whole row</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {cls.weapons.map((weapon) => (
            <tr key={weapon.id}>
              <th scope="row" className="px-5 py-3 text-left text-150 font-bold text-gray-1000">
                {weapon.name}
              </th>
              <td className="px-4 py-3">
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 space-y-2">
                    <MilitaryFigure weapon={weapon} max={mode.militaryMax} large />
                    <Meter value={militaryPercent(weapon, mode.militaryMax)} label={`${weapon.name} military`} />
                  </span>
                  {editable && mode.militaryMax > 0 ? (
                    <MilitaryStepper weapon={weapon} max={mode.militaryMax} onWeapon={onWeapon} large />
                  ) : null}
                </span>
              </td>
              {mode.tiers.map((tier, i) => (
                <td key={tier.id} className={cn('py-2.5', gap(i))}>
                  <span className="flex justify-center">
                    <TierCell
                      large
                      tier={tier}
                      ordinal={i + 1}
                      done={weapon.done[i]}
                      editable={editable}
                      weaponName={weapon.name}
                      onToggle={() => toggleCell(weapon, mode, i, onWeapon)}
                    />
                  </span>
                </td>
              ))}
              {editable ? (
                <td className="w-0 px-5 py-3">
                  <RowActions weapon={weapon} max={mode.militaryMax} onWeapon={onWeapon} large />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Which swatch is which tier, above a phone's cards: the cards carry only the
 * swatch and its number, with no room for a header row.
 */
export const TierLegend: React.FC<{
  mode: CamoMode;
  cls: CamoClass;
  editable: boolean;
  onToggleTier: (index: number) => void;
}> = ({ mode, cls, editable, onToggleTier }) => {
  // One line per run of a group — specials, then mastery — so the split reads
  // the same as the gap in the cards below.
  const runs: number[][] = [];
  mode.tiers.forEach((_, i) => {
    if (i === 0 || startsTierGroup(mode.tiers, i)) runs.push([]);
    runs[runs.length - 1].push(i);
  });
  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div key={mode.tiers[run[0]].id} className={cn('flex flex-wrap', editable ? 'gap-2' : 'gap-x-3 gap-y-2')}>
          {run.map((i) => {
            const tier = mode.tiers[i];
            const face = (
              <>
                <TierSwatch tier={tier} className="h-4 w-4 shrink-0 rounded-sm" />
                <span className="font-bold tabular-nums text-gray-900">{i + 1}</span>
                {tier.name}
              </>
            );
            if (!editable) {
              return (
                <span key={tier.id} className="flex items-center gap-1.5 text-75 text-gray-700">
                  {face}
                </span>
              );
            }
            // A phone has no header row, so in Edit mode the legend does its
            // job: each one marks its tier for the whole class, or clears it.
            const all = classHasTier(cls, i);
            return (
              <button
                key={tier.id}
                type="button"
                disabled={cls.weapons.length === 0}
                onClick={() => onToggleTier(i)}
                aria-pressed={all}
                aria-label={`${all ? 'Clear' : 'Mark'} ${tier.name} for every weapon in ${cls.name}`}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-full border px-3 text-75 text-gray-700',
                  all ? 'border-accent-700/60 bg-accent-700/16' : 'border-gray-300 bg-white/3',
                )}
              >
                {face}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/**
 * A phone's grid: a card per weapon — its name, its military count and meter,
 * then its tier cells wrapping at 44px.
 */
export const CamoCards: React.FC<Omit<GridProps, 'onToggleTier'>> = ({ mode, cls, editable, onWeapon }) => (
  <div className="space-y-2.5">
    {cls.weapons.map((weapon) => (
      <section key={weapon.id} className="panel space-y-3 rounded-lg p-3.5">
        <div className="flex items-center gap-3">
          <h3 className="min-w-0 flex-1 truncate text-150 font-bold text-gray-1000">{weapon.name}</h3>
          {editable ? <RowActions weapon={weapon} max={mode.militaryMax} onWeapon={onWeapon} /> : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="eyebrow shrink-0 text-gray-600">Military</span>
          <span className="min-w-0 flex-1 space-y-1.5">
            <MilitaryFigure weapon={weapon} max={mode.militaryMax} />
            <Meter value={militaryPercent(weapon, mode.militaryMax)} label={`${weapon.name} military`} />
          </span>
          {editable && mode.militaryMax > 0 ? (
            <MilitaryStepper weapon={weapon} max={mode.militaryMax} onWeapon={onWeapon} />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {mode.tiers.map((tier, i) => (
            <React.Fragment key={tier.id}>
              {/* Specials, a gap, then mastery. */}
              {startsTierGroup(mode.tiers, i) ? <span aria-hidden className="w-3" /> : null}
              <TierCell
                tier={tier}
                ordinal={i + 1}
                done={weapon.done[i]}
                editable={editable}
                weaponName={weapon.name}
                onToggle={() => toggleCell(weapon, mode, i, onWeapon)}
              />
            </React.Fragment>
          ))}
        </div>
      </section>
    ))}
  </div>
);
