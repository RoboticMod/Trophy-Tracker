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
| `/` | `pages/DashboardView.tsx` | The library: filters, sort, the whole grid |
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

## Design system

[`src/index.css`](src/index.css) — one `@theme` block of tokens (`--color-*`,
`--text-*`), then utilities. Two rules worth knowing:

- **Class strings must be literal.** Tailwind v4 scans source text, so a class
  built by concatenation is dropped at build time with no error. This is why the
  colour maps in `lib/collections.ts` are written out per id.
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
SUPABASE_SERVICE_ROLE_KEY    # only for POST /me/delete
```

The schema lives in [`supabase/schema.sql`](supabase/schema.sql) and is imported
raw by `lib/schema.ts`, so the "Copy schema SQL" button and the file cannot drift.
It is written to be re-run: every section repairs an existing project rather than
failing.

## Current status

Collections became the only shelf model in a batch that also cleared the UI
papercuts grown around the old one. Landed:

- `status`, `GameStatus`, `statusNames`, `isSystem` and `lib/status.ts` deleted;
  every surface reads `permanentOf(game.collections)`.
- `collections` primary key is now `(user_id, id)`. It was `id` alone, so the fixed
  starter ids could only ever be seeded once **across the whole project** — every
  account after the first failed to seed and was told its library would not load.
- `/setup` for a new account; delete-account via a service-role function route.
- Settings grouped into five; the sidebar order is dragged (arrow keys still work).
- Page descriptions became dismissable `IntroNotice` banners, synced to the profile.
- Adding a game no longer writes RAWG's community score as your rating.

### Known gaps

- **The SQL migration is one-way.** `status` is dropped in the same script that
  reads it. Take a Supabase backup before running it.
- **Not exercised against a live account.** Every change typechecks and builds, and
  the dev server renders, but the signed-in flows have not been driven end to end.
- `deleteCollection` fans out one write per affected game. Pre-existing, but far
  more reachable now that everything except the three shelves is deletable. A
  batched `{ kind: 'games'; op: 'upsert' }` queue variant would fix it;
  `db.upsertGames` already exists.
- The bundle is one 860 kB chunk. No code splitting anywhere.
- No tests. `tsc --noEmit` is the whole net.

---

*Updated per session. If something here is no longer true, fix it here first.*
