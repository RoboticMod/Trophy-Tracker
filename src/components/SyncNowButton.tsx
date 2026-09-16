import React, { useState } from 'react';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './ui';

export interface SyncOutcome {
  updated: boolean;
  grew?: boolean;
  /** Present when the platform could not be asked, or refused to answer. */
  error?: string | null;
}

interface SyncNowButtonProps {
  onSync: () => Promise<SyncOutcome>;
  /** Why the button cannot be used yet, e.g. the link is not saved. */
  disabledReason?: string;
}

/**
 * Fetching one game's progress on demand.
 *
 * Says what happened rather than only that it happened: a sync that changes
 * nothing looks identical to one that failed unless it tells you it found
 * nothing to change, and that ambiguity is exactly what makes a sync button
 * feel broken.
 */
export const SyncNowButton: React.FC<SyncNowButtonProps> = ({ onSync, disabledReason }) => {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null);

  const run = async () => {
    setSyncing(true);
    setMessage(null);

    const result = await onSync();

    setMessage(
      result.error
        ? {
            text:
              result.error === 'private-profile'
                ? 'Your profile hides its game details'
                : result.error === 'not-linked'
                  ? 'No account linked in Settings'
                  : 'Could not reach the platform',
            tone: 'bad',
          }
        : {
            text: result.grew
              ? 'New achievements found'
              : result.updated
                ? 'Progress updated'
                : 'Already up to date',
            tone: 'good',
          },
    );

    setSyncing(false);
    window.setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        buttonStyle="outline"
        size="s"
        onClick={() => void run()}
        disabled={syncing || Boolean(disabledReason)}
        title={disabledReason ?? 'Fetch this game’s progress now'}
      >
        {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        Sync now
      </Button>

      {message ? (
        <span
          className={
            message.tone === 'good'
              ? 'flex items-center gap-1 text-50 font-semibold text-positive-900'
              : 'text-50 font-semibold text-notice-900'
          }
        >
          {message.tone === 'good' ? <Check size={12} /> : null}
          {message.text}
        </span>
      ) : null}
    </div>
  );
};
