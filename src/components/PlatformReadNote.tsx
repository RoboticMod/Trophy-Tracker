import React from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { PLATFORMS } from '../lib/constants';
import { formatHours } from '../lib/format';
import { PlatformProgress, PlatformRead, PlatformReadError } from '../lib/usePlatformRead';
import { GameDetailsValues } from './GameDetailsFields';
import { awardNounFor } from './TrophyBadge';
import { cn } from '../lib/cn';

/**
 * What a platform's figures change in the form.
 *
 * Counts are taken as the platform gives them, since they are the reason for
 * reading it. Playtime only where there is some: a game with no clock on the
 * platform keeps whatever was typed rather than being reset to nothing.
 */
export const progressPatch = (progress: PlatformProgress): Partial<GameDetailsValues> => {
  const patch: Partial<GameDetailsValues> = {};
  if (progress.total !== null && progress.total > 0) {
    patch.achievementsTotal = progress.total;
    patch.achievementsUnlocked = Math.min(progress.unlocked ?? 0, progress.total);
  }
  if (progress.hoursPlayed !== null && progress.hoursPlayed > 0) {
    patch.hoursPlayed = progress.hoursPlayed;
  }
  return patch;
};

const failureText = (reason: PlatformReadError, platform: 'steam' | 'ps5', saved: string) => {
  const name = PLATFORMS[platform].name;
  switch (reason) {
    case 'not-linked':
      return `Link your ${name} account in Settings to fill this in from ${name}.`;
    case 'no-app':
      return 'Pick the game from search, or link it to its Steam page below, to read it from Steam.';
    case 'unmatched':
      return `None of your PlayStation trophy lists matches this title yet. It is looked for again ${saved}.`;
    case 'private-profile':
      return 'Your Steam profile keeps its game details private, so Steam will not share them.';
    case 'not-owned':
      return `This game is not in your Steam library. It is read again ${saved}.`;
    default:
      return `Could not reach ${name}. It is read again ${saved}.`;
  }
};

/**
 * One line saying what the platform just chosen had to say: reading it, what
 * it filled in, or why it could not.
 */
export const PlatformReadNote: React.FC<{
  read: PlatformRead;
  /** When the next try comes: "once it is added", "when you save". */
  saved: string;
}> = ({ read, saved }) => {
  if (read.status === 'idle') return null;
  const name = PLATFORMS[read.platform].name;

  let icon: React.ReactNode;
  let text: string;
  let tone = 'text-gray-600';

  if (read.status === 'reading') {
    icon = <Loader2 size={12} className="animate-spin" />;
    text = `Syncing with ${name}…`;
  } else if (read.status === 'done') {
    const { unlocked, total, hoursPlayed } = read.progress;
    const parts: string[] = [];
    if (total !== null && total > 0) {
      parts.push(
        `${unlocked ?? 0} of ${total} ${awardNounFor(read.platform, total).toLowerCase()}`,
      );
    }
    if (hoursPlayed !== null && hoursPlayed > 0) parts.push(`${formatHours(hoursPlayed)}h played`);
    icon = <Check size={12} />;
    tone = 'text-positive-900';
    text = parts.length
      ? `Synced with ${name}: ${parts.join(' · ')}.`
      : `Synced with ${name}, which has no progress for this game yet.`;
  } else {
    icon = <AlertCircle size={12} />;
    tone = 'text-notice-900';
    text = failureText(read.reason, read.platform, saved);
  }

  return (
    <p role="status" className={cn('flex items-start gap-1.5 text-50', tone)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </p>
  );
};
