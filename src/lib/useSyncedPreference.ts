import { useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { readPreference, writePreference } from './usePersistentState';

/**
 * A view preference that survives more than a reload.
 *
 * `usePersistentState` keeps these in localStorage, which is the right place
 * for a per-device choice — but localStorage is also the first thing a browser
 * throws away when it is told to clear site data on exit, and a preference that
 * quietly resets every few days may as well not be saved at all.
 *
 * So both: localStorage answers immediately, before the profile has loaded, and
 * the profile is the copy that actually lasts. The profile wins whenever it has
 * a valid value, which also means a choice made on the desktop is the one the
 * phone starts from. Every write goes to both.
 *
 * There is no useState here on purpose. The value is derived from the two
 * stores on every render, so there is no third copy to fall out of step with
 * them — and nothing to reconcile when the profile arrives moments after the
 * first paint.
 */
export function useSyncedPreference<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T,
): readonly [T, (value: T) => void] {
  const { sidebarConfig, updateSidebarConfig } = useGame();

  const synced = sidebarConfig.prefs?.[key];
  const local = readPreference(key);

  const value = isValid(synced) ? synced : isValid(local) ? local : initial;

  const setValue = useCallback(
    (next: T) => {
      writePreference(key, next);
      updateSidebarConfig({ prefs: { ...(sidebarConfig.prefs ?? {}), [key]: next } });
    },
    [key, sidebarConfig.prefs, updateSidebarConfig],
  );

  return [value, setValue] as const;
}
