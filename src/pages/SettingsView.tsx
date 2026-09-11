import React, { useState } from 'react';
import {
  Settings,
  Database,
  Key,
  Download,
  Upload,
  Check,
  RefreshCw,
  User,
  Sliders,
  Play,
  Gamepad2,
  FolderKanban,
  BarChart3,
  Search,
  Copy,
  Code,
  Trash2,
  ChevronDown,
  ChevronUp,
  Library,
  RotateCcw,
  LogOut,
  Tags,
  Palette,
  X,
  CloudOff,
  Cloud,
  Star,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { clearUserCache } from '../lib/localCache';
import {
  SidebarConfig,
  GameStatus,
  HighlightStyle,
  Platform,
  RatingMode,
  GAME_STATUSES,
} from '../types';
import { MAX_RATING } from '../lib/rating';
import { SUPABASE_SCHEMA_SQL } from '../lib/db';
import { getRawgCacheCount, clearRawgCache } from '../lib/rawg';
import {
  DEFAULT_STATUS_NAMES,
  DEFAULT_PLATFORM_SORT_ORDER,
  PLATFORMS,
  describePlatformOrder,
  normalizePlatform,
} from '../lib/constants';
import { validateStatusName, MAX_STATUS_NAME_LENGTH } from '../lib/status';
import { fileToAvatarDataUrl } from '../lib/image';
import { PlatformIcon } from '../components/PlatformIcon';
import { TrophyPair } from '../components/TrophyBadge';
import { Button, Card, Field, SectionHeader, Switch, TextInput } from '../components/ui';
import { cn } from '../lib/cn';

const ALL_NAV_ITEMS = [
  {
    id: 'dashboard',
    path: '/',
    name: 'Library',
    description: 'Overview and filters',
    icon: Library,
    configKey: null,
    tone: 'bg-accent-100 text-accent-900',
  },
  {
    id: 'playing',
    path: '/playing',
    name: 'Currently playing',
    description: 'Active titles in progress',
    icon: Play,
    configKey: 'showCurrentlyPlaying' as const,
    tone: 'bg-accent-100 text-accent-900',
  },
  {
    id: 'achievements',
    path: '/achievements',
    name: 'Achievements & trophies',
    description: 'Perfect games and platinums',
    icon: null,
    configKey: 'showAchievements' as const,
    tone: 'bg-trophy-100',
  },
  {
    id: 'search',
    path: '/search',
    name: 'Search & add',
    description: 'Catalog search',
    icon: Search,
    configKey: 'showSearch' as const,
    tone: 'bg-accent-100 text-accent-900',
  },
  {
    id: 'backlog',
    path: '/backlog',
    name: 'Backlog',
    description: 'Queue of unplayed games',
    icon: Gamepad2,
    configKey: 'showBacklog' as const,
    tone: 'bg-gray-300 text-gray-800',
  },
  {
    id: 'collections',
    path: '/collections',
    name: 'Collections',
    description: 'Custom lists',
    icon: FolderKanban,
    configKey: 'showCollections' as const,
    tone: 'bg-gray-200 text-gray-800',
  },
  {
    id: 'stats',
    path: '/stats',
    name: 'Statistics',
    description: 'Playtime and completion metrics',
    icon: BarChart3,
    configKey: 'showStats' as const,
    tone: 'bg-positive-100 text-positive-900',
  },
];

const DEFAULT_NAV_ORDER = [
  '/',
  '/playing',
  '/achievements',
  '/search',
  '/backlog',
  '/collections',
  '/stats',
];

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
    loading,
    isOnline,
    pendingWrites,
    lastSyncedAt,
  } = useGame();
  const { user, signOut } = useAuth();

  const [usernameInput, setUsernameInput] = useState(profile.username || '');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [cacheCount, setCacheCount] = useState(() => getRawgCacheCount());
  const [statusErrors, setStatusErrors] = useState<Partial<Record<GameStatus, string>>>({});

  const platformOrder = profile.platformOrder?.length
    ? profile.platformOrder
    : DEFAULT_PLATFORM_SORT_ORDER;

  /* -- Account ----------------------------------------------------------- */

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ username: usernameInput.trim() || 'Player' });
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
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

  /* -- Status names ------------------------------------------------------- */

  const handleStatusNameChange = (status: GameStatus, value: string) => {
    const error = validateStatusName(value);
    setStatusErrors((prev) => ({ ...prev, [status]: error ?? undefined }));
    if (error) return;

    updateProfile({
      statusNames: { ...(profile.statusNames || {}), [status]: value.trim() },
    });
  };

  const resetStatusName = (status: GameStatus) => {
    const next = { ...(profile.statusNames || {}) };
    delete next[status];
    setStatusErrors((prev) => ({ ...prev, [status]: undefined }));
    updateProfile({ statusNames: next });
  };

  /* -- Platform order ----------------------------------------------------- */

  const movePlatform = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= platformOrder.length) return;

    const next: Platform[] = [...platformOrder];
    [next[index], next[target]] = [next[target], next[index]];
    updateProfile({ platformOrder: next });
  };

  /* -- Sidebar ordering --------------------------------------------------- */

  const currentNavOrder = sidebarConfig.navOrder?.length ? sidebarConfig.navOrder : DEFAULT_NAV_ORDER;

  const orderedNavItems = [...ALL_NAV_ITEMS].sort((a, b) => {
    const idxA = currentNavOrder.indexOf(a.path);
    const idxB = currentNavOrder.indexOf(b.path);
    return (
      (idxA === -1 ? currentNavOrder.length : idxA) - (idxB === -1 ? currentNavOrder.length : idxB)
    );
  });

  const navNames = sidebarConfig.navNames || {};

  const renameNav = (path: string, value: string) => {
    const next = { ...navNames };
    if (value.trim()) next[path] = value.trim();
    else delete next[path];
    updateSidebarConfig({ navNames: next });
  };

  const moveNav = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= orderedNavItems.length) return;

    const next = orderedNavItems.map((item) => item.path);
    [next[index], next[target]] = [next[target], next[index]];
    updateSidebarConfig({ navOrder: next });
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-200 text-gray-800">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-600 font-bold tracking-tight text-gray-1000">Settings</h1>
          <p className="text-75 text-gray-700">
            Account, naming, ordering, navigation and data.
          </p>
        </div>
      </div>

      {/* Account ------------------------------------------------------------ */}
      <Card className="space-y-5">
        <SectionHeader
          icon={<User size={18} />}
          title="Account"
          description={user?.email ?? 'Signed in'}
          action={
            <Button variant="secondary" buttonStyle="outline" size="s" onClick={handleSignOut}>
              <LogOut size={13} />
              Sign out
            </Button>
          }
        />

        <div className="flex flex-col gap-4 rounded-md border border-gray-200 bg-gray-75 p-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 ring-1 ring-gray-300">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-500 font-bold text-gray-700">
                {(profile.username || 'P').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-sm bg-accent-700 px-4 text-100 font-semibold text-gray-1000 transition-colors hover:bg-accent-800">
                <Upload size={13} />
                <span>Upload image</span>
                <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
              </label>
              {profile.avatarUrl && (
                <Button
                  buttonStyle="subtle"
                  size="s"
                  variant="negative"
                  onClick={() => updateProfile({ avatarUrl: undefined })}
                >
                  <X size={12} />
                  Remove
                </Button>
              )}
            </div>
            <p className={cn('text-50', avatarError ? 'text-negative-900' : 'text-gray-600')}>
              {avatarError ?? 'Resized to 256px and stored with your profile.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveAccount} className="flex flex-wrap items-end gap-3">
          <Field label="Display name" className="min-w-56 flex-1">
            {(props) => (
              <TextInput
                {...props}
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Player"
              />
            )}
          </Field>
          <Button type="submit" variant="accent">
            {savedProfile ? <Check size={14} /> : null}
            {savedProfile ? 'Saved' : 'Save name'}
          </Button>
        </form>
      </Card>

      {/* Status names -------------------------------------------------------- */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Tags size={18} />}
          title="Status names"
          description="Rename any status — the new name appears everywhere at once"
          iconClassName="bg-trophy-100 text-trophy-900"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GAME_STATUSES.map((status) => {
            const custom = profile.statusNames?.[status];
            return (
              <Field
                key={status}
                label={DEFAULT_STATUS_NAMES[status]}
                error={statusErrors[status]}
                description={
                  statusErrors[status] ? undefined : `Up to ${MAX_STATUS_NAME_LENGTH} characters`
                }
                action={
                  custom ? (
                    <button
                      type="button"
                      onClick={() => resetStatusName(status)}
                      className="rounded-sm text-50 text-gray-600 hover:text-gray-900"
                    >
                      Reset
                    </button>
                  ) : null
                }
              >
                {(props) => (
                  <TextInput
                    {...props}
                    defaultValue={custom ?? DEFAULT_STATUS_NAMES[status]}
                    maxLength={MAX_STATUS_NAME_LENGTH + 8}
                    onChange={(e) => handleStatusNameChange(status, e.target.value)}
                    placeholder={DEFAULT_STATUS_NAMES[status]}
                  />
                )}
              </Field>
            );
          })}
        </div>
      </Card>

      {/* Card highlight ------------------------------------------------------ */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Palette size={18} />}
          title="Card highlight"
          description="How a game card signals that it is in progress or fully completed"
          iconClassName="bg-accent-100 text-accent-900"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              {
                id: 'stroke',
                name: 'Stroke',
                hint: 'A coloured outline around the card',
                swatch: 'border-2 border-trophy-700 bg-gray-100',
              },
              {
                id: 'fill',
                name: 'Filled',
                hint: 'The whole card tinted in the status colour',
                swatch: 'border border-trophy-700/40 bg-trophy-100',
              },
            ] as { id: HighlightStyle; name: string; hint: string; swatch: string }[]
          ).map((option) => {
            const selected = (profile.highlightStyle ?? 'stroke') === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => updateProfile({ highlightStyle: option.id })}
                aria-pressed={selected}
                className={cn(
                  'flex items-center gap-3 rounded-md border p-3 text-left transition-colors',
                  selected
                    ? 'border-accent-700 bg-accent-100'
                    : 'border-gray-300 bg-gray-75 hover:border-gray-400',
                )}
              >
                <span className={cn('h-10 w-14 shrink-0 rounded-sm', option.swatch)} />
                <span className="min-w-0">
                  <span className="block text-100 font-semibold text-gray-1000">{option.name}</span>
                  <span className="block text-50 text-gray-700">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Rating mode --------------------------------------------------------- */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Star size={18} />}
          title="How you rate games"
          description="Score a game directly, or answer a few questions and let the score follow"
          iconClassName="bg-trophy-100 text-trophy-900"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              {
                id: 'manual',
                name: 'Set the score myself',
                hint: `A slider from 0 to ${MAX_RATING}, in half points`,
              },
              {
                id: 'guided',
                name: 'Answer questions',
                hint: 'A few multiple-choice questions work the score out for you',
              },
            ] as { id: RatingMode; name: string; hint: string }[]
          ).map((option) => {
            const selected = (profile.ratingMode ?? 'manual') === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => updateProfile({ ratingMode: option.id })}
                aria-pressed={selected}
                className={cn(
                  'rounded-md border p-3 text-left transition-colors',
                  selected
                    ? 'border-accent-700 bg-accent-100'
                    : 'border-gray-300 bg-gray-75 hover:border-gray-400',
                )}
              >
                <span className="block text-100 font-semibold text-gray-1000">{option.name}</span>
                <span className="block text-50 text-gray-700">{option.hint}</span>
              </button>
            );
          })}
        </div>

        <p className="text-50 text-gray-600">
          A worked-out score always lands on the ordinary slider afterwards, so you can move it if
          you disagree. This applies to both the game and the {`achievement`} score.
        </p>
      </Card>

      {/* Platform order ------------------------------------------------------ */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Sliders size={18} />}
          title="Platform order"
          description={`Used by the "Platform" sort in every library view — currently ${describePlatformOrder(platformOrder)}`}
          iconClassName="bg-gray-200 text-gray-800"
          action={
            platformOrder.join() !== DEFAULT_PLATFORM_SORT_ORDER.join() ? (
              <Button
                variant="secondary"
                buttonStyle="outline"
                size="s"
                onClick={() => updateProfile({ platformOrder: DEFAULT_PLATFORM_SORT_ORDER })}
              >
                <RotateCcw size={13} />
                Reset
              </Button>
            ) : null
          }
        />

        <div className="space-y-2">
          {platformOrder.map((platform, index) => (
            <div
              key={platform}
              className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-75 p-2.5"
            >
              <span className="w-6 text-center text-75 font-bold text-gray-600">#{index + 1}</span>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-sm"
                style={{ color: PLATFORMS[platform]?.color }}
              >
                <PlatformIcon platform={platform} size={18} />
              </div>
              <span className="flex-1 text-100 text-gray-900">{PLATFORMS[platform]?.name}</span>
              <div className="flex gap-1">
                <Button
                  size="s"
                  iconOnly
                  variant="secondary"
                  buttonStyle="outline"
                  disabled={index === 0}
                  onClick={() => movePlatform(index, -1)}
                  aria-label={`Move ${PLATFORMS[platform]?.name} up`}
                >
                  <ChevronUp size={14} />
                </Button>
                <Button
                  size="s"
                  iconOnly
                  variant="secondary"
                  buttonStyle="outline"
                  disabled={index === platformOrder.length - 1}
                  onClick={() => movePlatform(index, 1)}
                  aria-label={`Move ${PLATFORMS[platform]?.name} down`}
                >
                  <ChevronDown size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Navigation ---------------------------------------------------------- */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Sliders size={18} />}
          title="Sidebar navigation"
          description="Reorder destinations or hide the ones you don't use"
          action={
            <Button
              variant="secondary"
              buttonStyle="outline"
              size="s"
              onClick={() => updateSidebarConfig({ navOrder: DEFAULT_NAV_ORDER })}
            >
              <RotateCcw size={13} />
              Reset order
            </Button>
          }
        />

        <div className="space-y-2">
          {orderedNavItems.map((item, index) => {
            const Icon = item.icon;
            const visible = item.configKey
              ? (sidebarConfig[item.configKey] as boolean)
              : true;

            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-75 p-3"
              >
                <div className="flex min-w-56 flex-1 items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-75 font-bold text-gray-600">
                    #{index + 1}
                  </span>
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm',
                      item.tone,
                    )}
                  >
                    {Icon ? <Icon size={16} /> : <TrophyPair size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <TextInput
                      defaultValue={navNames[item.path] ?? item.name}
                      onChange={(e) => renameNav(item.path, e.target.value)}
                      aria-label={`Sidebar name for ${item.name}`}
                      placeholder={item.name}
                      className="h-8 text-75 font-semibold"
                    />
                    <div className="mt-1 truncate text-50 text-gray-700">{item.description}</div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="s"
                    iconOnly
                    variant="secondary"
                    buttonStyle="outline"
                    disabled={index === 0}
                    onClick={() => moveNav(index, -1)}
                    aria-label={`Move ${item.name} up`}
                  >
                    <ChevronUp size={14} />
                  </Button>
                  <Button
                    size="s"
                    iconOnly
                    variant="secondary"
                    buttonStyle="outline"
                    disabled={index === orderedNavItems.length - 1}
                    onClick={() => moveNav(index, 1)}
                    aria-label={`Move ${item.name} down`}
                  >
                    <ChevronDown size={14} />
                  </Button>

                  {item.configKey ? (
                    <Switch
                      checked={visible}
                      onChange={() =>
                        updateSidebarConfig({
                          [item.configKey as keyof SidebarConfig]: !visible,
                        })
                      }
                      label={`${visible ? 'Hide' : 'Show'} ${item.name} in the sidebar`}
                    />
                  ) : (
                    <span className="w-11 text-center text-50 font-medium text-gray-600">
                      Always
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Cloud --------------------------------------------------------------- */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Database size={18} />}
          title="Cloud storage"
          description="Your library lives in Supabase and is scoped to your account"
          iconClassName="bg-positive-100 text-positive-900"
          action={
            <span
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-75 font-semibold',
                !isOnline
                  ? 'border-notice-700 bg-notice-100 text-notice-900'
                  : pendingWrites > 0
                    ? 'border-accent-400 bg-accent-100 text-accent-900'
                    : 'border-positive-700 bg-positive-100 text-positive-900',
              )}
            >
              {isOnline ? <Cloud size={13} /> : <CloudOff size={13} />}
              {!isOnline ? 'Offline' : pendingWrites > 0 ? `${pendingWrites} pending` : 'Synced'}
            </span>
          }
        />

        <p className="text-75 text-gray-700">
          Changes save to Supabase as you make them. When you are offline they queue locally and
          are sent as soon as the connection returns.
          {lastSyncedAt
            ? ` Last write: ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
            : ''}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Reload from cloud</span>
          </Button>

          <Button
            variant="secondary"
            buttonStyle="outline"
            onClick={() => {
              navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 2000);
            }}
          >
            {copiedSql ? <Check size={14} className="text-positive-900" /> : <Copy size={14} />}
            <span>{copiedSql ? 'Schema copied' : 'Copy schema SQL'}</span>
          </Button>

          <Button buttonStyle="subtle" onClick={() => setShowSqlSchema(!showSqlSchema)}>
            <Code size={14} />
            <span>{showSqlSchema ? 'Hide SQL' : 'View SQL'}</span>
            {showSqlSchema ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </div>

        {showSqlSchema && (
          <pre className="max-h-72 overflow-auto rounded-md border border-gray-200 bg-gray-25 p-4 text-75 leading-relaxed text-gray-800">
            {SUPABASE_SCHEMA_SQL}
          </pre>
        )}
      </Card>

      {/* RAWG ---------------------------------------------------------------- */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Key size={18} />}
          title="Catalog cache"
          description="RAWG search results are cached locally for 24 hours"
          action={
            <span className="rounded-full border border-gray-300 bg-gray-200 px-3 py-1 text-75 font-semibold text-gray-800">
              {cacheCount} cached
            </span>
          }
        />

        <p className="text-75 text-gray-700">
          Set <code className="rounded-sm bg-gray-200 px-1.5 py-0.5 text-accent-900">VITE_RAWG_API_KEY</code>{' '}
          to search the catalog. Without a key, catalog search returns nothing and games have to be
          entered by hand.{' '}
          <a
            href="https://rawg.io/apidocs"
            target="_blank"
            rel="noreferrer"
            className="rounded-sm font-semibold text-accent-900 underline"
          >
            Get a free key
          </a>
          .
        </p>

        <Button
          variant="secondary"
          buttonStyle="outline"
          onClick={() => {
            clearRawgCache();
            setCacheCount(0);
          }}
        >
          <Trash2 size={13} />
          <span>Clear search cache</span>
        </Button>
      </Card>

      {/* Backup -------------------------------------------------------------- */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Download size={18} />}
          title="Backup & restore"
          description="Export a portable JSON copy, or restore one into your account"
          iconClassName="bg-gray-200 text-gray-800"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={14} />
            <span>Export JSON</span>
          </Button>

          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-sm bg-gray-200 px-4 text-100 font-semibold text-gray-900 transition-colors hover:bg-gray-300">
            <Upload size={14} />
            <span>Restore backup</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>

        <p className="text-50 text-gray-600">
          Restoring replaces your library in the cloud. Games on platforms this app no longer
          supports are skipped.
        </p>

        {importStatus && <p className="text-75 font-semibold text-positive-900">{importStatus}</p>}
      </Card>
    </div>
  );
};
