import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Sparkles, Plus, Clock, Trophy, Check } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Platform, GameStatus, RawgGameResult } from '../types';
import { PLATFORMS } from '../lib/constants';
import { searchGames, detectPlatformFromRawg } from '../lib/rawg';
import { StarRating } from './StarRating';

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, setIsQuickAddOpen, addGame, collections } = useGame();
  
  const [tab, setTab] = useState<'search' | 'custom'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RawgGameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<Platform>('ps5');
  const [status, setStatus] = useState<GameStatus>('playing');
  const [coverImage, setCoverImage] = useState('');
  const [hoursPlayed, setHoursPlayed] = useState(0);
  const [achievementsUnlocked, setAchievementsUnlocked] = useState(0);
  const [achievementsTotal, setAchievementsTotal] = useState(40);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isQuickAddOpen) return;
    
    // Initial fetch of popular games
    const fetchInitial = async () => {
      setIsSearching(true);
      const res = await searchGames(searchQuery);
      setSearchResults(res);
      setIsSearching(false);
    };

    const timer = setTimeout(fetchInitial, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, isQuickAddOpen]);

  const selectGameFromSearch = (game: RawgGameResult) => {
    setTitle(game.name);
    setCoverImage(game.background_image || '');
    setPlatform(detectPlatformFromRawg(game));
    if (game.rating) {
      setRating(Math.min(5, Math.max(0, Math.round(game.rating * 2) / 2)));
    } else {
      setRating(0);
    }
    setTab('custom');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addGame({
      title: title.trim(),
      platform,
      status,
      coverImage: coverImage.trim() || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
      genres: ['Action', 'Adventure'],
      hoursPlayed: Number(hoursPlayed) || 0,
      achievementsUnlocked: Number(achievementsUnlocked) || 0,
      achievementsTotal: Number(achievementsTotal) || 0,
      rating: rating > 0 ? rating : undefined,
      collections: status === 'backlog' && !selectedCollections.includes('col-backlog') 
        ? [...selectedCollections, 'col-backlog'] 
        : selectedCollections,
      notes: notes.trim(),
    });

    // Reset & close
    setIsQuickAddOpen(false);
    setTitle('');
    setCoverImage('');
    setHoursPlayed(0);
    setAchievementsUnlocked(0);
    setRating(0);
    setNotes('');
  };

  if (!isQuickAddOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl text-zinc-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/90">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Add Game to Tracker</h3>
                <p className="text-xs text-zinc-400">Search the database or customize your entry</p>
              </div>
            </div>

            <button
              onClick={() => setIsQuickAddOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Friendly Tab Selector */}
          <div className="flex p-2 bg-zinc-950/60 border-b border-zinc-800/50 gap-1 px-6">
            <button
              type="button"
              onClick={() => setTab('search')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                tab === 'search'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Search size={16} />
              Search Game Database
            </button>
            <button
              type="button"
              onClick={() => setTab('custom')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                tab === 'custom'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Plus size={16} />
              Custom / Edit Details
            </button>
          </div>

          {/* Content Body */}
          <div className="overflow-y-auto p-6 flex-1 space-y-6">
            {tab === 'search' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-zinc-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search 800,000+ games (e.g. Elden Ring, Hollow Knight, Balatro...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-800/70 border border-zinc-700/60 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                {isSearching ? (
                  <div className="py-12 text-center text-zinc-400">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
                    />
                    <p className="text-xs">Searching game universe...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {searchResults.map((game) => (
                      <motion.div
                        key={game.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectGameFromSearch(game)}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/40 cursor-pointer transition-all group"
                      >
                        <img
                          src={game.background_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200'}
                          alt={game.name}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 group-hover:brightness-110"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-blue-400 transition-colors">
                            {game.name}
                          </h4>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {game.released?.split('-')[0] || 'Unknown'} • {game.genres?.[0]?.name || 'Game'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">
                              Select & Add
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Game Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter game title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Platform Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Platform</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {(Object.keys(PLATFORMS) as Platform[]).map((p) => {
                      const cfg = PLATFORMS[p];
                      const isSelected = platform === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPlatform(p)}
                          style={{
                            borderColor: isSelected ? cfg.color : 'rgba(255,255,255,0.08)',
                            backgroundColor: isSelected ? cfg.bgColor : 'rgba(255,255,255,0.03)',
                            color: isSelected ? cfg.textColor : '#a1a1aa',
                          }}
                          className="flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all"
                        >
                          <span className="font-bold">{cfg.shortName}</span>
                          <span className="text-[10px] opacity-75">{cfg.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Game Status</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'playing', label: profile.statusNames?.playing || 'Currently Playing', icon: '🎮' },
                      { id: 'backlog', label: profile.statusNames?.backlog || 'In Backlog', icon: '⏳' },
                      { id: 'completed', label: profile.statusNames?.completed || 'Completed', icon: '🏆' },
                      { id: 'mastered', label: profile.statusNames?.mastered || '100% Platinum', icon: '👑' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setStatus(st.id as GameStatus)}
                        className={`p-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                          status === st.id
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm'
                            : 'bg-zinc-800/40 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        <span>{st.icon}</span>
                        <span>{st.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Achievements & Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                      <Clock size={14} className="text-blue-400" />
                      Hours Played
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={hoursPlayed}
                      onChange={(e) => setHoursPlayed(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                      <Trophy size={14} className="text-amber-400" />
                      Achievements (Unlocked / Total)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Unlocked"
                        value={achievementsUnlocked}
                        onChange={(e) => setAchievementsUnlocked(Number(e.target.value))}
                        className="w-1/2 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-100"
                      />
                      <span className="text-zinc-500">/</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Total"
                        value={achievementsTotal}
                        onChange={(e) => setAchievementsTotal(Number(e.target.value))}
                        className="w-1/2 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Cover Image URL */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Cover Image URL</label>
                  <input
                    type="url"
                    placeholder="https://... (Optional)"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-500"
                  />
                </div>

                {/* Rating with Half Stars */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Rating (Half & Full Stars)
                  </label>
                  <div className="p-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl">
                    <StarRating
                      value={rating}
                      onChange={(newVal) => setRating(newVal)}
                      size="md"
                      showSteppers={true}
                      showLabel={true}
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Click the left half of any star for a half-star (e.g. 4.5★) or right half for full star.
                    </p>
                  </div>
                </div>

                {/* Collections Multi-Select */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Add to Collections</label>
                  <div className="flex flex-wrap gap-1.5">
                    {collections.map((col) => {
                      const isSelected = selectedCollections.includes(col.id);
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            setSelectedCollections(prev =>
                              isSelected ? prev.filter(id => id !== col.id) : [...prev, col.id]
                            );
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 transition-all ${
                            isSelected
                              ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                              : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {isSelected && <Check size={12} />}
                          {col.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Personal Notes</label>
                  <textarea
                    rows={2}
                    placeholder="E.g. Strategy tips, favorite memories, or plans..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 resize-none placeholder-zinc-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Plus size={16} />
                    Save Game
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
