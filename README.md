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
Without a [RAWG](https://rawg.io/apidocs) key, catalog search falls back to a small built-in list.

### 3. Run

```bash
npm run dev      # http://localhost:3000
npm run lint     # tsc --noEmit
npm run build    # production bundle in dist/
```

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

### Design system

The app follows **Adobe Spectrum 2**, expressed as a token layer rather than the S2 component
library. `src/index.css` defines the whole vocabulary — a 25→1000 gray ramp, accent and semantic
ramps, a 50→900 type ramp, a three-step corner-radius scale, elevation, and a focus indicator.

Components compose those tokens through Tailwind utilities (`bg-gray-100`, `text-200`,
`rounded-md`). **No component should introduce a raw hex value or an arbitrary-value class such as
`text-[11px]`.** Anything reusable belongs in `src/components/ui/`.

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
   optional — omit it and search falls back to the built-in list).
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
