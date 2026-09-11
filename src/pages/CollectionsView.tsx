import React, { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import {
  COLLECTION_COLORS,
  DEFAULT_COLLECTION_COLOR,
  comparePlatformOrder,
} from '../lib/constants';
import { navLabel, NAV_DESTINATIONS } from '../lib/navigation';
import {
  Button,
  Chip,
  Dot,
  EmptyState,
  Eyebrow,
  Field,
  Panel,
  PanelHeading,
  TextInput,
} from '../components/ui';
import { CheckIcon, FolderIcon, PlusIcon, TrashIcon } from '../components/icons';

const COLLECTIONS = NAV_DESTINATIONS.find((d) => d.path === '/collections')!;

export const CollectionsView: React.FC = () => {
  const {
    collections,
    createCollection,
    deleteCollection,
    games,
    profile,
    sidebarConfig,
    ui,
    setIsQuickAddOpen,
  } = useGame();

  const [activeId, setActiveId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_COLLECTION_COLOR);

  const active = collections.find((c) => c.id === activeId) ?? collections[0] ?? null;
  const platformOrder = profile.platformOrder;

  const collectionGames = useMemo(() => {
    if (!active) return [];
    return games
      .filter((g) => g.collections?.includes(active.id))
      .sort((a, b) => {
        const diff = comparePlatformOrder(a.platform, b.platform, platformOrder);
        return diff !== 0 ? diff : a.title.localeCompare(b.title);
      });
  }, [games, active, platformOrder]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createCollection(name.trim(), description.trim() || undefined, color);
    setName('');
    setDescription('');
    setIsCreating(false);
  };

  const gridClass = ui.cardLayout === 'poster' ? 'grid-cards-poster' : 'grid-cards';

  return (
    <section className="tt-rise flex flex-col gap-[clamp(20px,2.6vw,28px)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>Your own shelves</Eyebrow>
          <h1 className="m-0 mt-1 font-display text-[clamp(28px,4.2vw,42px)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
            {navLabel(COLLECTIONS, sidebarConfig)}
          </h1>
        </div>

        <Button variant="accent" size="xl" onClick={() => setIsCreating(true)}>
          <PlusIcon size={16} />
          New collection
        </Button>
      </div>

      {isCreating ? (
        <Panel className="flex max-w-lg flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <PanelHeading>Create collection</PanelHeading>
            <Button variant="ghost" size="s" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>

          <form onSubmit={handleCreate} className="flex flex-col gap-4">
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

            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 p-0 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                Colour accent
              </legend>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    aria-label={`Use colour ${preset}`}
                    aria-pressed={color === preset}
                    style={{
                      background: preset,
                      boxShadow:
                        color === preset ? '0 0 0 2px var(--tt-surface), 0 0 0 4px #f7f3ec' : 'none',
                    }}
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-0"
                  >
                    {color === preset ? <CheckIcon size={12} color="#100e0c" /> : null}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="l" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" size="l" disabled={!name.trim()}>
                Save collection
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      {collections.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {collections.map((collection) => {
            const tone = collection.color || DEFAULT_COLLECTION_COLOR;
            const count = games.filter((g) => g.collections?.includes(collection.id)).length;
            return (
              <Chip
                key={collection.id}
                size="lg"
                tone={tone}
                selected={active?.id === collection.id}
                onClick={() => setActiveId(collection.id)}
              >
                <Dot color={tone} />
                {collection.name}
                <span className="rounded-full bg-[rgb(8_7_6_/_.45)] px-1.5 text-[11px] tabular-nums">
                  {count}
                </span>
              </Chip>
            );
          })}
        </div>
      ) : null}

      {active ? (
        <Panel className="flex flex-wrap items-center justify-between gap-3 !p-[18px]">
          <div className="min-w-0">
            <h2 className="m-0 flex items-center gap-2.5 font-display text-[18px] font-bold text-ink">
              <Dot color={active.color || DEFAULT_COLLECTION_COLOR} size={10} />
              {active.name}
            </h2>
            {active.description ? (
              <p className="m-0 mt-1 text-[13px] text-muted">{active.description}</p>
            ) : null}
          </div>

          {!active.isSystem ? (
            <Button variant="danger" size="s" onClick={() => deleteCollection(active.id)}>
              <TrashIcon size={13} />
              Delete
            </Button>
          ) : null}
        </Panel>
      ) : null}

      {collectionGames.length > 0 ? (
        <div className={gridClass}>
          {collectionGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderIcon size={20} />}
          title={active ? 'This collection is empty' : 'No collections yet'}
          description={
            active
              ? 'Assign a game to this collection from its edit dialog, or add a new one.'
              : 'Create a collection to group games however you like.'
          }
          action={
            <Button variant="accent" size="m" onClick={() => setIsQuickAddOpen(true)}>
              Add game
            </Button>
          }
        />
      )}
    </section>
  );
};
