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

> **Upgrading an existing project:** the theming release added `card_layout`, `accent`, `gold`,
> `surface`, `ui_app_name` and `ui_dash_title` to `user_profile`. Re-run the same script — it is
> idempotent, and its reconcile section adds the new columns to a table that already exists.
> Without them, saving anything from **Advanced customization** fails with a `42703`.

### 2. Configure the environment

Copy `.env.example` to `.env.local` and fill it in:

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_RAWG_API_KEY=""   # optional
```

Without Supabase credentials the app renders a setup screen instead of booting.
Without a [RAWG](https://rawg.io/apidocs) key, catalog search returns nothing — every catalog
result comes from RAWG, so games have to be entered by hand instead.

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
| Design tokens | `src/index.css` |
| Live theme (accent, metal, surfaces) | `src/lib/theme.ts` |
| Chip / tone colour rule | `src/lib/tone.ts` |
| Icon set | `src/components/icons.tsx` |
| Navigation model | `src/lib/navigation.ts` |
| UI primitives | `src/components/ui/` |
| Auth session | `src/context/AuthContext.tsx` |
| Library state + offline queue | `src/context/GameContext.tsx` |
| Supabase queries | `src/lib/db.ts` |
| PostgreSQL schema | `src/lib/schema.ts` |
| Per-user cache | `src/lib/localCache.ts` |

### Design system

A console-style dark interface: large cover tiles, cinematic spacing, **gold reserved for
completion and trophy states** and **blue for interaction**. Display type and every numeral are
Chakra Petch; body copy is Manrope.

The token layer has two tiers:

- `--tt-*` custom properties on `:root` are the **live theme**. Advanced customization rewrites
  them at runtime, which repaints the whole app without a single component re-rendering.
- The `@theme` block maps Tailwind utilities onto those variables, so components are written as
  `bg-surface text-ink font-display`, never as raw hex.

Only `src/index.css` and `src/lib/theme.ts` read hex literals. A component that needs a colour
composes a token, or — where the colour is *data*, like a collection's accent or a platform's hue
— goes through `chipStyle()` in `src/lib/tone.ts`.

Two rules worth knowing:

- **Borders are inset shadows** (`hairline`, `hairline-2`, or an explicit `box-shadow`), never
  real borders, so a hover or selection state can never shift layout by a pixel.
- **Active chip ink is a lightened step of its tone**, not the tone itself. A saturated hue on its
  own 16% wash lands near 2:1; the lightened step measures ~10:1 on the same wash.

### Theming

`applyTheme()` writes six accent/metal variables plus a seven-variable surface set. The accent
family is derived, not picked, so a custom hex gets the same contrast treatment a preset does:

```
ink  = mix(accent, #ffffff, 55%)     soft = mix(accent, bg,      80%)
on   = mix(accent, #000000, 84%)     goldHi = mix(gold, #ffffff, 35%)
```

Surface presets store their **key**, never the seven hexes, so changing a preset's palette later
reaches accounts that already chose it.

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
`src/lib/constants.ts`, `TrophyBadge`, the `platform` check constraint in the schema, and
`normalizePlatform`.

Games on unsupported platforms are dropped when read from the cloud or restored from a backup,
rather than being silently coerced.

### Trophy artwork

`src/assets/steam-achievement.png` and `src/assets/ps5-platinum-achievement.png` are the
completion marks, imported as modules so Vite rewrites their URLs against the configured base and
they resolve from a subpath host too. Both are trimmed to their artwork, so `TrophyBadge` contains
them in a square box and `object-contain` sizes each by its height — the two line up at a matching
optical weight wherever they appear side by side.

`BrandMark` pairs both marks in the warm gold-washed chip used as the app's identity in the
sidebar, the mobile top bar and the sign-in card.

### Responsive layout

Card grids use the intrinsic `.grid-cards` utility (`auto-fill` with a `minmax` track), so column
count scales continuously with the viewport instead of stepping at hand-picked breakpoints. The
top bar's layout toggle swaps the track width and the cover aspect together — 248px/16:9 for wide
cards, 168px/2:3 for posters.

The sidebar is a 248px panel from `lg`; below that it gives way to a 64px bottom tab bar carrying
the first four destinations, with the rest behind a **More** sheet.

---

## Customisation

**Settings** covers the account, the card highlight treatment (stroke or filled), platform order,
cloud storage, the RAWG cache and JSON export/restore.

**Advanced customization** — a collapsible panel inside Settings — re-themes and renames the
interface, and every change is written to `user_profile`:

| Group | What it changes |
|---|---|
| Accent colour | Five presets plus any custom hex; rewrites the `--tt-accent*` family live |
| Background theme | Warm charcoal, Graphite, Midnight, Obsidian — swaps all seven surface tokens |
| Trophy tone | Trophy gold, Bronze, Platinum — drives `--tt-gold` / `--tt-gold-hi` |
| Interface names | App name and dashboard headline. RAWG game titles are never affected |
| Status names | Renaming one updates chips, cards, filters and statistics at once |
| Navigation | Rename, reorder and hide destinations |

Only UI chrome is customisable; game records from RAWG are read-only.

### Command palette

`Cmd`/`Ctrl`+`K` opens one list over destinations, actions and the library itself; `Escape`
closes it. Rows are tagged `GO` for a destination, `ACT` for an action, and the platform mark for
a game.

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
