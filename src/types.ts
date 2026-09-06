export type Platform = 'ps5' | 'steam' | 'xbox' | 'epic' | 'android';

export type GameStatus = 'backlog' | 'playing' | 'completed' | 'mastered' | 'dropped';

export interface GameAchievement {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface UserGame {
  id: string; // Unique UUID
  rawgId?: number;
  title: string;
  platform: Platform;
  status: GameStatus;
  coverImage?: string;
  releaseDate?: string;
  genres: string[];
  hoursPlayed: number;
  rating?: number; // 1 to 5 stars or 1 to 10
  achievementsUnlocked: number;
  achievementsTotal: number;
  achievements?: GameAchievement[];
  collections: string[]; // collection IDs
  notes?: string;
  lastPlayedAt?: string;
  addedAt: string;
  completedAt?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isSystem?: boolean;
  createdAt: string;
}

export interface SidebarConfig {
  showCurrentlyPlaying: boolean;
  showBacklog: boolean;
  showCollections: boolean;
  showAchievements: boolean; // Trophy & 100% Unlocks
  showStats: boolean;
  showSearch: boolean;
  navOrder?: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  email?: string;
  sidebarConfig?: SidebarConfig;
  statusNames?: Partial<Record<GameStatus, string>>;
  platformOrder?: Platform[];
}

export interface PlatformConfig {
  id: Platform;
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconName: string;
}

export interface RawgGameResult {
  id: number;
  name: string;
  background_image?: string;
  released?: string;
  rating?: number;
  genres?: { id: number; name: string }[];
  platforms?: { platform: { id: number; name: string; slug: string } }[];
}
