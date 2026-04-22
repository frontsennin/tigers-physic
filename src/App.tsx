import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import {
  ManagementRoute,
  PreparadorRoute,
  ProtectedRoute,
} from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { MyAnalysesPage } from './pages/MyAnalysesPage'
import { MyTrainingsPage } from './pages/MyTrainingsPage'
import { PlayerDetailPage } from './pages/PlayerDetailPage'
import { PlayersPage } from './pages/PlayersPage'
import { ProfilePage } from './pages/ProfilePage'
import { RankingPage } from './pages/RankingPage'
import { TrainingDetailPage } from './pages/TrainingDetailPage'

export default function App() {
  return (
    <div className="app-root">
      <BrowserRouter>
        <AuthProvider>
          <div className="app-routes-shell">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="treinos" element={<MyTrainingsPage />} />
                  <Route path="treinos/:id" element={<TrainingDetailPage />} />
                  <Route path="analises" element={<MyAnalysesPage />} />
                  <Route path="ranking" element={<RankingPage />} />
                  <Route path="perfil" element={<ProfilePage />} />
                  <Route element={<PreparadorRoute />}>
                    <Route
                      path="catalogo-treinos"
                      element={<Navigate to="/treinos" replace />}
                    />
                  </Route>
                  <Route element={<ManagementRoute />}>
                    <Route path="atletas" element={<PlayersPage />} />
                    <Route path="atletas/:uid" element={<PlayerDetailPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </div>
  )
}
