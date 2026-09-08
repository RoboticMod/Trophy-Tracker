import React from 'react';
import { Platform } from '../types';
import { normalizePlatform } from '../lib/constants';
import { cn } from '../lib/cn';
// Imported as modules rather than referenced from /public: Vite then rewrites
// each URL against the configured base, so the marks resolve correctly when the
// app is served from a subpath (GitHub Pages project sites) as well as from a
// domain root.
import steamArt from '../assets/steam-achievement.png';
import ps5Art from '../assets/ps5-platinum-achievement.png';

interface TrophyArt {
  src: string;
  alt: string;
  label: string;
  title: string;
  /**
   * What this platform calls the things a game collects. Steam has
   * achievements; PlayStation has trophies. Anywhere a single game's platform
   * is known, the interface uses that platform's word rather than a generic one.
   */
  noun: string;
  /** Announcement shown once every one of them has been earned. */
  completeLabel: string;
  /**
   * The asset's own pixel dimensions. Both PNGs are trimmed to their artwork —
   * no baked-in padding — so these are the true aspect ratios, declared on the
   * <img> to reserve the right box before the file loads.
   */
  width: number;
  height: number;
}

const TROPHY_ART: Record<Platform, TrophyArt> = {
  steam: {
    src: steamArt,
    alt: 'Steam perfect game',
    label: 'Perfect Game',
    title: 'Steam — every achievement unlocked (Perfect Game)',
    noun: 'Achievements',
    completeLabel: 'All Achievements Unlocked',
    width: 147,
    height: 192,
  },
  ps5: {
    src: ps5Art,
    alt: 'PlayStation platinum trophy',
    label: 'Platinum',
    title: 'PlayStation 5 — Platinum Trophy unlocked',
    noun: 'Trophies',
    completeLabel: 'Platinum Trophy Unlocked',
    width: 119,
    height: 192,
  },
};

interface TrophyBadgeProps {
  platform: Platform | string;
  /** Rendered box size in px. The artwork is contained within it. */
  size?: number;
  /**
   * Dims and desaturates the mark. Used where a platform's award is shown for a
   * game that has not earned it yet, so it never reads as unlocked.
   */
  muted?: boolean;
  className?: string;
}

/**
 * The completion mark for a 100% game: the supplied Steam perfect-game ribbon
 * or PlayStation platinum trophy artwork, contained in a square box with no
 * scale or translate hacks.
 *
 * Both marks are taller than they are wide, so `object-contain` sizes each by
 * its height — they line up at a matching optical weight wherever they appear
 * side by side.
 */
export const TrophyBadge: React.FC<TrophyBadgeProps> = ({
  platform,
  size = 20,
  muted = false,
  className,
}) => {
  const art = TROPHY_ART[normalizePlatform(platform) ?? 'steam'];

  return (
    <span
      // A dimmed mark stands for an award still to be earned, so it must not
      // claim the completion the full-colour one announces.
      title={muted ? art.noun : art.title}
      className={cn('inline-flex shrink-0 select-none items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <img
        src={art.src}
        alt={art.alt}
        width={art.width}
        height={art.height}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(
          'pointer-events-none h-full w-full object-contain',
          muted && 'opacity-45 grayscale'
        )}
      />
    </span>
  );
};

/** Short name for the completion mark, e.g. for a labelled badge. */
export const trophyLabel = (platform: Platform | string): string =>
  TROPHY_ART[normalizePlatform(platform) ?? 'steam'].label;

/** What this platform's games collect: "Achievements" on Steam, "Trophies" on PS5. */
export const awardNoun = (platform: Platform | string): string =>
  TROPHY_ART[normalizePlatform(platform) ?? 'steam'].noun;

/**
 * The label for a game's progress row: the platform's completion announcement
 * once everything is unlocked, and its plain collective noun until then.
 */
export const awardProgressLabel = (platform: Platform | string, complete: boolean): string => {
  const art = TROPHY_ART[normalizePlatform(platform) ?? 'steam'];
  return complete ? art.completeLabel : art.noun;
};

/**
 * Both completion marks as one lockup, for places that stand for achievements
 * in general rather than a single platform — navigation, page headers, and the
 * "100% completed" statistic.
 */
export const TrophyPair: React.FC<{ size?: number; className?: string }> = ({
  size = 18,
  className,
}) => (
  <span
    className={cn('inline-flex shrink-0 items-center', className)}
    aria-label="Achievements and trophies"
  >
    <TrophyBadge platform="steam" size={size} />
    <TrophyBadge platform="ps5" size={size} className="-ml-1.5" />
  </span>
);
