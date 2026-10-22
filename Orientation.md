# Orientation

Read this at the start of a session instead of the codebase. It says what the app
is, where each thing lives, and which rules are load-bearing. Under 250 lines on
purpose — if it stops fitting, something in it has stopped being orientation.

## What it is

**Trophy Tracker** — a personal library for Steam and PlayStation 5: what you
own, what you are playing, playtime, and how far through each award list you
are. Linked games keep their figures up to date. Beside it, a hand-entered
**Call of Duty camo tracker**.

React 19 · TypeScript · Vite 6 · Tailwind v4 · react-router 7 · motion ·
Supabase (Postgres + Auth + one edge function). No test framework:
`npm run lint` (`tsc --noEmit`) is the safety net; `npm run dev` serves on 3000.

## Routes

Every route below `/` renders inside [`AppLayout`](src/components/AppLayout.tsx),
which owns the phone bars, the top bar and the two banners.

| Path | File | What it is |
|---|---|---|
| `/` | `pages/DashboardView.tsx` | Home: a summary — Now playing, completion, Closest to 100%, Recent unlocks, CoD, Up next |
| `/library` | `pages/LibraryView.tsx` | Every game: search, filters, sort, the grid (tab off by default) |
| `/playing` | `pages/CurrentlyPlayingView.tsx` | The Playing shelf |
| `/backlog` | `pages/BacklogView.tsx` | The Backlog shelf |
| `/achievements` | `pages/AchievementsView.tsx` | Games at 100%, by `isPerfect` — no tab; opened from Lists and Home |
| `/collections` | `pages/CollectionsView.tsx` | Lists: the CoD and 100% entries, then every list |
| `/call-of-duty` | `pages/CallOfDutyView.tsx` | The camo tracker |
| `/search` | `pages/SearchView.tsx` | Catalog search, and adding from it |
| `/stats` | `pages/StatsView.tsx` | Four panels of metrics |
| `/settings` | `pages/SettingsView.tsx` | Five groups of cards; `?section=<id>` opens one |
| `/setup` | `pages/SetupView.tsx` | Where a brand-new account lands |

Signed out: `AuthView`. No Supabase credentials: `SetupNotice`. Opens on Home.
An open list is `/collections?list=<id>`, a push, so back returns to Lists.

## The data model

A game is a row with counts, dates, an optional platform link, and an array of
**collection ids**. That array is the whole filing system — there is no
`status` field (there was; it disagreed with the lists in normal use).

**Four collections are permanent** ([`lib/collections.ts`](src/lib/collections.ts)):
`perm-backlog · perm-playing · perm-beaten · perm-complete`. Beaten has no page
or tab; it lives first in Lists and counts toward Home's gauge.
`withPermanentCollections` adds any missing one on load.

- A game is on **at most one** of them. `fileInPermanent` and `toggleCollection`
  enforce it; `normalizeCollections` repairs anything past them and runs before
  every push.
- Undeletable, app-coloured (`withPermanentColors`), and permanent **by id,
  never a stored flag** — a flag goes wrong in an old backup.

Everything else is an ordinary list: deletable, colourable, any number per game.

**100% has exactly one definition**: `isPerfect` in
[`lib/completion.ts`](src/lib/completion.ts) — every award earned, counts only.
The `perm-complete` shelf *follows* it and never stands in for it, and so does
Lists' 100% entry. Earning the last award files a game there, losing one moves
it to Playing — only on the crossing, so a game shelved elsewhere at 100% stays
put, and an explicit `collections` in the same edit wins.

**The camo tracker** ([`lib/camo.ts`](src/lib/camo.ts), all rules, no React):
one `camo_games` row per tracked game, `data` jsonb holding modes → tiers
(Special or Mastery; a mastery tier's colour — gold, diamond, then dark — follows its order; optional image link) and classes → weapons
(`military`, `done[]` per tier), repaired on read (`normalizeCamoData`). Chain
rule: a tick ticks every earlier tier, a clear clears every later one; military
is separate. Nothing seeded; only Edit mode changes cells. Undo
(`useCamoHistory`): 25 snapshots, session only, per account, cleared by a
restore. View per device (`camo-view`). Add a game › From a file: `readCamoImport`.

**Award lists** ([`lib/awards.ts`](src/lib/awards.ts)): game details' Trophies
section, cached in `game_awards` with the counts at fetch time and refetched on
open only once those counts move. Tier from earn rate on both platforms: under
5% Ultra rare, under 15% Very rare, under 50% Rare, else Common. No rate, no
rarity shown — never a guess. Hidden for a game not linked.

## Data flow

```
UI  →  GameContext  →  optimistic setState (+ latest ref)
                    →  push()  →  db.ts  →  Supabase
                              ↘  on failure: localCache queue, retried on reconnect
```

[`GameContext`](src/context/GameContext.tsx) is the only writer, the camo
tracker included (`saveCamoGame`, queue kind `camo`).

- **Optimistic, always**; a failed write keeps the change and queues. A
  `latest` ref sits beside state for anything read across an await.
- **`localCache` snapshot** paints the last library first; a `CACHE_VERSION`
  mismatch returns `null` rather than painting an old model.
- **Seeding sits outside the load's `try`**; an empty server is `needsSetup`.
- **Later tables load on their own** (`platform_accounts`, `camo_games`,
  `game_awards`): a project missing one keeps its library; the tracker says it
  cannot save, award lists fetch live.
- **Restore replaces**: `replaceAll` deletes, through the queue, every game,
  list and (when the backup has them) camo game not in the backup. Backups are
  5.0.0; one without `camoGames` keeps the tracker. It confirms first (Now vs
  Backup, with Export current first).

## Sync

One edge function, `supabase/functions/game-data`, because the upstreams send no
CORS headers and the Steam key must not ship in the bundle.

- [`SyncContext`](src/context/SyncContext.tsx) is the only place platform data is
  fetched: on open, periodically, on focus, on reconnect, and on add or link.
- [`useSteamSync`](src/lib/useSteamSync.ts) / [`usePsnSync`](src/lib/usePsnSync.ts)
  fetch and write; [`lib/sync.ts`](src/lib/sync.ts) holds only the **rules**
  (`reconcile(game, incoming)` → `{ updates, changed, grewList }`) and knows no
  collection ids.
- A sync never touches `rating`; its shelf moves announce themselves
  (`automatic: true` → `GameMovedDialog`). PSN counts follow `usePsnTrophyScope`.
- Award lists: `/me/steam/awards?appid=` (schema + unlocks + global
  percentages) and `/me/psn/awards/:npCommunicationId` (trophies + earned state
  + `trophyEarnedRate`, PS5 service then PS4). Fetched when game details open,
  not during a sync.
- Backfills, same shape: [`useCoverArt`](src/lib/useCoverArt.ts) (RAWG),
  [`useGameLogos`](src/lib/useGameLogos.ts) (`logo_image`) and `useGamePosters`
  (`/poster`, `poster_image`) — SteamGridDB by title, Steam's CDN behind it. **A
  miss is not an error**: recorded and retried in a week. A Steam-CDN result is
  provisional; `isUpgrade` decides every write so a real answer is never
  replaced by the fallback.

## Design system

[`src/index.css`](src/index.css) — one `@theme` block of tokens, then utilities.
**No raw hex outside it** (`PLATFORMS` colours are `var(--color-…)` too). Each
colour means one thing: blue progress and interaction, **gold 100% only**, green
done/synced, orange (`notice`) warning and offline, violet the tracker's dark
tier and Ultra rare. `camo-*` tokens and `camo-swatch-*` utilities are the
tracker's original placeholder art — no game art is bundled. Accent fills run
600 → 500 and negative 600, for 4.5:1 white text.

- **Class strings must be literal.** Tailwind v4 scans source text; a class
  built by concatenation is silently dropped. Hence the per-id maps in
  `lib/collections.ts`.
- **`cn` joins, it does not merge.** Two paddings both land and the larger
  wins. A variant is a prop (`compact`, `bare`, `chip`), never an outside
  override.
- **Custom properties need `@property` to animate.** Primitives live in
  [`components/ui/`](src/components/ui), re-exported from `index.ts`.

## Environment

Client (`.env.local`, public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_RAWG_API_KEY` (optional; settable in Settings). Function secrets:
`STEAM_API_KEY`, `STEAMGRIDDB_API_KEY` (optional). `SUPABASE_*` are injected by
Supabase; delete-account uses the service-role key.

The schema lives in [`supabase/schema.sql`](supabase/schema.sql), imported raw by
`lib/schema.ts`, so "Copy schema SQL" and the file cannot drift. Every section
is re-runnable and repairs an existing project. The `collections` key is
`(user_id, id)`, so the fixed starter ids seed once per account.

## What is load-bearing

**Copy is a few words, or none** — kept only for an error, what a destructive
action costs, or something you must do. The handoff designs (`Mobile Redesign`,
`Desktop & Tablet`) rebuilt every surface on one card; the HANDOFF.md redesign
(0.13.1–0.19.1) added the contrast fixes, the still 100% treatment, Library,
the summary Home, the CoD tracker, award lists and replacing restores.

- **One card, 16:9 at every width** (`GameCard`): score top left, title on the
  art, then a solid strip — count, percentage, meter, and on a wide card
  playtime and **one list chip** plus `+n`. The 100% mark is the bare award art
  top right. No platform mark on a phone; the section heading names it. A
  portrait tile was tried and removed (most art is 16:9 only).
- **100% treatment, wherever a finished game appears** (card, Lists entry,
  Home's 100% row, a notification): a still `trophy-700/55` border,
  `trophy-glow` (22px, 24%) where a halo fits, `trophy-spot` and the foil
  `trophy-sweep`. **Nothing turns around the rim** — the `gold-ring` is gone.
- **`grid-cards`**: 2 on a phone, 3 from 600, then 248px tracks — **always
  cards**. Home also uses `grid-cards-three` and the phone `card-strip`.
- **Chrome.** Phone: 56px header (back, title, count badge, the page's slot via
  `PhoneHeaderAction`, bell, sync, add — 44px) and a 60px bottom bar: **the
  first four visible tabs, then More**. From 768: a 64px top bar, no backdrop
  blur, `Wordmark`, sync, bell, Add, `ProfileMenu`; below 1280 inactive tabs are
  icons, and controls are 44px below 1024.
- **Navigation** ([`lib/navigation.ts`](src/lib/navigation.ts), the one copy):
  Home · Library (off) · Playing · Lists · Call of Duty · Stats · Search (off) ·
  Backlog (off). All but Home can be hidden; all reorder in Settings ›
  Customization › Navigation, which marks where the phone bar ends.
  `resolveNavOrder` slots new tabs where the default puts them; `isShown` reads
  a missing key as its default.
- **Scroll is per history entry** (`location.key`): restored on POP, top on push.
- **Sort lives in `SortControl`** — a phone-header icon opening a sheet, the
  trailing pill of `PageHeader` from 768.
- **Figures sit with the title** (phone header count, desktop `subtitle`).
- **Every `Dialog` is a bottom sheet on a phone** (handle, max 88dvh, sticky
  header and footer, drag to close) and portals to `<body>`. Game details stay
  a sheet below 1024, then `Dialog size="split"`. **The dialog is the only way
  to edit a game.** Scroll lock is reference-counted.
- **Controls**: 44px on a phone (40 from md); chips scroll (`scroll-row`), not wrap.
- **Lists**: a row per list with three 2:3 previews on a phone (`posterImage`,
  else Steam's capsule, else cropped art), 2 × 2 mosaic cards from 768. Both
  open with the CoD entry (covers from the library game of the same name) and
  the 100% entry (gold). Library's list and rating filters are `Select chip`s.
- **Notifications**: each settled sync compares award counts with the device's
  marks and files what moved — merged per game, 30 days, 50 max, per device.
  Nothing pops up; opening the bell plays each new 100% first. Clear all undoes
  for 5 seconds (`restore`). Home's Recent unlocks reuses `NotificationRow`.
- **Naming**: users see "Lists", "PlayStation"; code, `/collections`, `ps5` and
  stored keys keep old names. **No star or sparkle icon. Logos only on list
  previews** — both were tried on cards and undone.
- **Version and changelog**: [`lib/changelog.ts`](src/lib/changelog.ts) is the
  one source — `APP_VERSION` is its newest entry; `package.json` and both
  `trophy-tracker` lines in `package-lock.json` match. 0.x: middle number for a
  feature, last for small changes and UI. **Every shipped change adds an entry.**
- **Not built**: playtime-over-time charts — nothing records playtime history.

### Performance rules

A library runs to 150 cards, so anything per card is paid 150 times.

- **Cards do not read the game context.** `GameList` reads it once and passes
  each memoised `GameCard` its slice; a context read inside the card undoes it.
- **Windows mount on first open** via [`lib/lazyDialogs.tsx`](src/lib/lazyDialogs.tsx);
  pages via `preloadable` in `App.tsx`, both prefetched on idle. Not
  `React.lazy` — it suspends even when loaded and holds content back 300 ms.
- **No `layout` animation, no per-card blur or big shadow.** Entrance is CSS
  `card-enter`; each card sits in a `card-shell` (`content-visibility: auto`,
  10px of padding for the glow).
- **No backdrop blur over scrolling content** — header, bars, sheet scrim.
- One `useMediaQuery` listener per query; backfills step at idle in a visible
  tab. Pages are chunks, vendors split (largest ~233 kB).

### Known gaps

- **The `status` migration is one-way.** Take a Supabase backup first.
- **Not exercised against a live account**: signed-in flows not driven end to end — the tracker's saves,
  restore's deletes and the award routes included. Layouts are checked by
  mounting real components in a throwaway Vite entry with contexts faked by
  alias (deleted after); edge function by `deno check`, SQL by a Postgres parser.
- **Award lists** were mapped from psn-api's types, one real PSN response
  (every trophy carried `trophyEarnedRate` and `trophyRare`, PS5 and PS4) and
  Valve's documented Steam responses. The first real fetch is the real test.
- **Logos and posters**: SteamGridDB verified; the signed-in round trip never run.
- `deleteCollection` writes once per affected game (`db.upsertGames` could batch).
- **Mixed line endings**: CRLF in `App.tsx`, `db.ts`, `types.ts`, `Button.tsx`,
  `package-lock.json`, the edge function, `schema.sql`. Keep each file's own.

---

*Updated per session. If something here is no longer true, fix it here first.*
