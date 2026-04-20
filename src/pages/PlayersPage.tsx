import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProfiles } from '../services/db'
import type { UserProfile } from '../types/models'
import { isManagementRole } from '../types/models'

export function PlayersPage() {
  const [rows, setRows] = useState<UserProfile[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await listProfiles()
        if (!alive) return
        setRows(list)
      } catch (e) {
        if (!alive) return
        setErr(e instanceof Error ? e.message : 'Erro ao carregar')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return <div className="page-padding muted">Carregando atletas…</div>
  }

  if (err) {
    return (
      <div className="page-padding">
        <p className="error-text">{err}</p>
      </div>
    )
  }

  return (
    <div className="page-padding stack-lg">
      <h2>Atletas &amp; staff</h2>
      <p className="muted">
        Gestão vê parâmetros e evolução. Apenas o preparador cadastra análises e
        treinos.
      </p>
      <ul className="user-list">
        {rows.map((p) => (
          <li key={p.uid}>
            <Link className="user-row" to={`/atletas/${p.uid}`}>
              <div>
                <strong>{p.displayName}</strong>
                <div className="muted small">{p.email}</div>
              </div>
              <div className="user-row-meta">
                <span className="pill">{rolePt(p.role)}</span>
                {p.sectors?.length > 0 && (
                  <span className="pill pill-muted">
                    {p.sectors.join(' · ')}
                  </span>
                )}
                {isManagementRole(p.role) && (
                  <span className="pill pill-soft">gestão</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function rolePt(role: UserProfile['role']): string {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'coordenador':
      return 'Coordenador'
    case 'preparador':
      return 'Preparador'
    default:
      return 'Jogador'
  }
}
