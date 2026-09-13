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
 */
const VOLUME_KEY = 'trophy-tracker.pref.sound-volume';

/** 0 is silent, 1 is the file's own level. */
const DEFAULT_VOLUME = 0.6;

const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

export function getSoundVolume(): number {
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clampVolume(parsed) : DEFAULT_VOLUME;
  } catch {
    // Private browsing, or storage disabled. A missing preference is not worth
    // failing over — fall back to the default and carry on.
    return DEFAULT_VOLUME;
  }
}

export function setSoundVolume(value: number): void {
  try {
    window.localStorage.setItem(VOLUME_KEY, String(clampVolume(value)));
  } catch {
    /* Nothing to do: the level simply will not survive a reload. */
  }
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
