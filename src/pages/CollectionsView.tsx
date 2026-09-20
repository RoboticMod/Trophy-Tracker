import React, { useMemo, useState } from 'react';
import { FolderKanban, Plus, Trash2, Folder, Check, Pencil } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import {
  COLLECTION_COLORS,
  DEFAULT_COLLECTION_COLOR,
  comparePlatformOrder,
} from '../lib/constants';
import { isPermanentCollection } from '../lib/collections';
import { Badge, Button, Card, EmptyState, Field, TextInput } from '../components/ui';
import { cn } from '../lib/cn';

/**
 * The palette a collection's accent is picked from, shared by the create form
 * and the editor so a colour cannot be offered in one and missing from the
 * other.
 */
const ColourSwatches: React.FC<{
  value: string;
  onChange: (color: string) => void;
  legend?: string;
}> = ({ value, onChange, legend = 'Colour accent' }) => (
  <fieldset>
    <legend className="eyebrow mb-2 text-gray-700">{legend}</legend>
    <div className="flex flex-wrap gap-2">
      {COLLECTION_COLORS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onChange(preset)}
          style={{ backgroundColor: preset }}
          aria-label={`Use colour ${preset}`}
          aria-pressed={value === preset}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full transition-transform',
            value === preset ? 'scale-110 ring-2 ring-gray-1000' : 'opacity-80 hover:opacity-100',
          )}
        >
          {value === preset && <Check size={12} className="text-gray-25" />}
        </button>
      ))}
    </div>
  </fieldset>
);

export const CollectionsView: React.FC = () => {
  const {
    collections,
    createCollection,
    updateCollection,
    deleteCollection,
    games,
    setIsQuickAddOpen,
    profile,
  } = useGame();

  const [activeCollectionId, setActiveCollectionId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  // Held by id rather than as a boolean, so switching tabs closes the editor
  // instead of carrying it over onto a collection you only meant to look at.
  const [editingId, setEditingId] = useState<string | null>(null);
  /** The rename in progress, which is allowed to be briefly empty. */
  const [nameDraft, setNameDraft] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_COLLECTION_COLOR);

  const activeCollection =
    collections.find((c) => c.id === activeCollectionId) ?? collections[0] ?? null;
  const isEditing = activeCollection !== null && editingId === activeCollection.id;
  const isPermanent = activeCollection !== null && isPermanentCollection(activeCollection.id);
  const platformOrder = profile.platformOrder;

  const collectionGames = useMemo(() => {
    if (!activeCollection) return [];
    return games
      .filter((g) => g.collections?.includes(activeCollection.id))
      .sort((a, b) => {
        const pDiff = comparePlatformOrder(a.platform, b.platform, platformOrder);
        return pDiff !== 0 ? pDiff : a.title.localeCompare(b.title);
      });
  }, [games, activeCollection, platformOrder]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createCollection(name.trim(), description.trim() || undefined, color);
    setName('');
    setDescription('');
    setIsCreating(false);
  };

  return (
    <div className="mx-auto max-w-[1760px] space-y-7 pb-10">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-700/16 text-accent-900">
              <FolderKanban size={18} />
            </div>
            <h1 className="text-600 font-bold tracking-tight text-gray-1000">Collections</h1>
          </div>
          <p className="text-75 text-gray-600">Custom lists across your library</p>
        </div>

        <Button variant="accent" size="l" onClick={() => setIsCreating(true)}>
          <Plus size={16} />
          <span>New collection</span>
        </Button>
      </div>

      {isCreating && (
        <Card className="max-w-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow text-gray-1000">Create collection</h2>
            <Button buttonStyle="subtle" size="s" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Name">
              {(props) => (
                <TextInput
                  {...props}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Soulsborne, speedruns, couch co-op…"
                />
              )}
            </Field>

            <Field label="Description" description="Optional">
              {(props) => (
                <TextInput
                  {...props}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What belongs in here?"
                />
              )}
            </Field>

            <ColourSwatches value={color} onChange={setColor} />

            <div className="flex justify-end gap-2 pt-1">
              <Button buttonStyle="subtle" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                Save collection
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tabs -------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        {collections.map((col) => {
          const isSelected = activeCollection?.id === col.id;
          const count = games.filter((g) => g.collections?.includes(col.id)).length;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setActiveCollectionId(col.id)}
              aria-pressed={isSelected}
              // The active tab is lit in the collection's own colour, so the
              // selection carries the same identity as the dot beside it.
              style={
                isSelected
                  ? {
                      borderColor: col.color,
                      backgroundColor: `${col.color}22`,
                      boxShadow: `0 0 12px -6px ${col.color}`,
                    }
                  : undefined
              }
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-sm border px-3 text-75 font-bold transition-all',
                isSelected
                  ? 'text-gray-1000'
                  : 'border-gray-300 bg-white/3 text-gray-700 hover:border-gray-400 hover:bg-white/6 hover:text-gray-900',
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: col.color || DEFAULT_COLLECTION_COLOR,
                  boxShadow: `0 0 6px -1px ${col.color || DEFAULT_COLLECTION_COLOR}`,
                }}
              />
              <span>{col.name}</span>
              <span className="rounded-full bg-gray-25/40 px-1.5 text-50 tabular-nums opacity-80">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {activeCollection && (
        <Card className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: activeCollection.color }}
                />
                <h2 className="text-200 font-bold tracking-tight text-gray-1000">
                  {activeCollection.name}
                </h2>
                {isPermanent && <Badge>Permanent</Badge>}
              </div>
              {activeCollection.description && (
                <p className="text-75 text-gray-600">{activeCollection.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isEditing ? 'accent' : 'secondary'}
                buttonStyle={isEditing ? 'fill' : 'outline'}
                size="s"
                aria-expanded={isEditing}
                onClick={() => {
                  setNameDraft(activeCollection.name);
                  setEditingId(isEditing ? null : activeCollection.id);
                }}
              >
                <Pencil size={13} />
                <span>{isEditing ? 'Done' : 'Edit'}</span>
              </Button>

              {!isPermanent && (
                <Button
                  variant="negative"
                  buttonStyle="outline"
                  size="s"
                  onClick={() => deleteCollection(activeCollection.id)}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </Button>
              )}
            </div>
          </div>

          {/* Edited in place rather than in a dialog: the tab strip above is
              where the colour actually shows, so the change is visible in the
              same glance that makes it. Every keystroke saves — the list a
              collection holds is untouched by any of this, so there is nothing
              here to cancel out of. */}
          {isEditing && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name">
                  {(props) => (
                    <TextInput
                      {...props}
                      required
                      value={nameDraft}
                      onChange={(e) => {
                        // The field shows exactly what is typed, including an
                        // empty box mid-rename. Only a real name is saved, so
                        // clearing it to type a new one cannot leave a
                        // collection called nothing.
                        setNameDraft(e.target.value);
                        const next = e.target.value.trim();
                        if (next) updateCollection(activeCollection.id, { name: next });
                      }}
                      onBlur={() => setNameDraft(activeCollection.name)}
                    />
                  )}
                </Field>

                <Field label="Description" description="Optional">
                  {(props) => (
                    <TextInput
                      {...props}
                      value={activeCollection.description ?? ''}
                      onChange={(e) =>
                        updateCollection(activeCollection.id, {
                          description: e.target.value || undefined,
                        })
                      }
                      placeholder="What belongs in here?"
                    />
                  )}
                </Field>
              </div>

              {isPermanent ? (
                <p className="text-50 text-gray-600">
                  A permanent collection keeps the app&rsquo;s own colour, so it stays
                  recognisable everywhere it appears, and it cannot be deleted — it is where
                  your games live. Its name and description are yours to change.
                </p>
              ) : (
                <ColourSwatches
                  value={activeCollection.color || DEFAULT_COLLECTION_COLOR}
                  onChange={(next) => updateCollection(activeCollection.id, { color: next })}
                />
              )}
            </div>
          )}
        </Card>
      )}

      <GameGrid games={collectionGames} platformOrder={platformOrder} />

      {collectionGames.length === 0 && (
        <EmptyState
          icon={<Folder size={24} />}
          title={activeCollection ? 'This collection is empty' : 'No collections yet'}
          description={
            activeCollection
              ? 'Assign a game to this collection from its edit dialog, or add a new one.'
              : 'Create a collection to group games however you like.'
          }
          action={
            <Button variant="accent" onClick={() => setIsQuickAddOpen(true)}>
              <Plus size={14} />
              Add game
            </Button>
          }
        />
      )}
    </div>
  );
};
