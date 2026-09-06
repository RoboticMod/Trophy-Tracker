import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { UserGame, Collection, UserProfile, Platform, GameStatus, SidebarConfig } from '../types';
import { INITIAL_GAMES, DEFAULT_COLLECTIONS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { executeBidirectionalSync, getSyncMetadata, SyncStats } from '../lib/syncEngine';

interface GameContextType {
  games: UserGame[];
  collections: Collection[];
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  sidebarConfig: SidebarConfig;
  updateSidebarConfig: (updates: Partial<SidebarConfig>) => void;
  activePlatformFilter: Platform | 'all';
  setActivePlatformFilter: (platform: Platform | 'all') => void;
  activeStatusFilter: GameStatus | 'all';
  setActiveStatusFilter: (status: GameStatus | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  addGame: (game: Omit<UserGame, 'id' | 'addedAt'>) => void;
  updateGame: (id: string, updates: Partial<UserGame>) => void;
  deleteGame: (id: string) => void;
  createCollection: (name: string, description?: string, color?: string, icon?: string) => void;
  deleteCollection: (id: string) => void;
  triggerCelebration: () => void;
  supabaseConnected: boolean;
  syncWithSupabase: () => Promise<void>;
  isSyncing: boolean;
  syncStats: SyncStats | null;
  lastSyncTime: string | null;
}

const STORAGE_GAMES_KEY = 'gametracker_pro_games_v1';
const STORAGE_COLLECTIONS_KEY = 'gametracker_pro_collections_v1';
const STORAGE_PROFILE_KEY = 'gametracker_pro_profile_v2';

export const DEFAULT_SIDEBAR_CONFIG: SidebarConfig = {
  showCurrentlyPlaying: true,
  showBacklog: true,
  showCollections: true,
  showAchievements: true,
  showStats: true,
  showSearch: true,
};

const DEFAULT_PROFILE: UserProfile = {
  id: 'usr-default',
  username: 'ApexGamer',
  email: 'gamer@gametracker.pro',
  avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
  sidebarConfig: DEFAULT_SIDEBAR_CONFIG,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<UserGame[]>(() => {
    const saved = localStorage.getItem(STORAGE_GAMES_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_GAMES;
  });

  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem(STORAGE_COLLECTIONS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return DEFAULT_COLLECTIONS;
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return DEFAULT_PROFILE;
  });

  const [activePlatformFilter, setActivePlatformFilter] = useState<Platform | 'all'>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<GameStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(() => getSyncMetadata().lastStats);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => getSyncMetadata().lastSyncTime);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_GAMES_KEY, JSON.stringify(games));
  }, [games]);

  useEffect(() => {
    localStorage.setItem(STORAGE_COLLECTIONS_KEY, JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  // Check Supabase connection on load
  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { error } = await supabase.from('games').select('count', { count: 'exact', head: true });
        if (!error) {
          setSupabaseConnected(true);
        }
      } catch (err) {
        // Safe fallback - offline mode is ready
        setSupabaseConnected(false);
      }
    };
    checkSupabase();
  }, []);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#c084fc', '#34d399', '#f43f5e', '#fbbf24']
      });
    } catch (e) {
      // Ignore if canvas is not ready
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({
      ...prev,
      ...updates,
    }));
  };

  const updateSidebarConfig = (updates: Partial<SidebarConfig>) => {
    setProfile(prev => ({
      ...prev,
      sidebarConfig: {
        ...(prev.sidebarConfig || DEFAULT_SIDEBAR_CONFIG),
        ...updates,
      },
    }));
  };

  const addGame = (gameData: Omit<UserGame, 'id' | 'addedAt'>) => {
    const newGame: UserGame = {
      ...gameData,
      id: 'game_' + Math.random().toString(36).substring(2, 9),
      addedAt: new Date().toISOString(),
    };

    setGames(prev => [newGame, ...prev]);
    triggerCelebration();
  };

  const updateGame = (id: string, updates: Partial<UserGame>) => {
    setGames(prev =>
      prev.map(g => {
        if (g.id !== id) return g;
        const updated = { ...g, ...updates };

        // If newly marked as completed or mastered, celebrate!
        if (
          (updates.status === 'completed' || updates.status === 'mastered') &&
          g.status !== 'completed' && g.status !== 'mastered'
        ) {
          triggerCelebration();
          updated.completedAt = new Date().toISOString();
        }

        // If achievements reached total, celebrate!
        if (
          updates.achievementsUnlocked &&
          updates.achievementsUnlocked >= (updated.achievementsTotal || 1) &&
          g.achievementsUnlocked < (updated.achievementsTotal || 1)
        ) {
          triggerCelebration();
        }

        return updated;
      })
    );
  };

  const deleteGame = (id: string) => {
    setGames(prev => prev.filter(g => g.id !== id));
  };

  const createCollection = (name: string, description?: string, color: string = '#8B5CF6', icon: string = 'Folder') => {
    const newCol: Collection = {
      id: 'col_' + Math.random().toString(36).substring(2, 9),
      name,
      description,
      color,
      icon,
      isSystem: false,
      createdAt: new Date().toISOString(),
    };
    setCollections(prev => [...prev, newCol]);
  };

  const deleteCollection = (id: string) => {
    setCollections(prev => prev.filter(c => c.id !== id));
    // Remove collection reference from games
    setGames(prev =>
      prev.map(g => ({
        ...g,
        collections: g.collections.filter(cId => cId !== id),
      }))
    );
  };

  const syncWithSupabase = async () => {
    setIsSyncing(true);
    try {
      const result = await executeBidirectionalSync(games, collections, profile);
      if (result.stats.success) {
        setGames(result.updatedGames);
        setCollections(result.updatedCollections);
        setProfile(result.updatedProfile);
        setSyncStats(result.stats);
        setLastSyncTime(result.stats.timestamp);
        setSupabaseConnected(true);
        triggerCelebration();
      } else {
        setSyncStats(result.stats);
      }
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <GameContext.Provider
      value={{
        games,
        collections,
        profile,
        updateProfile,
        sidebarConfig: profile.sidebarConfig || DEFAULT_SIDEBAR_CONFIG,
        updateSidebarConfig,
        activePlatformFilter,
        setActivePlatformFilter,
        activeStatusFilter,
        setActiveStatusFilter,
        searchQuery,
        setSearchQuery,
        isQuickAddOpen,
        setIsQuickAddOpen,
        addGame,
        updateGame,
        deleteGame,
        createCollection,
        deleteCollection,
        triggerCelebration,
        supabaseConnected,
        syncWithSupabase,
        isSyncing,
        syncStats,
        lastSyncTime,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
