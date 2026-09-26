# Orientation

Read this at the start of a session instead of the codebase. It says what the app
is, where each thing lives, and which rules are load-bearing. Under 250 lines on
purpose — if it stops fitting, something in it has stopped being orientation.

## What it is

**Trophy Tracker** — a personal library for two platforms, Steam and PlayStation 5,
that tracks what you own, what you are playing, how long you have played it, and
how far through its achievement or trophy list you are. Games can be linked to a
store entry, after which their figures keep themselves up to date.

React 19 · TypeScript · Vite 6 · Tailwind v4 · react-router 7 · motion ·
Supabase (Postgres + Auth + one edge function). No test framework;
`npm run lint` is `tsc --noEmit` and is the safety net.

```bash
npm run dev      # vite, port 3000 (.claude/launch.json)
npm run lint     # tsc --noEmit
npm run build
```

## Routes

Every route below `/` renders inside [`AppLayout`](src/components/AppLayout.tsx),
which owns the sidebar, the mobile bar, the top bar and the two banners.

| Path | File | What it is |
|---|---|---|
| `/` | `pages/DashboardView.tsx` | Home: the library, with filters, sort and the grid |
| `/playing` | `pages/CurrentlyPlayingView.tsx` | Games on the Playing shelf |
| `/backlog` | `pages/BacklogView.tsx` | Games on the Backlog shelf |
| `/achievements` | `pages/AchievementsView.tsx` | Games at 100%, by `isPerfect` |
| `/collections` | `pages/CollectionsView.tsx` | Every collection, and its games |
| `/search` | `pages/SearchView.tsx` | Catalog search, and adding from it |
| `/stats` | `pages/StatsView.tsx` | Reorderable sections of metrics |
| `/settings` | `pages/SettingsView.tsx` | Five groups of cards |
| `/setup` | `pages/SetupView.tsx` | Where a brand-new account lands |

Signed out, `AuthView` replaces the lot. With no Supabase credentials at all,
`App.tsx` shows `SetupNotice` instead of a broken app.

## The data model

A game is a row with counts, dates, an optional platform link, and an array of
**collection ids**. That array is the whole filing system. There is no `status`
field — there was, saying the same thing in a second vocabulary, and the two
disagreed in normal use.

**Four collections are permanent** ([`lib/collections.ts`](src/lib/collections.ts)):

```
perm-backlog  ·  perm-playing  ·  perm-beaten  ·  perm-complete
```

Beaten (finished, awards still to earn) has no page of its own and no tab: it
is kept in Lists, first, undeletable. It counts toward Home's gauge. A seeded
shelf needs no migration — `withPermanentCollections` adds any missing one on
load and writes it back.

- A game is on **at most one** of them. `fileInPermanent` and `toggleCollection`
  enforce that; `normalizeCollections` repairs any array that got past them, and
  `addGame`/`updateGame` run it before every push, so the choke point is one place.
- They cannot be deleted (`deleteCollection` returns early) and their colour is
  app-owned (`withPermanentColors` restores it on every load).
- Permanence is **derived from the id set, never stored**. A stored boolean can be
  wrong — an old backup is exactly where it goes wrong — and a `Set` lookup cannot
  drift. This is why `Collection.isSystem` and the `is_system` column are gone.
- The `perm-` prefix cannot collide with the legacy `col-*` ids, which is what let
  the migration merge and delete those unambiguously.

Everything else is an ordinary list: deletable, colourable, joinable in any number.

One card everywhere: `GameCard`, two across on a phone and as many as fit above
it. A portrait-tile variant was tried and removed — most games here have only
16:9 key art, so a tall tile meant cropping the picture in half or letterboxing
it.

**Logos live on the collection previews, and nowhere else.** Twice they went on
cards and twice that was undone — Steam-only, clipped by the card's own chips,
doubled up wherever the art had lettering. What survives is one box per cover
(`object-contain`, so a wide wordmark and a square crest claim the same room),
centred, on a pool of shade that keeps it off a painted-in title.

**100% has exactly one definition**: `isPerfect` in
[`lib/completion.ts`](src/lib/completion.ts) — every award earned, counts only.
Not the shelf, not a collection, not a flag. The `perm-complete` shelf *follows*
`isPerfect`; it never stands in for it. Earning the last award files a game onto
that shelf, and losing one moves it to Playing — but only on the crossing, so a
game deliberately shelved elsewhere at 100% stays put, and an explicit
`collections` in the same edit always wins.

## Data flow

```
UI  →  GameContext  →  optimistic setState (+ latest ref)
                    →  push()  →  db.ts  →  Supabase
                              ↘  on failure: localCache queue, retried on reconnect
```

[`GameContext`](src/context/GameContext.tsx) is the only writer. Notes that matter:

- **`latest` ref beside state.** React decides when a `setState` updater runs, so
  anything read across an await — a sync walking the library — reads the ref.
- **Optimistic, always.** A failed write keeps the local change and queues, so the
  library is never read-only because the network is not there.
- **`localCache` snapshot** paints the last library before the network answers. It
  carries a `CACHE_VERSION`; a mismatched snapshot returns `null` rather than being
  painted over the current model.
- **Seeding sits outside the load's `try`.** Folding it in meant a failed seed was
  reported as a library that could not be read — which is what the old
  "Could not load your library" banner on a new account actually was.
- **`needsSetup`**, not an error, when the server has nothing at all.

## Sync

One edge function, `supabase/functions/game-data`, because none of the upstreams
send CORS headers and the Steam key must not ship in the bundle.

- [`SyncContext`](src/context/SyncContext.tsx) is the only place platform data is
  fetched. It runs on open, periodically, on tab focus, on reconnect, and the
  moment a game is added or linked.
- [`useSteamSync`](src/lib/useSteamSync.ts) / [`usePsnSync`](src/lib/usePsnSync.ts)
  do the fetching and the writing.
- [`lib/sync.ts`](src/lib/sync.ts) holds the **rules** and nothing else. It knows
  no collection ids on purpose, so the rules read without a second file open. Its
  `reconcile(game, incoming)` returns `{ updates, changed, grewList }`; deciding
  what `grewList` means for a game's shelf is the hooks' job.
- A sync never touches `rating`. Ratings are yours.
- PlayStation counts follow `usePsnTrophyScope`: the base trophy list by default,
  or every group including add-ons. The edge function takes `?groups=all`.
- A sync passes `{ automatic: true }` to `updateGame`, which is what makes a shelf
  change it causes announce itself in `GameMovedDialog`.
- Three backfills ride along, same shape — posters too, via `useGamePosters`
  and the `/poster` route, stored in `poster_image`: [`useCoverArt`](src/lib/useCoverArt.ts)
  for RAWG art and [`useGameLogos`](src/lib/useGameLogos.ts) for logos —
  SteamGridDB by title (a PlayStation game's only source), Steam's CDN behind
  it, stored in `logo_image`. **A logo not found is not an error**: recorded as
  a miss and retried in a week. It **upgrades** too — a Steam-CDN logo is
  provisional, and `isUpgrade` decides every write so a real answer is never
  replaced, least of all by the fallback.

## Design system

[`src/index.css`](src/index.css) — one `@theme` block of tokens (`--color-*`,
`--text-*`), then utilities. Three rules worth knowing:

- **Class strings must be literal.** Tailwind v4 scans source text, so a class
  built by concatenation is dropped at build time with no error. This is why the
  colour maps in `lib/collections.ts` are written out per id.
- **`cn` joins, it does not merge.** Pass a `p-3.5` to a component applying its
  own `p-5` and both land in the list: the winner is whichever Tailwind emitted
  last, which is the larger value. A variant is a prop (`OverlayBadge`'s
  `compact`, `Card`'s `bare`), never an override from outside.
- **Custom properties need `@property` to animate**, or they jump between
  keyframes — see the marquee edge fades.

[`components/ui/`](src/components/ui) is the primitive set (`Button`, `Card`,
`Dialog`, `PageHeader`, `Meter`, `MarqueeText`, …), re-exported from its `index.ts`.

## Environment

Client (`.env.local`, inlined into the bundle — nothing secret):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_RAWG_API_KEY        # optional; users can supply their own in Settings
```

Function secrets (`supabase secrets set …`):

```
STEAM_API_KEY                # Steam search, achievements, playtime
STEAMGRIDDB_API_KEY          # optional; game logos and posters, keyed by title
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected into every edge
function by Supabase itself and cannot be set by hand — the `SUPABASE_` prefix is reserved. The
delete-account route reads the third of those, so it needs no setup of its own.

The schema lives in [`supabase/schema.sql`](supabase/schema.sql) and is imported
raw by `lib/schema.ts`, so the "Copy schema SQL" button and the file cannot drift.
It is written to be re-run: every section repairs an existing project rather than
failing.

## Current status

Collections became the only shelf model in a batch that also cleared the UI
papercuts grown around the old one. `status`, `GameStatus`, `statusNames`,
`isSystem` and `lib/status.ts` are deleted and every surface reads
`permanentOf(game.collections)`. The `collections` primary key is now
`(user_id, id)`: as `id` alone the fixed starter ids could only be seeded once
**across the whole project**, so every account after the first was told its
library would not load. Also landed: `/setup`, delete-account through a
service-role route, Settings in five groups, a dragged sidebar order, and page
descriptions as dismissable `IntroNotice` banners — which is why a page's first
rule can end up beside its second.

Passes since then, each cutting a surface down to what it is read for. The
achievement rating is asked for only at 100%, being a verdict on a whole list;
phones fold the three shelves into Lists (`CollectionsList`), where each wears
its own colour and 100% takes the card's travelling `gold-ring`.

Then the handoff's two designs, `Mobile Redesign` (phone) and `Desktop &
Tablet` (768 up), rebuilt every surface on one card and one set of rules. The
star is retired: see below. What is load-bearing:

- **One card, 16:9 at every width** (`GameCard`): the score top left, the title
  on the art (one line, ellipsis), then a solid strip — count and percentage,
  the meter, and on a wide card playtime and **one list chip** plus `+n` (lists
  only; the shelf is the card's own edge). The 100% mark is the bare award art
  top right at every width, no disc, over a strong top scrim (42%, mirroring the
  52% bottom one under the title). No platform mark on a phone — the section
  rule names it. A phone's per-card action (Backlog's Start) sits in the strip.
- **`grid-cards`**: 2 columns with 12px gaps on a phone, 3 from 600 to 1023,
  then a 248px track (five at 1440). **Always cards** — a sparse section once
  became full-width rows, and a card unlike every other read as a bug.
- **Chrome.** A phone: 56px fixed header (back — not on Home — 17px title, the
  shelf's count badge, sync, add — all 44px) and a 60px bottom bar lit on its top
  edge. A page can put a control in that header through `PhoneHeaderAction`
  (`lib/phoneHeader.tsx`, a portal target, no state lifted). From 768: a 64px
  top bar in the same 1440 `page-container` as the page, the `Wordmark` lockup,
  and `ProfileMenu` (Settings, Log out). `<main>` is reset to the top on every
  route change (a layout effect, so a page's own scroll-to still wins). The app
  always opens on Home — the start-page setting is gone.
- **Figures sit with the title, not in the page.** A phone shows the count in
  the fixed header; `PageHeader` there renders only a page's own control. A wide
  screen gets the title at 24 and a `subtitle` line of figures.
- **Every `Dialog` is a bottom sheet on a phone** — handle, 18px corners, max
  88dvh, sticky header and footer, pulled down by handle or header to close —
  and portals to `<body>`, since a sheet opened from inside `<main>` could not
  otherwise rise over the bars. `Select` opens one too. Game details
  (`GamePersonalModal`) stay a sheet up to 1024 (`sheetBelow="lg"`: 2-up
  secondaries, one full-width primary), then become `Dialog size="split"`,
  980 × 720, only the right column scrolling, Delete game bottom left. **The
  dialog is the only way to edit a game.**
- **Controls**: 44px fields and selects on a phone (40 from md), 36px pill
  chips in rows that scroll sideways (`scroll-row`) rather than wrap.
- **Type**: the phone ramp plus desktop steps `text-90/150/250/550/1000`
  (13/15/17/24/44); eyebrow 11, 12 from md. Radii `rounded-control` (8) and
  `rounded-tile` (12).
- **Pages**: Lists is a row per list with three 2:3 previews on a phone — the
  game's `posterImage` (`useGamePosters`: SteamGridDB 600 × 900 grid by title,
  then Steam's `library_600x900`, same upgrade rules as logos), Steam's capsule
  directly for a linked app, else the landscape art cropped — and a grid of
  2 × 2 mosaic cards from 768. `/settings?section=<id>` opens (or scrolls to) a
  Settings group. Statistics is four panels (overview,
  platforms, distribution, recent) — reorderable on a phone, fixed and two
  columns from 1280, as is Settings.
- **Naming**: users see "Lists", "New list", "Distribution", "PlayStation"
  / "PS". Code, the `/collections` route, the `ps5` id and stored config keys
  keep the old names, so saved settings still resolve; a saved nav label of
  "Collections" is treated as unset.
- **Version and changelog**: [`lib/changelog.ts`](src/lib/changelog.ts) is the
  one source — `APP_VERSION` is its newest entry, `package.json` matches, and
  Settings shows both. 0.x: major for a new major feature, minor for a feature
  changed entirely, patch for small changes and UI. **Every shipped change adds
  an entry.**
- **Not built, for want of data**: the design's 12-week playtime chart, its
  "All time" picker and "hours this month" — nothing records playtime over
  time. The Statistics 100% showcase is left to the Trophies tab.
- **`Dialog`'s scroll lock is reference-counted**, because the exit animation
  makes which of two dialogs closes first a matter of timing.

### Performance rules

A library runs to 150 cards, so anything per card is paid 150 times, and again
on every write. Measured on a 150-game library (production build): a one-game
edit went from ~70 ms to ~8 ms, Home's mount from ~190 ms to ~85 ms.

- **Cards do not read the game context.** `GameList` reads it once and passes
  each memoised `GameCard` only its slice (`collections`, `highlightStyle`, and
  this game's `followToken` / `celebrationToken` / `announcing`); celebration
  goes through `useCelebrationFor`. A new context read inside the card undoes
  this.
- **A card's windows mount on first open** and load through
  [`lib/lazyDialogs.tsx`](src/lib/lazyDialogs.tsx); pages load through
  `preloadable` in `App.tsx`. Both are prefetched on idle. Not `React.lazy`: it
  suspends on first render even when loaded, and React then holds the content
  back 300 ms.
- **No `layout` animation, no per-card blur or big shadow.** The entrance is the
  CSS `card-enter`; the card sits in a `card-shell` (`content-visibility: auto`,
  with 1px padding for the gold rim, lifted while a burst spills).
- **No backdrop blur over scrolling content on a phone** (header, bottom bar,
  sheet scrim). The gold rim rotates a layer instead of animating a gradient.
- **`useMediaQuery` shares one listener per query** (`useSyncExternalStore`).
- **Backfills** step only in a visible tab at idle (`lib/backgroundWork.ts`).

### Conventions worth keeping

- **No star or sparkle icon.** It was used for the achievements emblem and the
  rating filter and read as decoration in both. `CollectionIcon` keeps
  `Sparkles` only as a key aliased to `ListPlus`, so a row saved under the old
  name still draws something sensible.
- **A page's headline figures go beside its title** — the phone header's count,
  the desktop `subtitle` — never in a strip or a band of cards below it. Both
  were tried; both restated the title.

### Known gaps

- **The SQL migration is one-way.** `status` is dropped in the same script that
  reads it. Take a Supabase backup before running it.
- **Not exercised against a live account.** Every change typechecks and builds, and
  the dev server renders, but the signed-in flows have not been driven end to end.
  Phone layouts are measured by mounting the real components in a throwaway
  Vite entry (`harness.html` + `src/harness.tsx`, deleted after) — worth redoing
  that way: it catches a `cn` collision, hand-written HTML cannot.
- **Cover art is one landscape image per game**, from RAWG, shared by every
  surface. There is no separate poster; a portrait tile was tried and removed.
- **Logos are live but undriven.** Both SteamGridDB endpoints are verified
  against a real key, PlayStation exclusives included; the key is set, the route
  deployed and `logo_image` is on the table. What has never run is the round
  trip through the function with a signed-in session. A fresh project needs
  `STEAMGRIDDB_API_KEY`, a deploy, and the schema SQL.
- `deleteCollection` fans out one write per affected game — reachable now that
  everything except the three shelves is deletable. A batched
  `{ kind: 'games'; op: 'upsert' }` queue variant would fix it; `db.upsertGames`
  already exists.
- The bundle is one 888 kB chunk. No code splitting anywhere.

---

*Updated per session. If something here is no longer true, fix it here first.*
