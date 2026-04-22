import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isManagementRole } from '../types/models'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const loc = useLocation()

  if (loading) {
    return (
      <div className="screen-center muted" aria-busy="true">
        Carregando…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }

  return <Outlet />
}

export function ManagementRoute() {
  const { profile, loading } = useAuth()
  const loc = useLocation()

  if (loading) {
    return (
      <div className="screen-center muted" aria-busy="true">
        Carregando…
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  if (!isManagementRole(profile.role)) {
    return <Navigate to="/" replace state={{ from: loc.pathname }} />
  }

  return <Outlet />
}

export function PreparadorRoute() {
  const { profile, loading, isPreparador } = useAuth()
  const loc = useLocation()

  if (loading) {
    return (
      <div className="screen-center muted" aria-busy="true">
        Carregando…
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  if (!isPreparador) {
    return <Navigate to="/" replace state={{ from: loc.pathname }} />
  }

  return <Outlet />
}
