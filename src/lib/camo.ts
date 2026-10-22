/**
 * The Call of Duty camo tracker's model, and every rule it follows.
 *
 * No API exposes camo progress, so all of it is entered by hand. One document
 * per tracked game — modes, tiers, weapon classes, weapons, ticks — stored as
 * jsonb in `camo_games`, which is what lets a whole game ride the offline
 * queue as one write.
 *
 * Pure functions only: the page decides when, this file decides what. Nothing
 * here is seeded — a game exists because someone added it.
 */

export type CamoTierKind = 'special' | 'gold' | 'diamond' | 'dark';

export const CAMO_TIER_KINDS: readonly CamoTierKind[] = ['special', 'gold', 'diamond', 'dark'];

export const CAMO_KIND_LABEL: Record<CamoTierKind, string> = {
  special: 'Special',
  gold: 'Gold',
  diamond: 'Diamond',
  dark: 'Dark',
};

/**
 * What the editor offers: a tier is Special or Mastery. A mastery tier's
 * colour comes from its place among the mastery tiers — first Gold, second
 * Diamond, every one after Dark — so `kind` is derived, never picked.
 */
export type CamoTierGroup = 'special' | 'mastery';

export const CAMO_TIER_GROUPS: readonly CamoTierGroup[] = ['special', 'mastery'];

export const CAMO_GROUP_LABEL: Record<CamoTierGroup, string> = {
  special: 'Special',
  mastery: 'Mastery',
};

export const tierGroup = (kind: CamoTierKind): CamoTierGroup => (kind === 'special' ? 'special' : 'mastery');

const masteryKindAt = (n: number): CamoTierKind => (n === 0 ? 'gold' : n === 1 ? 'diamond' : 'dark');

/** Every mastery tier's kind set from its place among them. */
export const withMasteryKinds = <T extends { kind: CamoTierKind }>(tiers: T[]): T[] => {
  let n = 0;
  return tiers.map((tier) => {
    if (tier.kind === 'special') return tier;
    const kind = masteryKindAt(n++);
    return tier.kind === kind ? tier : { ...tier, kind };
  });
};

/** Whether tier i starts a new group — where the grid leaves a gap. */
export const startsTierGroup = (tiers: { kind: CamoTierKind }[], i: number): boolean =>
  i > 0 && tierGroup(tiers[i].kind) !== tierGroup(tiers[i - 1].kind);

export interface CamoTier {
  id: string;
  name: string;
  kind: CamoTierKind;
  /** A link to the camo's picture, drawn over its swatch. http(s) only. */
  imageUrl?: string;
}

export interface CamoWeapon {
  id: string;
  name: string;
  /** Military camos earned, 0 to the mode's militaryMax. */
  military: number;
  /** One per tier, in the mode's tier order. */
  done: boolean[];
}

export interface CamoClass {
  id: string;
  name: string;
  weapons: CamoWeapon[];
}

export interface CamoMode {
  id: string;
  name: string;
  /** Military camos per weapon in this mode. 0 until set. */
  militaryMax: number;
  /** In unlock order. */
  tiers: CamoTier[];
  classes: CamoClass[];
}

export interface CamoData {
  modes: CamoMode[];
}

export interface CamoGame {
  id: string;
  name: string;
  /** Position in the game switcher. */
  sort: number;
  data: CamoData;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Ids and fresh structures                                                   */
/* -------------------------------------------------------------------------- */

export const newCamoId = (prefix: string): string => {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
};

export const newWeapon = (name: string, tierCount: number): CamoWeapon => ({
  id: newCamoId('wpn'),
  name,
  military: 0,
  done: Array.from({ length: tierCount }, () => false),
});

export const newClass = (name: string): CamoClass => ({ id: newCamoId('cls'), name, weapons: [] });

/** "Blank": one mode, one Gold tier, one empty class. */
export const blankMode = (name = 'Mode 1'): CamoMode => ({
  id: newCamoId('mode'),
  name,
  militaryMax: 0,
  tiers: [{ id: newCamoId('tier'), name: 'Gold', kind: 'gold' }],
  classes: [newClass('Class 1')],
});

/** The same structure with every tick and military count cleared. */
export const clearedMode = (mode: CamoMode, name = mode.name): CamoMode => ({
  ...mode,
  id: newCamoId('mode'),
  name,
  tiers: mode.tiers.map((tier) => ({ ...tier })),
  classes: mode.classes.map((cls) => ({
    ...cls,
    weapons: cls.weapons.map((weapon) => ({
      ...weapon,
      military: 0,
      done: mode.tiers.map(() => false),
    })),
  })),
});

export const blankGame = (name: string, sort: number): CamoGame => ({
  id: newCamoId('camo'),
  name,
  sort,
  data: { modes: [blankMode()] },
  updatedAt: new Date().toISOString(),
});

/** "Copy of <game>": its structure kept, every tick cleared. */
export const copyOfGame = (source: CamoGame, name: string, sort: number): CamoGame => ({
  id: newCamoId('camo'),
  name,
  sort,
  data: { modes: source.data.modes.map((mode) => clearedMode(mode)) },
  updatedAt: new Date().toISOString(),
});

/* -------------------------------------------------------------------------- */
/* Import from a file                                                         */
/* -------------------------------------------------------------------------- */

/** Every mode, tier, class and weapon given a new id, ticks kept by position. */
const withFreshIds = (data: CamoData): CamoData => ({
  modes: data.modes.map((mode) => ({
    ...mode,
    id: newCamoId('mode'),
    tiers: mode.tiers.map((tier) => ({ ...tier, id: newCamoId('tier') })),
    classes: mode.classes.map((cls) => ({
      ...cls,
      id: newCamoId('cls'),
      weapons: cls.weapons.map((weapon) => ({ ...weapon, id: newCamoId('wpn') })),
    })),
  })),
});

/**
 * The games in an import file, ready to add beside the ones already tracked.
 * Takes a backup (its `camoGames`), a bare list, or one game; each needs a name
 * and `data`. Every id is new, so an import never overwrites anything.
 */
export function readCamoImport(raw: unknown, firstSort: number): CamoGame[] {
  const root = record(raw);
  const items = Array.isArray(raw) ? raw : Array.isArray(root.camoGames) ? root.camoGames : root.data ? [raw] : [];
  return items
    .map(record)
    .filter((g) => typeof g.name === 'string' && g.name.trim() && g.data)
    .map((g, i) => ({
      id: newCamoId('camo'),
      name: String(g.name).trim(),
      sort: firstSort + i,
      data: withFreshIds(normalizeCamoData(g.data)),
      updatedAt: new Date().toISOString(),
    }));
}

/* -------------------------------------------------------------------------- */
/* Repair on read                                                             */
/* -------------------------------------------------------------------------- */

const str = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

/**
 * Whatever came out of the jsonb column or a backup, made into a document the
 * page can trust: every array an array, every weapon holding exactly one tick
 * per tier, every military count inside its range. Never throws.
 */
export function normalizeCamoData(raw: unknown): CamoData {
  const modes = list(record(raw).modes).map((m, mi): CamoMode => {
    const mode = record(m);
    const militaryMax = count(mode.militaryMax);
    const tiers = withMasteryKinds(list(mode.tiers).map((t, ti): CamoTier => {
      const tier = record(t);
      const kind = CAMO_TIER_KINDS.includes(tier.kind as CamoTierKind)
        ? (tier.kind as CamoTierKind)
        : 'gold';
      const imageUrl = typeof tier.imageUrl === 'string' ? tier.imageUrl : undefined;
      return {
        id: str(tier.id, `tier-${ti}`),
        name: str(tier.name, CAMO_KIND_LABEL[kind]),
        kind,
        ...(imageUrl ? { imageUrl } : {}),
      };
    }));
    const classes = list(mode.classes).map((c, ci): CamoClass => {
      const cls = record(c);
      return {
        id: str(cls.id, `cls-${ci}`),
        name: str(cls.name, `Class ${ci + 1}`),
        weapons: list(cls.weapons).map((w, wi): CamoWeapon => {
          const weapon = record(w);
          const done = list(weapon.done);
          return {
            id: str(weapon.id, `wpn-${ci}-${wi}`),
            name: str(weapon.name, `Weapon ${wi + 1}`),
            military: Math.min(militaryMax, count(weapon.military)),
            done: tiers.map((_, i) => done[i] === true),
          };
        }),
      };
    });
    return {
      id: str(mode.id, `mode-${mi}`),
      name: str(mode.name, `Mode ${mi + 1}`),
      militaryMax,
      tiers,
      classes: classes.length ? classes : [newClass('Class 1')],
    };
  });
  return { modes: modes.length ? modes : [blankMode()] };
}

/* -------------------------------------------------------------------------- */
/* Ticking                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The chain rule: ticking a tier ticks every tier before it on that weapon;
 * clearing one clears every tier after it. Military is untouched.
 */
export const setWeaponTier = (weapon: CamoWeapon, index: number, on: boolean): CamoWeapon => ({
  ...weapon,
  done: weapon.done.map((value, i) => (on ? (i <= index ? true : value) : i >= index ? false : value)),
});

/** "All": every tier, and every military camo. */
export const completeWeapon = (weapon: CamoWeapon, militaryMax: number): CamoWeapon => ({
  ...weapon,
  military: militaryMax,
  done: weapon.done.map(() => true),
});

/** "Clear": every tier off. Military is separate and stays. */
export const clearWeapon = (weapon: CamoWeapon): CamoWeapon => ({
  ...weapon,
  done: weapon.done.map(() => false),
});

export const setWeaponMilitary = (weapon: CamoWeapon, value: number, max: number): CamoWeapon => ({
  ...weapon,
  military: Math.max(0, Math.min(max, Math.floor(value))),
});

/* -------------------------------------------------------------------------- */
/* Structure edits (the panel)                                                */
/* -------------------------------------------------------------------------- */

const everyWeapon = (mode: CamoMode, fn: (weapon: CamoWeapon) => CamoWeapon): CamoMode => ({
  ...mode,
  classes: mode.classes.map((cls) => ({ ...cls, weapons: cls.weapons.map(fn) })),
});

/** Lowering the count caps every weapon's existing value to it. */
export const setMilitaryMax = (mode: CamoMode, max: number): CamoMode => {
  const next = Math.max(0, Math.floor(max));
  return everyWeapon({ ...mode, militaryMax: next }, (w) => ({ ...w, military: Math.min(w.military, next) }));
};

/** Re-derives every mastery tier's kind after a change to the order. */
const ordered = (mode: CamoMode): CamoMode => ({ ...mode, tiers: withMasteryKinds(mode.tiers) });

/**
 * Where a new tier goes: a special after the last special (or first, if there
 * is none), a mastery tier at the end.
 */
export const tierInsertIndex = (mode: CamoMode, group: CamoTierGroup): number => {
  if (group !== 'special') return mode.tiers.length;
  let last = -1;
  mode.tiers.forEach((tier, i) => {
    if (tier.kind === 'special') last = i;
  });
  return last + 1;
};

/** A new tier, named after the colour it lands on. */
export const addTier = (mode: CamoMode, group: CamoTierGroup): CamoMode => {
  const at = tierInsertIndex(mode, group);
  const kind: CamoTierKind =
    group === 'special' ? 'special' : masteryKindAt(mode.tiers.filter((t) => t.kind !== 'special').length);
  const tier: CamoTier = { id: newCamoId('tier'), name: CAMO_KIND_LABEL[kind], kind };
  return everyWeapon(
    ordered({ ...mode, tiers: [...mode.tiers.slice(0, at), tier, ...mode.tiers.slice(at)] }),
    (w) => ({ ...w, done: [...w.done.slice(0, at), false, ...w.done.slice(at)] }),
  );
};

export const removeTier = (mode: CamoMode, index: number): CamoMode =>
  everyWeapon(
    ordered({ ...mode, tiers: mode.tiers.filter((_, i) => i !== index) }),
    (w) => ({ ...w, done: w.done.filter((_, i) => i !== index) }),
  );

/** Swaps a tier with its neighbour, carrying every weapon's tick with it. */
export const moveTier = (mode: CamoMode, index: number, direction: -1 | 1): CamoMode => {
  const target = index + direction;
  if (target < 0 || target >= mode.tiers.length) return mode;
  const swap = <T,>(items: T[]): T[] => {
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };
  return everyWeapon(ordered({ ...mode, tiers: swap(mode.tiers) }), (w) => ({ ...w, done: swap(w.done) }));
};

export const updateTier = (mode: CamoMode, index: number, patch: Partial<CamoTier>): CamoMode =>
  ordered({
    ...mode,
    tiers: mode.tiers.map((tier, i) => {
      if (i !== index) return tier;
      const next = { ...tier, ...patch };
      if (!next.imageUrl) delete next.imageUrl;
      return next;
    }),
  });

/** Special or Mastery; a mastery tier's colour follows from where it sits. */
export const setTierGroup = (mode: CamoMode, index: number, group: CamoTierGroup): CamoMode =>
  updateTier(mode, index, { kind: group === 'special' ? 'special' : 'gold' });

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

export const modeWeapons = (mode: CamoMode): CamoWeapon[] =>
  mode.classes.flatMap((cls) => cls.weapons);

export interface MasteryTile {
  tier: CamoTier;
  /** Index into the mode's tiers. */
  index: number;
  done: number;
  total: number;
  complete: boolean;
  /**
   * The previous mastery tier is incomplete and this one has nothing yet.
   * A tier with progress is never shown as locked.
   */
  locked: boolean;
}

/** One tile per non-special tier, in unlock order. */
export function masteryTiles(mode: CamoMode): MasteryTile[] {
  const weapons = modeWeapons(mode);
  const tiles: MasteryTile[] = [];
  mode.tiers.forEach((tier, index) => {
    if (tier.kind === 'special') return;
    const done = weapons.filter((w) => w.done[index]).length;
    const total = weapons.length;
    const previous = tiles[tiles.length - 1];
    tiles.push({
      tier,
      index,
      done,
      total,
      complete: total > 0 && done === total,
      locked: previous !== undefined && !previous.complete && done === 0,
    });
  });
  return tiles;
}

/**
 * The tier being worked on: the first mastery tier not yet complete, or the
 * last one once all are. Null for a mode with no mastery tier.
 */
export function currentTier(mode: CamoMode): MasteryTile | null {
  const tiles = masteryTiles(mode);
  return tiles.find((tile) => !tile.complete) ?? tiles[tiles.length - 1] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Colour                                                                     */
/* -------------------------------------------------------------------------- */

/** A tier's colour, for its meter and its edge. Tokens only. */
export const TIER_COLOR: Record<CamoTierKind, string> = {
  special: 'var(--color-camo-special-700)',
  gold: 'var(--color-camo-gold-700)',
  diamond: 'var(--color-camo-diamond-700)',
  dark: 'var(--color-camo-dark-700)',
};

/** The placeholder artwork each kind draws as (utilities in index.css). */
export const TIER_SWATCH: Record<CamoTierKind, string> = {
  special: 'camo-swatch-special',
  gold: 'camo-swatch-gold',
  diamond: 'camo-swatch-diamond',
  dark: 'camo-swatch-dark',
};

/* -------------------------------------------------------------------------- */
/* Image links                                                                */
/* -------------------------------------------------------------------------- */

export type ImageLinkCheck = { ok: true; url: string } | { ok: false; reason: 'empty' | 'not-url' };

/** Only http(s) web addresses are drawn. */
export function checkImageLink(raw: string | undefined): ImageLinkCheck {
  const value = (raw ?? '').trim();
  if (!value) return { ok: false, reason: 'empty' };
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? { ok: true, url: url.href }
      : { ok: false, reason: 'not-url' };
  } catch {
    return { ok: false, reason: 'not-url' };
  }
}

const CSS_URL_ESCAPES: Record<string, string> = {
  '"': '%22',
  "'": '%27',
  '(': '%28',
  ')': '%29',
  '[': '%5B',
  ']': '%5D',
  '\\': '%5C',
};

/**
 * A checked link as a CSS `url()`: quotes, brackets, backslashes and
 * whitespace escaped, so nothing in the link can end the value early.
 */
export const cssImage = (url: string): string =>
  `url("${url.replace(/["'()[\]\\]|\s/g, (c) => CSS_URL_ESCAPES[c] ?? '%20')}")`;

/* -------------------------------------------------------------------------- */
/* Order and what is being looked at                                          */
/* -------------------------------------------------------------------------- */

/** Switcher order: the stored sort, then name. */
export const byCamoSort = (a: CamoGame, b: CamoGame): number =>
  a.sort - b.sort || a.name.localeCompare(b.name);

/**
 * Which game, mode and class the tracker was last showing, per device — a
 * view choice like a sort order, not tracker data. Home reads the mode from it
 * so its panel names the mode you are working in.
 */
export const CAMO_VIEW_KEY = 'camo-view';

export interface CamoView {
  gameId?: string;
  /** Mode last shown, per game. */
  modes: Record<string, string>;
  /** Class last shown, per mode. */
  classes: Record<string, string>;
}

export const EMPTY_CAMO_VIEW: CamoView = { modes: {}, classes: {} };

export const isCamoView = (value: unknown): value is CamoView => {
  const v = value as CamoView | null;
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.modes === 'object' &&
    v.modes !== null &&
    typeof v.classes === 'object' &&
    v.classes !== null
  );
};

/** The mode a view points at for a game, or its first. */
export const viewedMode = (game: CamoGame, view: CamoView): CamoMode =>
  game.data.modes.find((m) => m.id === view.modes[game.id]) ?? game.data.modes[0];

/* -------------------------------------------------------------------------- */
/* Summaries for Home and Lists                                               */
/* -------------------------------------------------------------------------- */

/** One tracked game at a glance: the mode in view and the tier being worked on. */
export interface CamoGlance {
  game: CamoGame;
  mode: CamoMode;
  tile: MasteryTile | null;
}

export const camoGlance = (game: CamoGame, view: CamoView): CamoGlance => {
  const mode = viewedMode(game, view);
  return { game, mode, tile: currentTier(mode) };
};

const titleKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * A tracked game's artwork, borrowed from the library game of the same name
 * (case and punctuation ignored). A tracker game has no art of its own; with
 * no match, the caller draws a tile with the name instead.
 */
export const libraryMatch = <G extends { title: string }>(name: string, library: G[]): G | undefined => {
  const key = titleKey(name);
  return key ? library.find((g) => titleKey(g.title) === key) : undefined;
};

/** The Lists entry's line: "2 games · 5 modes · Game Gold 3 / 12". */
export const camoListLine = (games: CamoGame[], view: CamoView): string => {
  if (games.length === 0) return 'No games yet';
  const modes = games.reduce((n, g) => n + g.data.modes.length, 0);
  const focus = games.find((g) => g.id === view.gameId) ?? games[0];
  const { tile } = camoGlance(focus, view);
  return [
    `${games.length} ${games.length === 1 ? 'game' : 'games'}`,
    `${modes} ${modes === 1 ? 'mode' : 'modes'}`,
    tile ? `${focus.name} ${tile.tier.name} ${tile.done} / ${tile.total}` : focus.name,
  ].join(' · ');
};

/** The game the Lists entry's line and meter describe. */
export const camoFocus = (games: CamoGame[], view: CamoView): CamoGlance | null => {
  const focus = games.find((g) => g.id === view.gameId) ?? games[0];
  return focus ? camoGlance(focus, view) : null;
};

/** The swatches the entry's last tile shows: the focus mode's kinds, or all four. */
export const camoSwatchTiers = (glance: CamoGlance | null): CamoTier[] => {
  const tiers = glance?.mode.tiers ?? [];
  const seen = new Set<CamoTierKind>();
  const picked = tiers.filter((t) => (seen.has(t.kind) ? false : (seen.add(t.kind), true)));
  return picked.length
    ? picked
    : CAMO_TIER_KINDS.map((kind) => ({ id: `swatch-${kind}`, name: CAMO_KIND_LABEL[kind], kind }));
};

/* -------------------------------------------------------------------------- */
/* Bulk (Edit mode's column headers and toolbar)                              */
/* -------------------------------------------------------------------------- */

const inClass = (mode: CamoMode, classId: string, fn: (weapon: CamoWeapon) => CamoWeapon): CamoMode => ({
  ...mode,
  classes: mode.classes.map((cls) => (cls.id === classId ? { ...cls, weapons: cls.weapons.map(fn) } : cls)),
});

/** Every weapon in a class has this tier. False for an empty class. */
export const classHasTier = (cls: CamoClass, index: number): boolean =>
  cls.weapons.length > 0 && cls.weapons.every((w) => w.done[index]);

/**
 * A column header: this tier for every weapon in the class, by the chain rule —
 * or off for all of them when every one already has it.
 */
export const toggleClassTier = (mode: CamoMode, classId: string, index: number): CamoMode => {
  const cls = mode.classes.find((c) => c.id === classId);
  const on = !(cls && classHasTier(cls, index));
  return inClass(mode, classId, (w) => setWeaponTier(w, index, on));
};

/** "Mark every <class> through [tier]": that tier and all before it, and military done. */
export const markClassThrough = (mode: CamoMode, classId: string, index: number): CamoMode =>
  inClass(mode, classId, (w) => ({ ...setWeaponTier(w, index, true), military: mode.militaryMax }));

/** "All military done", for every weapon in the class. */
export const completeClassMilitary = (mode: CamoMode, classId: string): CamoMode =>
  inClass(mode, classId, (w) => ({ ...w, military: mode.militaryMax }));
