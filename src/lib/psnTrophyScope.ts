import { useSyncedPreference } from './useSyncedPreference';

/**
 * Which PlayStation trophy groups a game's counts are taken from.
 *
 * PSN numbers add-on groups "001", "002" and so on beside the base "default"
 * one, and will roll them all together on request. The base list is what a
 * platinum is measured against, so it is the default here — otherwise a game
 * whose platinum you have earned reads as 45 of 76 because someone shipped
 * three DLC packs you never bought. Someone chasing every trophy there is can
 * ask for the lot instead.
 *
 * A preference rather than a per-game flag: it decides what "100%" means to
 * you, and an account that means one thing by it on one game means it on all
 * of them. It syncs to the profile, so both devices agree on the counts.
 */
export const PSN_TROPHY_SCOPE_KEY = 'psn-trophy-scope';

export type PsnTrophyScope = 'base' | 'all';

const isScope = (value: unknown): value is PsnTrophyScope =>
  value === 'base' || value === 'all';

export const usePsnTrophyScope = () =>
  useSyncedPreference<PsnTrophyScope>(PSN_TROPHY_SCOPE_KEY, 'base', isScope);

export const PSN_TROPHY_SCOPE_LABELS: Record<PsnTrophyScope, string> = {
  base: 'Base game only',
  all: 'Base game and add-ons',
};

export const PSN_TROPHY_SCOPE_HINTS: Record<PsnTrophyScope, string> = {
  base: 'What a platinum is measured against. A finished game reads 100% even when DLC packs exist.',
  all: 'Every trophy there is. A game with unbought DLC will sit below 100% until you own and finish it.',
};
