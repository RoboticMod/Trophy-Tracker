import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Sparkles, Plus, Clock, Bookmark, Check, Gamepad2, Star, Filter } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { searchGames, detectPlatformFromRawg } from '../lib/rawg';
import { RawgGameResult, Platform } from '../types';
import { PLATFORMS } from '../lib/constants';
import { StarRating } from '../components/StarRating';

export const SearchView: React.FC = () => {
  const { games, addGame } = useGame();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RawgGameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [addedIds, setAddedIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const doSearch = async () => {
      setLoading(true);
      const res = await searchGames(query);
      setResults(res);
      setLoading(false);
    };

    const timer = setTimeout(doSearch, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleQuickAdd = (game: RawgGameResult, toBacklog: boolean = false) => {
    const detected = detectPlatformFromRawg(game);
    const platformToUse = selectedPlatform !== 'all' ? selectedPlatform : detected;
    const convertedRating = game.rating ? Math.min(5, Math.max(0, Math.round(game.rating * 2) / 2)) : undefined;

    addGame({
      rawgId: game.id,
      title: game.name,
      platform: platformToUse,
      status: toBacklog ? 'backlog' : 'playing',
      coverImage: game.background_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
      genres: game.genres?.map(g => g.name) || ['Action'],
      hoursPlayed: 0,
      achievementsUnlocked: 0,
      achievementsTotal: 40,
      rating: convertedRating,
      collections: toBacklog ? ['col-backlog'] : [],
      notes: `Added from open game database. Released in ${game.released || 'recent years'}.`,
    });

    setAddedIds(prev => ({ ...prev, [game.id]: true }));
  };

  const isAlreadyAdded = (gameTitle: string) => {
    return games.some(g => g.title.toLowerCase() === gameTitle.toLowerCase());
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Search Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="text-blue-400" size={24} />
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Game Database & Discovery
          </h1>
        </div>
        <p className="text-sm text-zinc-400">
          Search over 800,000+ video games across PS5, Steam, Epic Games, Android Play Store, and more.
        </p>
      </div>

      {/* Search Bar & Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Search by game name, genre, or universe (e.g., Final Fantasy, Resident Evil, Zelda, Hades...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-md transition-all"
          />
        </div>

        {/* Platform Target Preset */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1 mr-1">
            <Filter size={13} />
            Target Platform:
          </span>

          <button
            onClick={() => setSelectedPlatform('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedPlatform === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            Auto-Detect
          </button>

          {(Object.keys(PLATFORMS) as Platform[]).map((p) => {
            const cfg = PLATFORMS[p];
            const isSelected = selectedPlatform === p;
            return (
              <button
                key={p}
                onClick={() => setSelectedPlatform(p)}
                style={{
                  borderColor: isSelected ? cfg.color : undefined,
                  backgroundColor: isSelected ? cfg.bgColor : undefined,
                  color: isSelected ? cfg.textColor : undefined,
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                  isSelected
                    ? 'border-current shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {cfg.shortName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & Status */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          Showing {results.length} games {query.trim() ? `for "${query}"` : 'from top curated releases'}
        </span>
        {loading && <span className="text-blue-400 font-semibold animate-pulse">Searching database...</span>}
      </div>

      {/* Grid of Database Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
        {results.map((game) => {
          const added = isAlreadyAdded(game.name) || addedIds[game.id];
          const detected = detectPlatformFromRawg(game);
          const platformCfg = PLATFORMS[selectedPlatform !== 'all' ? selectedPlatform : detected];

          return (
            <motion.div
              key={game.id}
              whileHover={{ y: -3 }}
              className="group rounded-3xl bg-zinc-900 border border-zinc-800/80 overflow-hidden flex flex-col justify-between shadow-md hover:border-zinc-700 transition-all"
            >
              {/* Thumbnail */}
              <div className="relative h-40 w-full overflow-hidden bg-zinc-950">
                <img
                  src={game.background_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400'}
                  alt={game.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

                <div className="absolute top-2.5 left-2.5">
                  <div
                    className="relative px-2 py-0.5 rounded-full border flex items-center justify-center overflow-hidden shadow-sm"
                    style={{
                      borderColor: platformCfg.borderColor,
                      color: platformCfg.textColor,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                    <div className="absolute inset-0" style={{ backgroundColor: platformCfg.bgColor }} />
                    <span className="relative z-10 text-[10px] font-bold">
                      {platformCfg.shortName}
                    </span>
                  </div>
                </div>

                {game.rating ? (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-400/30">
                    <StarRating value={game.rating} readOnly size="xs" showLabel={false} />
                    <span>{game.rating}</span>
                  </div>
                ) : null}

                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="text-sm font-bold text-white truncate drop-shadow">
                    {game.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {game.released?.split('-')[0] || 'TBA'} • {game.genres?.[0]?.name || 'Video Game'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-zinc-900/60 border-t border-zinc-800/80 flex items-center gap-2">
                {added ? (
                  <div className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center justify-center gap-1.5">
                    <Check size={14} />
                    In Your Profile
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleQuickAdd(game, false)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md shadow-blue-600/20"
                    >
                      <Plus size={14} />
                      Play Now
                    </button>
                    <button
                      onClick={() => handleQuickAdd(game, true)}
                      className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold border border-zinc-700 transition-all flex items-center justify-center gap-1"
                      title="Add to Backlog Collection"
                    >
                      <Bookmark size={14} />
                      Backlog
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
