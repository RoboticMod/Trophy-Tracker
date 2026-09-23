import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Trash2, Folder, Check, Pencil } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameGrid } from '../components/GameGrid';
import {
  COLLECTION_COLORS,
  DEFAULT_COLLECTION_COLOR,
  comparePlatformOrder,
} from '../lib/constants';
import { isPermanentCollection } from '../lib/collections';
import { CollectionsList, PreviewCover } from '../components/CollectionsList';
import { aggregateCompletion } from '../lib/completion';
import { formatHours, sumHours } from '../lib/format';
import { Collection, UserGame } from '../types';
import { useIsPhone } from '../lib/useMediaQuery';
import { Badge, Button, Card, EmptyState, Field, PageHeader, TextInput } from '../components/ui';
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

/**
 * A save that waits for a pause in typing.
 *
 * The inline editor wrote to the cloud on every keystroke, so renaming a
 * collection to "Soulsborne" was eleven writes and eleven optimistic re-renders
 * of every game grid watching that collection. The field stays instant — it is
 * local state — and only the write is held back.
 */
const SAVE_DEBOUNCE_MS = 400;

function useDebouncedSave<T>(save: (value: T) => void) {
  const timer = useRef<number | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const latest = useRef(save);
  latest.current = save;

  const flush = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) {
      latest.current(pending.current.value);
      pending.current = null;
    }
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // Flushed rather than cancelled on the way out. Navigating away within the
  // debounce window is the ordinary way to leave this page, and losing the
  // rename you just typed because of it would be worse than an extra write.
  useEffect(() => () => flushRef.current(), []);

  return useCallback((value: T) => {
    pending.current = { value };
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => flushRef.current(), SAVE_DEBOUNCE_MS);
  }, []);
}

/** Cells in a list card's mosaic. The last one says how many more there are. */
const MOSAIC_CELLS = 4;

/**
 * One of your lists on a wide screen: a 2 × 2 of its games' 16:9 art, then its
 * name, its size and how far through it you are.
 *
 * 16:9 because that is the one image a game has — the phone's strip is a
 * phone's answer to a narrow row, and a poster crop on a card 400px wide would
 * cut every picture in half. The fourth cell carries the count of the rest
 * rather than a fifth cover squeezed in.
 */
const ListCard: React.FC<{
  collection: Collection;
  games: UserGame[];
  onOpen: () => void;
}> = ({ collection, games, onOpen }) => {
  const color = collection.color || DEFAULT_COLLECTION_COLOR;
  const shown = games.slice(0, MOSAIC_CELLS);
  const more = games.length - shown.length;
  const { percent } = aggregateCompletion(games);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col overflow-hidden rounded-lg border border-gray-300/80 bg-gray-100/72 text-left transition-colors hover:border-gray-400"
    >
      <span className="grid grid-cols-2 gap-0.5 bg-gray-75">
        {Array.from({ length: MOSAIC_CELLS }, (_, index) => {
          const game = shown[index];
          if (!game) {
            return <span key={index} aria-hidden className="block aspect-video bg-gray-100" />;
          }
          const last = index === MOSAIC_CELLS - 1 && more > 0;
          return (
            <PreviewCover key={game.id} game={game} className="w-full">
              {last ? (
                <span className="absolute inset-0 flex items-center justify-center bg-gray-25/72 text-250 font-bold tabular-nums text-gray-1000">
                  +{more}
                </span>
              ) : null}
            </PreviewCover>
          );
        })}
      </span>

      <span className="flex items-center gap-3.5 px-4.5 py-4">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px -1px ${color}` }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-250 font-bold tracking-tight text-gray-1000">
            {collection.name}
          </span>
          <span className="mt-0.75 block truncate text-75 tabular-nums text-gray-700">
            {games.length} {games.length === 1 ? 'game' : 'games'} · {formatHours(sumHours(games))}h
          </span>
        </span>
        <span className="shrink-0 text-90 font-bold tabular-nums text-gray-800">{percent}%</span>
        <ChevronRight size={20} className="shrink-0 text-gray-600" />
      </span>
    </button>
  );
};

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

  const navigate = useNavigate();
  // A page of lists you drill into, at any width: a row per list on a phone, a
  // card per list on a wide screen. It was a tab strip there, which put one
  // list's games on the page and every other list behind a name.
  const phone = useIsPhone();

  const [activeCollectionId, setActiveCollectionId] = useState<string>('');
  /** The collection whose delete has been asked for but not yet confirmed. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  // Held by id rather than as a boolean, so switching tabs closes the editor
  // instead of carrying it over onto a collection you only meant to look at.
  const [editingId, setEditingId] = useState<string | null>(null);
  /** The rename in progress, which is allowed to be briefly empty. */
  const [nameDraft, setNameDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_COLLECTION_COLOR);

  /**
   * This page is about the lists you made yourself.
   *
   * The three permanent shelves each already have a page of their own —
   * /playing, /backlog and /achievements — so listing them here too was a
   * second way to the same three places, taking up the front of a tab strip
   * that is otherwise entirely yours.
   */
  const customCollections = useMemo(
    () => collections.filter((c) => !isPermanentCollection(c.id)),
    [collections],
  );

  const activeCollection =
    customCollections.find((c) => c.id === activeCollectionId) ?? customCollections[0] ?? null;
  const isEditing = activeCollection !== null && editingId === activeCollection.id;
  const isPermanent = activeCollection !== null && isPermanentCollection(activeCollection.id);
  const platformOrder = profile.platformOrder;

  const saveName = useDebouncedSave<{ id: string; name: string }>((next) =>
    updateCollection(next.id, { name: next.name }),
  );
  const saveDescription = useDebouncedSave<{ id: string; description?: string }>((next) =>
    updateCollection(next.id, { description: next.description }),
  );

  const collectionGames = useMemo(() => {
    if (!activeCollection) return [];
    return games
      .filter((g) => g.collections?.includes(activeCollection.id))
      .sort((a, b) => {
        const pDiff = comparePlatformOrder(a.platform, b.platform, platformOrder);
        return pDiff !== 0 ? pDiff : a.title.localeCompare(b.title);
      });
  }, [games, activeCollection, platformOrder]);

  /**
   * Deleting the collection being looked at, and then landing somewhere real.
   *
   * The tab strip is about to lose a tab; without this the page would sit on an
   * id that no longer exists and fall back to whichever collection happened to
   * be first, which reads as the page jumping about on its own.
   */
  const handleDelete = () => {
    if (!activeCollection) return;
    deleteCollection(activeCollection.id);
    setConfirmDeleteId(null);
    setEditingId(null);
    setActiveCollectionId(
      customCollections.find((c) => c.id !== activeCollection.id)?.id ?? '',
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createCollection(name.trim(), description.trim() || undefined, color);
    setName('');
    setDescription('');
    setIsCreating(false);
  };

  return (
    <div className="mx-auto max-w-[1760px] space-y-6 md:space-y-7 md:pb-10">
      {phone ? (
        // No title on a phone, where the fixed header names the page. Making a
        // list is the page's one action, so it leads it, full width — dashed,
        // since it is a list that does not exist yet.
        activeCollectionId ? null : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-accent-700/50 bg-accent-700/8 text-90 font-bold text-accent-900 transition-colors hover:bg-accent-700/12"
          >
            <Plus size={16} />
            New list
          </button>
        )
      ) : (
        <PageHeader
          title="Lists"
          subtitle="Lists you make. Playing, Backlog and 100% live in the top bar."
          action={
            <Button variant="accent" size="l" onClick={() => setIsCreating(true)}>
              <Plus size={16} />
              <span>New list</span>
            </Button>
          }
        />
      )}

      {isCreating && (
        <Card className="max-w-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow text-gray-1000">Create list</h2>
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
                Save list
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* On a phone this page is the way to every shelf as well as every list,
          since the bottom bar has room for five destinations and dropping
          Playing, Backlog and 100% into here is what made them fit. A row
          shows what is actually inside rather than only what you called it. */}
      {phone && !activeCollectionId ? (
        <CollectionsList
          onOpen={(target) => {
            if (target.startsWith('/')) navigate(target);
            else setActiveCollectionId(target);
          }}
        />
      ) : null}

      {/* Your lists only — the shelves are destinations in the top bar. Three
          a row at 1440, two on a tablet. */}
      {!phone && !activeCollectionId && customCollections.length > 0 ? (
        <section className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,25rem),1fr))] items-stretch gap-5">
          {customCollections.map((col) => (
            <ListCard
              key={col.id}
              collection={col}
              games={games
                .filter((g) => g.collections?.includes(col.id))
                .sort((a, b) => a.title.localeCompare(b.title))}
              onOpen={() => setActiveCollectionId(col.id)}
            />
          ))}
        </section>
      ) : null}

      {/* A way back to the lists, which is the page this drilled in from. The
          browser's own back would work; a control that is visibly part of the
          page is what people reach for. */}
      {activeCollectionId ? (
        <Button
          buttonStyle="subtle"
          size="s"
          className="-ml-2"
          onClick={() => {
            setActiveCollectionId('');
            setEditingId(null);
          }}
        >
          <ChevronLeft size={15} />
          All lists
        </Button>
      ) : null}

      {activeCollection && activeCollectionId && (
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
                  setDescriptionDraft(activeCollection.description ?? '');
                  setEditingId(isEditing ? null : activeCollection.id);
                }}
              >
                <Pencil size={13} />
                <span>{isEditing ? 'Done' : 'Edit'}</span>
              </Button>

              {/* Deleting used to happen on a single click, with no undo and no
                  warning — and now that every ordinary list is deletable, that
                  click is a great deal easier to reach. The count is in the
                  question because it is the thing people are actually afraid
                  of: the answer is that the games stay. */}
              {!isPermanent &&
                (confirmDeleteId === activeCollection.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-75 text-gray-800">
                      Delete “{activeCollection.name}”? The {collectionGames.length}{' '}
                      {collectionGames.length === 1 ? 'game' : 'games'} in it stay in your library.
                    </span>
                    <Button variant="negative" size="s" onClick={handleDelete}>
                      Delete
                    </Button>
                    <Button buttonStyle="subtle" size="s" onClick={() => setConfirmDeleteId(null)}>
                      Keep
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="negative"
                    buttonStyle="outline"
                    size="s"
                    onClick={() => setConfirmDeleteId(activeCollection.id)}
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </Button>
                ))}
            </div>
          </div>

          {/* Edited in place rather than in a dialog: the tab strip above is
              where the colour actually shows, so the change is visible in the
              same glance that makes it. Typing saves itself once you pause — the
              list a collection holds is untouched by any of this, so there is
              nothing here to cancel out of. */}
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
                        if (next) saveName({ id: activeCollection.id, name: next });
                      }}
                      onBlur={() => setNameDraft(activeCollection.name)}
                    />
                  )}
                </Field>

                <Field label="Description" description="Optional">
                  {(props) => (
                    <TextInput
                      {...props}
                      value={descriptionDraft}
                      onChange={(e) => {
                        setDescriptionDraft(e.target.value);
                        saveDescription({
                          id: activeCollection.id,
                          description: e.target.value || undefined,
                        });
                      }}
                      placeholder="What belongs in here?"
                    />
                  )}
                </Field>
              </div>

              {isPermanent ? (
                <p className="text-50 text-gray-600">
                  A shelf keeps the app&rsquo;s own colour, so it stays
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

      {activeCollectionId && (
        <GameGrid games={collectionGames} platformOrder={platformOrder} />
      )}

      {((activeCollectionId && collectionGames.length === 0) ||
        (!phone && customCollections.length === 0)) && (
        <EmptyState
          icon={<Folder size={24} />}
          title={activeCollectionId ? 'This list is empty' : 'No lists yet'}
          description={
            activeCollectionId
              ? 'Assign a game to this list from its edit dialog, or add a new one.'
              : 'Make a list to group games however you like.'
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
