import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { FolderKanban, Plus, Trash2, Folder, Check } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GameCard } from '../components/GameCard';
import { comparePlatformOrder } from '../lib/constants';

export const CollectionsView: React.FC = () => {
  const { collections, createCollection, deleteCollection, games, setIsQuickAddOpen, profile } = useGame();
  const [activeCollectionId, setActiveCollectionId] = useState<string>(collections[0]?.id || 'col-backlog');
  const [isCreating, setIsCreating] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [newColColor, setNewColColor] = useState('#8B5CF6');

  const activeCollection = collections.find(c => c.id === activeCollectionId) || collections[0];

  const collectionGames = activeCollection
    ? games
        .filter(g => g.collections?.includes(activeCollection.id))
        .sort((a, b) => {
          const pDiff = comparePlatformOrder(a.platform, b.platform, profile?.platformOrder);
          if (pDiff !== 0) return pDiff;
          return a.title.localeCompare(b.title);
        })
    : [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    createCollection(newColName.trim(), newColDesc.trim(), newColColor);
    setNewColName('');
    setNewColDesc('');
    setIsCreating(false);
  };

  const colorPresets = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
  ];

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
            <FolderKanban size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Game Collections
            </h1>
            <p className="text-xs text-zinc-400">
              Custom lists and playlists
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm flex items-center gap-2 self-start sm:self-auto transition-colors"
        >
          <Plus size={16} />
          <span>New Collection</span>
        </button>
      </div>

      {/* Create Modal Form */}
      {isCreating && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-purple-500/30 shadow-xl space-y-4 max-w-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">
              Create Collection
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Collection Name *</label>
              <input
                type="text"
                required
                placeholder="E.g. Soulsborne, RPG Favorites, Speedruns"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Description (Optional)</label>
              <input
                type="text"
                placeholder="Brief summary of what belongs here..."
                value={newColDesc}
                onChange={e => setNewColDesc(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Color Accent</label>
              <div className="flex gap-2">
                {colorPresets.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                      newColColor === color ? 'scale-110 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {newColColor === color && <Check size={12} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm"
              >
                Save Collection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collections Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {collections.map(col => {
          const isSelected = activeCollection?.id === col.id;
          const count = games.filter(g => g.collections?.includes(col.id)).length;

          return (
            <button
              key={col.id}
              onClick={() => setActiveCollectionId(col.id)}
              style={{
                borderColor: isSelected ? col.color : 'rgba(255,255,255,0.08)',
                backgroundColor: isSelected ? `${col.color}20` : 'rgba(24, 24, 27, 0.8)',
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                isSelected ? 'shadow-sm text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: col.color || '#A855F7' }}
              />
              <span>{col.name}</span>
              <span className="opacity-70 px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Collection Header Details */}
      {activeCollection && (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: activeCollection.color }}
              />
              <h2 className="text-base font-bold text-white">{activeCollection.name}</h2>
              {activeCollection.isSystem && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                  Default
                </span>
              )}
            </div>
            {activeCollection.description && (
              <p className="text-xs text-zinc-400">{activeCollection.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!activeCollection.isSystem && (
              <button
                onClick={() => deleteCollection(activeCollection.id)}
                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors text-xs font-medium flex items-center gap-1.5 border border-rose-500/20"
                title="Delete Collection"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 border border-zinc-700"
            >
              <Plus size={13} />
              <span>Add Game Here</span>
            </button>
          </div>
        </div>
      )}

      {/* Games in Collection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        <AnimatePresence>
          {collectionGames.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {collectionGames.length === 0 && (
        <div className="py-16 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 p-8 space-y-3 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
            <Folder size={24} />
          </div>
          <h3 className="text-sm font-bold text-white">Collection is empty</h3>
          <p className="text-xs text-zinc-400">
            Add any game from your library or search catalog to this collection.
          </p>
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} />
            Add Game
          </button>
        </div>
      )}
    </div>
  );
};
