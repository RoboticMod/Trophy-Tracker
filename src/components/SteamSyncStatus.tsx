import React from 'react';
import { Link } from 'react-router-dom';
import { UserGame } from '../types';
import { useSync } from '../context/SyncContext';
import { SteamError, steamStoreUrl } from '../lib/steam';
import { formatHours, relativeTime } from '../lib/format';
import { SyncFact, SyncStatusFacts, SyncStatusHeader, SyncTone, syncDate } from './SyncStatus';
import { cn } from '../lib/cn';

const ERROR_TEXT: Partial<Record<SteamError, string>> = {
  'private-profile':
    'Your Steam profile hides its game details, so achievements cannot be read. Set Game details to Public in your Steam privacy settings.',
  'not-linked': 'This game is not linked to a Steam app yet.',
  'not-found': 'Steam has nothing for this app id. Link the game to a different app below.',
  'not-signed-in': 'Your session expired. Sign in again to sync.',
  'not-configured': 'Supabase is not configured, so Steam cannot be reached.',
};

/**
 * Whether a Steam game is actually being kept current, and if not, why.
 *
 * The mirror of the PlayStation panel, and for the same reason: sync runs
 * quietly in the background, which is right until it is not. A game linked to
 * the wrong app, or a profile whose game details are private, simply never
 * changes — with nothing anywhere to say so. This states the outcome for the
 * one game and points at the fix.
 */
export const SteamSyncStatus: React.FC<{ game: UserGame; className?: string }> = ({
  game,
  className,
}) => {
  const { steam } = useSync();

  const outcome = steam.state.outcomes[game.id];
  const error = outcome?.state === 'failed' ? outcome.error : undefined;

  let tone: SyncTone;
  let heading: string;
  let detail: React.ReactNode = null;

  if (!steam.isLinked) {
    tone = 'warn';
    heading = 'Steam account not linked';
    detail = (
      <>
        Link it in{' '}
        <Link to="/settings?section=connected" className="font-semibold text-accent-900 hover:text-accent-1000">
          Settings
        </Link>{' '}
        to sync achievements and playtime.
      </>
    );
  } else if (!game.steamAppId) {
    tone = 'warn';
    heading = 'Not linked to a Steam app';
    detail = 'Find it on Steam above, and it will sync from then on.';
  } else if (steam.state.running && !game.lastSyncedAt) {
    tone = 'busy';
    heading = 'Syncing with Steam…';
  } else if (error) {
    tone = 'bad';
    heading = error === 'private-profile' ? 'Steam is not showing your progress' : 'Last sync failed';
    detail = ERROR_TEXT[error] ?? 'Steam could not be reached. It will try again shortly.';
  } else if (!game.lastSyncedAt) {
    tone = 'warn';
    heading = 'Not synced yet';
    detail = 'Waiting for the first pass to read this game from your account.';
  } else {
    tone = steam.state.running ? 'busy' : 'good';
    heading = steam.state.running ? 'Syncing with Steam…' : 'Synced with Steam';
    detail = `Checked ${relativeTime(game.lastSyncedAt)}`;
  }

  const facts: SyncFact[] = [];
  if (game.steamAppId) {
    facts.push({ label: 'Steam app', value: String(game.steamAppId) });
    facts.push({
      label: 'Playtime',
      value:
        outcome?.hasPlaytime === false && game.hoursPlayed === 0
          ? 'Not reported by Steam'
          : `${formatHours(game.hoursPlayed)}h`,
    });
    facts.push({
      label: 'Last achievement',
      value: game.lastUnlockedAt ? syncDate(game.lastUnlockedAt) : '—',
    });
  }

  return (
    <div className={cn('space-y-3', className)}>
      <SyncStatusHeader
        tone={tone}
        heading={heading}
        detail={detail}
        action={
          game.steamAppId ? (
            <a
              href={steamStoreUrl(game.steamAppId)}
              target="_blank"
              rel="noreferrer noopener"
              className="shrink-0 text-50 font-bold text-accent-900 hover:text-accent-1000"
            >
              Store page
            </a>
          ) : null
        }
      />
      <SyncStatusFacts facts={facts} />
    </div>
  );
};
