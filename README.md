# Trophy Tracker

A personal web app for tracking game progress across **Steam** and **PlayStation 5** — hours
played, achievement unlocks, Steam perfect games and PlayStation platinum trophies.

Sign-in and all data live in Supabase, so the same library follows you between devices.

---

## Setup

```bash
npm install
```

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then open **SQL Editor → New query** and
run the schema. The exact SQL is in [`src/lib/schema.ts`](src/lib/schema.ts) and is also copyable
from the running app under **Settings → Cloud storage → Copy schema SQL**.

It creates three tables — `games`, `collections`, `user_profile` — each scoped by `user_id` with
row level security enforced against `auth.uid()`, so an account can only ever read or write its
own rows.

### 2. Configure the environment

Copy `.env.example` to `.env.local` and fill it in:

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_RAWG_API_KEY=""   # optional
```

Without Supabase credentials the app renders a setup screen instead of booting.
Game search uses the Steam store by default, through the edge function below. [RAWG](https://rawg.io/apidocs)
is what searches alongside it, and — whichever catalog a game is found in — the only place cover
art comes from: pick it under Settings → Game catalog and paste a key there, or set
`VITE_RAWG_API_KEY` to give every user a default one. Without a key, games are still added and
synced, but they wear the plain lettered tile rather than a cover.

### 3. Run

```bash
npm run dev      # http://localhost:3000
npm run lint     # tsc --noEmit
npm run build    # production bundle in dist/
```

### 4. Live game data (optional)

Steam search, player charts, screenshots, reviews and synced progress all come through one
Supabase edge function, `supabase/functions/game-data`. Without it, games are entered by hand (or
found through RAWG).

It exists because none of the three upstreams can be called from a browser. SteamRaw,
`store.steampowered.com` and `api.steampowered.com` all answer a request happily and send **no**
`Access-Control-Allow-Origin` header with it, so the response is unreadable from the page. The
Steam Web API also needs a key, and Vite inlines every `VITE_*` value into the shipped bundle —
so the key has to live somewhere that is not the client.

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set STEAM_API_KEY=<your-steam-web-api-key>   # steamcommunity.com/dev/apikey
supabase functions deploy game-data
```

Then re-run the schema SQL (Settings → Cloud storage → "Copy schema SQL") to add the
`platform_accounts` table and the new columns on `games`.

**Steam.** Settings → Connected accounts takes a profile URL, a custom URL name or a SteamID64.
Your Steam profile's *Game details* privacy must be **Public**, or the Web API reports no
achievements at all. A game added from Steam search arrives linked; any other can be linked to its
app in its edit dialog. Every linked game syncs on its own.

**PlayStation.** Sony publishes no API. The working route is the NPSSO cookie:

1. Sign in at [playstation.com](https://www.playstation.com).
2. In the same browser open <https://ca.account.sony.com/api/v1/ssocookie>.
3. Copy the 64-character `npsso` value into Settings → Connected accounts.

That token is equivalent to your account password. It is posted straight to the edge function,
exchanged there for an access/refresh pair, and **never stored** — only the resulting tokens are,
in your own RLS-protected row. Access tokens last about an hour and are refreshed automatically;
the refresh token lasts about two months, after which the app asks for a new NPSSO.

Every PS5 game is matched to your trophy lists and played games by title, which brings its
trophies and playtime with it.

Only the **base game's** trophies are counted. PSN files add-on trophies in groups of their own
alongside the base `default` group, and asking for them all rolls the lot into one figure — so a
game whose platinum you earned years ago reads as 45 of 76 because someone shipped three DLC packs
you never bought. A platinum is the base list, and that is what a PS5 game tracks. The account
summary in the trophy-list picker still shows PlayStation's own DLC-inclusive counts, since that
is what identifies a list.

Syncing is automatic: when the app opens, every 15 minutes while it is on screen, when the tab
comes back into view or the connection returns, and as soon as a game is added or linked. Each
pass only asks about games the platform says have been played since the last one. The sync
button in the top bar reloads from the cloud and asks about every linked game at once.

A sync only ever writes achievement counts, playtime, last played and completion dates. Ratings,
status, notes and collections are yours and are never overwritten — with one exception: a finished
game whose award list has grown (a DLC, usually) comes off the 100% shelf and is filed into a
**New Achievements** collection, created on demand.

A game's own sync status — matched or not, checked when, or why the last pass failed — is in its
edit dialog, inside the platform panel, for both Steam and PlayStation.

### Cover art

Every cover comes from RAWG, whichever catalog found the game. Steam's own image is a 460×215
store banner with the logo burned into it; RAWG's is key art, and a grid mixing the two reads as
two applications stuck together. A Steam search borrows RAWG's artwork by matching titles against
one extra RAWG search per query, and a game RAWG has never heard of keeps the lettered tile rather
than wearing another game's art.

`src/lib/useCoverArt.ts` walks the library once per session, one title at a time, filling in games
that have no cover or still carry a Steam banner from an older version.

Artwork is always requested through `coverUrl` in `src/lib/image.ts`, which rewrites a RAWG media
URL to its 640px variant. `background_image` is the full key art and RAWG means it — one
Spider-Man result is **9990 × 7940** — so a page of sixteen search results was ninety megapixels
of decoding on the main thread, which is what made a search for a word with blockbusters behind it
stutter. The resized copies come to three.

A result shows the marks of every platform its catalog lists, not the one it would be added on:
RAWG knows a game is on the PC *and* the PlayStation, and collapsing that to a single answer was
what left a Steam+PlayStation game wearing one logo. Only PlayStation generations that have
trophies count — a PS1 game is not something this app has anything to track.

---

## Architecture

| Area | Where |
|---|---|
| Design tokens (Spectrum 2) | `src/index.css` |
| UI primitives | `src/components/ui/` |
| Auth session | `src/context/AuthContext.tsx` |
| Library state + offline queue | `src/context/GameContext.tsx` |
| Supabase queries | `src/lib/db.ts` |
| PostgreSQL schema | `src/lib/schema.ts` |
| Per-user cache | `src/lib/localCache.ts` |
| Platform + cover syncing | `src/context/SyncContext.tsx` |

### Design system

The app follows **Adobe Spectrum 2**, expressed as a token layer rather than the S2 component
library. `src/index.css` defines the whole vocabulary — a 25→1000 gray ramp, accent and semantic
ramps, a 50→900 type ramp, a three-step corner-radius scale, elevation, and a focus indicator.

Components compose those tokens through Tailwind utilities (`bg-gray-100`, `text-200`,
`rounded-md`). **No component should introduce a raw hex value or an arbitrary-value class such as
`text-[11px]`.** Anything reusable belongs in `src/components/ui/`.

`panel` — the one card treatment — deliberately has **no `backdrop-filter`**. Nothing ever scrolls
behind a panel (they sit on the fixed ambient layer, and dialogs are opaque), so the blur changed
nothing about how one looked, while a 10px Gaussian reaches far enough sideways to pull a
neighbouring card's icon well in as a glow along the panel's own edge. Keep bright elements at
least three times any blur radius away from the edge of anything that filters its backdrop.

The gaming character lives in cover art, the gold "mastered" treatment, the platform trophy
artwork and the motion — not in inventing new tokens.

### Data flow

Supabase is the source of truth. Every mutation updates local state optimistically, then writes
through to Postgres. If a write fails (offline, or a transient error) it is queued in
`localStorage` under a **per-user** key and retried when the connection returns; the sidebar and
Settings both surface the pending count.

`localStorage` is only ever a cache. It is namespaced by user id and cleared on sign-out, so a
second account signing in on the same browser never sees the first account's library.

### Platforms

`Platform` is `'steam' | 'ps5'`. That union is deliberately narrow — the compiler is what keeps
platform handling exhaustive. To add one you would extend `src/types.ts`, `PLATFORMS` in
`src/lib/constants.ts`, `PlatformIcon`, `TrophyBadge`, the `platform` check constraint in the
schema, and `normalizePlatform`.

Games on unsupported platforms are dropped when read from the cloud or restored from a backup,
rather than being silently coerced.

### Trophy artwork

`public/assets/steam-achievement.png` and `public/assets/ps5-platinum-achievement.png` are the
completion marks. They are 256×256 with their own padding baked in, so `TrophyBadge` renders them
contained in a square box at their natural proportions. Optical differences between the two are
corrected by a single `OPTICAL_SCALE` constant per asset in `src/components/TrophyBadge.tsx` —
never by scaling at a call site.

### Landing a new game

A game that is added, or re-filed by a status change, is "followed": the app looks for its card in
the document, opens the shelf the game actually went to when the card is not on the current one
(finishing a game while reading the playing shelf moves it to the 100% one), and the card then
scrolls itself into view. Search is the one page a follow never moves you off, because adding
games there is a run of them.

The celebration is a request, not an event. `GameContext` records that a game has a completion to
celebrate; the card plays it — the burst, and the sound with it — only once it is genuinely on
screen, and the meter underneath waits for the same thing before sweeping up to full. A completion
that lands two screens down is still waiting when you scroll to it.

### Responsive layout

Card grids use the intrinsic `.grid-cards` utility (`auto-fill` with a `minmax` track), so column
count scales continuously with the viewport instead of stepping at hand-picked breakpoints —
roughly 1 column on a phone through 6 on a 2560px display. The sidebar is a full panel from `lg`,
an icon rail from `md`, and a bottom bar below that.

---

## Customisation

Settings covers renaming any status (the new name propagates to the sidebar, filters, card menus
and statistics immediately), reordering the platforms used by the "Platform" sort in every library
view, reordering and hiding sidebar destinations, and JSON export/restore.

---

## Deployment

The build uses a relative base path and `HashRouter`, so `dist/` can be served from any static
host — including a subpath — with no rewrite rules. Set the same `VITE_*` variables in the host's
build environment.

### GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to `main`. One-time setup:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → New repository secret**, once per value:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_RAWG_API_KEY` (the RAWG one is
   optional — omit it and catalog search returns nothing).
3. In Supabase, add the published origin to **Authentication → URL Configuration** (Site URL and
   Redirect URLs), otherwise sign-in emails point back at localhost.

The site is published at `https://<user>.github.io/<repo>/`. Two properties make that subpath work,
and both are load-bearing — changing either breaks the deployment:

- `vite.config.ts` builds with `base: './'`, so every asset URL is relative to `index.html`.
- Badge artwork is imported from `src/assets/` rather than referenced from `public/` by an
  absolute `/assets/...` path, so Vite rewrites those URLs against the base too.

`HashRouter` keeps all routing after the `#`, so Pages never sees an unknown path and no `404.html`
fallback is required.

> **Note:** Vite inlines `VITE_*` values into the shipped JavaScript, so on a public site they are
> publicly readable. That is fine for the Supabase *anon* key, which is designed to be exposed and
> constrained by row level security — confirm your RLS policies are enabled. A RAWG key added here
> is likewise readable by anyone.
