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

/**
 * What it takes to earn a camo, for its hover card. `challenges` holds the
 * game's variants, keyed by `challengeKey` of a weapon's or a class's name —
 * the weapon's wins — and `challenge` is the text for everything else.
 */
export interface CamoChallenge {
  challenge?: string;
  challenges?: Record<string, string>;
}

export interface CamoTier extends CamoChallenge {
  id: string;
  name: string;
  kind: CamoTierKind;
  /** A link to the camo's picture, drawn over its swatch. http(s) only. */
  imageUrl?: string;
  /** What opens this tier's challenge ("Unlock Platinum on 51 weapons"). */
  unlock?: string;
  /**
   * How many weapons need this tier, when the game sets a number — the count
   * the next tier asks for (MWII's Platinum: 51, for Polyatomic). Its tile is
   * full there. Absent: every weapon in the mode.
   */
  need?: number;
  /**
   * Earned by every weapon at once when the tier before it is full (MWII's
   * Orion). Its tile reads Unlocked then, or once any weapon is ticked.
   */
  auto?: boolean;
}

/** One military camo: its name, picture and challenge. */
export interface MilitaryCamo extends CamoChallenge {
  name: string;
  imageUrl?: string;
}

export interface CamoWeapon {
  id: string;
  name: string;
  /** Military camos earned, 0 to the mode's militaryMax. */
  military: number;
  /** One per tier, in the mode's tier order. */
  done: boolean[];
  /** A link to the gun's picture, shown beside its name. http(s) only. */
  iconUrl?: string;
  /** This weapon's own military camos, in unlock order (MWII, MWIII). */
  militaryCamos?: MilitaryCamo[];
}

export interface CamoClass {
  id: string;
  name: string;
  weapons: CamoWeapon[];
  /** Military camos every weapon in the class shares (MW2019). */
  militaryCamos?: MilitaryCamo[];
}

export interface CamoMode {
  id: string;
  name: string;
  /** Military camos per weapon in this mode. 0 until set. */
  militaryMax: number;
  /**
   * Military camos every weapon in the mode shares (Cold War, MW4), in unlock
   * order. A class's or weapon's own list wins over this. With none at all,
   * the military count shows as a meter.
   */
  militaryCamos?: MilitaryCamo[];
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

/** A name reduced to letters and digits, for matching a file to what is tracked. */
const matchKey = (name: string) => name.toLowerCase().replace(/call of duty:?/g, '').replace(/[^a-z0-9]/g, '');

/** The key a `challenges` entry is stored under: a weapon's or a class's name, reduced. */
export const challengeKey = matchKey;

export interface CamoImportPlan {
  /** Games not tracked yet, to add. */
  added: CamoGame[];
  /** Tracked games the file also has, with what it adds filled in. */
  updated: CamoGame[];
}

const has = (list: unknown[] | undefined) => Boolean(list && list.length);

/** A tier with the file's numbers, and whatever of its words and picture it lacks. */
const fillTier = (tier: CamoTier, from: CamoTier | undefined): CamoTier => {
  if (!from) return tier;
  return {
    ...tier,
    ...(from.need ? { need: from.need } : {}),
    ...(from.auto ? { auto: true } : {}),
    ...(!tier.imageUrl && from.imageUrl ? { imageUrl: from.imageUrl } : {}),
    ...(!tier.unlock && from.unlock ? { unlock: from.unlock } : {}),
    ...(!tier.challenge && from.challenge ? { challenge: from.challenge } : {}),
    ...(!tier.challenges && from.challenges ? { challenges: from.challenges } : {}),
  };
};

/**
 * What an import does: a game already tracked (same name) is updated, not
 * added twice. Matched by name: weapons get the file's icons, tiers its
 * numbers needed. Pictures, challenges and military camos fill only what is
 * missing, so the user's own stay. Ticks, military counts, weapons and tiers
 * are never added, removed or changed. Every other game in the file is added.
 */
export function planCamoImport(incoming: CamoImportGame[], existing: CamoGame[]): CamoImportPlan {
  const added: CamoGame[] = [];
  const updated: CamoGame[] = [];
  for (const game of incoming) {
    const target = existing.find((g) => matchKey(g.name) === matchKey(game.name));
    if (!target) {
      if (!game.updateOnly) {
        const { updateOnly: _skip, ...fresh } = game;
        void _skip;
        added.push(fresh);
      }
      continue;
    }
    const tiers = new Map<string, CamoTier>();
    const weapons = new Map<string, CamoWeapon>();
    for (const mode of game.data.modes) {
      for (const tier of mode.tiers) if (!tiers.has(matchKey(tier.name))) tiers.set(matchKey(tier.name), tier);
      for (const cls of mode.classes) for (const weapon of cls.weapons) weapons.set(matchKey(weapon.name), weapon);
    }
    // A mode, and its classes, take their shared military camos from the
    // file's mode of the same name — or its only mode, when each has one.
    const sameMode = (mode: CamoMode) =>
      game.data.modes.find((m) => matchKey(m.name) === matchKey(mode.name)) ??
      (game.data.modes.length === 1 && target.data.modes.length === 1 ? game.data.modes[0] : undefined);
    const modes = target.data.modes.map((mode): CamoMode => {
      const from = sameMode(mode);
      return {
        ...mode,
        ...(!has(mode.militaryCamos) && has(from?.militaryCamos) ? { militaryCamos: from!.militaryCamos } : {}),
        tiers: mode.tiers.map((tier) => fillTier(tier, tiers.get(matchKey(tier.name)))),
        classes: mode.classes.map((cls) => {
          const fromClass = from?.classes.find((c) => matchKey(c.name) === matchKey(cls.name));
          return {
            ...cls,
            ...(!has(cls.militaryCamos) && has(fromClass?.militaryCamos) ? { militaryCamos: fromClass!.militaryCamos } : {}),
            weapons: cls.weapons.map((weapon) => {
              const file = weapons.get(matchKey(weapon.name));
              if (!file) return weapon;
              return {
                ...weapon,
                ...(file.iconUrl ? { iconUrl: file.iconUrl } : {}),
                ...(!has(weapon.militaryCamos) && has(file.militaryCamos) ? { militaryCamos: file.militaryCamos } : {}),
              };
            }),
          };
        }),
      };
    });
    const next = { ...target, data: { modes } };
    if (JSON.stringify(next.data) !== JSON.stringify(target.data)) updated.push(next);
  }
  return { added, updated };
}

/**
 * The games in an import file, ready to add beside the ones already tracked.
 * Takes a backup (its `camoGames`), a bare list, or one game; each needs a name
 * and `data`. Every id is new, so an import never overwrites anything.
 */
/** A game read from a file. `updateOnly`: fill in a tracked game, never add it. */
export type CamoImportGame = CamoGame & { updateOnly?: boolean };

export function readCamoImport(raw: unknown, firstSort: number): CamoImportGame[] {
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
      ...(g.updateOnly === true ? { updateOnly: true } : {}),
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

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const link = (value: unknown): string | undefined => {
  const checked = typeof value === 'string' ? checkImageLink(value) : null;
  return checked?.ok ? checked.url : undefined;
};

const readChallenge = (raw: Record<string, unknown>): CamoChallenge => {
  const challenge = text(raw.challenge);
  const challenges = Object.fromEntries(
    Object.entries(record(raw.challenges)).flatMap(([k, v]) => (text(v) ? [[k, text(v)!]] : [])),
  );
  return {
    ...(challenge ? { challenge } : {}),
    ...(Object.keys(challenges).length ? { challenges } : {}),
  };
};

const readMilitaryCamos = (value: unknown): MilitaryCamo[] | undefined => {
  const camos = list(value).map((c, i): MilitaryCamo => {
    const camo = record(c);
    const imageUrl = link(camo.imageUrl);
    return { name: str(camo.name, `Military camo ${i + 1}`), ...(imageUrl ? { imageUrl } : {}), ...readChallenge(camo) };
  });
  return camos.length ? camos : undefined;
};

/**
 * Whatever came out of the jsonb column or a backup, made into a document the
 * page can trust: every array an array, every weapon holding exactly one tick
 * per tier, every military count inside its range. Never throws.
 *
 * Two older shapes are read forward. A tier's `goal` once meant "this many
 * weapons need the tier before me", so it becomes that tier's `need`, and a
 * last mastery tier that had one is earned by every weapon at once. A mode's
 * `militaryImages` (pictures only) becomes its `militaryCamos`.
 */
export function normalizeCamoData(raw: unknown): CamoData {
  const modes = list(record(raw).modes).map((m, mi): CamoMode => {
    const mode = record(m);
    const militaryMax = count(mode.militaryMax);
    const read = list(mode.tiers).map((t, ti) => {
      const tier = record(t);
      const kind = CAMO_TIER_KINDS.includes(tier.kind as CamoTierKind)
        ? (tier.kind as CamoTierKind)
        : 'gold';
      const imageUrl = typeof tier.imageUrl === 'string' ? tier.imageUrl : undefined;
      const need = count(tier.need);
      const unlock = text(tier.unlock);
      return {
        legacyGoal: count(tier.goal),
        tier: {
          id: str(tier.id, `tier-${ti}`),
          name: str(tier.name, CAMO_KIND_LABEL[kind]),
          kind,
          ...(imageUrl ? { imageUrl } : {}),
          ...(unlock ? { unlock } : {}),
          ...(need > 0 ? { need } : {}),
          ...(tier.auto === true ? { auto: true } : {}),
          ...readChallenge(tier),
        } as CamoTier,
      };
    });
    const mastery = read.filter((r) => r.tier.kind !== 'special');
    mastery.forEach((r, i) => {
      if (!r.legacyGoal) return;
      const previous = mastery[i - 1];
      if (previous && !previous.tier.need) previous.tier.need = r.legacyGoal;
      if (i === mastery.length - 1) r.tier.auto = true;
    });
    const tiers = withMasteryKinds(read.map((r) => r.tier));
    const classes = list(mode.classes).map((c, ci): CamoClass => {
      const cls = record(c);
      const classMilitary = readMilitaryCamos(cls.militaryCamos);
      return {
        id: str(cls.id, `cls-${ci}`),
        name: str(cls.name, `Class ${ci + 1}`),
        ...(classMilitary ? { militaryCamos: classMilitary } : {}),
        weapons: list(cls.weapons).map((w, wi): CamoWeapon => {
          const weapon = record(w);
          const done = list(weapon.done);
          const iconUrl = link(weapon.iconUrl);
          const militaryCamos = readMilitaryCamos(weapon.militaryCamos);
          return {
            id: str(weapon.id, `wpn-${ci}-${wi}`),
            name: str(weapon.name, `Weapon ${wi + 1}`),
            military: Math.min(militaryMax, count(weapon.military)),
            done: tiers.map((_, i) => done[i] === true),
            ...(iconUrl ? { iconUrl } : {}),
            ...(militaryCamos ? { militaryCamos } : {}),
          };
        }),
      };
    });
    const legacyImages = list(mode.militaryImages).map((u, i) => ({ name: `Military camo ${i + 1}`, imageUrl: u }));
    const militaryCamos = readMilitaryCamos(has(list(mode.militaryCamos)) ? mode.militaryCamos : legacyImages);
    return {
      id: str(mode.id, `mode-${mi}`),
      name: str(mode.name, `Mode ${mi + 1}`),
      militaryMax,
      ...(militaryCamos ? { militaryCamos } : {}),
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

/**
 * One shared military camo's picture set, or cleared with ''. The list grows
 * to reach it; a camo left with no picture keeps its name and challenge.
 */
export const setMilitaryImage = (mode: CamoMode, index: number, url: string): CamoMode => {
  const camos = [...(mode.militaryCamos ?? [])];
  while (camos.length <= index) camos.push({ name: `Military camo ${camos.length + 1}` });
  const { imageUrl: _old, ...camo } = camos[index];
  void _old;
  camos[index] = url ? { ...camo, imageUrl: url } : camo;
  return { ...mode, militaryCamos: camos };
};

/** The military camos a weapon shows: its own, else its class's, else the mode's. */
export const militaryCamosFor = (mode: CamoMode, cls: CamoClass, weapon: CamoWeapon): MilitaryCamo[] =>
  weapon.militaryCamos ?? cls.militaryCamos ?? mode.militaryCamos ?? [];

/** A camo's challenge for this weapon: its own variant, else its class's, else the general one. */
export const challengeFor = (item: CamoChallenge, weapon?: { name: string }, cls?: { name: string }): string | undefined =>
  (weapon && item.challenges?.[challengeKey(weapon.name)]) ||
  (cls && item.challenges?.[challengeKey(cls.name)]) ||
  item.challenge;

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
      if (!next.need) delete next.need;
      if (!next.auto) delete next.auto;
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

/**
 * One tile per non-special tier, in unlock order. A tier counts the weapons
 * that have it, and is full at its `need` — the number the next tier asks
 * for — or at every weapon. An `auto` tier is 0 or 1: unlocked once the
 * tier before it is full, or once any weapon is ticked.
 */
export function masteryTiles(mode: CamoMode): MasteryTile[] {
  const weapons = modeWeapons(mode);
  const tiles: MasteryTile[] = [];
  mode.tiers.forEach((tier, index) => {
    if (tier.kind === 'special') return;
    const previous = tiles[tiles.length - 1];
    const ticked = weapons.filter((w) => w.done[index]).length;
    if (tier.auto) {
      const complete = Boolean(previous?.complete) || ticked > 0;
      tiles.push({ tier, index, done: complete ? 1 : 0, total: 1, complete, locked: !complete && Boolean(previous) });
      return;
    }
    const total = tier.need ? Math.min(tier.need, weapons.length) : weapons.length;
    tiles.push({
      tier,
      index,
      done: Math.min(ticked, total),
      total,
      complete: total > 0 && ticked >= total,
      locked: previous !== undefined && !previous.complete && ticked === 0,
    });
  });
  return tiles;
}

/** A mode whose last mastery tier is earned: the game's gold, like a 100% game. */
export const modeMastered = (mode: CamoMode): boolean => {
  const tiles = masteryTiles(mode);
  return tiles.length > 0 && tiles[tiles.length - 1].complete;
};

export const gameMastered = (game: CamoGame): boolean => game.data.modes.some(modeMastered);

/** The furthest mastery tier earned in full, for a tick on the game's cover. */
export const topMastery = (mode: CamoMode): MasteryTile | null =>
  [...masteryTiles(mode)].reverse().find((tile) => tile.complete) ?? null;

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

/** The Lists entry's line: "2 games · 5 modes · Game 3 / 12" — camos show as pictures, not names. */
export const camoListLine = (games: CamoGame[], view: CamoView): string => {
  if (games.length === 0) return 'No games yet';
  const modes = games.reduce((n, g) => n + g.data.modes.length, 0);
  const focus = games.find((g) => g.id === view.gameId) ?? games[0];
  const { tile } = camoGlance(focus, view);
  return [
    `${games.length} ${games.length === 1 ? 'game' : 'games'}`,
    `${modes} ${modes === 1 ? 'mode' : 'modes'}`,
    tile ? `${focus.name} ${tile.done} / ${tile.total}` : focus.name,
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
