import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * True when real credentials are present. The app renders a setup screen when
 * this is false rather than building a client against a placeholder URL and
 * firing doomed requests on every load.
 */
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('placeholder') && !url.includes('YOUR_'),
);

const REMEMBER_KEY = 'trophy-tracker.remember-me';

/** Browser storage throws when cookies are blocked, so every access is guarded. */
const safely = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const getRememberMe = () =>
  safely(() => window.localStorage.getItem(REMEMBER_KEY) === '1', false);

/**
 * Must be set before signing in: it decides which store the resulting session is
 * written to, and the auth storage adapter reads it at write time.
 */
export const setRememberMe = (remember: boolean) =>
  safely(() => {
    if (remember) window.localStorage.setItem(REMEMBER_KEY, '1');
    else window.localStorage.removeItem(REMEMBER_KEY);
  }, undefined);

/**
 * Routes the session to localStorage when "remember me" is on and sessionStorage
 * when it is off, so an unremembered sign-in lasts only as long as the tab. Only
 * one store ever holds the session, so reads can check both.
 */
const authStorage = {
  getItem: (key: string) =>
    safely(
      () => window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key),
      null,
    ),
  setItem: (key: string, value: string) =>
    safely(() => {
      const remembered = getRememberMe();
      const target = remembered ? window.localStorage : window.sessionStorage;
      const other = remembered ? window.sessionStorage : window.localStorage;
      other.removeItem(key);
      target.setItem(key, value);
    }, undefined),
  removeItem: (key: string) =>
    safely(() => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }, undefined),
};

export const supabase: SupabaseClient = createClient(
  url || 'http://localhost:54321',
  anonKey || 'anon-key-not-configured',
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: false,
      storage: authStorage,
    },
  },
);
