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

/**
 * The scope the stored counts were actually fetched under.
 *
 * A sync only re-reads a game PSN says has changed, so switching this setting
 * otherwise did nothing at all: every game was skipped as up to date, and the
 * counts kept whatever scope they were first read with until the safety net
 * expired days later. Comparing the two makes a change force one full pass.
 *
 * Kept in the synced store rather than in a ref so it survives a reload — the
 * obvious thing to do after changing a setting that appears not to work.
 */
export const PSN_TROPHY_SCOPE_APPLIED_KEY = 'psn-trophy-scope-applied';

export const usePsnTrophyScopeApplied = () =>
  useSyncedPreference<PsnTrophyScope>(PSN_TROPHY_SCOPE_APPLIED_KEY, 'base', isScope);

export const PSN_TROPHY_SCOPE_LABELS: Record<PsnTrophyScope, string> = {
  base: 'Base game only',
  all: 'Base game and add-ons',
};

