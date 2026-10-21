import React, { useMemo, useState } from 'react';
import { Crosshair, Pencil, Check, Plus, Layers, Trash2, Settings2, ListChecks, Undo2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { useCamoHistory } from '../lib/useCamoHistory';
import {
  CAMO_VIEW_KEY,
  CamoGame,
  CamoMode,
  CamoView,
  CamoWeapon,
  EMPTY_CAMO_VIEW,
  TIER_COLOR,
  classHasTier,
  clearedMode,
  completeClassMilitary,
  isCamoView,
  markClassThrough,
  toggleClassTier,
  masteryTiles,
  viewedMode,
} from '../lib/camo';
import { usePersistentState } from '../lib/usePersistentState';
import { useIsPhone } from '../lib/useMediaQuery';
import { cn } from '../lib/cn';
import { CamoCards, CamoTable, TierLegend } from '../components/camo/CamoGrid';
import { ConfirmDialog, LockedLabel, TierSwatch } from '../components/camo/CamoBits';
import { CamoEditPanel } from '../components/camo/CamoEditPanel';
import { CamoBulkBar } from '../components/camo/CamoBulkBar';
import { Button, Dialog, EmptyState, FilterChip, Meter, PageHeader } from '../components/ui';
import { AddCamoGameDialog } from '../components/camo/AddCamoGameDialog';

/** The mastery tiles: one per non-special tier, x / y and a meter in its colour. */
const MasteryTiles: React.FC<{ mode: CamoMode }> = ({ mode }) => {
  const tiles = masteryTiles(mode);
  if (tiles.length === 0) return null;
  return (
    // A row that scrolls sideways on a phone. Each tile is flex-shrink 0, or
    // the row collapses them to fit instead of scrolling.
    <div className="scroll-row -mx-4 flex gap-2.5 px-4 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] md:gap-3 md:px-0">
      {tiles.map((tile) => (
        <div
          key={tile.tier.id}
          className={cn(
            'panel flex w-44 shrink-0 items-center gap-3 rounded-lg p-3 md:w-auto md:gap-4 md:p-4',
            tile.locked && 'opacity-60',
          )}
        >
          <TierSwatch tier={tile.tier} className="h-10 w-10 shrink-0 rounded-control md:h-12 md:w-12" />
          <div className="min-w-0 flex-1 space-y-1.5 md:space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-90 font-bold text-gray-1000 md:text-150">{tile.tier.name}</span>
              {tile.locked ? (
                <LockedLabel />
              ) : (
                <span className="shrink-0 text-75 font-bold tabular-nums text-gray-800 md:text-90">
                  {tile.done} / {tile.total}
                </span>
              )}
            </div>
            <Meter
              value={tile.total > 0 ? (tile.done / tile.total) * 100 : 0}
              color={TIER_COLOR[tile.tier.kind]}
              label={`${tile.tier.name} progress`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * The Call of Duty camo tracker.
 *
 * No API exposes camo progress, so all of it is typed and ticked by hand. The
 * page opens read-only: View mode cannot change a cell, so a stray tap on a
 * phone does nothing. Edit unlocks the rest — the cells, military counts,
 * whole-row All / Clear, column headers that mark a tier for the class, the
 * bulk tools, adding games and modes, and the panel for weapons, camos and
 * images.
 *
 * Every write goes through `writeGame` / `removeGame`, which record the game as
 * it was first — that is all Undo needs.
 */
export const CallOfDutyView: React.FC = () => {
  const { camoGames, camoUnavailable, saveCamoGame, deleteCamoGame } = useGame();
  const { user } = useAuth();
  const history = useCamoHistory(user?.id ?? null);
  const phone = useIsPhone();
  const [bulkOpen, setBulkOpen] = useState(false);

  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [removingMode, setRemovingMode] = useState(false);
  const [view, setView] = usePersistentState<CamoView>(CAMO_VIEW_KEY, EMPTY_CAMO_VIEW, isCamoView);

  // What is on screen, falling back to the first of each when what was last
  // viewed has since gone (deleted here, or on another device).
  const game: CamoGame | undefined =
    camoGames.find((g) => g.id === view.gameId) ?? camoGames[0];
  const mode = game ? viewedMode(game, view) : undefined;
  const cls = mode ? (mode.classes.find((c) => c.id === view.classes[mode.id]) ?? mode.classes[0]) : undefined;

  const show = (patch: { gameId?: string; modeId?: string; classId?: string }) =>
    setView((current) => {
      const gameId = patch.gameId ?? current.gameId ?? game?.id;
      const next: CamoView = { ...current, gameId };
      if (patch.modeId && gameId) next.modes = { ...current.modes, [gameId]: patch.modeId };
      if (patch.classId && (patch.modeId ?? mode?.id))
        next.classes = { ...current.classes, [(patch.modeId ?? mode?.id) as string]: patch.classId };
      return next;
    });

  /** Every write: the game as it was goes on the Undo stack first. */
  const writeGame = (next: CamoGame, label: string) => {
    history.record(label, next.id, camoGames.find((g) => g.id === next.id) ?? null);
    saveCamoGame(next);
  };

  const removeGame = (target: CamoGame, label: string) => {
    history.record(label, target.id, target);
    deleteCamoGame(target.id);
  };

  /** Puts the newest change back: re-writes the game as it was, or removes one just added. */
  const undo = () => {
    const step = history.undo();
    if (!step) return;
    if (step.before) {
      saveCamoGame(step.before);
      show({ gameId: step.before.id });
    } else {
      deleteCamoGame(step.gameId);
    }
  };

  const saveMode = (next: CamoMode, label: string) => {
    if (!game) return;
    writeGame({ ...game, data: { modes: game.data.modes.map((m) => (m.id === next.id ? next : m)) } }, label);
  };

  const saveWeapon = (weapon: CamoWeapon, label: string) => {
    if (!mode || !cls) return;
    saveMode(
      {
        ...mode,
        classes: mode.classes.map((c) =>
          c.id === cls.id ? { ...c, weapons: c.weapons.map((w) => (w.id === weapon.id ? weapon : w)) } : c,
        ),
      },
      label,
    );
  };

  const toggleTier = (index: number) => {
    if (!mode || !cls) return;
    const verb = classHasTier(cls, index) ? 'Cleared' : 'Marked';
    saveMode(toggleClassTier(mode, cls.id, index), `${verb} ${mode.tiers[index].name} for ${cls.name}`);
  };

  const markThrough = (index: number) => {
    if (!mode || !cls) return;
    saveMode(markClassThrough(mode, cls.id, index), `Marked ${cls.name} through ${mode.tiers[index].name}`);
  };

  const allMilitary = () => {
    if (!mode || !cls) return;
    saveMode(completeClassMilitary(mode, cls.id), `All military done for ${cls.name}`);
  };

  const addMode = () => {
    if (!game || !mode) return;
    // A new mode starts as a copy of the one on screen, ticks cleared: the
    // modes of one game usually share their weapons and tiers.
    const added = clearedMode(mode, `Mode ${game.data.modes.length + 1}`);
    writeGame({ ...game, data: { modes: [...game.data.modes, added] } }, `Added ${added.name}`);
    show({ modeId: added.id });
  };

  const removeMode = () => {
    if (!game || !mode || game.data.modes.length <= 1) return;
    writeGame(
      { ...game, data: { modes: game.data.modes.filter((m) => m.id !== mode.id) } },
      `Removed ${mode.name}`,
    );
  };

  const subtitle = `Camo tracker · ${camoGames.length} ${camoGames.length === 1 ? 'game' : 'games'}`;
  const counts = useMemo(
    () => new Map(mode?.classes.map((c) => [c.id, c.weapons.length]) ?? []),
    [mode],
  );

  const editToggle = camoGames.length > 0 ? (
    <Button
      variant={editing ? 'accent' : 'secondary'}
      buttonStyle={editing ? 'fill' : 'outline'}
      size={phone ? 'l' : 'm'}
      aria-pressed={editing}
      onClick={() => setEditing((on) => !on)}
    >
      {editing ? <Check size={15} /> : <Pencil size={14} />}
      {editing ? 'Done' : 'Edit'}
    </Button>
  ) : undefined;

  return (
    <div className="mx-auto max-w-[1760px] space-y-5 md:space-y-6 md:pb-10">
      <PageHeader title="Call of Duty" subtitle={subtitle} action={editToggle} />

      {camoUnavailable ? (
        <p className="rounded-md border border-notice-700/50 bg-notice-700/12 p-3 text-75 font-semibold text-notice-900">
          The tracker can’t save yet. Copy the schema SQL from Settings › Data › Cloud storage and run it in Supabase.
        </p>
      ) : null}

      {!game || !mode || !cls ? (
        <EmptyState
          icon={<Crosshair size={24} />}
          title="Nothing tracked yet"
          action={
            <span className="flex flex-wrap justify-center gap-2">
              <Button variant="accent" onClick={() => setAdding(true)}>
                <Plus size={14} />
                Add a game
              </Button>
              {/* Deleting the last game lands here, so its Undo has to be here too. */}
              {history.canUndo ? (
                <Button buttonStyle="outline" onClick={undo}>
                  <Undo2 size={14} />
                  Undo
                </Button>
              ) : null}
            </span>
          }
        />
      ) : (
        <>
          {/* Game switcher -------------------------------------------------- */}
          <div className="scroll-row -mx-4 flex items-center gap-2 px-4 md:mx-0 md:px-0">
            {camoGames.map((g) => (
              <FilterChip key={g.id} selected={g.id === game.id} onClick={() => show({ gameId: g.id })}>
                {g.name}
              </FilterChip>
            ))}
            {editing ? (
              <Button size="s" buttonStyle="outline" className="shrink-0" onClick={() => setAdding(true)}>
                <Plus size={13} />
                Game
              </Button>
            ) : null}
          </div>

          {/* Mode row ------------------------------------------------------- */}
          <div className="scroll-row -mx-4 flex items-center gap-2 px-4 md:mx-0 md:px-0">
            <span className="eyebrow shrink-0 pr-1 text-gray-600">Mode</span>
            {game.data.modes.map((m) => (
              <FilterChip key={m.id} tone="neutral" selected={m.id === mode.id} onClick={() => show({ modeId: m.id })}>
                {m.name}
              </FilterChip>
            ))}
            {editing ? (
              <>
                <Button size="s" buttonStyle="outline" className="shrink-0" onClick={addMode}>
                  <Plus size={13} />
                  Mode
                </Button>
                {game.data.modes.length > 1 ? (
                  <Button
                    size="s"
                    buttonStyle="subtle"
                    variant="negative"
                    className="shrink-0"
                    onClick={() => setRemovingMode(true)}
                  >
                    <Trash2 size={13} />
                    Remove mode
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>

          <MasteryTiles mode={mode} />

          {/* Weapon classes ------------------------------------------------- */}
          <div className="scroll-row -mx-4 flex items-center gap-2 px-4 md:mx-0 md:px-0">
            {mode.classes.map((c) => (
              <FilterChip key={c.id} selected={c.id === cls.id} onClick={() => show({ classId: c.id })}>
                <Layers size={14} />
                {c.name} <span className="tabular-nums">{counts.get(c.id) ?? 0}</span>
              </FilterChip>
            ))}
          </div>

          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="accent" buttonStyle="outline" size={phone ? 'l' : 'm'} onClick={() => setPanelOpen(true)}>
                <Settings2 size={15} />
                Weapons, camos & images…
              </Button>
              {phone ? (
                <>
                  <Button buttonStyle="outline" size="l" onClick={() => setBulkOpen(true)}>
                    <ListChecks size={15} />
                    Bulk…
                  </Button>
                  {/* Undo stays one tap away on a phone, outside the sheet. */}
                  <Button
                    buttonStyle="outline"
                    size="l"
                    iconOnly
                    disabled={!history.canUndo}
                    aria-label={history.lastAction ? `Undo: ${history.lastAction}` : 'Undo'}
                    onClick={undo}
                  >
                    <Undo2 size={16} />
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}

          {editing && !phone ? (
            <CamoBulkBar
              mode={mode}
              cls={cls}
              onMarkThrough={markThrough}
              onAllMilitary={allMilitary}
              lastAction={history.lastAction}
              canUndo={history.canUndo}
              onUndo={undo}
            />
          ) : null}

          {/* The grid ------------------------------------------------------- */}
          {cls.weapons.length === 0 ? (
            <EmptyState
              icon={<Crosshair size={24} />}
              title={`No weapons in ${cls.name}`}
              action={
                editing ? (
                  <Button variant="accent" onClick={() => setPanelOpen(true)}>
                    <Plus size={14} />
                    Add weapons
                  </Button>
                ) : (
                  <Button onClick={() => {
                    setEditing(true);
                    setPanelOpen(true);
                  }}>
                    <Pencil size={14} />
                    Edit to add weapons
                  </Button>
                )
              }
            />
          ) : phone ? (
            <div className="space-y-3">
              <TierLegend mode={mode} cls={cls} editable={editing} onToggleTier={toggleTier} />
              <CamoCards mode={mode} cls={cls} editable={editing} onWeapon={saveWeapon} />
            </div>
          ) : (
            <CamoTable
              mode={mode}
              cls={cls}
              editable={editing}
              onWeapon={saveWeapon}
              onToggleTier={toggleTier}
            />
          )}

          <CamoEditPanel
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
            game={game}
            mode={mode}
            cls={cls}
            onSaveGame={(next) => writeGame(next, `Edited ${next.name}`)}
            onDeleteGame={() => removeGame(game, `Deleted ${game.name}`)}
            onSelectClass={(classId) => show({ classId })}
          />

          <Dialog isOpen={bulkOpen} onClose={() => setBulkOpen(false)} title={`Bulk · ${cls.name}`}>
            <CamoBulkBar
              stacked
              mode={mode}
              cls={cls}
              onMarkThrough={markThrough}
              onAllMilitary={allMilitary}
              lastAction={history.lastAction}
              canUndo={history.canUndo}
              onUndo={undo}
            />
          </Dialog>

          <ConfirmDialog
            isOpen={removingMode}
            title={`Remove ${mode.name}?`}
            message="Every tick and military count in this mode goes with it."
            confirmLabel="Remove mode"
            onConfirm={removeMode}
            onClose={() => setRemovingMode(false)}
          />
        </>
      )}

      <AddCamoGameDialog
        isOpen={adding}
        onClose={() => setAdding(false)}
        games={camoGames}
        currentId={game?.id}
        onAdd={(added) => {
          writeGame(added, `Added ${added.name}`);
          show({ gameId: added.id });
        }}
      />
    </div>
  );
};
