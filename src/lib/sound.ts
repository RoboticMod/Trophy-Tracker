import { Platform } from '../types';
import { normalizePlatform } from './constants';
// Imported as modules rather than referenced from /public, so Vite fingerprints
// each file and resolves its URL against the configured base — the same reason
// the trophy artwork is imported this way.
import steamSound from '../assets/steam-achievement.mp3';
import ps5Sound from '../assets/ps5-platinum.mp3';

const SOURCE: Record<Platform, string> = {
  steam: steamSound,
  ps5: ps5Sound,
};

/**
 * Volume lives in localStorage rather than on the profile.
 *
 * It is a property of the device you are listening on, not of you — the level
 * that suits a desktop at a desk is rarely the one that suits a phone — so it
 * deliberately does not sync, and needs no column adding to the profile table.
 *
 * Stored as JSON, like every other preference under this prefix. The first
 * version of this wrote a bare number string into the same namespace that
 * usePersistentState reads as JSON, which is a trap waiting for the first
 * value that is not a plain number — and a level that came back as NaN was
 * read as "no preference" and silently replaced by the default.
 */
export const VOLUME_PREF_KEY = 'sound-volume-v2';

const VOLUME_KEY = `trophy-tracker.pref.${VOLUME_PREF_KEY}`;

/** The bare-number key this replaced, read once so a saved level carries over. */
const LEGACY_VOLUME_KEY = 'trophy-tracker.pref.sound-volume';

/** 0 is silent, 1 is the file's own level. */
const DEFAULT_VOLUME = 0.6;

const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

/**
 * The level, held in memory so playback and the Settings slider read one value
 * rather than each keeping a copy that the other cannot see. Storage is still
 * the record; this is just what everything in the tab agrees on.
 */
let volume: number | null = null;

const listeners = new Set<(value: number) => void>();

function readStoredVolume(): number {
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'number' && Number.isFinite(parsed)) return clampVolume(parsed);
    }

    // Nothing under the current key: carry over a level saved by the version
    // that wrote a bare number, then let the next write settle it in JSON.
    const legacy = Number(window.localStorage.getItem(LEGACY_VOLUME_KEY));
    if (Number.isFinite(legacy) && legacy > 0) return clampVolume(legacy);
  } catch {
    // Private browsing, or storage disabled. A missing preference is not worth
    // failing over — fall back to the default and carry on.
  }
  return DEFAULT_VOLUME;
}

export function getSoundVolume(): number {
  if (volume === null) volume = readStoredVolume();
  return volume;
}

/**
 * Whether this device has a level of its own.
 *
 * False after storage has been cleared, which is the moment the copy kept on
 * the profile is worth restoring — see `adoptSoundVolume`.
 */
export function hasStoredVolume(): boolean {
  try {
    return (
      window.localStorage.getItem(VOLUME_KEY) !== null ||
      window.localStorage.getItem(LEGACY_VOLUME_KEY) !== null
    );
  } catch {
    return false;
  }
}

/**
 * Takes the level saved on the profile, for a device that has none — a new
 * browser, or one that clears site data when it closes. Does nothing when this
 * device has already made its own choice, which stays local.
 */
export function adoptSoundVolume(value: unknown): void {
  if (hasStoredVolume()) return;
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  setSoundVolume(value);
}

export function setSoundVolume(value: number): void {
  const next = clampVolume(value);
  volume = next;

  try {
    window.localStorage.setItem(VOLUME_KEY, JSON.stringify(next));
    window.localStorage.removeItem(LEGACY_VOLUME_KEY);
  } catch {
    /* Nothing to do: the level simply will not survive a reload. */
  }

  listeners.forEach((listener) => listener(next));
}

/** Subscribes to level changes, for a control that has to stay in step. */
export function onSoundVolumeChange(listener: (value: number) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * One element per platform, created on first use and reused after that, so the
 * file is fetched and decoded well before the moment it has to play. Creating an
 * Audio at the point of use would start the download then, and the sound would
 * land some way behind the burst it is meant to accompany.
 */
const players = new Map<Platform, HTMLAudioElement>();

const playerFor = (platform: Platform): HTMLAudioElement | null => {
  if (typeof Audio === 'undefined') return null;

  const existing = players.get(platform);
  if (existing) return existing;

  const audio = new Audio(SOURCE[platform]);
  audio.preload = 'auto';
  players.set(platform, audio);
  return audio;
};

/** Fetches and decodes both files up front, so the first one is not the slow one. */
export function preloadAwardSounds(): void {
  for (const platform of Object.keys(SOURCE) as Platform[]) {
    playerFor(platform)?.load();
  }
}

/**
 * Plays the platform's completion sound: the Steam achievement chime, or the
 * PlayStation platinum fanfare.
 *
 * Rewinds before playing so finishing two games in quick succession restarts the
 * sound rather than being ignored because it is already running. Silent at
 * volume 0, and any rejected play (a browser that has not seen a user gesture
 * yet) is swallowed — a missing sound must never break saving a game.
 */
export function playAwardSound(platform: Platform | string): void {
  const volume = getSoundVolume();
  if (volume <= 0) return;

  const resolved = normalizePlatform(platform) ?? 'steam';
  const audio = playerFor(resolved);
  if (!audio) return;

  audio.volume = volume;
  audio.currentTime = 0;
  void audio.play().catch(() => {
    /* Autoplay blocked, or the file could not be decoded. Not worth surfacing. */
  });
}
