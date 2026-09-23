import React, { useState } from 'react';
import { Check, Loader2, Plug, Unlink } from 'lucide-react';
import { SiPlaystation, SiSteam } from 'react-icons/si';
import { useGame } from '../context/GameContext';
import { resolveSteamAccount } from '../lib/steam';
import { hasLinkColumns } from '../lib/db';
import { useSync } from '../context/SyncContext';
import { linkPsnAccount, unlinkPsnAccount } from '../lib/psn';
import { NEW_ACHIEVEMENTS_COLLECTION } from '../lib/sync';
import { relativeTime } from '../lib/format';
import { Button, Card, Field, SectionHeader, TextInput } from './ui';

/**
 * Linking the platform accounts a sync reads from.
 *
 * Separate from the per-game link in the edit dialog: that says *which* game
 * this is, and this says *whose* progress to read. Both are needed before
 * anything syncs, which is why each states what the other is waiting for.
 */
export const ConnectedAccounts: React.FC = () => {
  const { games, platformAccounts, linkSteamAccount, unlinkSteamAccount } = useGame();
  const { state } = useSync().steam;

  const [input, setInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedCount = games.filter((g) => g.platform === 'steam' && g.steamAppId).length;

  const handleLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    setLinking(true);
    setError(null);

    const result = await resolveSteamAccount(input);
    if (!result.data) {
      setError(
        result.error === 'request-failed'
          ? 'Could not reach Steam. Check that the game-data function is deployed and that STEAM_API_KEY is set.'
          : 'No Steam account matches that. Try the full profile URL, or the 17-digit SteamID64.',
      );
      setLinking(false);
      return;
    }

    try {
      await linkSteamAccount(result.data);
      setInput('');
    } catch {
      setError('Linked with Steam, but the account could not be saved. Re-run the schema SQL.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <Card className="space-y-4">
      <SectionHeader
        icon={<Plug size={18} />}
        title="Connected accounts"
        description="Steam and PlayStation keep your linked games current on their own"
        iconClassName="bg-steam-700/16 text-steam-900"
      />

      {/* Shown only once a write has actually been refused for want of the new
          columns, so it is a fact rather than a warning about a maybe. */}
      {!hasLinkColumns() ? (
        <p className="rounded-md border border-notice-700/50 bg-notice-700/12 p-3 text-50 font-semibold text-notice-900">
          Your database is missing the platform-link columns, so links cannot be saved. Copy the
          schema SQL from Cloud storage below and run it in Supabase, then reload.
        </p>
      ) : null}

      <div className="panel-inset space-y-3 rounded-md p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-steam-700/16 text-steam-900">
            <SiSteam size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-100 font-semibold text-gray-1000">Steam</div>
            <div className="truncate text-50 text-gray-600">
              {platformAccounts?.steamId
                ? `${platformAccounts.steamPersona ?? 'Linked'} · ${platformAccounts.steamId}`
                : 'Not linked'}
            </div>
          </div>

          {platformAccounts?.steamId ? (
            <Button
              variant="secondary"
              buttonStyle="outline"
              size="s"
              onClick={() => void unlinkSteamAccount()}
            >
              <Unlink size={13} />
              Unlink
            </Button>
          ) : null}
        </div>

        {platformAccounts?.steamId ? (
          <>
            <p className="text-50 text-gray-600">
              {linkedCount > 0
                ? `${linkedCount} linked game${linkedCount === 1 ? '' : 's'}, kept current automatically.`
                : 'No games are linked yet. Add one from the Steam search, or link a game to its Steam app in its edit dialog.'}
            </p>

            {/* The single most common reason a sync comes back empty, said
                before it happens rather than as an error afterwards. */}
            <p className="text-50 text-gray-600">
              Your Steam profile&rsquo;s <strong className="text-gray-800">Game details</strong> must
              be set to Public, or Steam reports no achievements at all.
            </p>

            {state.lastReport ? (
              <div className="flex flex-wrap items-center gap-2 text-50 text-gray-700">
                <Check size={13} className="text-positive-900" />
                <span>
                  Last sync {state.lastRunAt ? relativeTime(state.lastRunAt) : ''} — checked{' '}
                  {state.lastReport.checked}, updated {state.lastReport.updated}
                </span>
                {state.lastReport.grown.length > 0 ? (
                  <span className="text-trophy-900">
                    · {state.lastReport.grown.length} moved to {NEW_ACHIEVEMENTS_COLLECTION}
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <form onSubmit={handleLink} className="space-y-3">
            <Field
              label="Steam profile"
              description="A profile URL, a custom URL name, or a 17-digit SteamID64."
              error={error}
            >
              {(props) => (
                <TextInput
                  {...props}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="https://steamcommunity.com/id/yourname"
                />
              )}
            </Field>

            <Button type="submit" variant="accent" size="s" disabled={linking || !input.trim()}>
              {linking ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
              Link Steam account
            </Button>
          </form>
        )}
      </div>

      <PlayStationAccount />
    </Card>
  );
};

/**
 * The PlayStation half.
 *
 * Sony publishes no API for this, so the link is the NPSSO cookie from a
 * signed-in playstation.com session. That cookie is as good as the account
 * password, which is why the steps say so plainly, why it is posted straight to
 * the function and exchanged there, and why it is never stored — only the
 * tokens it produces are.
 */
const PlayStationAccount: React.FC = () => {
  const { games, platformAccounts, refreshPlatformAccounts } = useGame();
  const { state } = useSync().psn;

  const [npsso, setNpsso] = useState('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  const linked = Boolean(platformAccounts?.psnAccountId);
  const ps5Count = games.filter((g) => g.platform === 'ps5').length;

  const handleLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = npsso.trim();
    if (!value) return;

    setLinking(true);
    setError(null);

    const result = await linkPsnAccount(value);
    // Cleared whatever happened: there is no reason for this value to sit in
    // memory for a second longer than the request it was made for.
    setNpsso('');

    if (!result.data) {
      setError(
        result.error === 'bad-npsso'
          ? 'PlayStation rejected that NPSSO. They expire quickly — sign in again and copy a fresh one.'
          : 'Could not reach PlayStation. Check that the game-data function is deployed.',
      );
    } else {
      await refreshPlatformAccounts();
    }
    setLinking(false);
  };

  const handleUnlink = async () => {
    await unlinkPsnAccount();
    await refreshPlatformAccounts();
  };

  return (
    <div className="panel-inset space-y-3 rounded-md p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-playstation-700/16 text-playstation-900">
          <SiPlaystation size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-100 font-semibold text-gray-1000">PlayStation Network</div>
          <div className="truncate text-50 text-gray-600">
            {linked ? (platformAccounts?.psnOnlineId ?? 'Linked') : 'Not linked'}
          </div>
        </div>

        {linked ? (
          <Button
            variant="secondary"
            buttonStyle="outline"
            size="s"
            onClick={() => void handleUnlink()}
          >
            <Unlink size={13} />
            Unlink
          </Button>
        ) : null}
      </div>

      {linked ? (
        <>
          <p className="text-50 text-gray-600">
            {ps5Count > 0
              ? `${ps5Count} PlayStation game${ps5Count === 1 ? '' : 's'} kept current automatically. Trophy lists and playtime are matched to your library by title.`
              : 'No PlayStation games yet. Any you add are matched to your trophy lists by title and kept current automatically.'}
          </p>

          {state.lastReport ? (
            <div className="flex flex-wrap items-center gap-2 text-50 text-gray-700">
              <Check size={13} className="text-positive-900" />
              <span>
                Last sync {state.lastRunAt ? relativeTime(state.lastRunAt) : ''} — checked{' '}
                {state.lastReport.checked}, updated {state.lastReport.updated}
                {state.lastReport.unmatched > 0
                  ? `, ${state.lastReport.unmatched} with no trophy list matched`
                  : ''}
              </span>
              {state.lastReport.grown.length > 0 ? (
                <span className="text-trophy-900">
                  · {state.lastReport.grown.length} moved to {NEW_ACHIEVEMENTS_COLLECTION}
                </span>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <form onSubmit={handleLink} className="space-y-3">
          <Field
            label="NPSSO token"
            description="Exchanged for access tokens and then discarded — it is never stored."
            error={error}
            action={
              <Button buttonStyle="subtle" size="s" onClick={() => setShowSteps((open) => !open)}>
                {showSteps ? 'Hide steps' : 'How do I get this?'}
              </Button>
            }
          >
            {(props) => (
              <TextInput
                {...props}
                value={npsso}
                onChange={(e) => setNpsso(e.target.value)}
                placeholder="64-character token"
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </Field>

          {showSteps ? (
            <ol className="list-inside list-decimal space-y-1 text-50 leading-relaxed text-gray-600">
              <li>
                Sign in at{' '}
                <a
                  href="https://www.playstation.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-bold text-accent-900 hover:text-accent-1000"
                >
                  playstation.com
                </a>{' '}
                in your browser.
              </li>
              <li>
                In the same browser, open{' '}
                <a
                  href="https://ca.account.sony.com/api/v1/ssocookie"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-bold text-accent-900 hover:text-accent-1000"
                >
                  ca.account.sony.com/api/v1/ssocookie
                </a>
                .
              </li>
              <li>
                Copy the 64-character <code className="text-gray-800">npsso</code> value from the
                JSON and paste it above.
              </li>
              <li className="text-notice-900">
                Treat it like your password: it grants access to your PlayStation account. Do not
                paste it anywhere else.
              </li>
            </ol>
          ) : null}

          <Button type="submit" variant="accent" size="s" disabled={linking || !npsso.trim()}>
            {linking ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
            Link PlayStation account
          </Button>
        </form>
      )}
    </div>
  );
};
