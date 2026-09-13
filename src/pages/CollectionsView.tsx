import React, { useMemo, useState } from 'react';
import { FolderKanban, Plus, Trash2, Folder, Check } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import {
  COLLECTION_COLORS,
  DEFAULT_COLLECTION_COLOR,
  comparePlatformOrder,
} from '../lib/constants';
import { Badge, Button, Card, EmptyState, Field, TextInput } from '../components/ui';
import { cn } from '../lib/cn';

export const CollectionsView: React.FC = () => {
  const { collections, createCollection, deleteCollection, games, setIsQuickAddOpen, profile } =
    useGame();

  const [activeCollectionId, setActiveCollectionId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_COLLECTION_COLOR);

  const activeCollection =
    collections.find((c) => c.id === activeCollectionId) ?? collections[0] ?? null;
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

            <fieldset>
              <legend className="eyebrow mb-2 text-gray-700">Colour accent</legend>
              <div className="flex gap-2">
                {COLLECTION_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    style={{ backgroundColor: preset }}
                    aria-label={`Use colour ${preset}`}
                    aria-pressed={color === preset}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full transition-transform',
                      color === preset ? 'scale-110 ring-2 ring-gray-1000' : 'opacity-80 hover:opacity-100',
                    )}
                  >
                    {color === preset && <Check size={12} className="text-gray-25" />}
                  </button>
                ))}
              </div>
            </fieldset>

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
        <Card className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: activeCollection.color }}
              />
              <h2 className="text-200 font-bold tracking-tight text-gray-1000">{activeCollection.name}</h2>
              {activeCollection.isSystem && (
                <Badge>Default</Badge>
              )}
            </div>
            {activeCollection.description && (
              <p className="text-75 text-gray-600">{activeCollection.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!activeCollection.isSystem && (
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
