import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listDailyPointsRange } from '../services/db'
import type { DailyPoints } from '../types/models'
import { RankPointsBadge } from '../components/RankingSummaryRow'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function dateKeyLocal(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfWeekMondayMs(now: Date): number {
  const d = new Date(now)
  const day = d.getDay() // 0 dom ... 6 sab
  const diff = day === 0 ? 6 : day - 1 // segunda como início
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - diff)
  return d.getTime()
}

type Row = {
  userId: string
  displayName: string
  points: number
  days: number
  mediaDays: number
}

export function RankingPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<DailyPoints[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const now = new Date()
  const startMs = startOfWeekMondayMs(now)
  const startKey = dateKeyLocal(startMs)
  const endKey = dateKeyLocal(Date.now())

  const errKind = useMemo(() => {
    const msg = (err ?? '').toLowerCase()
    if (!msg) return null
    if (
      msg.includes('missing or insufficient permissions') ||
      msg.includes('permission') ||
      msg.includes('permission-denied')
    ) {
      return 'permission' as const
    }
    if (msg.includes('index')) return 'index' as const
    return 'generic' as const
  }, [err])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr(null)
    listDailyPointsRange({ startDateKey: startKey, endDateKey: endKey })
      .then((list) => {
        if (!alive) return
        setRows(list)
      })
      .catch((e) => {
        if (!alive) return
        setErr(e instanceof Error ? e.message : 'Erro ao carregar ranking.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [startKey, endKey])

  const leaderboard = useMemo(() => {
    const map = new Map<string, Row>()
    for (const dp of rows) {
      const key = dp.userId
      const cur = map.get(key) ?? {
        userId: dp.userId,
        displayName: dp.displayName || 'Atleta',
        points: 0,
        days: 0,
        mediaDays: 0,
      }
      cur.points += dp.points
      cur.days += 1
      if (dp.hasMedia) cur.mediaDays += 1
      if (!cur.displayName && dp.displayName) cur.displayName = dp.displayName
      map.set(key, cur)
    }
    const out = [...map.values()]
    out.sort((a, b) => b.points - a.points || b.days - a.days)
    return out
  }, [rows])

  const myIndex = profile?.uid
    ? leaderboard.findIndex((r) => r.userId === profile.uid)
    : -1

  return (
    <div className="page-padding stack-lg">
      <Link to="/" className="back-link">
        ← Voltar
      </Link>
      <h2>Ranking da semana</h2>
      <p className="muted">
        Pontos por <strong>dia</strong>: 5 ao marcar “treinei” + 5 se houver
        mídia (total 10).
      </p>
      <p className="muted small">
        Período: <code>{startKey}</code> até <code>{endKey}</code>
      </p>

      {loading ? (
        <p className="muted">Carregando ranking…</p>
      ) : err ? (
        <div className="card stack">
          <h3>Ranking indisponível</h3>
          {errKind === 'permission' ? (
            <p className="muted small">
              Ainda não temos permissão para ler os pontos do ranking neste
              ambiente. Normalmente isso acontece quando as regras/índices do
              Firestore ainda não foram publicados.
            </p>
          ) : errKind === 'index' ? (
            <p className="muted small">
              O Firestore pediu um índice para esta consulta. Publique os índices
              do projeto e tente novamente.
            </p>
          ) : (
            <p className="muted small">
              Não foi possível carregar o ranking agora.
            </p>
          )}
          <p className="muted small">
            <strong>Detalhe:</strong> <span className="mono">{err}</span>
          </p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="empty-state card">
          <h3 className="empty-state-title">Sem pontuações ainda</h3>
          <p className="muted small">
            Quando os atletas marcarem treinos como feitos, o ranking aparece
            aqui.
          </p>
        </div>
      ) : (
        <div className="ranking-card stack">
          {myIndex >= 0 && (
            <div className="ranking-me">
              <span className="muted small">Sua posição</span>
              <strong>#{myIndex + 1}</strong>
            </div>
          )}

          <ol className="ranking-list">
            {leaderboard.slice(0, 30).map((r, i) => {
              const isMe = r.userId === profile?.uid
              return (
                <li
                  key={r.userId}
                  className={`ranking-row ${isMe ? 'ranking-row--me' : ''}`}
                >
                  <div className="ranking-rank" aria-hidden>
                    {i + 1}
                  </div>
                  <div className="ranking-main">
                    <div className="ranking-name">
                      <strong>{r.displayName}</strong>
                      {i < 3 && (
                        <span className="pill pill-soft pill-tiny">
                          top {i + 1}
                        </span>
                      )}
                    </div>
                    <div className="ranking-sub muted small">
                      {r.days} dia(s) · {r.mediaDays} com mídia
                    </div>
                  </div>
                  <div className="ranking-score">
                    <RankPointsBadge points={r.points} />
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}

