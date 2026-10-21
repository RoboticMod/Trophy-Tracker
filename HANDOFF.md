# Trophy Tracker — redesign handover

Written for Claude Code. Read `Orientation.md` first, as it asks; this file
says what to change and why. The design canvas these decisions came from is a
Claude Design artifact you cannot open, so everything it shows is written out
here. Where this file and the canvas disagree, this file wins.

All game names, counts, ratings and rarity figures shown in the designs were
sample data. Do not seed any of them.

---

## 0. Ground rules

- **Keep every existing feature.** Sign-up, sign-in, delete account, `/setup`,
  the profile menu (avatar, display name), "Copy schema SQL" / "View SQL",
  the per-user RAWG key field, backup/restore. An earlier idea to strip
  "public-only" features was dropped. Logins stay so desktop and phone sync.
- **Keep the visual language.** The ambient wash (all four layers), panels,
  glow ring on Playing cards, gold glow/spot/foil sweep on 100% cards, meter
  and gauge bloom, Bahnschrift. The changes below fix errors; they are not a
  restyle.
- **Follow `Orientation.md` conventions**: tokens only (no raw hex in
  components), literal class strings, `cn` joins not merges, every shipped
  change gets a `lib/changelog.ts` entry, update `Orientation.md` when a rule
  in it changes.
- Safety net: `npm run lint` and `npm run build` must pass after each section.

---

## 1. Token and contrast fixes (`src/index.css`, `Button.tsx`)

Measured against `gray-100` (#0f1422).

| Token / place | Now | Change to | Result |
|---|---|---|---|
| `--color-gray-600` (secondary text, eyebrows, card meta, phone bottom-bar labels) | #6e7898, 4.20:1 | #7d88a8 | 5.21:1 |
| Accent button gradient (`Button` FILL.accent, top-bar Add, phone header Add, game sheet Close, any hand-written copies) | 700→600, hover 800→700 (4.17 / 3.03:1) | 600→#0058ad, hover #0071de→600 | 5.45 / 4.75:1; keep inset highlight and glow |
| `--color-steam-900` (platform marks) | #2d5fb4, 2.98:1 | #3d6cc4 | 3.62:1, still far darker than PS #14b4ff |
| `--color-notice-*` (offline, schema notice) | amber, 1.3:1 from trophy gold | orange, notice-700 #f08a3c | gold stays 100%-only |
| Negative button (`Button` FILL.negative, delete confirm) | white on #e04034 4.24:1, hover lighter 3.19:1 | #c42f24, hover darker #b8291f | 5.56 / 6.22:1 |
| Unread count on the bell (`NotificationBell.tsx`) | white on accent-700 | accent-600 | 5.45:1 |

Grep for hard-coded copies of the accent gradient (`from-accent-700 to-accent-600`)
— at least the top bar Add and the phone game sheet Close have their own.

Colour meanings after this: blue = progress/interactive, gold = 100% only,
green = done/synced, orange = warning/offline, violet = tracker mastery tiers.

---

## 2. 100% treatment

- **Remove the rotating gold rim** (`gold-ring` utility, its `gold-turn`
  keyframes and every `<span className="gold-ring">`). Keep:
  `trophy-glow` (raise the halo slightly: 0 0 22px trophy-700 at ~24%),
  a solid gold border on the card (`trophy-700` at ~55%), `trophy-spot`,
  and the foil `trophy-sweep`.
- 100% games use this gold everywhere they appear: cards, the 100% list
  entry, Home's 100% shelf row, the notifications row.

---

## 3. Navigation

### Tabs (default order)

Home · Library · Playing · Lists · Call of Duty · Stats · Search (off) · Backlog (off)

- **Trophies / 100% is no longer a tab.** It lives on the Lists page (§6).
  The `/achievements` route stays and is opened from Lists and from Home.
- **New routes:** `/library` (§5) and `/call-of-duty` (§8).
- **Every tab can be reordered and switched off** in Settings ›
  Customization › Navigation. Home can be reordered but not switched off
  (the app always opens on it).
  - Add `showLibrary` and `showCallOfDuty` to `SidebarConfig`
    (`types.ts`) beside the existing show keys, and both ids to `navOrder`.
    Keep stored keys backward compatible (missing = default).
  - Rename the card "Sidebar navigation" → "Navigation" (there is no
    sidebar).
  - Draw a divider after the 4th **visible** row: "Phone bar above · More
    below". The phone bar already takes `navItems.slice(0, 4)`; the divider
    must count only enabled items. Optional: live previews of the top bar
    and phone bar under the list.

### Desktop top bar (`AppLayout.tsx`)

- **Overflow at 1024–1279px:** with labels from `lg`, tabs + badges + right
  cluster need ~966 of ~976px; one more tab or a three-digit badge pushes
  the row into a hidden sideways scroll. Fix: below 1280px show icons only
  except the active tab (keep `aria-label`/`title` on icon-only tabs), and
  hide the "Add game" word below 1280px.
- **Touch targets:** 768–1023px is tablets. Bar controls h-9 → h-11 below
  `lg`, h-9 from `lg`.
- **Remove `backdrop-blur-lg`** from the desktop header. Nothing scrolls
  under it (it's a flex sibling of `<main>`), so it costs a layer for no
  visible change — the same reasoning the README gives for panels.
- Profile menu (avatar) stays at the right end: Settings, Log out.

### Phone (`AppLayout.tsx`)

- Bottom bar = first four enabled tabs + More. Default: Home, Library,
  Playing, Lists, More (Call of Duty, Stats, Settings inside More).
- Bottom bar labels use the fixed gray-600 (§1).
- **Sticky platform headings (`GameGrid.tsx` PhoneSections):** remove
  `backdrop-blur-md`; `Orientation.md` forbids blur over scrolling content
  on a phone, and the 95% fill already hides what's behind.

---

## 4. Home (`/`, `DashboardView.tsx`)

Home becomes a summary. The full grid moves to Library (§5).

Desktop, top to bottom:
1. Header: "Home" + subtitle figures (games · awards · hours) and an
   "Open library" link.
2. Row: **Now playing** (up to 3 Playing cards, full card treatment, the
   playing one keeps its glow ring) | **Library completion** (existing
   3/4-arc gauge with glow and halo, verdict, then the four shelf rows:
   100% in gold, Beaten, Playing, Backlog; each row links to its page; 100%
   links to the 100% list).
3. Row of three panels: **Closest to 100%** (games with fewest awards left,
   excluding 100%; count left on the right, gold meter when ≤ 2 left),
   **Recent unlocks** (from `NotificationsContext` entries; a 100% entry
   gets the gold row with spot + sweep), **Call of Duty camos** (one row per
   tracked CoD game: current mode, the tier being worked on, x / y, meter
   in that tier's colour; links to `/call-of-duty`).
4. **Up next from backlog**: first five Backlog games as cards (backlog
   greyscale), link to Backlog.

Phone: same sections stacked — gauge card, shelf rows panel, Now playing as
a horizontal snap-scroll strip of 260px cards, Recent unlocks, Closest to
100%, Call of Duty, Up next as a 2-column grid.

---

## 5. Library (`/library`, new page)

The old Home grid, moved unchanged: same `GameCard`, same platform
sections (two columns on desktop, sticky headings on phone), same search,
chips and `SortControl`.

Fixes while moving it:
- **Lists and rating filters must always be present.** Today they render
  only on a phone or from 1280px unless already active, so on 768–1279 you
  cannot start either filter. Make both compact dropdown chips that are
  always in the filter row.
- **Drop the Playing spotlight** above the grid. Home has Now playing now,
  and the spotlight showed every playing game twice.

---

## 6. Lists (`/collections`, `CollectionsView.tsx`)

Add two entries at the top, before the user's lists:

1. **Call of Duty** (tracker entry): 2×2 mosaic of the tracked CoD games'
   covers with the last tile showing the tier swatches and "Camo tracker";
   footer with crosshair icon, name, a "Tracker" tag, "N games · N modes ·
   <game> <tier> x / y" and a meter. Blue glow outline so it reads as
   different from a list. Opens `/call-of-duty`. Not deletable, not a
   collection.
2. **100%**: the games where `isPerfect` is true. Gold: gold border and
   halo, trophy marks on the mosaic tiles, gold name and count, "N games ·
   N Steam · N PS · every award earned". Opens `/achievements`. Not a stored
   collection — it follows `isPerfect` (Orientation: "100% has exactly one
   definition").

Phone rows: same two entries first, each with three 2:3 posters; Backlog
stays in Lists on phones as today.

---

## 7. Game details (`GamePersonalModal.tsx`)

- Delete confirm uses the fixed negative button (§1).
- **New section "Trophies"** (desktop right column, phone sheet) between
  "Your record" and "Notes":
  - Segmented control: "Left · N" (default) / "Earned · N".
  - A gold strip: "Rarest you own: <name> · x% of players".
  - Rows sorted rarest first: icon, name, description, rarity % and tier.
    Tiers: under 5% Ultra rare (violet tokens), under 15% Very rare (blue),
    otherwise Rare/Common (grey). Do not use gold for rarity.
  - Show the first few, then "Show all N".
- **Data** (new edge-function routes in `supabase/functions/game-data`,
  cached per game; only refetch on sync when counts changed):
  - Steam: `ISteamUserStats/GetSchemaForGame` (names, descriptions, icons),
    `GetPlayerAchievements` (earned + unlock time),
    `GetGlobalAchievementPercentagesForApp` (rarity).
  - PlayStation: trophy titles/details and earned state through the
    existing NPSSO route. **Verify** the trophy payload carries an earn
    rate before building the rarity half for PS; if it doesn't, show PS
    rarity as unavailable rather than guessing.
  - Store as a per-game JSON cache (e.g. `game_awards` table: user_id,
    game_id, items jsonb, fetched_at, RLS like the other tables), included
    in the schema SQL so "Copy schema SQL" stays the single source.

---

## 8. Call of Duty camo tracker (`/call-of-duty`, new)

No API exposes camo progress; everything is entered by hand.

### Data model

One document per tracked game is enough and fits the offline queue:

```
camo_games (user_id, id, name, sort, data jsonb, updated_at)  -- RLS by user_id
data = {
  modes: [{
    id, name, militaryMax,
    tiers:   [{ id, name, kind: 'special'|'gold'|'diamond'|'dark', imageUrl? }],
    classes: [{ id, name, weapons: [{ id, name, military: number, done: boolean[] /* per tier */ }] }]
  }]
}
```

Seed nothing. "Add a game" offers "Copy of <existing game>" (structure
kept, every tick cleared) or "Blank" (one mode, one Gold tier, one empty
class).

### Behaviour

- Header: title, "Camo tracker · N games", an **Edit / Done** toggle.
- Game switcher, then a **Mode** row (each mode tracked separately), then
  the mastery tiles (one per non-special tier: x / y and meter in the
  tier's colour; a tier shows "Locked" while the previous one is
  incomplete and it has none), then weapon-class chips, then the grid.
- **View mode is read-only**: cells can't be toggled (prevents accidental
  taps). Edit mode unlocks everything below.
- **Chain rule:** ticking a tier ticks every tier before it on that weapon;
  clearing one clears every tier after it. Military count is separate
  (only "All" and "Mark through" set it).
- Edit mode adds:
  - + Game, + Mode, Remove mode (only when a game has more than one).
  - Military − / + per weapon; per-row "All" / "Clear".
  - Column headers become "mark this tier for every weapon in the class"
    buttons (toggle off when all are on).
  - Bulk toolbar: "Mark every <class> through [tier]" + Apply,
    "All military done", last-action text, **Undo** (25 steps; persist it
    with the data if cheap, otherwise session-only is acceptable).
  - "Weapons, camos & images…" panel: military camos per weapon (number;
    lowering caps existing values), tiers in unlock order (rename, kind,
    move up/down, remove; "+ Special" inserts after the last special, other
    kinds append), image link per tier, weapons in the current class
    (rename, remove, add).
- **Images:** each tier has a placeholder swatch (CSS gradient per kind,
  original artwork, not game assets). A pasted image link draws on top of
  its swatch so a dead link shows the swatch. Status under the field:
  empty / loading / loaded / couldn't load / "not a web address". Accept
  only http(s); escape quotes, brackets and spaces before putting it in
  `url()`. Do not bundle any Activision camo art.
- Desktop grid: weapon name, military (count + meter), one 52px column per
  tier with 44px swatch cells, Row column in Edit mode. Build it with CSS
  grid or a real `<table>` in JSX (both are fine in React).
- Phone: one card per weapon (name, military count and meter, tier cells
  wrapping at 44px), a tier legend above the list; the bulk toolbar and the
  weapons/camos panel open as bottom sheets via the existing `Dialog`. In a
  fixed-height scroll column, give horizontally scrolling rows
  `flex-shrink: 0` or they collapse.

Sample content in the designs (Black Ops 6 MP/Zombies/Warzone, Cold War,
Black Ops 7 with three specials and "[Mastery n]" names) was illustrative
only.

---

## 9. Backup & restore (`SettingsView.tsx`)

- Export version 4.0.0 → **5.0.0**, adding `camoGames` (all tracker games
  with modes, tiers, weapons, ticks, image links) and the navigation
  settings. Steam/PSN tokens stay out.
- Show what a backup contains in the card (games, lists, Call of Duty
  tracker, profile and settings; "not included: platform sign-ins").
- **Restore must confirm first.** Today `handleImport` calls `replaceAll`
  straight away. Show a dialog comparing Now vs Backup counts (games,
  lists, CoD games), a warning that it replaces everything, and buttons:
  Export current first · Cancel · Replace (negative).
- A backup without `camoGames` keeps the current tracker instead of
  wiping it.

---

## 10. Smaller fixes

- **Select** (`ui/Select.tsx`): desktop option rows 36px at text-90 (were
  ~30px at 12px); set `ROW_HEIGHT` to 36 so the flip check matches.
- **Notifications "Clear all":** no confirm and no undo today. After clearing,
  turn the footer into an Undo bar for ~5 seconds.
- Score ring colours (`lib/rating.ts`) run red → green. Not a failure (the
  number is always shown); leave unless asked.

---

## 11. Not in scope (ideas parked)

- Daily playtime/award snapshots for charts (`Orientation.md` "Not built,
  for want of data").
- Camo screenshot import (vision/OCR), exportable camo templates.
- Installable PWA polish, code splitting of the 888 kB bundle, batched
  `deleteCollection`.

## 12. Suggested order

1 → 2 → 3 (nav + routes) → 5 (move the grid out) → 4 (new Home) → 6 → 8
→ 9 → 7 (needs new edge routes) → 10. Changelog entry and version bump per
step; update `Orientation.md` (routes table, nav, 100% treatment, tracker
model) at the end.
