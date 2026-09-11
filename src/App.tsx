import { Routes, Route, Navigate } from 'react-router-dom';
import { CloudOffIcon, RefreshIcon } from './components/icons';
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
    <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <div className="flex max-w-md flex-col gap-4 rounded-panel bg-surface p-7 hairline">
        <span className="flex h-12 w-12 items-center justify-center rounded-inset bg-queued-wash text-queued">
          <CloudOffIcon size={22} />
        </span>
        <h1 className="m-0 font-display text-[22px] font-bold text-ink">
          {APP_NAME} needs Supabase
        </h1>
        <p className="m-0 text-[14px] text-muted [text-wrap:pretty]">
          Sign-in and your library both live in Supabase. Create a project, run the schema from the
          repository README, then add these to a <code className="text-ink">.env.local</code> file
          and restart the dev server:
        </p>
        <pre className="m-0 overflow-x-auto rounded-inset bg-bg-2 p-3 font-mono text-[12px] leading-relaxed text-body hairline">
          {'VITE_SUPABASE_URL="https://<project>.supabase.co"\nVITE_SUPABASE_ANON_KEY="<anon key>"'}
        </pre>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <RefreshIcon size={28} className="animate-spin text-subtle" />
      <span className="sr-only">Loading</span>
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
