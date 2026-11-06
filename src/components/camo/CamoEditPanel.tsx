import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import {
  CAMO_GROUP_LABEL,
  CAMO_TIER_GROUPS,
  CamoClass,
  CamoGame,
  CamoMode,
  CamoTier,
  CamoTierGroup,
  addTier,
  checkImageLink,
  moveTier,
  newClass,
  newWeapon,
  removeTier,
  setMilitaryImage,
  setMilitaryMax,
  setTierGroup,
  startsTierGroup,
  tierGroup,
  updateTier,
} from '../../lib/camo';
import { cn } from '../../lib/cn';
import { Button, Dialog, Select, Switch, TextInput } from '../ui';
import { CommitInput, ConfirmDialog, TierSwatch, WeaponIcon } from './CamoBits';

type LinkStatus = 'empty' | 'not-url' | 'loading' | 'loaded' | 'failed';

const LINK_STATUS_TEXT: Record<LinkStatus, string> = {
  empty: '',
  'not-url': 'Not a web address',
  loading: 'Loading…',
  loaded: 'Loaded',
  failed: 'Couldn’t load',
};

/**
 * An image link — a tier's, or a military camo's — with what became of it
 * underneath. Only an http(s) address is kept; anything else stays in the
 * field, marked, and is not saved.
 */
const ImageLinkField: React.FC<{
  value?: string;
  label: string;
  onSave: (url: string | undefined) => void;
}> = ({ value, label, onSave }) => {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);

  const check = checkImageLink(draft);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'failed'>('loading');

  useEffect(() => {
    if (!check.ok) return;
    setLoadState('loading');
    let cancelled = false;
    const image = new Image();
    image.onload = () => !cancelled && setLoadState('loaded');
    image.onerror = () => !cancelled && setLoadState('failed');
    image.src = check.url;
    return () => {
      cancelled = true;
    };
    // Re-checked per address, not per object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [check.ok ? check.url : null]);

  const status: LinkStatus = check.ok ? loadState : check.reason;

  const commit = () => {
    if (check.ok && check.url !== value) onSave(check.url);
    else if (!check.ok && check.reason === 'empty' && value) onSave(undefined);
  };

  return (
    <div className="space-y-1">
      <TextInput
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder="Image link (https://…)"
        aria-label={label}
        inputMode="url"
      />
      {status === 'empty' ? null : (
        <p
          className={cn(
            'text-50',
            status === 'not-url' || status === 'failed'
              ? 'text-notice-900'
              : status === 'loaded'
                ? 'text-positive-900'
                : 'text-gray-600',
          )}
        >
          {LINK_STATUS_TEXT[status]}
        </p>
      )}
    </div>
  );
};

/**
 * How many weapons need this tier — the number the next tier asks for (MWII's
 * Platinum: 51, for Polyatomic). Empty means every weapon in the mode. Or the
 * tier is earned by every weapon at once when the one before it is full.
 */
const NeedField: React.FC<{
  tier: CamoTier;
  weaponCount: number;
  onSave: (patch: Pick<CamoTier, 'need' | 'auto'>) => void;
}> = ({ tier, weaponCount, onSave }) => {
  const [draft, setDraft] = useState(tier.need ? String(tier.need) : '');
  useEffect(() => setDraft(tier.need ? String(tier.need) : ''), [tier.need]);
  const commit = () => {
    const value = Number.parseInt(draft, 10);
    const next = Number.isFinite(value) && value > 0 ? value : undefined;
    if (next !== tier.need) onSave({ need: next, auto: tier.auto });
    if (!next) setDraft('');
  };
  return (
    <div className="flex shrink-0 flex-col gap-2">
      {tier.auto ? null : (
        <label className="flex items-center gap-2.5">
          <span className="text-75 text-gray-700">Needed on</span>
          <TextInput
            type="number"
            min={1}
            inputMode="numeric"
            value={draft}
            placeholder={`All ${weaponCount}`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            aria-label={`Weapons needed with ${tier.name}`}
            className="w-24"
          />
        </label>
      )}
      <span className="flex items-center gap-2.5">
        <Switch
          checked={Boolean(tier.auto)}
          onChange={(auto) => onSave({ need: auto ? undefined : tier.need, auto })}
          label={`Every weapon gets ${tier.name} at once`}
        />
        <span className="text-75 text-gray-700">Every weapon at once</span>
      </span>
    </div>
  );
};

/** A titled part of the panel. */
const Part: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  action,
  children,
}) => (
  <section className="space-y-3">
    <div className="flex items-center gap-3">
      <h3 className="eyebrow flex-1 text-gray-1000">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const GROUP_OPTIONS = CAMO_TIER_GROUPS.map((group) => ({ value: group, label: CAMO_GROUP_LABEL[group] }));

/**
 * "Weapons, camos & images…": everything about a game's structure, for the
 * mode and class on screen. Opens as a dialog — a bottom sheet on a phone.
 */
export const CamoEditPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  game: CamoGame;
  mode: CamoMode;
  cls: CamoClass;
  onSaveGame: (next: CamoGame) => void;
  onDeleteGame: () => void;
  onSelectClass: (id: string) => void;
}> = ({ isOpen, onClose, game, mode, cls, onSaveGame, onDeleteGame, onSelectClass }) => {
  const [confirm, setConfirm] = useState<null | { title: string; message: string; label: string; run: () => void }>(null);
  const [newWeaponName, setNewWeaponName] = useState('');
  const [militaryDraft, setMilitaryDraft] = useState(String(mode.militaryMax));
  useEffect(() => setMilitaryDraft(String(mode.militaryMax)), [mode.militaryMax]);

  const weaponCount = mode.classes.reduce((n, c) => n + c.weapons.length, 0);

  const saveMode = (fn: (m: CamoMode) => CamoMode) =>
    onSaveGame({
      ...game,
      data: { modes: game.data.modes.map((m) => (m.id === mode.id ? fn(m) : m)) },
    });

  const saveClass = (fn: (c: CamoClass) => CamoClass) =>
    saveMode((m) => ({ ...m, classes: m.classes.map((c) => (c.id === cls.id ? fn(c) : c)) }));

  const addWeapon = () => {
    const name = newWeaponName.trim();
    if (!name) return;
    saveClass((c) => ({ ...c, weapons: [...c.weapons, newWeapon(name, mode.tiers.length)] }));
    setNewWeaponName('');
  };

  const commitMilitary = () => {
    const value = Number.parseInt(militaryDraft, 10);
    if (!Number.isFinite(value) || value < 0) {
      setMilitaryDraft(String(mode.militaryMax));
      return;
    }
    if (value !== mode.militaryMax) saveMode((m) => setMilitaryMax(m, value));
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title="Weapons, camos & images"
        size="l"
        footer={
          <div className="flex justify-end">
            <Button size="l" variant="accent" onClick={onClose}>
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-7">
          {/* Game ------------------------------------------------------------ */}
          <Part
            title="Game"
            action={
              <Button
                size="s"
                variant="negative"
                buttonStyle="outline"
                onClick={() =>
                  setConfirm({
                    title: `Delete ${game.name}?`,
                    message: 'Every mode, weapon and tick in it goes too. Undo brings it back.',
                    label: 'Delete game',
                    run: () => {
                      onDeleteGame();
                      onClose();
                    },
                  })
                }
              >
                <Trash2 size={13} />
                Delete game
              </Button>
            }
          >
            <CommitInput
              value={game.name}
              aria-label="Game name"
              onCommit={(name) => onSaveGame({ ...game, name })}
            />
          </Part>

          {/* Mode ------------------------------------------------------------ */}
          <Part title={`Mode · ${mode.name}`}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <CommitInput
                value={mode.name}
                aria-label="Mode name"
                onCommit={(name) => saveMode((m) => ({ ...m, name }))}
              />
              <label className="flex items-center gap-2.5">
                <span className="text-75 text-gray-700">Military camos</span>
                <TextInput
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={militaryDraft}
                  onChange={(e) => setMilitaryDraft(e.target.value)}
                  onBlur={commitMilitary}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  aria-label="Military camos per weapon"
                  className="w-20"
                />
              </label>
            </div>
            {/* Collapsed: most games have no shared military pictures, and
                Cold War has 35 of them. */}
            {mode.militaryMax > 0 ? (
              <details className="group mt-3">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-75 font-bold text-gray-700">
                  <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                  Military camo pictures
                  <span className="font-semibold tabular-nums text-gray-600">
                    {(mode.militaryCamos ?? []).filter((c) => c.imageUrl).length} / {mode.militaryMax}
                  </span>
                </summary>
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  {Array.from({ length: mode.militaryMax }, (_, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-2.5 w-5 shrink-0 text-75 font-bold tabular-nums text-gray-600">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <ImageLinkField
                          value={mode.militaryCamos?.[i]?.imageUrl}
                          label={`Picture for military camo ${i + 1}`}
                          onSave={(url) => saveMode((m) => setMilitaryImage(m, i, url ?? ''))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </Part>

          {/* Tiers ----------------------------------------------------------- */}
          <Part title="Tiers, in unlock order">
            <div className="space-y-2.5">
              {mode.tiers.map((tier, i) => (
                <div
                  key={tier.id}
                  className={cn('panel-inset space-y-2.5 rounded-md p-3', startsTierGroup(mode.tiers, i) && 'mt-6')}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <TierSwatch tier={tier} className="h-9 w-9 shrink-0 rounded-control" />
                    <div className="min-w-40 flex-1">
                      <CommitInput
                        value={tier.name}
                        aria-label={`Name of tier ${i + 1}`}
                        onCommit={(name) => saveMode((m) => updateTier(m, i, { name }))}
                      />
                    </div>
                    <Select<CamoTierGroup>
                      aria-label={`Kind of ${tier.name}`}
                      value={tierGroup(tier.kind)}
                      onChange={(group) => saveMode((m) => setTierGroup(m, i, group))}
                      options={GROUP_OPTIONS}
                      className="w-32"
                    />
                    <span className="flex items-center gap-1">
                      <Button
                        iconOnly
                        size="m"
                        buttonStyle="outline"
                        disabled={i === 0}
                        aria-label={`Move ${tier.name} earlier`}
                        onClick={() => saveMode((m) => moveTier(m, i, -1))}
                      >
                        <ChevronUp size={15} />
                      </Button>
                      <Button
                        iconOnly
                        size="m"
                        buttonStyle="outline"
                        disabled={i === mode.tiers.length - 1}
                        aria-label={`Move ${tier.name} later`}
                        onClick={() => saveMode((m) => moveTier(m, i, 1))}
                      >
                        <ChevronDown size={15} />
                      </Button>
                      <Button
                        iconOnly
                        size="m"
                        buttonStyle="subtle"
                        variant="negative"
                        aria-label={`Remove ${tier.name}`}
                        onClick={() =>
                          setConfirm({
                            title: `Remove ${tier.name}?`,
                            message: 'Its tick on every weapon in this mode goes with it.',
                            label: 'Remove tier',
                            run: () => saveMode((m) => removeTier(m, i)),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </Button>
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <ImageLinkField
                        value={tier.imageUrl}
                        label={`Image link for ${tier.name}`}
                        onSave={(imageUrl) => saveMode((m) => updateTier(m, i, { imageUrl }))}
                      />
                    </div>
                    {tierGroup(tier.kind) === 'mastery' ? (
                      <NeedField
                        tier={tier}
                        weaponCount={weaponCount}
                        onSave={(patch) => saveMode((m) => updateTier(m, i, patch))}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {CAMO_TIER_GROUPS.map((group) => (
                <Button key={group} size="s" buttonStyle="outline" onClick={() => saveMode((m) => addTier(m, group))}>
                  <Plus size={13} />
                  {CAMO_GROUP_LABEL[group]}
                </Button>
              ))}
            </div>
          </Part>

          {/* Classes --------------------------------------------------------- */}
          <Part
            title="Weapon classes"
            action={
              <Button
                size="s"
                buttonStyle="outline"
                onClick={() => {
                  const added = newClass(`Class ${mode.classes.length + 1}`);
                  saveMode((m) => ({ ...m, classes: [...m.classes, added] }));
                  onSelectClass(added.id);
                }}
              >
                <Plus size={13} />
                Class
              </Button>
            }
          >
            <div className="space-y-2">
              {mode.classes.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <CommitInput
                      value={c.name}
                      aria-label={`Name of class ${c.name}`}
                      onCommit={(name) =>
                        saveMode((m) => ({
                          ...m,
                          classes: m.classes.map((x) => (x.id === c.id ? { ...x, name } : x)),
                        }))
                      }
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-75 tabular-nums text-gray-600">
                    {c.weapons.length} {c.weapons.length === 1 ? 'weapon' : 'weapons'}
                  </span>
                  <Button
                    iconOnly
                    size="m"
                    buttonStyle="subtle"
                    variant="negative"
                    disabled={mode.classes.length <= 1}
                    aria-label={`Remove class ${c.name}`}
                    onClick={() => {
                      const remove = () => {
                        saveMode((m) => ({ ...m, classes: m.classes.filter((x) => x.id !== c.id) }));
                        if (c.id === cls.id) {
                          const other = mode.classes.find((x) => x.id !== c.id);
                          if (other) onSelectClass(other.id);
                        }
                      };
                      if (c.weapons.length === 0) remove();
                      else
                        setConfirm({
                          title: `Remove ${c.name}?`,
                          message: `Its ${c.weapons.length} weapons and their ticks go with it.`,
                          label: 'Remove class',
                          run: remove,
                        });
                    }}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
            </div>
          </Part>

          {/* Weapons --------------------------------------------------------- */}
          <Part title={`Weapons · ${cls.name}`}>
            <div className="space-y-2">
              {cls.weapons.map((weapon) => (
                <div key={weapon.id} className="flex items-center gap-2">
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <CommitInput
                      value={weapon.name}
                      aria-label={`Name of ${weapon.name}`}
                      onCommit={(name) =>
                        saveClass((c) => ({
                          ...c,
                          weapons: c.weapons.map((w) => (w.id === weapon.id ? { ...w, name } : w)),
                        }))
                      }
                    />
                    <CommitInput
                      value={weapon.iconUrl ?? ''}
                      allowEmpty
                      placeholder="Icon link (https://…)"
                      aria-label={`Icon link for ${weapon.name}`}
                      onCommit={(raw) => {
                        const link = checkImageLink(raw);
                        if (raw && !link.ok) return;
                        saveClass((c) => ({
                          ...c,
                          weapons: c.weapons.map((w) => {
                            if (w.id !== weapon.id) return w;
                            const next = { ...w };
                            if (link.ok) next.iconUrl = link.url;
                            else delete next.iconUrl;
                            return next;
                          }),
                        }));
                      }}
                    />
                  </div>
                  <WeaponIcon url={weapon.iconUrl} className="hidden h-8 w-16 sm:block" />
                  <Button
                    iconOnly
                    size="m"
                    buttonStyle="subtle"
                    variant="negative"
                    aria-label={`Remove ${weapon.name}`}
                    onClick={() => {
                      const remove = () =>
                        saveClass((c) => ({ ...c, weapons: c.weapons.filter((w) => w.id !== weapon.id) }));
                      // Only asks when there is something to lose.
                      if (weapon.military === 0 && !weapon.done.some(Boolean)) remove();
                      else
                        setConfirm({
                          title: `Remove ${weapon.name}?`,
                          message: 'Its ticks and military count go with it.',
                          label: 'Remove weapon',
                          run: remove,
                        });
                    }}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addWeapon();
                }}
              >
                <div className="min-w-0 flex-1">
                  <TextInput
                    value={newWeaponName}
                    onChange={(e) => setNewWeaponName(e.target.value)}
                    placeholder="Weapon name"
                    aria-label={`New weapon in ${cls.name}`}
                  />
                </div>
                <Button type="submit" size="l" buttonStyle="outline" disabled={!newWeaponName.trim()}>
                  <Plus size={14} />
                  Add
                </Button>
              </form>
            </div>
          </Part>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.label ?? 'Remove'}
        onConfirm={() => confirm?.run()}
        onClose={() => setConfirm(null)}
      />
    </>
  );
};
