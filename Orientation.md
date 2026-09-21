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

**Three collections are permanent** ([`lib/collections.ts`](src/lib/collections.ts)):

```
perm-backlog  ·  perm-playing  ·  perm-complete
```

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
- Two backfills ride along, same shape: [`useCoverArt`](src/lib/useCoverArt.ts)
  for RAWG art and [`useGameLogos`](src/lib/useGameLogos.ts) for logos —
  SteamGridDB by title (a PlayStation game's only source), Steam's CDN behind
  it, stored in `logo_image`. **A logo not found is not an error**: recorded as
  a miss and left for a week.

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
STEAMGRIDDB_API_KEY          # optional; game logos, keyed by title
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

Passes since then, each cutting a surface down to what it is read for. A card
lists **every** collection a game is in, shelf first; the achievement rating is
asked for only at 100%, being a verdict on a whole list; phones fold the three
shelves into Collections (`CollectionsList`), where each wears its own colour
(`PERMANENT_ROW_CLASS`, lifted from `Badge`'s tones) and 100% takes the card's
travelling `gold-ring`; `grid-metrics` is one per row there, which is what let
`MetricCard` give its emblem a column. The star is retired: see below. And:

- **Figures count games, not unlocks**, and live as `Badge` pills beside the
  page title: `6 active`, `27 queued`, `19 finished` and the two platform marks.
  Statistics' platform rows end in the perfected count alone and Home's gauge
  caption counts the games its arc speaks for.
- **`MetricCard` centres on its own height** and gives the emblem a column —
  stretched to the gauge beside it, the lower half of every box was void.
- **Platform is no longer a sort.** `GameSortOption` has no `'platform'` and
  `compareGames` takes no `platformOrder`: every grid splits into platform
  sections already. The Settings card stays — it orders those sections.
- **A phone card is the artwork**, in a 3:2 box rather than 16:9: platform mark,
  a fixed-width score, and on the art's own scrim the name, the award mark
  beside its word (`awardNoun`), the count hard right, then the meter. No panel,
  hours, emblem or percentage — the line fills a 166px card without it.
- **The cover scrims are a share of the box, not a pixel height.** At `h-20` and
  `h-24` they totalled 176px over a 94px phone cover, overlapping by 82px and
  darkening every pixel twice. The overlay text has its own shadow instead.
- **A phone reads its page title, and the tab's mark, from the fixed app
  header**, where the lockup was. `PageHeader` draws no title below `md`;
  `CollectionsView` and `SettingsView` hide their hand-rolled ones too. Space
  that row to the glyphs, not the boxes — an icon button carries 5px of its own
  padding, so even gaps read uneven beside one.
- **One rule between sections, not two.** `PageHeader` ends in a border, so a
  filter row below it carries none — with the notice gone they sat a gap apart.
- **A phone splits a game into two windows**: `GamePersonalModal` for what is
  yours — hours, the last unlock, both ratings, and `notes`, which nothing had
  ever read back — with a button stepping through to `GameInfoModal` for the
  store page. A wide screen scrolls one column through both, as before. **The
  dialog is the only way to edit a game**; the card's pencil is gone.
- **`Dialog`'s scroll lock is reference-counted.** Saving and restoring
  `body.overflow` per dialog meant the first of two to close handed the page
  back its scroll — and the exit animation makes "first" a matter of timing.

### Conventions worth keeping

- **No star or sparkle icon.** It was used for the achievements emblem and the
  rating filter and read as decoration in both. `CollectionIcon` keeps
  `Sparkles` only as a key aliased to `ListPlus`, so a row saved under the old
  name still draws something sensible.
- **A page's headline figures go in `PageHeader`'s `badge`**, never in a strip
  under the title or a band of cards below it. Both were tried; both restated
  the title.

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
- **Logos need switching on.** Both SteamGridDB endpoints are verified against a
  real key, including PlayStation exclusives, but the key is currently unset and
  the deployed function has no `/logo` route: set `STEAMGRIDDB_API_KEY`, deploy,
  and re-run the schema SQL for `logo_image`. Until then Steam's CDN answers for
  linked apps and everything else shows plain art.
- `deleteCollection` fans out one write per affected game — reachable now that
  everything except the three shelves is deletable. A batched
  `{ kind: 'games'; op: 'upsert' }` queue variant would fix it; `db.upsertGames`
  already exists.
- The bundle is one 888 kB chunk. No code splitting anywhere.

---

*Updated per session. If something here is no longer true, fix it here first.*
