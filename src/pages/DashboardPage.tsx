import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { showAnalysesInOwnNav } from '../types/models'

export function DashboardPage() {
  const { profile, isManagement, isPreparador } = useAuth()

  if (!profile) return null

  return (
    <div className="page-padding stack-lg">
      <header>
        <h2>Olá, {profile.displayName}</h2>
        <p className="muted">
          {isPreparador
            ? 'Registre análises e monte treinos alinhados às necessidades de cada atleta.'
            : isManagement
              ? 'Acompanhe evolução e treinos do elenco.'
              : 'Veja seus treinos e evolução física definidos pelo preparador.'}
        </p>
      </header>

      <section className="card-grid">
        <Link className="tile" to="/treinos">
          <h3>Meus treinos</h3>
          <p className="muted small">
            Check de execução, dia e horário, anexos de foto/vídeo.
          </p>
        </Link>

        {showAnalysesInOwnNav(profile.role) && (
          <Link className="tile" to="/analises">
            <h3>Minhas análises</h3>
            <p className="muted small">
              Histórico de testes e medições ligadas ao seu perfil.
            </p>
          </Link>
        )}

        {isManagement && (
          <Link className="tile" to="/atletas">
            <h3>Atletas &amp; staff</h3>
            <p className="muted small">
              Lista completa, parâmetros e histórico (visão gestão).
            </p>
          </Link>
        )}

        <Link className="tile" to="/perfil">
          <h3>Perfil &amp; setores</h3>
          <p className="muted small">
            {profile.role === 'jogador'
              ? 'QB, DL, OL, WR, RB — você pode ter mais de um.'
              : 'Seus dados e setores (quando aplicável).'}
          </p>
        </Link>
      </section>
    </div>
  )
}
