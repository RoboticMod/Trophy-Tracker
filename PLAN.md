# Game Tracking Web App - Master Implementation Plan

A unified, single-user cross-platform game progress and achievement tracking web application (PlayStation 5, Steam, Xbox, Epic Games, Nintendo Switch, Android Play Store). Designed strictly as an objective utility and info tracker adhering to the Adobe Spectrum design system, without gamification, XP, or social network bloat.

---

## Phase 1: Foundation & Adobe Spectrum UI Architecture [COMPLETED]
- **Design Language**: Implemented Adobe Spectrum-inspired styling:
  - Sophisticated neutral color scales (zinc-900 canvas, zinc-800 borders, high-contrast typography).
  - Spectrum component patterns (clean toggles, badges, action buttons, progress meters).
  - Smooth, lightweight motion transitions.
- **Single-User Architecture**: Removed all unnecessary social network elements. Dedicated entirely to personal game tracking and data persistence.
- **GitHub Pages Support**: Built as a responsive client-side SPA with local-first persistence, portable JSON backup/restore, and optional Supabase PostgreSQL sync.

## Phase 2: Navigation & Sidebar Customization [COMPLETED]
- **Sidebar Cleanup**: Removed profile info (avatar, XP, rank) from the sidebar. Profile settings are consolidated into a clean, dedicated section inside Settings.
- **Dynamic Customizable Navigation**:
  - Added user-customizable sidebar toggles in Settings (`showCurrentlyPlaying`, `showAchievements`, `showBacklog`, `showCollections`, `showStats`, `showSearch`).
  - Navigation immediately adapts to user preferences.
- **Responsive Shell**: Collapsible sidebar on desktop with quick drawer on mobile viewports.

## Phase 3: Platform Visual Identity & Completion Badges [COMPLETED]
- **Platform Icons**: Replaced plain text platform names with platform icons across cards, filters, and analytics:
  - Steam, PlayStation (PS5/PS4), Xbox, Epic Games, Nintendo Switch, Android Google Play, PC/GOG.
- **Platform-Specific Completion Indicators**:
  - Steam: Golden Completed Achievements Ribbon.
  - PlayStation: Platinum Trophy Badge.
  - Xbox: Diamond 100% Gamerscore Badge.
  - Nintendo: Gold Star 100% Clear Badge.
  - Android Play Store: Android Platinum Trophy.

## Phase 4: Gamification Stripping & Utility Focus [COMPLETED]
- **Removed XP & Levels**: Completely purged XP calculations, player rank levels, title badges, and arbitrary milestones.
- **Pure Progress Tracking**: App is purely focused on:
  - Game completion status (Playing, Backlog, Completed, 100% Mastered).
  - Exact achievement unlocks (`unlocked / total` and `% completion`).
  - Hours played and date updated.
  - Custom priority (High, Medium, Low) and notes.

## Phase 5: Dedicated Tracking Views [COMPLETED]
- **Unified Profile Dashboard (`/`)**: Main hub with platform filters using platform icons, status pills, and quick stats.
- **Currently Playing (`/playing`)**: Focused view for active titles with quick-increment controls for playtime and achievements.
- **All Achievements & Trophy Unlocks (`/achievements`)**: Specialized view showcasing 100% completed games with platform badges alongside games in active achievement progress.
- **Backlog Queue (`/backlog`)**: Prioritized queue for unplayed titles with "Start Next Game" action.
- **Collections Management (`/collections`)**: Custom categorizations with color accents.
- **Statistics & Analytics (`/stats`)**: Clean analytical breakdown of lifetime hours, achievement rates, and platform distribution.
- **Search & Database Catalog (`/search`)**: RAWG video games database search with preloaded catalog.
- **Account & Preferences Settings (`/settings`)**:
  - Account Profile settings (username, email, avatar selection).
  - Sidebar navigation customization toggles.
  - Supabase / PostgreSQL cloud synchronization.
  - Portable JSON backup export & restore.

---

## Phase 6: Cloud Database & Synchronization [COMPLETED]
- **Supabase Cloud Sync Engine**:
  - Live bidirectional PostgreSQL synchronization (`games`, `collections`, `user_profile` tables) via `src/lib/syncEngine.ts`.
  - Comprehensive PostgreSQL SQL schema migration script with RLS policies, copyable directly from Settings with 1-click clipboard integration and schema viewer.
- **Sync Conflict Resolution**:
  - Timestamp-based conflict resolution comparing local vs remote record modification times (`lastPlayedAt`, `addedAt`, `updated_at`).
  - Seamless merge strategy ensuring newer local updates upload and newer remote records download with detailed synchronization metrics (`uploadedGames`, `downloadedGames`, etc.).
- **API Cache Optimization**:
  - Client-side 24-hour TTL local caching layer for RAWG catalog search queries to prevent API rate limiting and reduce network latency.
  - Cache management controls in Settings with active cache count display and 1-click cache purge.
- **Library Sorting & Half-Star Rating Filters**:
  - Added multi-criteria sorting: Recently Played, Rating (Highest First), Playtime (Most Hours), Completion % (Highest), and Title (A-Z).
  - Added granular half-star rating filters (All, ★ 5.0, ★ 4.5+, ★ 4.0+, ★ 3.0+, Unrated) across library views.

---

## Phase 7: Advanced Data Portability & Custom Themes (Next Step)
- **Direct Platform Import**: CSV/JSON parsers for exporting and importing libraries from Steam (Steam community profile import), Exophase, and Backloggd.
- **Spectrum Themes & Accent Customization**: Adobe Spectrum contrast modes (High Contrast, Medium, Dark/Light theme switching).
- **Custom Tags & Detailed Play Logs**: Session-based playtime journaling with date-stamped activity entries.
