import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2, DatabaseZap } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { SyncProvider } from './context/SyncContext';
import { isSupabaseConfigured } from './lib/supabase';
import { APP_NAME } from './lib/constants';
import { AppLayout } from './components/AppLayout';
import { preloadable } from './lib/preloadable';
// Home is where every session opens, so it ships with the app. Every other
// page is its own chunk — a phone parses one page's code before first paint
// rather than all ten — and they are all fetched once the app is idle, so a
// tab is ready by the time anyone taps it.
import { DashboardView } from './pages/DashboardView';

const pages: (() => Promise<unknown>)[] = [];
const page = <K extends string>(
  load: () => Promise<Record<K, React.ComponentType>>,
  name: K,
  fallback?: React.ReactNode,
) => {
  const entry = preloadable(() => load().then((module) => module[name]), fallback);
  pages.push(entry.preload);
  return entry.Component;
};

/** Every page's chunk, at the first idle moment. */
const prefetchPages = () => {
  const warm = () => pages.forEach((preload) => void preload());
  if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 4000 });
  else setTimeout(warm, 2000);
};

const AuthView = page(() => import('./pages/AuthView'), 'AuthView', <Splash />);
const CurrentlyPlayingView = page(() => import('./pages/CurrentlyPlayingView'), 'CurrentlyPlayingView');
const AchievementsView = page(() => import('./pages/AchievementsView'), 'AchievementsView');
const SearchView = page(() => import('./pages/SearchView'), 'SearchView');
const BacklogView = page(() => import('./pages/BacklogView'), 'BacklogView');
const CollectionsView = page(() => import('./pages/CollectionsView'), 'CollectionsView');
const StatsView = page(() => import('./pages/StatsView'), 'StatsView');
const SettingsView = page(() => import('./pages/SettingsView'), 'SettingsView');
const SetupView = page(() => import('./pages/SetupView'), 'SetupView');

/** Shown instead of a broken app when Supabase credentials are absent. */
function SetupNotice() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gray-50 p-6">
      <div aria-hidden className="app-ambient" />
      <div className="panel relative z-10 max-w-md space-y-4 rounded-lg p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-notice-700/16 text-notice-900">
          <DatabaseZap size={22} />
        </div>
        <h1 className="text-400 font-bold tracking-tight text-gray-1000">
          {APP_NAME} needs Supabase
        </h1>
        <p className="text-100 text-gray-700">
          Sign-in and your library both live in Supabase. Create a project, run the schema from the
          repository README, then add these to a <code className="text-gray-900">.env.local</code>{' '}
          file and restart the dev server:
        </p>
        <pre className="panel-inset overflow-x-auto rounded-md p-3 text-75 text-gray-800">
          {'VITE_SUPABASE_URL="https://<project>.supabase.co"\nVITE_SUPABASE_ANON_KEY="<anon key>"'}
        </pre>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gray-50">
      <div aria-hidden className="app-ambient" />
      <Loader2 size={28} className="relative z-10 animate-spin text-accent-800" aria-label="Loading" />
    </div>
  );
}

function AuthenticatedApp() {
  const { session, loading } = useAuth();

  useEffect(() => prefetchPages(), []);

  if (loading) return <Splash />;
  if (!session) return <AuthView />;

  return (
    <GameProvider>
      <SyncProvider>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="playing" element={<CurrentlyPlayingView />} />
            <Route path="achievements" element={<AchievementsView />} />
            <Route path="search" element={<SearchView />} />
            <Route path="backlog" element={<BacklogView />} />
            <Route path="collections" element={<CollectionsView />} />
            <Route path="stats" element={<StatsView />} />
            <Route path="settings" element={<SettingsView />} />
            <Route path="setup" element={<SetupView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </SyncProvider>
    </GameProvider>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
