import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listProfiles } from '../services/db'
import type { UserProfile } from '../types/models'
import {
  DEFENSE_SECTORS,
  OFFENSE_SECTORS,
  OTHER_SECTORS,
  isManagementRole,
  type Sector,
} from '../types/models'

export function PlayersPage() {
  const { isManagement } = useAuth()
  const [rows, setRows] = useState<UserProfile[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<'athletes' | 'staff'>('athletes')
  const [sector, setSector] = useState<Sector | 'all'>('all')
  const [q, setQ] = useState('')

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

  const athletes = useMemo(
    () => rows.filter((p) => !isManagementRole(p.role)),
    [rows],
  )
  const staff = useMemo(
    () => rows.filter((p) => isManagementRole(p.role)),
    [rows],
  )

  const visible = useMemo(() => {
    const base = group === 'athletes' ? athletes : staff
    const qq = q.trim().toLowerCase()
    return base
      .filter((p) => {
        if (group === 'athletes' && sector !== 'all') {
          return (p.sectors ?? []).includes(sector)
        }
        return true
      })
      .filter((p) => {
        if (!qq) return true
        const hay = `${p.displayName} ${p.email}`.toLowerCase()
        return hay.includes(qq)
      })
  }, [athletes, group, q, sector, staff])

  if (!isManagement) {
    return <Navigate to="/" replace />
  }

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

      <Link className="card stack" to="/ranking">
        <h3>Ranking</h3>
        <p className="muted small">
          Quem treinou mais na semana (pontos por dia + evidência).
        </p>
      </Link>

      <div className="segmented">
        <button
          type="button"
          className={group === 'athletes' ? 'seg seg--on' : 'seg'}
          onClick={() => setGroup('athletes')}
        >
          Atletas <span className="muted">({athletes.length})</span>
        </button>
        <button
          type="button"
          className={group === 'staff' ? 'seg seg--on' : 'seg'}
          onClick={() => setGroup('staff')}
        >
          Staff <span className="muted">({staff.length})</span>
        </button>
      </div>

      <div className="card stack">
        <label className="field">
          <span>Buscar</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome ou e-mail…"
          />
        </label>

        {group === 'athletes' && (
          <div className="stack">
            <div className="tabs-scroll" aria-label="Filtrar por setor">
              <button
                type="button"
                className={`pill pill-button ${sector === 'all' ? 'pill-button--on' : ''}`}
                onClick={() => setSector('all')}
              >
                Todos
              </button>
            </div>

            <div className="tabs-scroll" aria-label="Setores de ataque">
              {OFFENSE_SECTORS.map((s) => {
                const count = athletes.filter((p) =>
                  (p.sectors ?? []).includes(s),
                ).length
                return (
                  <button
                    key={s}
                    type="button"
                    className={`pill pill-button ${sector === s ? 'pill-button--on' : ''}`}
                    onClick={() => setSector(s)}
                    title={`${count} atleta(s)`}
                  >
                    {s} <span className="muted">({count})</span>
                  </button>
                )
              })}
            </div>

            <div className="tabs-scroll" aria-label="Setores de defesa">
              {DEFENSE_SECTORS.map((s) => {
                const count = athletes.filter((p) =>
                  (p.sectors ?? []).includes(s),
                ).length
                return (
                  <button
                    key={s}
                    type="button"
                    className={`pill pill-button ${sector === s ? 'pill-button--on' : ''}`}
                    onClick={() => setSector(s)}
                    title={`${count} atleta(s)`}
                  >
                    {s} <span className="muted">({count})</span>
                  </button>
                )
              })}
            </div>

            <div className="tabs-scroll" aria-label="Outros setores">
              {OTHER_SECTORS.map((s) => {
                const count = athletes.filter((p) =>
                  (p.sectors ?? []).includes(s),
                ).length
                return (
                  <button
                    key={s}
                    type="button"
                    className={`pill pill-button ${sector === s ? 'pill-button--on' : ''}`}
                    onClick={() => setSector(s)}
                    title={`${count} atleta(s)`}
                  >
                    {s} <span className="muted">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <ul className="user-list">
        {visible.length === 0 ? (
          <li className="muted small">
            Nenhum resultado para os filtros atuais.
          </li>
        ) : (
          visible.map((p) => (
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
          ))
        )}
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
