import React from 'react';
import { Info, X } from 'lucide-react';
import { useSyncedPreference } from '../lib/useSyncedPreference';

/**
 * The sentence a page used to carry under its own title.
 *
 * Those paragraphs largely restated the heading — "Backlog: games queued and
 * waiting to be played" — and restated it on every single visit, for the life
 * of the account. The text is worth having once; it is not worth a permanent
 * band across the top of a page you open every day.
 *
 * So: dismissable, and dismissed for good. The flag goes through
 * `useSyncedPreference`, which answers from localStorage immediately and keeps
 * the profile as the copy that lasts — so putting this away on the desktop also
 * puts it away on the phone, and clearing site data does not bring it back.
 */
const isBool = (value: unknown): value is boolean => typeof value === 'boolean';

export const IntroNotice: React.FC<{
  /** Names the preference key, so each page is dismissed independently. */
  id: string;
  children: React.ReactNode;
}> = ({ id, children }) => {
  const [dismissed, setDismissed] = useSyncedPreference<boolean>(
    `intro-${id}-dismissed`,
    false,
    isBool,
  );

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 rounded-md border border-accent-700/40 bg-accent-700/10 p-3 text-75 text-accent-900">
      <Info size={15} className="mt-0.5 shrink-0" />
      <p className="flex-1">{children}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss this note"
        className="shrink-0 rounded-sm p-0.5 hover:bg-accent-700/20"
      >
        <X size={14} />
      </button>
    </div>
  );
};
