import React, { useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import {
  Settings,
  Database,
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
  ChevronDown,
  ChevronUp,
  Home,
  RotateCcw,
  LogOut,
  GripVertical,
  Loader2,
  UserX,
  Palette,
  X,
  CloudOff,
  Cloud,
  Volume2,
  Volume1,
  VolumeX,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useSync } from '../context/SyncContext';
import { useAuth } from '../context/AuthContext';
import { clearUserCache } from '../lib/localCache';
import { SidebarConfig, HighlightStyle, Platform } from '../types';
import { SUPABASE_SCHEMA_SQL } from '../lib/db';
import { GameCatalogCard } from '../components/GameCatalogCard';
import {
  DEFAULT_PLATFORM_SORT_ORDER,
  DEFAULT_START_PATH,
  PLATFORMS,
  describePlatformOrder,
  normalizePlatform,
} from '../lib/constants';
import { DELETE_ACCOUNT_MESSAGES, deleteAccount } from '../lib/deleteAccount';
import {
  PSN_TROPHY_SCOPE_LABELS,
  PsnTrophyScope,
  usePsnTrophyScope,
} from '../lib/psnTrophyScope';
import { migrateLegacySnapshot } from '../lib/migrateLegacyGames';
import { fileToAvatarDataUrl } from '../lib/image';
import {
  VOLUME_PREF_KEY,
  getSoundVolume,
  onSoundVolumeChange,
  playAwardSound,
  setSoundVolume,
} from '../lib/sound';
import { PLATFORM_IDS } from '../types';
import { PlatformIcon } from '../components/PlatformIcon';
import { ConnectedAccounts } from '../components/ConnectedAccounts';
import { TrophyBadge, TrophyPair, awardNoun } from '../components/TrophyBadge';
import { Button, Card, Field, SectionHeader, Select, Switch, TextInput } from '../components/ui';
import { cn } from '../lib/cn';

/**
 * A titled run of related cards.
 *
 * The page was one flat column of eleven cards, so finding the one you wanted
 * meant reading all of them. These are the same cards — only the heading above
 * each run is new.
 */
const SettingsGroup: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section className="space-y-3">
    <h2 className="eyebrow px-0.5 text-gray-600">{title}</h2>
    <div className="space-y-6">{children}</div>
  </section>
);

type NavItem = (typeof ALL_NAV_ITEMS)[number];

/**
 * One draggable row of the sidebar order.
 *
 * Its own component because `useDragControls` is a hook and these are a list —
 * and because the row needs controls of its own so that only the handle starts
 * a drag. A row that drags from anywhere would make the rename field and the
 * visibility switch inside it a fight to use.
 */
const NavReorderRow: React.FC<{
  item: NavItem;
  name: string;
  visible: boolean;
  onRename: (value: string) => void;
  /** Absent for a destination that is always shown. */
  onToggle?: () => void;
  onMove: (direction: -1 | 1) => void;
}> = ({ item, name, visible, onRename, onToggle, onMove }) => {
  const controls = useDragControls();
  const Icon = item.icon;

  return (
    <Reorder.Item
      value={item.path}
      dragListener={false}
      dragControls={controls}
      className="panel-inset flex flex-wrap items-center justify-between gap-3 rounded-md p-3"
    >
      <div className="flex min-w-56 flex-1 items-center gap-3">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              onMove(-1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              onMove(1);
            }
          }}
          aria-label={`Reorder ${item.name}. Drag, or use the arrow keys.`}
          className="shrink-0 cursor-grab touch-none rounded-sm p-1 text-gray-600 hover:text-gray-900 active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>

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
            defaultValue={name}
            onChange={(e) => onRename(e.target.value)}
            aria-label={`Sidebar name for ${item.name}`}
            placeholder={item.name}
            className="h-8 text-75 font-semibold"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onToggle ? (
          <Switch
            checked={visible}
            onChange={onToggle}
            label={`${visible ? 'Hide' : 'Show'} ${item.name} in the sidebar`}
          />
        ) : (
          <span className="w-11 text-center text-50 font-medium text-gray-600">Always</span>
        )}
      </div>
    </Reorder.Item>
  );
};

/** Speaker icon matching the level, the way a system volume control does. */
const VolumeIcon: React.FC<{ volume: number }> = ({ volume }) => {
  if (volume === 0) return <VolumeX size={16} className="shrink-0 text-gray-600" />;
  if (volume < 0.5) return <Volume1 size={16} className="shrink-0 text-trophy-900" />;
  return <Volume2 size={16} className="shrink-0 text-trophy-900" />;
};

const ALL_NAV_ITEMS = [
  {
    id: 'dashboard',
    path: '/',
    name: 'Home',
    icon: Home,
    configKey: null,
    tone: 'bg-accent-700/16 text-accent-900',
  },
  {
    id: 'playing',
    path: '/playing',
    name: 'Currently playing',
    icon: Play,
    configKey: 'showCurrentlyPlaying' as const,
    tone: 'bg-accent-700/16 text-accent-900',
  },
  {
    id: 'achievements',
    path: '/achievements',
    name: 'Achievements & trophies',
    icon: null,
    configKey: 'showAchievements' as const,
    tone: 'bg-trophy-100',
  },
  {
    id: 'search',
    path: '/search',
    name: 'Search & add',
    icon: Search,
    configKey: 'showSearch' as const,
    tone: 'bg-accent-700/16 text-accent-900',
  },
  {
    id: 'backlog',
    path: '/backlog',
    name: 'Backlog',
    icon: Gamepad2,
    configKey: 'showBacklog' as const,
    tone: 'bg-gray-300 text-gray-800',
  },
  {
    id: 'collections',
    path: '/collections',
    name: 'Collections',
    icon: FolderKanban,
    configKey: 'showCollections' as const,
    tone: 'bg-gray-200 text-gray-800',
  },
  {
    id: 'stats',
    path: '/stats',
    name: 'Statistics',
    icon: BarChart3,
    configKey: 'showStats' as const,
    tone: 'bg-positive-700/16 text-positive-900',
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
  const [trophyScope, setTrophyScope] = usePsnTrophyScope();
  const { syncEverything } = useSync();
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  // Mirrors the stored level so the slider and the preview stay in step; the
  // sound module remains the source of truth for playback, and tells this back
  // whenever the level changes.
  const [soundVolume, setSoundVolumeState] = useState(getSoundVolume);
  useEffect(() => onSoundVolumeChange(setSoundVolumeState), []);

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

  /* -- Delete account ----------------------------------------------------- */

  /**
   * Armed only once the account's own address has been typed back.
   *
   * Case and surrounding space are forgiven — the point is that you read which
   * account this is, not that you can type accurately.
   */
  const deleteArmed =
    Boolean(user?.email) &&
    deleteConfirmText.trim().toLowerCase() === user!.email!.trim().toLowerCase();

  const handleDeleteAccount = async () => {
    if (!deleteArmed || deleting) return;
    setDeleting(true);
    setDeleteError(null);

    const failure = await deleteAccount();
    if (failure) {
      setDeleteError(DELETE_ACCOUNT_MESSAGES[failure]);
      setDeleting(false);
      return;
    }

    // The same two steps signing out takes, in the same order: the local copy
    // goes first, so a browser that somehow keeps the session cannot repaint a
    // library whose account no longer exists.
    if (user?.id) clearUserCache(user.id);
    await signOut();
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

  /**
   * Somewhere to open on. A hidden destination is not offered: sending the app
   * to a page that is not in the navigation would leave you somewhere you
   * cannot get back to.
   */
  const startPageOptions = orderedNavItems
    .filter((item) => !item.configKey || (sidebarConfig[item.configKey] as boolean))
    .map((item) => ({
      value: item.path,
      label: navNames[item.path]?.trim() || item.name,
    }));

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
      // 4: games carry their shelf as collection membership and no longer have
      // a `status` field. An import checks this to know whether to translate.
      version: '4.0.0',
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

        // A 3.x backup files every game by a `status` field this app no longer
        // has. Restoring one untranslated would leave the whole library
        // unshelved, so it is moved onto collections on the way in.
        const migrated = migrateLegacySnapshot(
          kept,
          Array.isArray(json.collections) ? json.collections : collections,
        );

        await replaceAll({
          games: migrated.games,
          collections: migrated.collections,
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
    <div className="mx-auto max-w-3xl space-y-8 pb-10">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-200 text-gray-800">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-600 font-bold tracking-tight text-gray-1000">Settings</h1>
          <p className="text-75 text-gray-700">
            Your account, the accounts you have linked, how the app looks and where your
            library is kept.
          </p>
        </div>
      </div>

      <SettingsGroup title="Account">
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

        <div className="flex flex-col gap-4 panel-inset rounded-md p-4 sm:flex-row sm:items-center">
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

        {/* Delete account ---------------------------------------------------- */}
        <Card className="space-y-4 border-negative-700/40">
          <SectionHeader
            icon={<UserX size={18} />}
            title="Delete account"
            description="Removes your sign-in and everything stored against it, permanently"
            iconClassName="bg-negative-700/16 text-negative-900"
          />

          <p className="text-75 text-gray-700">
            Your games, collections, profile and linked accounts go with it. There is no undo and
            no copy kept — export a backup first if you want one.
          </p>

          {deleteError && (
            <p role="alert" className="text-75 font-semibold text-negative-900">
              {deleteError}
            </p>
          )}

          {confirmingDelete ? (
            <div className="space-y-3">
              {/* Typing the address is the point: a Delete button one click from
                  a Cancel button is not a decision, it is a slip waiting to
                  happen. */}
              <Field
                label="Type your email address to confirm"
                description={user?.email ?? 'Signed in'}
              >
                {(props) => (
                  <TextInput
                    {...props}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={user?.email ?? ''}
                    autoComplete="off"
                    spellCheck={false}
                  />
                )}
              </Field>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="negative"
                  disabled={!deleteArmed || deleting}
                  onClick={handleDeleteAccount}
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                  <span>{deleting ? 'Deleting…' : 'Delete my account'}</span>
                </Button>
                <Button
                  buttonStyle="subtle"
                  disabled={deleting}
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteConfirmText('');
                    setDeleteError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="negative"
              buttonStyle="outline"
              onClick={() => setConfirmingDelete(true)}
            >
              <UserX size={14} />
              <span>Delete account</span>
            </Button>
          )}
        </Card>
      </SettingsGroup>

      <SettingsGroup title="Connected accounts">
      {/* Connected accounts -------------------------------------------------- */}
      <ConnectedAccounts />

      {/* PlayStation trophy scope ------------------------------------------- */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<TrophyBadge platform="ps5" size={18} />}
          title="PlayStation trophy counts"
          description="Which trophy groups a PS5 game is measured against"
          iconClassName="bg-playstation-700/15"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(Object.keys(PSN_TROPHY_SCOPE_LABELS) as PsnTrophyScope[]).map((option) => {
            const selected = trophyScope === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  if (option === trophyScope) return;
                  setTrophyScope(option);
                  // Straight away, rather than waiting for the next timed
                  // pass: a setting that appears to do nothing for ten minutes
                  // reads as a setting that does not work.
                  void syncEverything();
                }}
                aria-pressed={selected}
                className={cn(
                  'rounded-md border p-3 text-left transition-colors',
                  selected
                    ? 'border-accent-700/60 bg-accent-700/16'
                    : 'border-gray-300 bg-black/25 hover:border-gray-400 hover:bg-black/40',
                )}
              >
                <span className="block text-100 font-semibold text-gray-1000">
                  {PSN_TROPHY_SCOPE_LABELS[option]}
                </span>
              </button>
            );
          })}
        </div>

      </Card>
      </SettingsGroup>

      <SettingsGroup title="Customization">
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
              className="flex items-center gap-3 panel-inset rounded-md p-2.5"
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

      {/* Start page ---------------------------------------------------------- */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Home size={18} />}
          title="Start page"
          description="Where the app opens when you arrive"
        />

        <Field
          label="Open on"
          description="Only destinations you have kept visible are offered here."
        >
          {(props) => (
            <Select
              {...props}
              value={sidebarConfig.startPath ?? DEFAULT_START_PATH}
              onChange={(startPath) => updateSidebarConfig({ startPath })}
              options={startPageOptions}
            />
          )}
        </Field>
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
        {/* Dragged rather than nudged one row at a time. The handle also takes
            arrow keys, because a drag is not operable by keyboard at all and
            "reorder your navigation" should not be a mouse-only feature. */}
        {/* Dragged rather than nudged one row at a time. The handle also takes
            arrow keys, because a drag is not operable by keyboard at all and
            "reorder your navigation" should not become a mouse-only feature. */}
        <Reorder.Group
          axis="y"
          values={orderedNavItems.map((item) => item.path)}
          onReorder={(navOrder: string[]) => updateSidebarConfig({ navOrder })}
          className="space-y-2"
        >
          {orderedNavItems.map((item, index) => (
            <NavReorderRow
              key={item.path}
              item={item}
              name={navNames[item.path] ?? item.name}
              visible={item.configKey ? (sidebarConfig[item.configKey] as boolean) : true}
              onRename={(value) => renameNav(item.path, value)}
              onToggle={
                item.configKey
                  ? () =>
                      updateSidebarConfig({
                        [item.configKey as keyof SidebarConfig]: !(sidebarConfig[
                          item.configKey as keyof SidebarConfig
                        ] as boolean),
                      })
                  : undefined
              }
              onMove={(direction) => moveNav(index, direction)}
            />
          ))}
        </Reorder.Group>
      </Card>
      </SettingsGroup>

      <SettingsGroup title="Appearance">
      {/* Card highlight ------------------------------------------------------ */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Palette size={18} />}
          title="Card highlight"
          description="How a game card signals that it is in progress or fully completed"
          iconClassName="bg-accent-700/16 text-accent-900"
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
                    ? 'border-accent-700/60 bg-accent-700/16'
                    : 'border-gray-300 bg-black/25 hover:border-gray-400 hover:bg-black/40',
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

      {/* Completion sounds --------------------------------------------------- */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Volume2 size={18} />}
          title="Completion sounds"
          description="Played with the celebration when a game reaches 100%"
          iconClassName="bg-trophy-700/16 text-trophy-900"
        />

        <Field
          label="Volume"
          description={
            soundVolume === 0
              ? 'Silent — no sound plays on completion.'
              : 'Stored on this device, so your phone and desktop can differ.'
          }
        >
          {(props) => (
            <div className="flex items-center gap-3">
              <VolumeIcon volume={soundVolume} />
              <input
                {...props}
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(soundVolume * 100)}
                onChange={(e) => {
                  const next = Number(e.target.value) / 100;
                  setSoundVolumeState(next);
                  setSoundVolume(next);
                  // Also kept on the profile, so the level survives a browser
                  // that clears site data — and so a new device starts where
                  // this one left off rather than back at the default.
                  updateSidebarConfig({
                    prefs: { ...(sidebarConfig.prefs ?? {}), [VOLUME_PREF_KEY]: next },
                  });
                }}
                aria-label="Completion sound volume"
                className="h-1.5 min-w-32 flex-1 cursor-pointer appearance-none rounded-full"
                style={{
                  accentColor: 'var(--color-trophy-700)',
                  background: `linear-gradient(90deg, var(--color-trophy-700) ${soundVolume * 100}%, var(--color-gray-300) ${soundVolume * 100}%)`,
                }}
              />
              <span className="w-10 shrink-0 text-right text-75 font-bold tabular-nums text-gray-900">
                {Math.round(soundVolume * 100)}
              </span>
            </div>
          )}
        </Field>

        {/* One preview per platform, since each has its own sound and the point
            of a preview is to hear the one you are setting the level for. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PLATFORM_IDS.map((platform) => (
            <div key={platform} className="panel-inset flex items-center gap-3 rounded-md p-3">
              <TrophyBadge platform={platform} size={26} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-100 font-semibold text-gray-1000">
                  {PLATFORMS[platform].name}
                </div>
                <div className="truncate text-50 text-gray-600">
                  {awardNoun(platform) === 'Trophies' ? 'Platinum trophy' : 'Perfect game'}
                </div>
              </div>
              <Button
                variant="secondary"
                buttonStyle="outline"
                size="s"
                onClick={() => playAwardSound(platform)}
                disabled={soundVolume === 0}
                title={
                  soundVolume === 0
                    ? 'Raise the volume to hear the preview'
                    : `Play the ${PLATFORMS[platform].name} sound`
                }
              >
                <Play size={13} />
                Preview
              </Button>
            </div>
          ))}
        </div>
      </Card>
      </SettingsGroup>

      <SettingsGroup title="Data">
      {/* Cloud --------------------------------------------------------------- */}
      <Card className="space-y-4">
        <SectionHeader
          icon={<Database size={18} />}
          title="Cloud storage"
          description="Your library lives in Supabase and is scoped to your account"
          iconClassName="bg-positive-700/16 text-positive-900"
          action={
            <span
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-75 font-semibold',
                !isOnline
                  ? 'border-notice-700/60 bg-notice-700/16 text-notice-900'
                  : pendingWrites > 0
                    ? 'border-accent-700/45 bg-accent-700/16 text-accent-900'
                    : 'border-positive-700/60 bg-positive-700/16 text-positive-900',
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

      {/* Catalog ------------------------------------------------------------- */}
      <GameCatalogCard />

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
      </SettingsGroup>
    </div>
  );
};
