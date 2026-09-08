import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2, DatabaseZap } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { isSupabaseConfigured } from './lib/supabase';
import { APP_NAME } from './lib/constants';
import { AppLayout } from './components/AppLayout';
import { AuthView } from './pages/AuthView';
import { DashboardView } from './pages/DashboardView';
import { CurrentlyPlayingView } from './pages/CurrentlyPlayingView';
import { AchievementsView } from './pages/AchievementsView';
import { SearchView } from './pages/SearchView';
import { BacklogView } from './pages/BacklogView';
import { CollectionsView } from './pages/CollectionsView';
import { StatsView } from './pages/StatsView';
import { SettingsView } from './pages/SettingsView';

/** Shown instead of a broken app when Supabase credentials are absent. */
function SetupNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md space-y-4 rounded-lg border border-gray-200 bg-gray-100 p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-notice-100 text-notice-900">
          <DatabaseZap size={22} />
        </div>
        <h1 className="text-400 font-bold text-gray-1000">{APP_NAME} needs Supabase</h1>
        <p className="text-100 text-gray-700">
          Sign-in and your library both live in Supabase. Create a project, run the schema from the
          repository README, then add these to a <code className="text-gray-900">.env.local</code>{' '}
          file and restart the dev server:
        </p>
        <pre className="overflow-x-auto rounded-md border border-gray-200 bg-gray-25 p-3 text-75 text-gray-800">
          {'VITE_SUPABASE_URL="https://<project>.supabase.co"\nVITE_SUPABASE_ANON_KEY="<anon key>"'}
        </pre>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50">
      <Loader2 size={28} className="animate-spin text-gray-600" aria-label="Loading" />
    </div>
  );
}

function AuthenticatedApp() {
  const { session, loading } = useAuth();

  if (loading) return <Splash />;
  if (!session) return <AuthView />;

  return (
    <GameProvider>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
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
