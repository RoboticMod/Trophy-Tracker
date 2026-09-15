import { useEffect, useState } from 'react';

const KEY_PREFIX = 'trophy-tracker.pref.';

/**
 * useState that survives a reload, for view preferences like sort order.
 *
 * These are per-device display choices rather than library data, so they stay in
 * localStorage instead of the synced profile. Every access is guarded: storage
 * throws outright when cookies are blocked.
 *
 * `isValid` rejects a stored value that is no longer one of the options, so a
 * renamed choice falls back to the default instead of leaving a control stuck on
 * something it can no longer display.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T,
) {
  const [value, setValue] = useState<T>(() => {
    const stored = readPreference(key);
    return isValid(stored) ? stored : initial;
  });

  useEffect(() => {
    writePreference(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}

/**
 * The raw store behind the hook, for the two places that need it without a
 * component: `useSyncedPreference`, which derives rather than holds its value,
 * and the sound module, which is read from outside React entirely.
 */
export function readPreference(key: string): unknown {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

export function writePreference(key: string, value: unknown): void {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    // Private browsing or a full quota — the local copy just will not persist,
    // and the profile copy carries the choice instead.
  }
}

/** Builds an `isValid` guard from a fixed list of allowed values. */
export const oneOf =
  <T extends string>(options: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === 'string' && (options as readonly string[]).includes(value);
