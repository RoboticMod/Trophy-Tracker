import React from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  CamoClass,
  CamoMode,
  CamoTier,
  CamoWeapon,
  challengeFor,
  checkImageLink,
  classHasTier,
  clearWeapon,
  completeWeapon,
  cssImage,
  masteryTiles,
  militaryCamosFor,
  setWeaponMilitary,
  setWeaponTier,
  startsTierGroup,
} from '../../lib/camo';
import { cn } from '../../lib/cn';
import { Button, Meter } from '../ui';
import { CamoHover, TierCell, TierSwatch, WeaponIcon, tierInfo } from './CamoBits';

interface GridProps {
  mode: CamoMode;
  cls: CamoClass;
  /** Edit mode: whole-class headers, All / Clear and − / +. Ticking needs none of it. */
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

/** Tiers every weapon was given at once (MWII's Orion), lit on every row once earned. */
const autoLit = (mode: CamoMode): Set<number> =>
  new Set(masteryTiles(mode).filter((t) => t.tier.auto && t.complete).map((t) => t.index));

/** A tier's own line on its hover card: how many weapons the game asks for. */
export const needNote = (tier: CamoTier): string | undefined =>
  tier.auto ? 'Every weapon gets it at once' : tier.need ? `Needed on ${tier.need} weapons` : undefined;

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

/**
 * A weapon's military camos as pictures, lit up to its count; a tap on one
 * sets the count to it (or one below, tapping the last lit one). With no
 * military camos known, a meter. Cold War's 35 draw smaller.
 */
const MilitaryCamos: React.FC<{
  weapon: CamoWeapon;
  mode: CamoMode;
  cls: CamoClass;
  onWeapon: OnWeapon;
  large?: boolean;
}> = ({ weapon, mode, cls, onWeapon, large = false }) => {
  const camos = militaryCamosFor(mode, cls, weapon);
  const max = mode.militaryMax;
  if (camos.length === 0 || max === 0) {
    return <Meter value={max > 0 ? (weapon.military / max) * 100 : 0} label={`${weapon.name} military`} />;
  }
  const many = max > 12;
  return (
    <span className={cn('flex flex-wrap', many ? 'gap-0.5' : 'gap-1')}>
      {Array.from({ length: max }, (_, i) => {
        const camo = camos[i] ?? { name: `Military camo ${i + 1}` };
        const link = checkImageLink(camo.imageUrl);
        const earned = i < weapon.military;
        const next = weapon.military === i + 1 ? i : i + 1;
        return (
          <CamoHover key={i} info={{ name: camo.name, challenge: challengeFor(camo, weapon, cls) }}>
            {(anchor) => (
              <button
                type="button"
                {...anchor}
                onClick={() => onWeapon(setWeaponMilitary(weapon, next, max), `Military on ${weapon.name}: ${next}`)}
                aria-pressed={earned}
                aria-label={`${weapon.name}: ${camo.name} ${earned ? 'earned' : 'not earned'}`}
                className={cn(
                  'block shrink-0 touch-manipulation select-none rounded-sm border bg-gray-300 bg-cover bg-center transition-all focus-visible:outline-2',
                  many ? (large ? 'h-4 w-4' : 'h-5 w-5') : large ? 'h-6 w-6' : 'h-7 w-7',
                  earned ? 'border-gray-1000/40' : 'border-gray-400 opacity-25 grayscale',
                )}
                style={link.ok ? { backgroundImage: cssImage(link.url) } : undefined}
              />
            )}
          </CamoHover>
        );
      })}
    </span>
  );
};

/** − and + for one weapon's military count: always where there are no pictures to tap, else in Edit mode. */
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

const showStepper = (mode: CamoMode, cls: CamoClass, weapon: CamoWeapon, editable: boolean) =>
  mode.militaryMax > 0 && (editable || militaryCamosFor(mode, cls, weapon).length === 0);

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

/**
 * A wide screen's grid: weapon, military, then one column per tier with a 56px
 * cell — specials, a gap, then mastery — and in Edit mode All / Clear at the
 * end. A real table, so the columns line up by construction and a screen
 * reader can walk it by row and column. Headers are the camos' pictures; the
 * names are on their hover cards.
 */
export const CamoTable: React.FC<GridProps> = ({ mode, cls, editable, onWeapon, onToggleTier }) => {
  // Fixed-width tier columns, so the weapon column takes what is left; the
  // first tier of a new group (special → mastery) gets a rule and room.
  const gap = (i: number) =>
    cn('w-21 pr-1.5', startsTierGroup(mode.tiers, i) ? 'border-l border-gray-300 pl-5' : 'pl-1.5');
  const lit = autoLit(mode);
  return (
    <div className="panel overflow-x-auto rounded-lg">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className="eyebrow min-w-48 px-5 py-4 text-left align-bottom text-gray-600">
              Weapon
            </th>
            {/* Wider while editing, so eight military pictures still fit on
                one line beside − and +. */}
            <th
              scope="col"
              className={cn(
                'eyebrow px-4 py-4 text-left align-bottom text-gray-600',
                editable ? 'w-88 min-w-80' : 'w-64 min-w-56',
              )}
            >
              Military
            </th>
            {mode.tiers.map((tier, i) => {
              // In Edit mode a header marks its tier for the whole class, and
              // clears it again once every weapon has it.
              const all = classHasTier(cls, i);
              const info = { ...tierInfo(tier), note: needNote(tier) };
              return (
                <th key={tier.id} scope="col" className={cn('py-3 align-bottom', gap(i))}>
                  <CamoHover info={info} tap={!editable}>
                    {(anchor) =>
                      editable ? (
                        <button
                          type="button"
                          {...anchor}
                          disabled={cls.weapons.length === 0}
                          onClick={() => onToggleTier(i)}
                          aria-pressed={all}
                          aria-label={`${all ? 'Clear' : 'Mark'} ${tier.name} for every weapon in ${cls.name}`}
                          className={cn(
                            'mx-auto block rounded-md p-1.5 transition-colors hover:bg-accent-700/12',
                            all && 'bg-accent-700/16',
                          )}
                        >
                          <TierSwatch tier={tier} className="h-8 w-8 rounded-sm" />
                        </button>
                      ) : (
                        <span {...anchor} tabIndex={0} aria-label={tier.name} className="mx-auto block w-fit rounded-sm p-1.5">
                          <TierSwatch tier={tier} className="h-8 w-8 rounded-sm" />
                        </span>
                      )
                    }
                  </CamoHover>
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
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">{weapon.name}</span>
                  <WeaponIcon url={weapon.iconUrl} className="h-8 w-20" />
                </span>
              </th>
              <td className="px-4 py-3">
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 space-y-2">
                    <MilitaryFigure weapon={weapon} max={mode.militaryMax} large />
                    <MilitaryCamos weapon={weapon} mode={mode} cls={cls} onWeapon={onWeapon} large />
                  </span>
                  {showStepper(mode, cls, weapon, editable) ? (
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
                      done={weapon.done[i]}
                      lit={weapon.done[i] || lit.has(i)}
                      info={tierInfo(tier, weapon, cls)}
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
 * A phone's stand-in for the table's headers, in Edit mode only: one swatch
 * per tier, marking it for the whole class or clearing it. Names are on the
 * hover cards, held with a finger.
 */
export const TierLegend: React.FC<{
  mode: CamoMode;
  cls: CamoClass;
  editable: boolean;
  onToggleTier: (index: number) => void;
}> = ({ mode, cls, editable, onToggleTier }) => {
  if (!editable) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {mode.tiers.map((tier, i) => {
        const all = classHasTier(cls, i);
        return (
          <React.Fragment key={tier.id}>
            {startsTierGroup(mode.tiers, i) ? <span aria-hidden className="w-2" /> : null}
            <CamoHover info={{ ...tierInfo(tier), note: needNote(tier) }}>
              {(anchor) => (
                <button
                  type="button"
                  {...anchor}
                  disabled={cls.weapons.length === 0}
                  onClick={() => onToggleTier(i)}
                  aria-pressed={all}
                  aria-label={`${all ? 'Clear' : 'Mark'} ${tier.name} for every weapon in ${cls.name}`}
                  className={cn(
                    'flex h-11 w-11 touch-manipulation select-none items-center justify-center rounded-full border',
                    all ? 'border-accent-700/60 bg-accent-700/16' : 'border-gray-300 bg-white/3',
                  )}
                >
                  <TierSwatch tier={tier} className="h-6 w-6 rounded-sm" />
                </button>
              )}
            </CamoHover>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * A phone's grid: a card per weapon — its name, its military camos, then its
 * tier cells wrapping at 44px.
 */
export const CamoCards: React.FC<Omit<GridProps, 'onToggleTier'>> = ({ mode, cls, editable, onWeapon }) => {
  const lit = autoLit(mode);
  return (
    <div className="space-y-2.5">
      {cls.weapons.map((weapon) => (
        <section key={weapon.id} className="panel space-y-3 rounded-lg p-3.5">
          <div className="flex items-center gap-3">
            <h3 className="min-w-0 flex-1 truncate text-150 font-bold text-gray-1000">{weapon.name}</h3>
            <WeaponIcon url={weapon.iconUrl} className="h-7 w-16" />
            {editable ? <RowActions weapon={weapon} max={mode.militaryMax} onWeapon={onWeapon} /> : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1 space-y-1.5">
              <span className="flex items-baseline gap-2">
                <span className="eyebrow text-gray-600">Military</span>
                <MilitaryFigure weapon={weapon} max={mode.militaryMax} />
              </span>
              <MilitaryCamos weapon={weapon} mode={mode} cls={cls} onWeapon={onWeapon} />
            </span>
            {showStepper(mode, cls, weapon, editable) ? (
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
                  done={weapon.done[i]}
                  lit={weapon.done[i] || lit.has(i)}
                  info={tierInfo(tier, weapon, cls)}
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
};
