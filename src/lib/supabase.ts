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

export const supabase: SupabaseClient = createClient(
  url || 'http://localhost:54321',
  anonKey || 'anon-key-not-configured',
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
  },
);
