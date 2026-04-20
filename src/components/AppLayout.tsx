import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { showAnalysesInOwnNav } from '../types/models'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? ' nav-link--active' : ''}`

export function AppLayout() {
  const { profile, logout, isManagement } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <header className="top-bar">
        <button
          type="button"
          className="brand"
          onClick={() => navigate('/')}
          aria-label="Início Tigers Physic"
        >
          <span className="brand-mark" />
          <span className="brand-text">
            <strong>Tigers</strong>
            <small>Physic</small>
          </span>
        </button>
        {profile && (
          <div className="top-meta">
            <span className="pill pill-role">{roleLabel(profile.role)}</span>
            <button type="button" className="btn-ghost" onClick={() => logout()}>
              Sair
            </button>
          </div>
        )}
      </header>

      <main className="main-scroll">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Principal">
        <NavLink to="/" end className={linkClass}>
          Início
        </NavLink>
        <NavLink to="/treinos" className={linkClass}>
          Treinos
        </NavLink>
        {profile && showAnalysesInOwnNav(profile.role) && (
          <NavLink to="/analises" className={linkClass}>
            Análises
          </NavLink>
        )}
        {isManagement && (
          <NavLink to="/atletas" className={linkClass}>
            Atletas
          </NavLink>
        )}
        <NavLink to="/perfil" className={linkClass}>
          Perfil
        </NavLink>
      </nav>
    </div>
  )
}

function roleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'coordenador':
      return 'Coord.'
    case 'preparador':
      return 'Prep.'
    case 'jogador':
      return 'Atleta'
    default:
      return role
  }
}
