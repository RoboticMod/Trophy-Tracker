/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { AppLayout } from './components/AppLayout';
import { DashboardView } from './pages/DashboardView';
import { CurrentlyPlayingView } from './pages/CurrentlyPlayingView';
import { AchievementsView } from './pages/AchievementsView';
import { SearchView } from './pages/SearchView';
import { BacklogView } from './pages/BacklogView';
import { CollectionsView } from './pages/CollectionsView';
import { StatsView } from './pages/StatsView';
import { SettingsView } from './pages/SettingsView';

export default function App() {
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
        </Route>
      </Routes>
    </GameProvider>
  );
}

