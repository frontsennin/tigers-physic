import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getProfile, listAnalysesForUser } from '../services/db'
import type { PerformanceAnalysis } from '../types/models'
import {
  analysisCategoryLabel,
  formatAnalysisMeasure,
  measureKindDisplayLabel,
} from '../utils/analysisDisplay'

export function MyAnalysesPage() {
  const { profile, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<PerformanceAnalysis[]>([])
  const [authorByUid, setAuthorByUid] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.uid) {
      setLoading(false)
      setRows([])
      setAuthorByUid({})
      return
    }

    let alive = true
    setLoading(true)
    setErr(null)
    const uid = profile.uid

    listAnalysesForUser(uid)
      .then(async (list) => {
        const creators = [...new Set(list.map((a) => a.createdBy))]
        const entries = await Promise.all(
          creators.map(async (id) => {
            try {
              const p = await getProfile(id)
              return [id, p?.displayName ?? 'Equipe técnica'] as const
            } catch {
              return [id, 'Equipe técnica'] as const
            }
          }),
        )
        if (!alive) return
        setAuthorByUid(Object.fromEntries(entries))
        setRows(list)
      })
      .catch((e) => {
        if (!alive) return
        setErr(e instanceof Error ? e.message : 'Erro ao carregar análises')
        setRows([])
        setAuthorByUid({})
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [profile?.uid])

  if (authLoading) {
    return (
      <div className="page-padding muted" aria-busy="true">
        Carregando…
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="page-padding">
        <p className="muted">Não foi possível carregar seu perfil.</p>
      </div>
    )
  }

  if (err) {
    return (
      <div className="page-padding stack">
        <h2>Minhas análises</h2>
        <p className="error-text" role="alert">
          {err}
        </p>
        <p className="muted small">
          Confira a conexão e as permissões do Firestore. Se o erro persistir,
          tente de novo em instantes.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-padding stack-lg" aria-busy="true">
        <h2>Minhas análises</h2>
        <p className="muted">Carregando histórico…</p>
      </div>
    )
  }

  return (
    <div className="page-padding stack-lg">
      <header className="my-analyses-header">
        <h2 className="my-analyses-title">Minhas análises</h2>
        <p className="muted small my-analyses-lead">
          Cada registro é uma avaliação feita pela equipe técnica. Você pode ter
          várias análises ao longo do tempo — todas ficam listadas aqui, da
          mais recente para a mais antiga.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="empty-state card">
          <h3 className="empty-state-title">Nenhuma análise ainda</h3>
          <p className="muted small">
            Quando a equipe registrar testes ou medições para este perfil, elas
            aparecerão aqui com data, categoria e valores.
          </p>
        </div>
      ) : (
        <ul className="analysis-athlete-list">
          {rows.map((a) => (
            <li key={a.id}>
              <article className="analysis-athlete-card">
                <div className="analysis-athlete-head">
                  <span className="pill">{analysisCategoryLabel(a.category)}</span>
                  <time
                    className="muted small analysis-athlete-date"
                    dateTime={new Date(a.createdAt).toISOString()}
                  >
                    {new Date(a.createdAt).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </time>
                </div>
                <p className="analysis-athlete-author muted small">
                  Registrado por{' '}
                  <strong className="analysis-athlete-author-name">
                    {authorByUid[a.createdBy] ?? 'Equipe técnica'}
                  </strong>
                  {' · '}
                  {measureKindDisplayLabel(a.measureKind)}
                </p>
                <p className="analysis-athlete-value mono">
                  {formatAnalysisMeasure(a)}
                </p>
                {a.protocol ? (
                  <p className="analysis-athlete-protocol muted small">
                    <span className="analysis-athlete-label">Protocolo</span>{' '}
                    {a.protocol}
                  </p>
                ) : null}
                {a.notes ? (
                  <p className="analysis-athlete-notes small">{a.notes}</p>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
