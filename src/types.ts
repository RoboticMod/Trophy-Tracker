import type { SurfaceKey } from './lib/theme';

export type { SurfaceKey };

/** The only two platforms this tracker supports. */
export type Platform = 'steam' | 'ps5';

export const PLATFORM_IDS: Platform[] = ['steam', 'ps5'];

export const isPlatform = (value: unknown): value is Platform =>
  value === 'steam' || value === 'ps5';

/** Card emphasis treatment, chosen in Settings. */
export type HighlightStyle = 'stroke' | 'fill';

export type GameStatus = 'backlog' | 'playing' | 'completed' | 'mastered' | 'dropped';

export const GAME_STATUSES: GameStatus[] = [
  'backlog',
  'playing',
  'completed',
  'mastered',
  'dropped',
];

export interface UserGame {
  id: string;
  rawgId?: number;
  title: string;
  platform: Platform;
  status: GameStatus;
  coverImage?: string;
  releaseDate?: string;
  genres: string[];
  hoursPlayed: number;
  rating?: number;
  /** Separate score for how good the achievement/trophy list was to earn. */
  achievementRating?: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  collections: string[];
  notes?: string;
  lastPlayedAt?: string;
  addedAt: string;
  completedAt?: string;
  /** Real modification time — drives last-write-wins against the cloud copy. */
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isSystem?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SidebarConfig {
  showCurrentlyPlaying: boolean;
  showBacklog: boolean;
  showCollections: boolean;
  showAchievements: boolean;
  showStats: boolean;
  showSearch: boolean;
  navOrder?: string[];
  /** User-supplied labels for sidebar destinations, keyed by route path. */
  navNames?: Record<string, string>;
}

/** Cover shape for every card in a library grid, chosen from the top bar. */
export type CardLayout = 'wide' | 'poster';

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  email?: string;
  sidebarConfig?: SidebarConfig;
  /** User-defined display names for each status. */
  statusNames?: Partial<Record<GameStatus, string>>;
  /** Ordering used by the "Platform" sort across every library view. */
  platformOrder?: Platform[];
  /** How a card signals its status: a coloured stroke, or a filled tint. */
  highlightStyle?: HighlightStyle;
  /** Cover shape for library grids. */
  cardLayout?: CardLayout;

  /* -- Advanced customization ------------------------------------------- */
  /** Accent hex driving buttons, links, active nav and progress meters. */
  accent?: string;
  /** Trophy metal for completion, platinum badges and highlights. */
  gold?: string;
  /** Key of the surface preset — never the hexes it expands to. */
  surface?: SurfaceKey;
  /** Renames the app itself. Never affects RAWG game titles. */
  uiAppName?: string;
  /** Headline on the dashboard. */
  uiDashTitle?: string;
}

export interface PlatformConfig {
  id: Platform;
  name: string;
  shortName: string;
  /** All-caps wordmark used on card overlays and rank chips. */
  mark: string;
  /** Identity hue — meters, chart fills, chip ink. */
  color: string;
  /** The hue at 40% alpha, for a hairline that names the platform. */
  line: string;
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
