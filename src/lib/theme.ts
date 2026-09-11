/**
 * The live theme.
 *
 * Everything the Advanced customization panel can change resolves to a handful
 * of CSS custom properties on the document root. Components never read these
 * values in JS — they compose the Tailwind tokens in index.css, which point at
 * the same variables — so a theme change repaints the whole app without a
 * single component re-rendering.
 */

export type SurfaceKey = 'warm' | 'graphite' | 'midnight' | 'obsidian';

export const SURFACE_VAR_NAMES = [
  '--tt-bg',
  '--tt-bg-2',
  '--tt-surface',
  '--tt-surface-2',
  '--tt-surface-3',
  '--tt-line',
  '--tt-line-2',
] as const;

type SurfaceVars = Record<(typeof SURFACE_VAR_NAMES)[number], string>;

const surfaceSet = (...values: string[]): SurfaceVars =>
  Object.fromEntries(SURFACE_VAR_NAMES.map((name, i) => [name, values[i]])) as SurfaceVars;

export interface SurfacePreset {
  key: SurfaceKey;
  name: string;
  vars: SurfaceVars;
}

/**
 * Only the preset key is persisted, never the seven hexes — so a later change
 * to a preset's palette reaches accounts that already chose it.
 */
export const SURFACES: Record<SurfaceKey, SurfacePreset> = {
  warm: {
    key: 'warm',
    name: 'Warm charcoal',
    vars: surfaceSet('#100e0c', '#16130f', '#1a1714', '#221e1a', '#2b2620', '#35302a', '#4a433a'),
  },
  graphite: {
    key: 'graphite',
    name: 'Graphite',
    vars: surfaceSet('#0f0f10', '#151517', '#1a1a1c', '#212124', '#2b2b2f', '#343438', '#48484e'),
  },
  midnight: {
    key: 'midnight',
    name: 'Midnight',
    vars: surfaceSet('#0a0d13', '#0f141d', '#141a25', '#1b2230', '#252e3e', '#2f3a4c', '#435068'),
  },
  obsidian: {
    key: 'obsidian',
    name: 'Obsidian',
    vars: surfaceSet('#08080a', '#0e0e10', '#141416', '#1b1b1e', '#242427', '#2e2e32', '#414146'),
  },
};

export const SURFACE_KEYS = Object.keys(SURFACES) as SurfaceKey[];

export const isSurfaceKey = (value: unknown): value is SurfaceKey =>
  typeof value === 'string' && value in SURFACES;

export interface ColorPreset {
  name: string;
  color: string;
}

export const ACCENT_PRESETS: ColorPreset[] = [
  { name: 'Signal blue', color: '#45c8ea' },
  { name: 'Deep sea', color: '#3f8cf5' },
  { name: 'Mint', color: '#3fd6a4' },
  { name: 'Ultraviolet', color: '#9a7bf5' },
  { name: 'Ember', color: '#f2686f' },
];

export const GOLD_PRESETS: ColorPreset[] = [
  { name: 'Trophy gold', color: '#e5a83c' },
  { name: 'Bronze', color: '#c07a45' },
  { name: 'Platinum', color: '#b9c4d4' },
];

export const DEFAULT_ACCENT = ACCENT_PRESETS[0].color;
export const DEFAULT_GOLD = GOLD_PRESETS[0].color;
export const DEFAULT_SURFACE: SurfaceKey = 'warm';
export const DEFAULT_APP_NAME = 'Trophy Tracker';
export const DEFAULT_DASH_TITLE = 'Your cabinet';

/** Longest an interface name may be, matching the Settings inputs. */
export const MAX_UI_NAME_LENGTH = 28;

const HEX = /^#[0-9a-f]{6}$/i;

/** Coerces stored or user-entered colour onto a full six-digit hex. */
export function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (HEX.test(v)) return v.toLowerCase();
  // A three-digit hex is valid CSS but cannot be mixed by the maths below.
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  return fallback;
}

/** Linear channel mix, `amt` of `target` blended into `hex`. */
export function mix(hex: string, target: string, amt: number): string {
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(target);
  const channel = (a: number, b: number) =>
    Math.round(a + (b - a) * amt)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r1, r2)}${channel(g1, g2)}${channel(b1, b2)}`;
}

export interface ThemeSettings {
  accent: string;
  gold: string;
  surface: SurfaceKey;
}

export const DEFAULT_THEME: ThemeSettings = {
  accent: DEFAULT_ACCENT,
  gold: DEFAULT_GOLD,
  surface: DEFAULT_SURFACE,
};

/**
 * The derived accent family. `ink` has to clear 4.5:1 on its own wash and `on`
 * has to clear it against a filled accent button, so both are computed from the
 * chosen accent rather than picked — a custom hex gets the same treatment a
 * preset does.
 */
export function themeVars(theme: ThemeSettings): Record<string, string> {
  const accent = normalizeHex(theme.accent, DEFAULT_ACCENT);
  const gold = normalizeHex(theme.gold, DEFAULT_GOLD);
  const surface = SURFACES[theme.surface] ?? SURFACES[DEFAULT_SURFACE];

  return {
    ...surface.vars,
    '--tt-accent': accent,
    '--tt-accent-ink': mix(accent, '#ffffff', 0.55),
    '--tt-accent-soft': mix(accent, surface.vars['--tt-bg'], 0.8),
    '--tt-accent-on': mix(accent, '#000000', 0.84),
    '--tt-gold': gold,
    '--tt-gold-hi': mix(gold, '#ffffff', 0.35),
  };
}

/** Writes the theme onto the document root. Safe to call on every render. */
export function applyTheme(theme: ThemeSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  const vars = themeVars(theme);
  for (const [name, value] of Object.entries(vars)) root.setProperty(name, value);
}
