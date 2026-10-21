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
const MilitaryFigure: React.FC<{ weapon: CamoWeapon; max: number }> = ({ weapon, max }) => (
  <span className="text-75 font-bold tabular-nums text-gray-900">
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
}> = ({ weapon, max, onWeapon }) => (
  <span className="flex shrink-0 items-center gap-1">
    <Button
      iconOnly
      size="s"
      buttonStyle="outline"
      disabled={weapon.military <= 0}
      aria-label={`One fewer military camo on ${weapon.name}`}
      onClick={() => onWeapon(setWeaponMilitary(weapon, weapon.military - 1, max), `Military on ${weapon.name}: ${weapon.military - 1}`)}
    >
      <Minus size={13} />
    </Button>
    <Button
      iconOnly
      size="s"
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
}> = ({ weapon, max, onWeapon }) => (
  <span className="flex items-center gap-1">
    <Button size="s" buttonStyle="outline" onClick={() => onWeapon(completeWeapon(weapon, max), `All on ${weapon.name}`)}>
      All
    </Button>
    <Button size="s" buttonStyle="subtle" onClick={() => onWeapon(clearWeapon(weapon), `Cleared ${weapon.name}`)}>
      Clear
    </Button>
  </span>
);

const militaryPercent = (weapon: CamoWeapon, max: number) =>
  max > 0 ? (weapon.military / max) * 100 : 0;

/**
 * A wide screen's grid: weapon, military, then one 52px column per tier with a
 * 44px swatch cell — and in Edit mode a Row column for All / Clear. A real
 * table, so the columns line up by construction and a screen reader can walk
 * it by row and column.
 */
export const CamoTable: React.FC<GridProps> = ({ mode, cls, editable, onWeapon, onToggleTier }) => (
  <div className="panel overflow-x-auto rounded-lg">
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-gray-200">
          <th scope="col" className="eyebrow px-4 py-3 text-left text-gray-600">
            Weapon
          </th>
          <th scope="col" className="eyebrow w-44 px-3 py-3 text-left text-gray-600">
            Military
          </th>
          {mode.tiers.map((tier, i) => {
            const head = (
              <span className="flex flex-col items-center gap-1">
                <TierSwatch tier={tier} className="h-4 w-4 rounded-sm" />
                <span className="block max-w-12 truncate text-50 font-bold text-gray-700">
                  {i + 1}. {tier.name}
                </span>
              </span>
            );
            // In Edit mode a header marks its tier for the whole class, and
            // clears it again once every weapon has it.
            const all = classHasTier(cls, i);
            return (
              <th key={tier.id} scope="col" className="w-13 px-1 py-2.5 align-bottom" title={tier.name}>
                {editable ? (
                  <button
                    type="button"
                    disabled={cls.weapons.length === 0}
                    onClick={() => onToggleTier(i)}
                    aria-pressed={all}
                    aria-label={`${all ? 'Clear' : 'Mark'} ${tier.name} for every weapon in ${cls.name}`}
                    title={`${all ? 'Clear' : 'Mark'} ${tier.name} for every weapon in ${cls.name}`}
                    className={cn(
                      'w-full rounded-sm px-0.5 py-1 transition-colors hover:bg-accent-700/12',
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
            <th scope="col" className="eyebrow px-3 py-3 text-left text-gray-600">
              Row
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {cls.weapons.map((weapon) => (
          <tr key={weapon.id}>
            <th scope="row" className="max-w-56 truncate px-4 py-2 text-left text-90 font-bold text-gray-1000">
              {weapon.name}
            </th>
            <td className="px-3 py-2">
              <span className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1 space-y-1.5">
                  <MilitaryFigure weapon={weapon} max={mode.militaryMax} />
                  <Meter value={militaryPercent(weapon, mode.militaryMax)} label={`${weapon.name} military`} />
                </span>
                {editable && mode.militaryMax > 0 ? (
                  <MilitaryStepper weapon={weapon} max={mode.militaryMax} onWeapon={onWeapon} />
                ) : null}
              </span>
            </td>
            {mode.tiers.map((tier, i) => (
              <td key={tier.id} className="w-13 px-1 py-1.5">
                <span className="flex justify-center">
                  <TierCell
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
              <td className="px-3 py-2">
                <RowActions weapon={weapon} max={mode.militaryMax} onWeapon={onWeapon} />
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * Which swatch is which tier, above a phone's cards: the cards carry only the
 * swatch and its number, with no room for a header row.
 */
export const TierLegend: React.FC<{
  mode: CamoMode;
  cls: CamoClass;
  editable: boolean;
  onToggleTier: (index: number) => void;
}> = ({ mode, cls, editable, onToggleTier }) => (
  <div className={cn('flex flex-wrap', editable ? 'gap-2' : 'gap-x-3 gap-y-2')}>
    {mode.tiers.map((tier, i) => {
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
      // A phone has no header row, so in Edit mode the legend does its job:
      // each one marks its tier for the whole class, or clears it.
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
);

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
        <div className={cn('flex flex-wrap gap-1.5')}>
          {mode.tiers.map((tier, i) => (
            <TierCell
              key={tier.id}
              tier={tier}
              ordinal={i + 1}
              done={weapon.done[i]}
              editable={editable}
              weaponName={weapon.name}
              onToggle={() => toggleCell(weapon, mode, i, onWeapon)}
            />
          ))}
        </div>
      </section>
    ))}
  </div>
);
