import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Trophy,
  Gamepad2,
  FolderKanban,
  BarChart3,
  Search,
  CheckCircle2,
  Copy,
  Code,
  Trash2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Library,
  RotateCcw,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { SidebarConfig, GameStatus, Platform } from '../types';
import { SUPABASE_SCHEMA_SQL } from '../lib/syncEngine';
import { getRawgCacheCount, clearRawgCache } from '../lib/rawg';
import { DEFAULT_STATUS_NAMES, DEFAULT_PLATFORM_SORT_ORDER, PLATFORMS } from '../lib/constants';

const ALL_NAV_ITEMS = [
  {
    id: 'dashboard',
    path: '/',
    name: 'Dashboard',
    description: 'Library overview and quick filters',
    icon: Library,
    configKey: null,
    badgeColor: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'playing',
    path: '/playing',
    name: 'Currently Playing',
    description: 'Active titles in progress',
    icon: Play,
    configKey: 'showCurrentlyPlaying' as const,
    badgeColor: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'achievements',
    path: '/achievements',
    name: 'All Achievements & Trophies',
    description: 'Trophy showcase and platinum tracking',
    icon: Trophy,
    configKey: 'showAchievements' as const,
    badgeColor: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'search',
    path: '/search',
    name: 'Search & Add',
    description: 'Catalog search and adding games',
    icon: Search,
    configKey: 'showSearch' as const,
    badgeColor: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    id: 'backlog',
    path: '/backlog',
    name: 'My Backlog',
    description: 'Queue of unplayed games',
    icon: Gamepad2,
    configKey: 'showBacklog' as const,
    badgeColor: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    id: 'collections',
    path: '/collections',
    name: 'Collections',
    description: 'Custom playlists and categories',
    icon: FolderKanban,
    configKey: 'showCollections' as const,
    badgeColor: 'bg-purple-500/20 text-purple-400',
  },
  {
    id: 'stats',
    path: '/stats',
    name: 'Statistics',
    description: 'Playtime, charts, and metrics',
    icon: BarChart3,
    configKey: 'showStats' as const,
    badgeColor: 'bg-rose-500/20 text-rose-400',
  },
];

const DEFAULT_NAV_ORDER = ['/', '/playing', '/achievements', '/search', '/backlog', '/collections', '/stats'];

export const SettingsView: React.FC = () => {
  const {
    supabaseConnected,
    syncWithSupabase,
    isSyncing,
    syncStats,
    lastSyncTime,
    games,
    collections,
    profile,
    updateProfile,
    sidebarConfig,
    updateSidebarConfig,
    triggerCelebration,
  } = useGame();

  const [usernameInput, setUsernameInput] = useState(profile.username || 'ApexGamer');
  const [emailInput, setEmailInput] = useState(profile.email || 'gamer@gametracker.pro');
  const [avatarUrlInput, setAvatarUrlInput] = useState(profile.avatarUrl || '');
  
  const [statusNamesInput, setStatusNamesInput] = useState<Partial<Record<GameStatus, string>>>(
    profile.statusNames || {}
  );
  const [platformOrderInput, setPlatformOrderInput] = useState<Platform[]>(
    profile.platformOrder || DEFAULT_PLATFORM_SORT_ORDER
  );

  const [savedProfileAlert, setSavedProfileAlert] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [cacheCount, setCacheCount] = useState(() => getRawgCacheCount());
  const [clearedCacheAlert, setClearedCacheAlert] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      username: usernameInput,
      email: emailInput,
      avatarUrl: avatarUrlInput,
      statusNames: statusNamesInput,
      platformOrder: platformOrderInput,
    });
    setSavedProfileAlert(true);
    triggerCelebration();
    setTimeout(() => setSavedProfileAlert(false), 2500);
  };

  const handleToggleSidebar = (key: keyof SidebarConfig) => {
    updateSidebarConfig({
      [key]: !sidebarConfig[key],
    });
  };

  const handleExportData = () => {
    const data = {
      profile,
      collections,
      games,
      sidebarConfig,
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gametracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerCelebration();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.games && Array.isArray(json.games)) {
          localStorage.setItem('gametracker_pro_games_v1', JSON.stringify(json.games));
          if (json.collections) localStorage.setItem('gametracker_pro_collections_v1', JSON.stringify(json.collections));
          if (json.profile) localStorage.setItem('gametracker_pro_profile_v2', JSON.stringify(json.profile));
          setImportStatus('Data successfully restored! Refreshing...');
          triggerCelebration();
          setTimeout(() => window.location.reload(), 1200);
        } else {
          setImportStatus('Invalid backup file format.');
        }
      } catch (err) {
        setImportStatus('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Custom avatar file upload handler
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, etc.).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setAvatarUrlInput(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearAvatar = () => {
    setAvatarUrlInput('');
  };

  // Sidebar reordering logic
  const currentNavOrder = sidebarConfig.navOrder && sidebarConfig.navOrder.length > 0
    ? sidebarConfig.navOrder
    : DEFAULT_NAV_ORDER;

  const orderedNavItems = [...ALL_NAV_ITEMS].sort((a, b) => {
    const idxA = currentNavOrder.indexOf(a.path);
    const idxB = currentNavOrder.indexOf(b.path);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const handleMoveNav = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedNavItems.length) return;

    const newOrder = orderedNavItems.map(item => item.path);
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    updateSidebarConfig({
      navOrder: newOrder,
    });
  };

  const handleResetNavOrder = () => {
    updateSidebarConfig({
      navOrder: DEFAULT_NAV_ORDER,
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center">
            <Settings size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Settings & Preferences
            </h1>
            <p className="text-xs text-zinc-400">
              Customize your sidebar navigation order, manage your account, and configure data syncing.
            </p>
          </div>
        </div>
      </div>

      {/* Account Settings Section */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <User size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Account Profile</h2>
              <p className="text-xs text-zinc-400">Personalize your avatar and profile information</p>
            </div>
          </div>

          {savedProfileAlert && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={14} />
              Saved successfully!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Custom Avatar Upload & URL */}
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200">Custom Avatar</label>
              {avatarUrlInput && (
                <button
                  type="button"
                  onClick={handleClearAvatar}
                  className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <X size={12} />
                  <span>Remove Avatar</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Avatar Preview */}
              <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-zinc-700 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                {avatarUrlInput ? (
                  <img
                    src={avatarUrlInput}
                    alt={usernameInput}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarUrlInput('')}
                  />
                ) : (
                  <div className="text-xl font-bold text-zinc-400">
                    {usernameInput ? usernameInput.charAt(0).toUpperCase() : <User size={24} />}
                  </div>
                )}
              </div>

              {/* Upload and URL Controls */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm">
                    <Upload size={13} />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFile}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-zinc-400">Supports PNG, JPG, WebP, GIF</span>
                </div>

                <div className="relative">
                  <input
                    type="url"
                    value={avatarUrlInput}
                    onChange={(e) => setAvatarUrlInput(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    placeholder="Or paste an image URL (https://...)"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Username</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter username"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Email Address</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-blue-500"
                placeholder="gamer@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            Save Account Settings
          </button>
        </form>
      </div>

      {/* Customization & Display Section */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Settings size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Customization</h2>
            <p className="text-xs text-zinc-400">Rename your game statuses and order platforms.</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-zinc-300">Custom Status Names</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.keys(DEFAULT_STATUS_NAMES) as GameStatus[]).map((status) => (
              <div key={status} className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-400 capitalize">{status}</label>
                <input
                  type="text"
                  value={statusNamesInput[status] || DEFAULT_STATUS_NAMES[status]}
                  onChange={(e) => setStatusNamesInput({ ...statusNamesInput, [status]: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  placeholder={DEFAULT_STATUS_NAMES[status]}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-zinc-800/80">
          <h3 className="text-xs font-semibold text-zinc-300">Platform Sort Order</h3>
          <p className="text-[11px] text-zinc-400">Drag or adjust order below to change how platforms are prioritized.</p>
          <div className="flex flex-col gap-2">
            {platformOrderInput.map((platform, index) => (
              <div key={platform} className="flex items-center gap-2 p-2 bg-zinc-800/60 rounded-xl border border-zinc-700/60">
                <span className="text-xs font-bold w-6 text-zinc-500">#{index + 1}</span>
                <div className="flex items-center gap-2 flex-1">
                   <div className={`w-6 h-6 rounded flex flex-shrink-0 items-center justify-center`} style={{ backgroundColor: PLATFORMS[platform]?.bgColor, color: PLATFORMS[platform]?.textColor }}>
                      {PLATFORMS[platform]?.name?.[0]}
                   </div>
                   <span className="text-xs text-zinc-200">{PLATFORMS[platform]?.name}</span>
                </div>
                <div className="flex gap-1">
                   <button 
                     type="button" 
                     disabled={index === 0}
                     onClick={() => {
                        const newOrder = [...platformOrderInput];
                        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                        setPlatformOrderInput(newOrder);
                     }}
                     className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
                   >
                     <ChevronUp size={14} />
                   </button>
                   <button 
                     type="button" 
                     disabled={index === platformOrderInput.length - 1}
                     onClick={() => {
                        const newOrder = [...platformOrderInput];
                        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                        setPlatformOrderInput(newOrder);
                     }}
                     className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
                   >
                     <ChevronDown size={14} />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          className="mt-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-sm"
        >
          Save Customizations
        </button>
      </div>

      {/* Sidebar Customization & Reordering Section */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Sidebar Navigation & Reordering</h2>
              <p className="text-xs text-zinc-400">
                Reorder navigation items or toggle their visibility in your sidebar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetNavOrder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors"
            title="Reset sidebar order to default"
          >
            <RotateCcw size={13} />
            <span>Reset Order</span>
          </button>
        </div>

        {/* Reorderable Items List */}
        <div className="space-y-2 pt-2">
          {orderedNavItems.map((item, index) => {
            const Icon = item.icon;
            const isVisible = item.configKey ? sidebarConfig[item.configKey] : true;
            const isFirst = index === 0;
            const isLast = index === orderedNavItems.length - 1;

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-between gap-3 transition-colors hover:border-zinc-600"
              >
                {/* Left: Position index, Icon, and Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center text-xs font-bold text-zinc-500 flex-shrink-0">
                    #{index + 1}
                  </span>

                  <div className={`w-8 h-8 rounded-lg ${item.badgeColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} />
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate flex items-center gap-2">
                      <span>{item.name}</span>
                      {item.configKey === null && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Home
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">{item.description}</div>
                  </div>
                </div>

                {/* Right: Reorder Buttons and Visibility Toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Move Up */}
                  <button
                    type="button"
                    onClick={() => handleMoveNav(index, 'up')}
                    disabled={isFirst}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isFirst
                        ? 'opacity-30 border-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                    }`}
                    title="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    onClick={() => handleMoveNav(index, 'down')}
                    disabled={isLast}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isLast
                        ? 'opacity-30 border-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                    }`}
                    title="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>

                  {/* Visibility Toggle Switch */}
                  {item.configKey ? (
                    <button
                      type="button"
                      onClick={() => handleToggleSidebar(item.configKey!)}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ml-1 ${
                        isVisible ? 'bg-blue-600' : 'bg-zinc-700'
                      }`}
                      title={isVisible ? 'Hide from sidebar' : 'Show in sidebar'}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          isVisible ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="w-11 text-center text-[10px] text-zinc-500 font-medium ml-1">
                      Always
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supabase & PostgreSQL Cloud Sync Card */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Supabase & PostgreSQL Database Sync</h2>
              <p className="text-xs text-zinc-400">
                Live bidirectional cloud synchronization with conflict resolution
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              supabaseConnected
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {supabaseConnected ? 'Connected to PostgreSQL' : 'Local Storage Mode'}
          </span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Your profile automatically persists game records locally with zero latency.
          To sync between devices via Supabase, set{' '}
          <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-blue-300 font-mono">
            VITE_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-blue-300 font-mono">
            VITE_SUPABASE_ANON_KEY
          </code>{' '}
          in your environment.
        </p>

        {/* Sync Status & Stats Summary */}
        {lastSyncTime && (
          <div className="p-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Clock size={14} className="text-emerald-400" />
              <span>Last synced: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            {syncStats && (
              <span className="text-zinc-400 font-mono text-[11px]">
                {syncStats.message || (syncStats.success ? 'Sync healthy' : syncStats.error)}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={syncWithSupabase}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Synchronizing tables...' : 'Run Cloud Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 2000);
            }}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-zinc-700 flex items-center gap-2 transition-colors"
          >
            {copiedSql ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedSql ? 'SQL Copied!' : 'Copy PostgreSQL Schema SQL'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSqlSchema(!showSqlSchema)}
            className="px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1.5 transition-colors"
          >
            <Code size={14} />
            <span>{showSqlSchema ? 'Hide SQL' : 'View SQL'}</span>
            {showSqlSchema ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Expandable SQL Schema */}
        {showSqlSchema && (
          <div className="mt-3 p-4 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-300 overflow-x-auto max-h-60 leading-relaxed">
            <pre>{SUPABASE_SCHEMA_SQL}</pre>
          </div>
        )}
      </div>

      {/* RAWG Open Database & Query Cache */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Key size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">RAWG Video Games Database & Cache</h2>
              <p className="text-xs text-zinc-400">
                Access 800,000+ games with optimized 24-hour client caching
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {cacheCount} Cached Queries
          </span>
        </div>

        <p className="text-xs text-zinc-400">
          A built-in curated catalog is preloaded. Search queries and metadata are automatically cached for 24 hours to minimize API latency and save rate limits.
          Supply your free key from{' '}
          <a
            href="https://rawg.io/apidocs"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 underline font-semibold"
          >
            rawg.io/apidocs
          </a>{' '}
          in your environment variables.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              clearRawgCache();
              setCacheCount(0);
              setClearedCacheAlert(true);
              setTimeout(() => setClearedCacheAlert(false), 2000);
            }}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 font-semibold text-xs border border-zinc-700 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={13} />
            <span>Purge Local Search Cache</span>
          </button>
          {clearedCacheAlert && (
            <span className="text-xs text-emerald-400 font-medium">Cache cleared!</span>
          )}
        </div>
      </div>

      {/* Backup & Export Data */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
            <Download size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Data Portability & Backup</h2>
            <p className="text-xs text-zinc-400">Export or restore your full game tracker data anytime</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleExportData}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs border border-zinc-700 flex items-center gap-2 transition-colors"
          >
            <Download size={14} />
            <span>Export Backup (JSON)</span>
          </button>

          <label className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs border border-zinc-700 flex items-center gap-2 transition-colors cursor-pointer">
            <Upload size={14} />
            <span>Restore Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>
        </div>

        {importStatus && (
          <p className="text-xs font-semibold text-emerald-400 mt-2">{importStatus}</p>
        )}
      </div>
    </div>
  );
};
