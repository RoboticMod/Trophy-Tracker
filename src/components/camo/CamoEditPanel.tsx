import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import {
  CAMO_KIND_LABEL,
  CAMO_TIER_KINDS,
  CamoClass,
  CamoGame,
  CamoMode,
  CamoTier,
  CamoTierKind,
  addTier,
  checkImageLink,
  moveTier,
  newClass,
  newWeapon,
  removeTier,
  setMilitaryMax,
  updateTier,
} from '../../lib/camo';
import { cn } from '../../lib/cn';
import { Button, Dialog, Select, TextInput } from '../ui';
import { CommitInput, ConfirmDialog, TierSwatch } from './CamoBits';

type LinkStatus = 'empty' | 'not-url' | 'loading' | 'loaded' | 'failed';

const LINK_STATUS_TEXT: Record<LinkStatus, string> = {
  empty: 'No image — the swatch shows',
  'not-url': 'Not a web address',
  loading: 'Loading…',
  loaded: 'Loaded',
  failed: 'Couldn’t load — the swatch shows',
};

/**
 * A tier's image link, with what became of it underneath. Only an http(s)
 * address is kept; anything else stays in the field, marked, and is not saved.
 */
const ImageLinkField: React.FC<{
  tier: CamoTier;
  onSave: (url: string | undefined) => void;
}> = ({ tier, onSave }) => {
  const [draft, setDraft] = useState(tier.imageUrl ?? '');
  useEffect(() => setDraft(tier.imageUrl ?? ''), [tier.imageUrl]);

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
    if (check.ok && check.url !== tier.imageUrl) onSave(check.url);
    else if (!check.ok && check.reason === 'empty' && tier.imageUrl) onSave(undefined);
  };

  return (
    <div className="space-y-1">
      <TextInput
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder="Image link (https://…)"
        aria-label={`Image link for ${tier.name}`}
        inputMode="url"
      />
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

const KIND_OPTIONS = CAMO_TIER_KINDS.map((kind) => ({ value: kind, label: CAMO_KIND_LABEL[kind] }));

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
                    message: 'Every mode, weapon and tick in it goes too. This can’t be undone.',
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
            <p className="text-50 text-gray-600">Lowering the count caps every weapon at it.</p>
          </Part>

          {/* Tiers ----------------------------------------------------------- */}
          <Part title="Tiers, in unlock order">
            <div className="space-y-2.5">
              {mode.tiers.map((tier, i) => (
                <div key={tier.id} className="panel-inset space-y-2.5 rounded-md p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <TierSwatch tier={tier} className="h-9 w-9 shrink-0 rounded-control" />
                    <span className="w-5 text-center text-75 font-bold tabular-nums text-gray-600">{i + 1}</span>
                    <div className="min-w-40 flex-1">
                      <CommitInput
                        value={tier.name}
                        aria-label={`Name of tier ${i + 1}`}
                        onCommit={(name) => saveMode((m) => updateTier(m, i, { name }))}
                      />
                    </div>
                    <Select<CamoTierKind>
                      aria-label={`Kind of ${tier.name}`}
                      value={tier.kind}
                      onChange={(kind) => saveMode((m) => updateTier(m, i, { kind }))}
                      options={KIND_OPTIONS}
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
                  <ImageLinkField
                    tier={tier}
                    onSave={(imageUrl) => saveMode((m) => updateTier(m, i, { imageUrl }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {CAMO_TIER_KINDS.map((kind) => (
                <Button key={kind} size="s" buttonStyle="outline" onClick={() => saveMode((m) => addTier(m, kind))}>
                  <Plus size={13} />
                  {CAMO_KIND_LABEL[kind]}
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
                  <div className="min-w-0 flex-1">
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
                  </div>
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
