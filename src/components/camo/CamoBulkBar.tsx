import React, { useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { CamoClass, CamoMode } from '../../lib/camo';
import { Button, Select } from '../ui';

/**
 * Edit mode's bulk tools for the class on screen: mark every weapon through a
 * tier (military done with it), mark all military done — then what the last
 * change was, and Undo. Inline on a wide screen; a bottom sheet on a phone.
 */
export const CamoBulkBar: React.FC<{
  mode: CamoMode;
  cls: CamoClass;
  onMarkThrough: (index: number) => void;
  onAllMilitary: () => void;
  lastAction: string | null;
  canUndo: boolean;
  onUndo: () => void;
  /** Laid out as a column, for the phone's sheet. */
  stacked?: boolean;
}> = ({ mode, cls, onMarkThrough, onAllMilitary, lastAction, canUndo, onUndo, stacked = false }) => {
  // The tier to mark through, by id so it survives a reorder. Defaults to the
  // first mastery tier, which is what a whole class is usually being taken to.
  const firstMastery = mode.tiers.find((t) => t.kind !== 'special') ?? mode.tiers[0];
  const [tierId, setTierId] = useState(firstMastery?.id ?? '');
  useEffect(() => {
    if (!mode.tiers.some((t) => t.id === tierId)) setTierId(firstMastery?.id ?? '');
  }, [mode.tiers, tierId, firstMastery]);

  const index = mode.tiers.findIndex((t) => t.id === tierId);
  const empty = cls.weapons.length === 0;

  const tierOptions = mode.tiers.map((t) => ({ value: t.id, label: t.name }));

  const tools = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-90 font-bold text-gray-800">Mark every {cls.name} through</span>
        <Select
          aria-label="Tier to mark through"
          value={tierId}
          onChange={setTierId}
          options={tierOptions}
          className="w-60"
        />
        <Button size="l" variant="accent" disabled={empty || index < 0} onClick={() => onMarkThrough(index)}>
          Apply
        </Button>
      </div>
      <Button
        size="l"
        buttonStyle="outline"
        disabled={empty || mode.militaryMax === 0}
        title={`Every weapon in ${cls.name} at ${mode.militaryMax} military camos`}
        onClick={onAllMilitary}
      >
        All military done
      </Button>
    </>
  );

  const history = (
    <div className="flex min-w-0 items-center gap-3">
      <span className="min-w-0 flex-1 truncate text-75 text-gray-600" aria-live="polite">
        {lastAction ?? 'No changes yet'}
      </span>
      <Button size="l" buttonStyle="outline" disabled={!canUndo} onClick={onUndo}>
        <Undo2 size={15} />
        Undo
      </Button>
    </div>
  );

  // The phone's sheet: one job per row, every control full width or sharing a
  // row with its partner at the same height — the label above its picker, the
  // picker and Apply side by side, the second action under them, history last.
  return stacked ? (
    <div className="space-y-5">
      <div className="space-y-2">
        <span className="eyebrow block text-gray-600">Mark every {cls.name} through</span>
        <div className="flex gap-2">
          <Select
            aria-label="Tier to mark through"
            value={tierId}
            onChange={setTierId}
            options={tierOptions}
            className="min-w-0 flex-1"
          />
          <Button size="l" variant="accent" disabled={empty || index < 0} onClick={() => onMarkThrough(index)}>
            Apply
          </Button>
        </div>
      </div>
      <Button
        size="l"
        buttonStyle="outline"
        className="w-full"
        disabled={empty || mode.militaryMax === 0}
        onClick={onAllMilitary}
      >
        All military done
      </Button>
      <div className="border-t border-gray-200 pt-4">{history}</div>
    </div>
  ) : (
    <div className="panel flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg p-4">
      {tools}
      <div className="ml-auto min-w-64">{history}</div>
    </div>
  );
};
