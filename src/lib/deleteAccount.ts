import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Deleting the signed-in account, for good.
 *
 * Removing an `auth.users` row needs the service role, which the browser must
 * never hold, so the work happens in the `game-data` edge function: it reads
 * the caller's id from the verified session and deletes that one. Every table
 * references `auth.users … on delete cascade`, so the library goes with it.
 *
 * Its own tiny module rather than a fourth route bolted onto `psn.ts`, which is
 * about trophies and has nothing to do with this.
 */
export type DeleteAccountError =
  | 'not-configured'
  | 'not-signed-in'
  | 'could-not-delete'
  | 'request-failed';

/** Null on success, or the reason it did not happen. */
export async function deleteAccount(): Promise<DeleteAccountError | null> {
  if (!isSupabaseConfigured) return 'not-configured';

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return 'not-signed-in';

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-data/me/delete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.ok) return null;

    // 'not-configured' here means the function is deployed but has no service
    // role key, which is a deployment step the UI has to say out loud rather
    // than reporting as a generic failure.
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (body.error === 'not-configured') return 'not-configured';
    if (body.error === 'could-not-delete') return 'could-not-delete';
    return 'request-failed';
  } catch {
    return 'request-failed';
  }
}

/** What each reason means to the person who pressed the button. */
export const DELETE_ACCOUNT_MESSAGES: Record<DeleteAccountError, string> = {
  'not-configured':
    'Deleting an account needs SUPABASE_SERVICE_ROLE_KEY set as a secret on the game-data function. See the README.',
  'not-signed-in': 'Your session has expired. Sign in again and retry.',
  'could-not-delete': 'Supabase refused the delete. Nothing was removed.',
  'request-failed': 'Could not reach the server. Nothing was removed.',
};
