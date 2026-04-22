import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getCompletion,
  listAnalysesForUser,
  listDailyPointsRange,
  listTrainingsForUser,
} from '../services/db'
import { showAnalysesInOwnNav } from '../types/models'
import { analysisCategoryLabel, formatAnalysisMeasure } from '../utils/analysisDisplay'
import { RankingSummaryRow } from '../components/RankingSummaryRow'

export function DashboardPage() {
  const { profile, isManagement, isPreparador } = useAuth()

  if (!profile) return null

  const [todayTraining, setTodayTraining] = useState<{
    id: string
    title: string
    completed: boolean
    hasMedia: boolean
  } | null>(null)
  const [todayErr, setTodayErr] = useState<string | null>(null)

  const [rankPos, setRankPos] = useState<number | null>(null)
  const [rankPts, setRankPts] = useState<number | null>(null)
  const [rankErr, setRankErr] = useState<string | null>(null)

  const [latestAnalyses, setLatestAnalyses] = useState<
    { id: string; when: string; label: string; value: string }[]
  >([])
  const [analysesErr, setAnalysesErr] = useState<string | null>(null)

  const todayWd = new Date().getDay()

  const weekRange = useMemo(() => {
    const now = new Date()
    const d = new Date(now)
    const day = d.getDay() // 0 dom ... 6 sab
    const diff = day === 0 ? 6 : day - 1 // segunda como início
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - diff)
    const pad = (n: number) => String(n).padStart(2, '0')
    const key = (x: Date) =>
      `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
    return { startDateKey: key(d), endDateKey: key(new Date()) }
  }, [])

  useEffect(() => {
    let alive = true
    const uid = profile.uid

    // Treino do dia
    ;(async () => {
      setTodayErr(null)
      try {
        const trainings = await listTrainingsForUser(uid)
        const todays = trainings.filter((t) => {
          const wds = t.trainingWeekdays?.length ? t.trainingWeekdays : [t.weekday]
          return wds.includes(todayWd)
        })
        if (!todays.length) {
          if (alive) setTodayTraining(null)
          return
        }
        // Preferir o primeiro pendente
        const withStatus = await Promise.all(
          todays.map(async (t) => {
            const c = await getCompletion(t.id, uid)
            return {
              id: t.id,
              title: t.title,
              completed: Boolean(c?.completed),
              hasMedia: (c?.mediaUrls?.length ?? 0) > 0,
            }
          }),
        )
        withStatus.sort((a, b) => Number(a.completed) - Number(b.completed))
        if (alive) setTodayTraining(withStatus[0] ?? null)
      } catch (e) {
        if (!alive) return
        setTodayErr(e instanceof Error ? e.message : 'Erro ao carregar treino do dia.')
      }
    })()

    // Ranking (posição + pontos na semana)
    ;(async () => {
      setRankErr(null)
      try {
        const dps = await listDailyPointsRange(weekRange)
        const map = new Map<string, { name: string; pts: number }>()
        for (const dp of dps) {
          const cur = map.get(dp.userId) ?? { name: dp.displayName || 'Atleta', pts: 0 }
          cur.pts += dp.points
          if (!cur.name && dp.displayName) cur.name = dp.displayName
          map.set(dp.userId, cur)
        }
        const rows = [...map.entries()].map(([userId, x]) => ({
          userId,
          points: x.pts,
          displayName: x.name,
        }))
        rows.sort((a, b) => b.points - a.points)
        const idx = rows.findIndex((r) => r.userId === uid)
        if (alive) {
          setRankPos(idx >= 0 ? idx + 1 : null)
          setRankPts(idx >= 0 ? rows[idx].points : 0)
        }
      } catch (e) {
        if (!alive) return
        setRankErr(e instanceof Error ? e.message : 'Erro ao carregar ranking.')
      }
    })()

    // Últimas análises
    ;(async () => {
      setAnalysesErr(null)
      try {
        const list = await listAnalysesForUser(uid)
        const top = list.slice(0, 3).map((a) => ({
          id: a.id,
          when: new Date(a.createdAt).toLocaleDateString('pt-BR'),
          label: analysisCategoryLabel(a.category),
          value: formatAnalysisMeasure(a),
        }))
        if (alive) setLatestAnalyses(top)
      } catch (e) {
        if (!alive) return
        setAnalysesErr(e instanceof Error ? e.message : 'Erro ao carregar análises.')
      }
    })()

    return () => {
      alive = false
    }
  }, [profile.uid, todayWd, weekRange])

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

      <nav className="dash-actions" aria-label="Ações rápidas">
        <Link className="dash-action" to="/treinos">
          Treinos
        </Link>
        {showAnalysesInOwnNav(profile.role) && (
          <Link className="dash-action" to="/analises">
            Análises
          </Link>
        )}
        <Link className="dash-action" to="/ranking">
          Ranking
        </Link>
        {isManagement && (
          <Link className="dash-action" to="/atletas">
            Atletas
          </Link>
        )}
        <Link className="dash-action" to="/perfil">
          Perfil
        </Link>
      </nav>

      <section className="stack-lg">
        <Link className="card stack dash-card-link" to="/treinos">
          <div className="dash-card-head">
            <h3>Treino do dia</h3>
            {todayTraining ? (
              <span className={todayTraining.completed ? 'pill pill-done' : 'pill pill-pending'}>
                {todayTraining.completed ? 'Feito' : 'A fazer'}
              </span>
            ) : (
              <span className="pill pill-muted">—</span>
            )}
          </div>
          {todayErr ? (
            <p className="muted small">{todayErr}</p>
          ) : !todayTraining ? (
            <p className="muted small">
              Nenhum treino prescrito para hoje. Veja a fila completa em Treinos.
            </p>
          ) : (
            <div className="dash-card-body">
              <strong>{todayTraining.title}</strong>
              <div className="muted small">
                {todayTraining.completed
                  ? todayTraining.hasMedia
                    ? 'Pontuação do dia: +10 (com mídia)'
                    : 'Pontuação do dia: +5'
                  : 'Abra para marcar como realizado e anexar evidência.'}
              </div>
            </div>
          )}
        </Link>

        <Link className="card stack dash-card-link" to="/ranking">
          <div className="dash-card-head">
            <h3>Sua posição no ranking</h3>
            <span className="pill pill-soft">semana</span>
          </div>
          {rankErr ? (
            <p className="muted small">{rankErr}</p>
          ) : (
            <RankingSummaryRow
              rank={rankPos}
              subtitle="na semana"
              points={rankPts}
            />
          )}
        </Link>

        {showAnalysesInOwnNav(profile.role) && (
          <Link className="card stack dash-card-link" to="/analises">
            <div className="dash-card-head">
              <h3>Últimas análises</h3>
              <span className="pill pill-soft">recentes</span>
            </div>
            {analysesErr ? (
              <p className="muted small">{analysesErr}</p>
            ) : latestAnalyses.length === 0 ? (
              <p className="muted small">Ainda não há análises registradas.</p>
            ) : (
              <ul className="dash-mini-list">
                {latestAnalyses.map((a) => (
                  <li key={a.id} className="dash-mini-row">
                    <div>
                      <strong>{a.label}</strong>
                      <div className="muted small">{a.when}</div>
                    </div>
                    <span className="pill pill-muted">{a.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </Link>
        )}
      </section>
    </div>
  )
}
