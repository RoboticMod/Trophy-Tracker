# Handoff for Claude Code

Written 2026-10-28, at version **0.21.0**. Read `Orientation.md` first (it is
the map of the codebase and its rules), then this file. `HANDOFF.md` is the old
redesign spec and is **done**; treat it as history, not a to-do list.

## Who you're working with

- Ibrar: a designer and basic coder. Explain things plainly; prefer GUI steps
  over CLI. When a CLI step is unavoidable, give the exact command.
- Push back when an idea is weak; don't agree just to agree. Say plainly when
  you're unsure, and cite sources for facts about games.
- Ask when a request is ambiguous instead of guessing.
- Replies: bold section headers **Reasoning**, **Answer**, **Caveat**, kept
  scannable.
- Windows + PowerShell. `npx` is blocked by execution policy, so use
  **`npx.cmd`** (e.g. `npx.cmd supabase functions deploy game-data`).
- Deploys by committing to `main` in **GitHub Desktop** and pushing. The GitHub
  Actions workflow (`.github/workflows/deploy.yml`) then builds to GitHub Pages
  (repo `RoboticMod/Trophy-Tracker`). It runs `npm ci`, `npm run lint` and
  `npm run build`, so all three must pass.

## How every change is shipped (do all of it, every time)

1. Make the change. Keep every existing feature.
2. `npm run lint` (`tsc --noEmit`) and `npm run build` must both pass.
3. Add an entry at the top of `src/lib/changelog.ts`. `APP_VERSION` comes from
   the newest entry. The middle number goes up for a feature, the last number
   for a fix or UI tweak.
4. Bump the same version in `package.json` **and** in both
   `"name": "trophy-tracker"` version lines of `package-lock.json`. Don't touch
   other `0.x` versions in the lock file.
5. Update `Orientation.md` if what it says is no longer true. Keep it **under
   250 lines** by condensing, not by growing it.
6. Summarise what changed, then tell him to commit and push.

## Hard rules

- **No raw hex in components.** Colours are tokens in `src/index.css`
  (`@theme`). Gold means 100% and nothing else.
- **Tailwind class strings must be literal**; concatenated classes are silently
  dropped. `cn` joins classes, it doesn't merge them.
- **`GameContext` is the only writer** (optimistic, with an offline queue).
  `isPerfect` is the only definition of 100%.
- **Schema changes go in `supabase/schema.sql`** and must be safe to re-run
  (`if not exists`, `drop … if exists`). The "Copy schema SQL" button reads
  that file.
- **Line endings are mixed.** These are CRLF: `App.tsx`, `db.ts`, `types.ts`,
  `ui/Button.tsx`, `package-lock.json`, `supabase/functions/game-data/index.ts`
  and `supabase/schema.sql`. Most other files are LF. Keep each file's own
  endings.
- **Seed no sample data.** Don't bundle Activision camo art. The tracker's
  default swatches are original placeholders; real camo pictures are links to
  the wiki.
- Keep copy minimal: no hints that state the obvious.

## State of things

### Done recently (0.19.2 to 0.21.0)

- **Camo tracker, desktop:** bigger cells (56px), tier names that wrap,
  name-only column headers, and a divider plus gap between special and mastery
  tiers. The "Row" header is gone.
- **Tiers are Special or Mastery.** A mastery tier's colour comes from its order
  (`withMasteryKinds` in `lib/camo.ts`): 1st gold, 2nd diamond, the rest dark.
  The editor offers only **+ Special** and **+ Mastery**.
- **Import from a file** (Call of Duty page, Edit, + Game, From a file):
  - `readCamoImport` reads the file; `planCamoImport` decides what it does.
  - New games are added with fresh ids.
  - A game already tracked (matched by name) is **updated**: it gets gun icons
    (`weapon.iconUrl`) and tier goals. Ticks, military counts, guns and tiers
    are never touched.
  - File entries with `"updateOnly": true` are never added.
- **Tier `goal`** ("X needed on" box in the tier editor): the tile counts guns
  that have the **previous** mastery tier, toward the goal. Example: Orion
  shows "guns with Polyatomic / 51". With no goal, a tile counts its own ticks
  against every gun.
- **Gun icons:** `WeaponIcon` in `CamoBits.tsx`. It shows nothing if the link
  fails to load. Each gun can also be given an icon link in the editor.
- The tracker data lives in the user's Supabase as one `camo_games` row per
  game (jsonb).

### Data file outside the repo

The user has `cod-multiplayer-camos.json`, an import file for Cold War, MW2019,
MWII and MWIII multiplayer (263 guns, mastery tiers with wiki images, gun
icons), plus an update-only Black Ops 7 entry carrying icons. It was built from
the Call of Duty Fandom wiki's MediaWiki API (`/api.php`, read in the browser).
Plain fetches of fandom.com from a server are usually blocked. Military counts
per gun: Cold War 35, MW2019 10, MWII 4, MWIII 4.

### Waiting on the user (check before assuming)

- Push 0.21.0, then import the file again so his existing games get icons and
  goals.
- Type BO7's numbers needed into the tier editor. **He said 33; fandom says 30
  for Tempest and Singularity (33 is Black Ops 6's number).** Check before
  hard-coding anything.
- Possibly still not done from earlier:
  - `npx.cmd supabase functions deploy game-data` (award lists need it).
  - Running `supabase/schema.sql` in Supabase (adds `camo_games` and
    `game_awards`).

## Open issues and ideas (none started)

1. **Modern Warfare 4** came out 2026-10-23. Its camo data was skipped because
   the wiki wasn't complete at launch. Build it as another import entry the same
   way (the wiki page `Weapon Camouflage/Call of Duty: Modern Warfare 4`
   exists).
2. **The military count is one number per mode**, but in MWII and MWIII
   launchers and melee weapons have only 1 base challenge. A per-class or
   per-gun override would fix that.
3. **Cold War's Diamond** counts Melee and Special as one class. The tracker
   has them as two separate classes.
4. **MWIII prestige camos** (One Trick, Molten Obsidian, Mercury,
   Constellation's End) were left out. The chain rule (ticking a tier ticks
   every earlier one) would wrongly tick them. Supporting them needs tiers that
   sit outside the chain.
5. **Missing icons:** Cold War's Vargo 52, UGR and Scythe, and BO7's 1911,
   HE-1 and DOA 4.
6. **Never tested against his real account:** the signed-in flows (camo saves,
   restore's deletes, the award routes, imports). Wiki-hosted images haven't
   been checked on the live site either.
7. **Repo hygiene:**
   - `supabase/.temp/` (Supabase CLI cache) is tracked in git.
   - `.claude/settings.local.json` may have been committed.
   - Ask him before changing `.gitignore` or removing either.
8. `deleteCollection` writes once per game it affects. `db.upsertGames` could
   batch those writes.

## Checking UI work

There are no tests, so check UI changes by rendering them:

- Mount the real components in a throwaway Vite entry. Use a CSS file that does
  `@import "../src/index.css"` and `@source "../src"`, otherwise Tailwind won't
  scan `src`. Fake the contexts if needed.
- Take screenshots at 1440px and 390px. Delete the throwaway files afterwards.
- For logic in `lib/camo.ts`, bundle a small script with
  `npx esbuild … --platform=node` and run it with node.
