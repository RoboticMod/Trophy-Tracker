/** The only two platforms this tracker supports. */
export type Platform = 'steam' | 'ps5';

export const PLATFORM_IDS: Platform[] = ['steam', 'ps5'];

export const isPlatform = (value: unknown): value is Platform =>
  value === 'steam' || value === 'ps5';

/** Card emphasis treatment, chosen in Settings. */
export type HighlightStyle = 'stroke' | 'fill';

/** How a rating is entered: a slider, or a short questionnaire that scores it. */
export type RatingMode = 'manual' | 'guided';

/**
 * Where a game's figures come from. Manual is the default and always will be:
 * linking a game to a platform account is opt-in, per game.
 */
export type SyncSource = 'manual' | 'steam' | 'psn';

export interface UserGame {
  id: string;
  rawgId?: number;
  title: string;
  platform: Platform;
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

  /* -- Platform links -------------------------------------------------------
     Set when a game is matched to a store entry, which is what makes live data
     and auto-sync possible. Absent on a hand-entered game, which stays fully
     editable and is never touched by a sync.                                 */

  /** Steam application id, e.g. 367520 for Hollow Knight. */
  steamAppId?: number;
  /** PSN trophy-set id (NPWR…), which is what trophy calls are keyed by. */
  psnCommunicationId?: string;
  /** PSN title id (CUSA…/PPSA…), for store links. */
  psnTitleId?: string;
  /** Which account last supplied this game's figures. */
  syncSource?: SyncSource;
  /** Whether a sync is allowed to overwrite the tracked figures. */
  autoSync?: boolean;
  lastSyncedAt?: string;
  /** When the platform says the most recent achievement or trophy was earned. */
  lastUnlockedAt?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
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
  /**
   * The destination the app opens on. Stored here for the same reason
   * statsOrder is: this object is already a jsonb blob, so it needs no
   * migration and follows you between devices.
   */
  startPath?: string;
  /**
   * View preferences — sort orders, the rating filter, the completion-sound
   * level. They live in localStorage first, because they are per-device
   * choices and must be readable before the profile has loaded; this is the
   * durable copy, so clearing site data does not lose them and a second device
   * starts from the same choices.
   */
  prefs?: Record<string, unknown>;
  /**
   * Order of the sections down the statistics page. Stored here rather than in
   * its own profile column because this object is already a jsonb blob, so it
   * takes no migration and reaches other devices with everything else.
   */
  statsOrder?: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  email?: string;
  sidebarConfig?: SidebarConfig;
  /** Ordering used by the "Platform" sort across every library view. */
  platformOrder?: Platform[];
  /** How a card signals its shelf: a coloured stroke, or a filled tint. */
  highlightStyle?: HighlightStyle;
  /** Whether ratings are set by hand, or worked out from a few questions. */
  ratingMode?: RatingMode;
}

/**
 * The accounts a user has linked, one row per user.
 *
 * The PSN refresh token is held server-side by the edge function and never
 * reaches the client, so it is deliberately absent from this type — the app
 * only ever needs to know whether a link exists and who it points at.
 */
export interface PlatformAccounts {
  steamId?: string;
  steamPersona?: string;
  psnAccountId?: string;
  psnOnlineId?: string;
  psnTokenExpiresAt?: string;
  updatedAt?: string;
}

export interface PlatformConfig {
  id: Platform;
  name: string;
  shortName: string;
  /** Identity hue — meters, chart fills, overlay tints. */
  color: string;
  /** Low-alpha identity tint layered above the overlay scrim on cover art. */
  tint: string;
  /** Token classes for the platform on an ordinary (non-overlay) surface. */
  surfaceClass: string;
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
