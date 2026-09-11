import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { clearUserCache } from '../lib/localCache';
import { GameStatus, GAME_STATUSES, Platform, SurfaceKey } from '../types';
import { SUPABASE_SCHEMA_SQL } from '../lib/db';
import { getRawgCacheCount, clearRawgCache } from '../lib/rawg';
import {
  DEFAULT_PLATFORM_SORT_ORDER,
  DEFAULT_STATUS_NAMES,
  PLATFORMS,
  normalizePlatform,
} from '../lib/constants';
import { statusLabel, validateStatusName, MAX_STATUS_NAME_LENGTH, STATUS_COLOR } from '../lib/status';
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  DEFAULT_APP_NAME,
  DEFAULT_DASH_TITLE,
  DEFAULT_GOLD,
  DEFAULT_SURFACE,
  GOLD_PRESETS,
  MAX_UI_NAME_LENGTH,
  SURFACES,
  SURFACE_KEYS,
} from '../lib/theme';
import {
  DEFAULT_NAV_ORDER,
  MAX_NAV_NAME_LENGTH,
  allNavDestinationsInOrder,
  isNavVisible,
  navLabel,
} from '../lib/navigation';
import { fileToAvatarDataUrl } from '../lib/image';
import { softEdge } from '../lib/tone';
import {
  Button,
  Dot,
  Eyebrow,
  Field,
  FieldLabel,
  GroupHeading,
  InsetRow,
  Panel,
  PanelHeading,
  RowInput,
  Switch,
  SyncPill,
  TextInput,
} from '../components/ui';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  DownloadIcon,
  LogOutIcon,
  RefreshIcon,
  SlidersIcon,
  UploadIcon,
} from '../components/icons';
import { cn } from '../lib/cn';

export const SettingsView: React.FC = () => {
  const {
    games,
    collections,
    profile,
    updateProfile,
    sidebarConfig,
    updateSidebarConfig,
    replaceAll,
    refresh,
    ui,
  } = useGame();
  const { user, signOut } = useAuth();

  const [usernameInput, setUsernameInput] = useState(profile.username || '');
  const [savedName, setSavedName] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [cacheCount, setCacheCount] = useState(() => getRawgCacheCount());
  const [statusErrors, setStatusErrors] = useState<Partial<Record<GameStatus, string>>>({});
  const [advOpen, setAdvOpen] = useState(false);

  const platformOrder = profile.platformOrder?.length
    ? profile.platformOrder
    : DEFAULT_PLATFORM_SORT_ORDER;

  /* -- Account ----------------------------------------------------------- */

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ username: usernameInput.trim() || 'Player' });
    setSavedName(true);
    setTimeout(() => setSavedName(false), 2000);
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarError(null);
    try {
      updateProfile({ avatarUrl: await fileToAvatarDataUrl(file) });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not use that image.');
    }
  };

  const handleSignOut = async () => {
    if (user?.id) clearUserCache(user.id);
    await signOut();
  };

  /* -- Ordering ---------------------------------------------------------- */

  const movePlatform = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= platformOrder.length) return;
    const next: Platform[] = [...platformOrder];
    [next[index], next[target]] = [next[target], next[index]];
    updateProfile({ platformOrder: next });
  };

  const navDestinations = allNavDestinationsInOrder(sidebarConfig);

  const moveNav = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= navDestinations.length) return;
    const next = navDestinations.map((d) => d.path);
    [next[index], next[target]] = [next[target], next[index]];
    updateSidebarConfig({ navOrder: next });
  };

  const renameNav = (path: string, value: string) => {
    const next = { ...(sidebarConfig.navNames || {}) };
    if (value.trim()) next[path] = value.trim();
    else delete next[path];
    updateSidebarConfig({ navNames: next });
  };

  /* -- Status names ------------------------------------------------------- */

  const renameStatus = (status: GameStatus, value: string) => {
    const error = validateStatusName(value);
    setStatusErrors((prev) => ({ ...prev, [status]: error ?? undefined }));
    if (error) return;
    updateProfile({ statusNames: { ...(profile.statusNames || {}), [status]: value.trim() } });
  };

  /* -- Backup ------------------------------------------------------------- */

  const handleExport = () => {
    const payload = {
      profile,
      collections,
      games,
      exportedAt: new Date().toISOString(),
      version: '3.0.0',
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `trophy-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json.games)) {
          setImportStatus('That file does not look like a Trophy Tracker backup.');
          return;
        }

        // Backups from older versions may hold platforms this app dropped.
        const kept = json.games
          .map((g: Record<string, unknown>) => ({
            ...g,
            platform: normalizePlatform(g.platform),
            updatedAt: g.updatedAt ?? new Date().toISOString(),
          }))
          .filter((g: { platform: Platform | null }) => g.platform !== null);

        const dropped = json.games.length - kept.length;

        await replaceAll({
          games: kept,
          collections: Array.isArray(json.collections) ? json.collections : collections,
          profile: json.profile,
        });

        setImportStatus(
          dropped > 0
            ? `Restored ${kept.length} games. ${dropped} on unsupported platforms were skipped.`
            : `Restored ${kept.length} games.`,
        );
      } catch {
        setImportStatus('Could not parse that JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Clipboard access can be denied; the SQL is still readable via View SQL.
      setShowSql(true);
    }
  };

  const resetCustomization = () =>
    updateProfile({
      accent: DEFAULT_ACCENT,
      gold: DEFAULT_GOLD,
      surface: DEFAULT_SURFACE,
      uiAppName: undefined,
      uiDashTitle: undefined,
      statusNames: undefined,
    });

  const avatarInitial = (profile.username || 'P').trim().charAt(0).toUpperCase() || 'P';
  const usingPresetAccent = ACCENT_PRESETS.some((p) => p.color === ui.theme.accent);

  return (
    <section className="tt-rise mx-auto flex w-full max-w-[780px] flex-col gap-4">
      <div>
        <Eyebrow>Preferences</Eyebrow>
        <h1 className="m-0 mt-1 font-display text-[clamp(28px,4.2vw,42px)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">
          Settings
        </h1>
      </div>

      {/* Account ----------------------------------------------------------- */}
      <Panel className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PanelHeading>Account</PanelHeading>
          <Button variant="outline" size="s" onClick={handleSignOut}>
            <LogOutIcon size={13} />
            Sign out
          </Button>
        </div>

        <InsetRow className="flex flex-wrap items-start gap-4 !p-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-[62px] w-[62px] shrink-0 rounded-full object-cover hairline-2"
            />
          ) : (
            <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full bg-surface-3 font-display text-[22px] font-bold text-muted hairline-2">
              {avatarInitial}
            </span>
          )}

          <div className="flex min-w-[200px] flex-1 flex-col items-start gap-2">
            <span className="text-[13px] text-muted">{user?.email ?? 'Signed in'}</span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-[34px] cursor-pointer items-center gap-[7px] rounded-control bg-surface-3 px-3.5 font-display text-[13px] font-bold text-body transition-colors hover:bg-line">
                <UploadIcon size={13} />
                Upload image
                <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
              </label>
              {profile.avatarUrl ? (
                <Button
                  variant="ghost"
                  size="s"
                  onClick={() => updateProfile({ avatarUrl: undefined })}
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <span className={cn('text-[11px]', avatarError ? 'text-danger' : 'text-faint')}>
              {avatarError ?? 'Resized to 256px and stored with your profile.'}
            </span>
          </div>
        </InsetRow>

        <form onSubmit={handleSaveName} className="flex flex-wrap items-end gap-2.5">
          <Field label="Display name" className="min-w-[200px] flex-1">
            {(props) => (
              <TextInput
                {...props}
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Player"
              />
            )}
          </Field>
          <Button type="submit" variant="accent" size="l">
            {savedName ? 'Saved' : 'Save name'}
          </Button>
        </form>
      </Panel>

      {/* Card highlight ---------------------------------------------------- */}
      <Panel className="flex flex-col gap-3.5">
        <div>
          <PanelHeading>Card highlight</PanelHeading>
          <p className="m-0 mt-1 text-[12px] text-subtle">
            How a card signals that a game is in progress or fully completed.
          </p>
        </div>
        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))]">
          <HighlightOption
            selected={ui.highlight === 'stroke'}
            onClick={() => updateProfile({ highlightStyle: 'stroke' })}
            title="Stroke"
            description="A gold hairline around the card"
            preview={
              <span
                style={{
                  boxShadow: `inset 0 0 0 2px ${softEdge('var(--tt-gold, #e5a83c)', 70)}`,
                }}
                className="block h-10 w-14 shrink-0 rounded-md bg-surface"
              />
            }
          />
          <HighlightOption
            selected={ui.highlight === 'fill'}
            onClick={() => updateProfile({ highlightStyle: 'fill' })}
            title="Filled"
            description="The card body tinted in status colour"
            preview={
              <span
                style={{
                  background:
                    'linear-gradient(165deg, var(--color-gold-wash), var(--tt-surface))',
                  boxShadow: `inset 0 0 0 1px ${softEdge('var(--tt-gold, #e5a83c)', 40)}`,
                }}
                className="block h-10 w-14 shrink-0 rounded-md"
              />
            }
          />
        </div>
      </Panel>

      {/* Platform order ---------------------------------------------------- */}
      <Panel className="flex flex-col gap-3.5">
        <div>
          <PanelHeading>Platform order</PanelHeading>
          <p className="m-0 mt-1 text-[12px] text-subtle">
            Drives the “Platform” sort in every library view.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {platformOrder.map((platform, index) => (
            <InsetRow key={platform} className="flex items-center gap-3 !px-3 !py-2.5">
              <span className="w-[22px] shrink-0 font-display text-[12px] font-bold text-faint">
                {index + 1}
              </span>
              <span
                style={{ color: PLATFORMS[platform].color }}
                className="flex h-[30px] w-11 shrink-0 items-center justify-center rounded-control bg-bg-2 font-display text-[10px] font-bold tracking-[0.08em]"
              >
                {PLATFORMS[platform].mark}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-body">
                {PLATFORMS[platform].name}
              </span>
              <MoveButtons
                onUp={() => movePlatform(index, -1)}
                onDown={() => movePlatform(index, 1)}
                disableUp={index === 0}
                disableDown={index === platformOrder.length - 1}
              />
            </InsetRow>
          ))}
        </div>
      </Panel>

      {/* Advanced customization -------------------------------------------- */}
      <div className="rounded-panel bg-surface hairline">
        <button
          type="button"
          onClick={() => setAdvOpen((open) => !open)}
          aria-expanded={advOpen}
          className="flex w-full cursor-pointer items-center gap-3.5 rounded-panel border-0 bg-transparent p-[clamp(16px,2.4vw,22px)] text-left transition-colors hover:bg-surface-2"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-inset bg-accent-soft text-accent-ink">
            <SlidersIcon size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[16px] font-bold text-ink">
              Advanced customization
            </span>
            <span className="mt-1 block text-[12px] text-subtle [text-wrap:pretty]">
              Accents, interface names, statuses and tabs. Saved to your Supabase profile.
            </span>
          </span>
          <SyncPill size="sm" className="hidden sm:inline-flex">
            Synced
          </SyncPill>
          <ChevronDownIcon
            size={17}
            color="#9a9082"
            className={cn(
              'shrink-0 transition-transform duration-200 ease-tt',
              advOpen && 'rotate-180',
            )}
          />
        </button>

        {advOpen ? (
          <div className="flex flex-col gap-6 px-[clamp(16px,2.4vw,22px)] pb-[clamp(16px,2.4vw,22px)] pt-1">
            <div className="h-px bg-line" />

            {/* Accent ------------------------------------------------------ */}
            <div className="flex flex-col gap-3.5">
              <div>
                <GroupHeading>Accent colour</GroupHeading>
                <p className="m-0 mt-1 text-[12px] text-subtle">
                  Drives buttons, links, active tabs and progress meters across the app.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {ACCENT_PRESETS.map((preset) => (
                  <SwatchPill
                    key={preset.color}
                    name={preset.name}
                    selected={ui.theme.accent === preset.color}
                    ringColor={preset.color}
                    onClick={() => updateProfile({ accent: preset.color })}
                    swatch={
                      <span
                        style={{ background: preset.color }}
                        className="h-[22px] w-[22px] rounded-full"
                      />
                    }
                  />
                ))}

                {/* The ring only appears once the accent is genuinely custom,
                    so a preset never leaves two swatches looking selected. */}
                <label
                  style={{
                    boxShadow: usingPresetAccent
                      ? 'inset 0 0 0 1px var(--tt-line)'
                      : `inset 0 0 0 2px ${ui.theme.accent}`,
                  }}
                  className="flex h-11 cursor-pointer items-center gap-2.5 rounded-full bg-surface-2 py-0 pl-2 pr-3.5"
                >
                  <input
                    type="color"
                    value={ui.theme.accent}
                    onChange={(e) => updateProfile({ accent: e.target.value })}
                    aria-label="Custom accent colour"
                    className="h-[22px] w-[22px] shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  />
                  <span className="font-display text-[12px] font-bold text-muted">Custom</span>
                </label>
              </div>
            </div>

            {/* Background theme -------------------------------------------- */}
            <div className="flex flex-col gap-3.5">
              <div>
                <GroupHeading>Background theme</GroupHeading>
                <p className="m-0 mt-1 text-[12px] text-subtle">
                  Sets every surface, from the page behind the cards to panel hairlines.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {SURFACE_KEYS.map((key: SurfaceKey) => (
                  <SwatchPill
                    key={key}
                    name={SURFACES[key].name}
                    selected={ui.theme.surface === key}
                    ringColor="var(--tt-accent, #45c8ea)"
                    onClick={() => updateProfile({ surface: key })}
                    swatch={
                      <span
                        style={{
                          background: `linear-gradient(135deg, ${SURFACES[key].vars['--tt-surface-3']}, ${SURFACES[key].vars['--tt-bg']})`,
                        }}
                        className="h-[22px] w-[22px] rounded-full hairline-2"
                      />
                    }
                  />
                ))}
              </div>
            </div>

            {/* Trophy tone -------------------------------------------------- */}
            <div className="flex flex-col gap-3.5">
              <div>
                <GroupHeading>Trophy tone</GroupHeading>
                <p className="m-0 mt-1 text-[12px] text-subtle">
                  The metal used for 100% completion, platinum badges and highlights.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {GOLD_PRESETS.map((preset) => (
                  <SwatchPill
                    key={preset.color}
                    name={preset.name}
                    selected={ui.theme.gold === preset.color}
                    ringColor={preset.color}
                    onClick={() => updateProfile({ gold: preset.color })}
                    swatch={
                      <span
                        style={{ background: preset.color }}
                        className="h-[22px] w-[22px] rounded-full"
                      />
                    }
                  />
                ))}
              </div>
            </div>

            {/* Interface names ---------------------------------------------- */}
            <div className="flex flex-col gap-3.5">
              <div>
                <GroupHeading>Interface names</GroupHeading>
                <p className="m-0 mt-1 text-[12px] text-subtle">
                  Rename the app and its landing headline. Game titles come from RAWG and are never
                  touched.
                </p>
              </div>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="tt-appname">App name</FieldLabel>
                  <TextInput
                    id="tt-appname"
                    value={profile.uiAppName ?? ''}
                    maxLength={MAX_UI_NAME_LENGTH}
                    placeholder={DEFAULT_APP_NAME}
                    onChange={(e) => updateProfile({ uiAppName: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="tt-dashtitle">Dashboard headline</FieldLabel>
                  <TextInput
                    id="tt-dashtitle"
                    value={profile.uiDashTitle ?? ''}
                    maxLength={MAX_UI_NAME_LENGTH}
                    placeholder={DEFAULT_DASH_TITLE}
                    onChange={(e) => updateProfile({ uiDashTitle: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Status names -------------------------------------------------- */}
            <div className="flex flex-col gap-3.5">
              <div>
                <GroupHeading>Status names</GroupHeading>
                <p className="m-0 mt-1 text-[12px] text-subtle">
                  Rename any status and it updates everywhere at once. Up to{' '}
                  {MAX_STATUS_NAME_LENGTH} characters.
                </p>
              </div>
              <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
                {GAME_STATUSES.map((status) => (
                  <div key={status} className="flex flex-col gap-1.5">
                    <FieldLabel className="flex items-center gap-1.5">
                      <Dot color={STATUS_COLOR[status]} size={7} />
                      {DEFAULT_STATUS_NAMES[status]}
                    </FieldLabel>
                    <RowInput
                      defaultValue={statusLabel(status, profile)}
                      maxLength={MAX_STATUS_NAME_LENGTH}
                      aria-label={`Name for ${DEFAULT_STATUS_NAMES[status]}`}
                      onChange={(e) => renameStatus(status, e.target.value)}
                    />
                    {statusErrors[status] ? (
                      <span className="text-[11px] text-danger">{statusErrors[status]}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation ---------------------------------------------------- */}
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <GroupHeading>Navigation</GroupHeading>
                  <p className="m-0 mt-1 text-[12px] text-subtle">
                    Reorder destinations, rename them, or hide what you don’t use.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="s"
                  onClick={() => updateSidebarConfig({ navOrder: DEFAULT_NAV_ORDER })}
                >
                  Reset order
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {navDestinations.map((destination, index) => {
                  const visible = isNavVisible(destination, sidebarConfig);
                  return (
                    <InsetRow
                      key={destination.path}
                      className="flex flex-wrap items-center gap-3 !p-3"
                    >
                      <span className="w-[22px] shrink-0 font-display text-[12px] font-bold text-faint">
                        {index + 1}
                      </span>

                      <span className="flex min-w-[180px] flex-1 flex-col gap-1">
                        <RowInput
                          className="!bg-surface font-display font-semibold"
                          defaultValue={navLabel(destination, sidebarConfig)}
                          maxLength={MAX_NAV_NAME_LENGTH}
                          aria-label={`Name for ${destination.name}`}
                          onChange={(e) => renameNav(destination.path, e.target.value)}
                        />
                        <span className="truncate text-[11px] text-faint">
                          {destination.description}
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-1.5">
                        <MoveButtons
                          onUp={() => moveNav(index, -1)}
                          onDown={() => moveNav(index, 1)}
                          disableUp={index === 0}
                          disableDown={index === navDestinations.length - 1}
                        />
                        {/* The dashboard is the fallback route, so it has no
                            switch — hiding it would leave nowhere to land. */}
                        {destination.configKey ? (
                          <Switch
                            checked={visible}
                            label={`Show ${destination.name} in navigation`}
                            onChange={(next) =>
                              updateSidebarConfig({ [destination.configKey!]: next })
                            }
                          />
                        ) : (
                          <span className="w-[46px]" />
                        )}
                      </span>
                    </InsetRow>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span className="text-[12px] text-faint">Saved to Supabase as you change them.</span>
              <Button variant="outline" size="m" onClick={resetCustomization}>
                Reset customization
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Cloud storage ------------------------------------------------------ */}
      <Panel className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <PanelHeading>Cloud storage</PanelHeading>
            <p className="m-0 mt-1 text-[12px] text-subtle">
              Your library lives in Supabase, scoped to your account.
            </p>
          </div>
          <SyncPill>Synced</SyncPill>
        </div>
        <p className="m-0 text-[13px] text-muted [text-wrap:pretty]">
          Changes save as you make them. Offline edits queue locally and send as soon as the
          connection returns.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="neutral" size="m" onClick={() => void refresh()}>
            <RefreshIcon size={13} />
            Reload from cloud
          </Button>
          <Button variant="outline" size="m" onClick={copySql}>
            <CopyIcon size={13} />
            {copiedSql ? 'Copied' : 'Copy schema SQL'}
          </Button>
          <Button variant="ghost" size="m" onClick={() => setShowSql((open) => !open)}>
            {showSql ? 'Hide SQL' : 'View SQL'}
          </Button>
        </div>
        {showSql ? (
          <pre className="m-0 overflow-x-auto rounded-inset bg-bg p-3.5 font-mono text-[11px] leading-[1.6] text-muted hairline">
            {SUPABASE_SCHEMA_SQL}
          </pre>
        ) : null}
      </Panel>

      {/* Catalog cache ------------------------------------------------------ */}
      <Panel className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <PanelHeading>Catalog cache</PanelHeading>
            <p className="m-0 mt-1 text-[12px] text-subtle">
              RAWG results are cached locally for 24 hours.
            </p>
          </div>
          <span className="rounded-full bg-surface-2 px-3 py-1.5 font-display text-[12px] font-bold tabular-nums text-body hairline">
            {cacheCount} cached
          </span>
        </div>
        <Button
          variant="outline"
          size="m"
          className="w-fit"
          onClick={() => {
            clearRawgCache();
            setCacheCount(getRawgCacheCount());
          }}
        >
          Clear search cache
        </Button>
      </Panel>

      {/* Backup ------------------------------------------------------------- */}
      <Panel className="flex flex-col gap-3.5">
        <div>
          <PanelHeading>Backup &amp; restore</PanelHeading>
          <p className="m-0 mt-1 text-[12px] text-subtle">
            Export a portable JSON copy, or restore one into your account.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="neutral" size="m" onClick={handleExport}>
            <DownloadIcon size={13} />
            Export JSON
          </Button>
          <label className="inline-flex h-[34px] cursor-pointer items-center gap-[7px] rounded-control px-3.5 font-display text-[13px] font-bold text-body hairline-2 transition-colors hover:bg-surface-2">
            <UploadIcon size={13} />
            Restore backup
            <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
          </label>
        </div>
        {importStatus ? <p className="m-0 text-[12px] text-muted">{importStatus}</p> : null}
        <p className="m-0 text-[11px] text-faint [text-wrap:pretty]">
          Restoring replaces your cloud library. Games on unsupported platforms are skipped.
        </p>
      </Panel>
    </section>
  );
};

/* -------------------------------------------------------------------------- */

const HighlightOption: React.FC<{
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  preview: React.ReactNode;
}> = ({ selected, onClick, title, description, preview }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    style={{
      background: selected ? 'var(--tt-accent-soft, #12313c)' : 'var(--tt-surface-2, #221e1a)',
      boxShadow: `inset 0 0 0 1px ${selected ? 'var(--tt-accent, #45c8ea)' : 'var(--tt-line, #35302a)'}`,
    }}
    className="flex cursor-pointer items-center gap-3 rounded-inset border-0 p-3 text-left"
  >
    {preview}
    <span className="min-w-0">
      <span className="block font-display text-[14px] font-bold text-ink">{title}</span>
      <span className="block text-[11px] text-subtle">{description}</span>
    </span>
  </button>
);

const SwatchPill: React.FC<{
  name: string;
  selected: boolean;
  ringColor: string;
  onClick: () => void;
  swatch: React.ReactNode;
}> = ({ name, selected, ringColor, onClick, swatch }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={name}
    aria-pressed={selected}
    style={{
      boxShadow: selected
        ? `inset 0 0 0 2px ${ringColor}`
        : 'inset 0 0 0 1px var(--tt-line, #35302a)',
      color: selected ? '#f7f3ec' : '#b8ae9f',
    }}
    className="flex h-11 cursor-pointer items-center gap-2.5 rounded-full border-0 bg-surface-2 py-0 pl-2 pr-3.5"
  >
    {swatch}
    <span className="font-display text-[12px] font-bold">{name}</span>
  </button>
);

const MoveButtons: React.FC<{
  onUp: () => void;
  onDown: () => void;
  disableUp: boolean;
  disableDown: boolean;
}> = ({ onUp, onDown, disableUp, disableDown }) => (
  <span className="flex shrink-0 gap-1">
    <Button variant="outline" size="s" iconOnly aria-label="Move up" disabled={disableUp} onClick={onUp}>
      <ChevronUpIcon size={14} />
    </Button>
    <Button
      variant="outline"
      size="s"
      iconOnly
      aria-label="Move down"
      disabled={disableDown}
      onClick={onDown}
    >
      <ChevronDownIcon size={14} />
    </Button>
  </span>
);
