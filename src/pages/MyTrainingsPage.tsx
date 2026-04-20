import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { modeLabelShort, weekdaysToShort } from '../data/workoutCatalog'
import { useAuth } from '../contexts/AuthContext'
import { getCompletion, listTrainingsForUser } from '../services/db'
import { ANALYSIS_CATEGORIES, type Training } from '../types/models'

type TrainingListRow = {
  training: Training
  completed: boolean
}

const WD_LONG_PT: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
}

const BUSINESS_WD = new Set([1, 2, 3, 4, 5])

function weekDaysForTraining(t: Training): number[] {
  const w = t.trainingWeekdays?.length ? t.trainingWeekdays : [t.weekday]
  return [...new Set(w)].sort((a, b) => a - b)
}

/** Próxima ocorrência em dia útil (seg–sex), se existir entre as opções; senão o próximo dia prescrito (ex.: só fim de semana). */
function nextSessionDayOffsetPreferBusiness(
  weekdays: number[],
  todayWd: number,
): number {
  const set = new Set(weekdays)
  let bestAny = 999
  let bestBusiness = 999
  for (let d = 1; d <= 7; d++) {
    const wd = (todayWd + d) % 7
    if (!set.has(wd)) continue
    bestAny = Math.min(bestAny, d)
    if (BUSINESS_WD.has(wd)) bestBusiness = Math.min(bestBusiness, d)
  }
  return bestBusiness < 999 ? bestBusiness : bestAny
}

function nextSessionWeekday(weekdays: number[], todayWd: number): number {
  const d = nextSessionDayOffsetPreferBusiness(weekdays, todayWd)
  return (todayWd + d) % 7
}

function partitionTrainingsForSchedule(rows: TrainingListRow[], todayWd: number) {
  const todayList: TrainingListRow[] = []
  const upcomingList: TrainingListRow[] = []

  for (const row of rows) {
    const wds = weekDaysForTraining(row.training)
    if (wds.includes(todayWd)) todayList.push(row)
    else upcomingList.push(row)
  }

  todayList.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return a.training.title.localeCompare(b.training.title, 'pt-BR')
  })

  const weekdayOrder: number[] = []
  for (let i = 1; i <= 7; i++) weekdayOrder.push((todayWd + i) % 7)

  type Group = { weekday: number; rows: TrainingListRow[] }
  const groupMap = new Map<number, TrainingListRow[]>()

  for (const row of upcomingList) {
    const wds = weekDaysForTraining(row.training)
    const nextWd = nextSessionWeekday(wds, todayWd)
    const g = groupMap.get(nextWd) ?? []
    g.push(row)
    groupMap.set(nextWd, g)
  }

  for (const [, list] of groupMap) {
    list.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return a.training.title.localeCompare(b.training.title, 'pt-BR')
    })
  }

  const upcomingGroups: Group[] = []
  for (const wd of weekdayOrder) {
    const list = groupMap.get(wd)
    if (list?.length) upcomingGroups.push({ weekday: wd, rows: list })
  }

  return { todayList, upcomingGroups }
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function TrainingListCard({
  row,
  emphasis = 'default',
}: {
  row: TrainingListRow
  emphasis?: 'today' | 'default'
}) {
  const t = row.training
  const completed = row.completed
  const rx = t.prescription

  const dayNums =
    t.trainingWeekdays?.length ? t.trainingWeekdays : [t.weekday]
  const dayChips = weekdaysToShort(dayNums).split(', ')

  const focus = t.linkedCategories.map(
    (c) => ANALYSIS_CATEGORIES.find((x) => x.id === c)?.label ?? c,
  )

  const showLoad =
    rx?.loadNote &&
    rx.mode !== 'time' &&
    rx.mode !== 'skill'

  const aria = `${t.title}. ${completed ? 'Treino já marcado como feito.' : 'Treino pendente.'}`

  const rowClass =
    emphasis === 'today'
      ? 'training-row training-row--rich training-row--today-highlight'
      : 'training-row training-row--rich'

  return (
    <Link to={`/treinos/${t.id}`} className={rowClass} aria-label={aria}>
      <div className="training-row-inner">
        <div className="training-card-head">
          <strong className="training-card-title">{t.title}</strong>
          <span
            className={completed ? 'pill pill-done' : 'pill pill-pending'}
          >
            {completed ? 'Feito' : 'A fazer'}
          </span>
        </div>

        <div className="training-card-chips" aria-hidden>
          {dayChips.map((d, i) => (
            <span key={`${d.trim()}-${i}`} className="pill pill-day">
              {d.trim()}
            </span>
          ))}
        </div>

        {rx ? (
          <>
            <div className="training-card-metrics">
              <span className="training-metric">
                <span className="training-metric-value">{String(rx.sets)}</span>
                <span className="training-metric-label">séries</span>
              </span>
              <span className="training-metric-sep" aria-hidden>
                ×
              </span>
              <span className="training-metric training-metric--grow">
                <span className="training-metric-value">
                  {rx.repsOrDuration}
                </span>
                <span className="training-metric-label">reps / tempo</span>
              </span>
              {showLoad && (
                <>
                  <span className="training-metric-sep" aria-hidden>
                    ·
                  </span>
                  <span className="training-metric">
                    <span className="training-metric-value">
                      {rx.loadNote}
                    </span>
                    <span className="training-metric-label">carga</span>
                  </span>
                </>
              )}
            </div>
            <p className="training-card-mode">
              {modeLabelShort(rx.mode)}
              {rx.restBetweenSets ? (
                <span className="training-card-meta-hint">
                  {' '}
                  · desc. {rx.restBetweenSets}
                </span>
              ) : null}
              {rx.rpeTarget ? (
                <span className="training-card-meta-hint">
                  {' '}
                  · {rx.rpeTarget}
                </span>
              ) : null}
              {rx.equipment ? (
                <span className="training-card-meta-hint">
                  {' '}
                  · {rx.equipment}
                </span>
              ) : null}
            </p>
            {rx.objective ? (
              <p className="training-card-objective">
                {truncate(rx.objective, 100)}
              </p>
            ) : null}
          </>
        ) : (
          <p className="training-card-objective muted small">
            {truncate(
              t.description?.trim() || 'Abra para ver detalhes do treino.',
              130,
            )}
          </p>
        )}

        {focus.length > 0 ? (
          <div className="training-card-chips training-card-chips--focus">
            {focus.map((label) => (
              <span key={label} className="pill pill-soft pill-tiny">
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <span className="chev training-chev" aria-hidden>
        ›
      </span>
    </Link>
  )
}

export function MyTrainingsPage() {
  const { profile, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<TrainingListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.uid) {
      setLoading(false)
      setRows([])
      return
    }

    let alive = true
    setLoading(true)
    setErr(null)
    const uid = profile.uid

    listTrainingsForUser(uid)
      .then(async (trainings) => {
        const withStatus: TrainingListRow[] = await Promise.all(
          trainings.map(async (training) => {
            try {
              const c = await getCompletion(training.id, uid)
              return { training, completed: Boolean(c?.completed) }
            } catch {
              return { training, completed: false }
            }
          }),
        )
        if (!alive) return
        setRows(withStatus)
      })
      .catch((e) => {
        if (!alive) return
        setErr(e instanceof Error ? e.message : 'Erro ao carregar treinos')
        setRows([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [profile?.uid])

  const todayWd = new Date().getDay()
  const { todayList, upcomingGroups } = useMemo(
    () => partitionTrainingsForSchedule(rows, todayWd),
    [rows, todayWd],
  )

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
        <h2>Meus treinos</h2>
        <p className="error-text" role="alert">
          {err}
        </p>
        <p className="muted small">
          Se a mensagem fala de índice no Firestore, publique os índices do
          projeto ou tente de novo em instantes.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-padding stack-lg" aria-busy="true">
        <h2>Meus treinos</h2>
        <p className="muted">Carregando treinos…</p>
      </div>
    )
  }

  return (
    <div className="page-padding stack-lg">
      <header className="my-trainings-header">
        <h2 className="my-trainings-title">Meus treinos</h2>
        <p className="muted small my-trainings-lead">
          <strong>Treino do dia</strong> reúne o que vale para hoje. Em{' '}
          <strong>Próximos treinos</strong>, a ordem segue os dias da semana a
          partir de amanhã, priorizando a próxima ocorrência em{' '}
          <span className="nowrap">dia útil</span> (segunda a sexta) quando o
          plano também inclui fim de semana.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="empty-state card">
          <h3 className="empty-state-title">Nenhum treino prescrito</h3>
          <p className="muted small">
            Quando o preparador definir treinos para você, eles aparecerão aqui
            com exercício, dias, séries e objetivo.
          </p>
        </div>
      ) : (
        <div className="my-trainings-sections stack-lg">
          <section
            className="training-schedule-section training-schedule-section--today"
            aria-labelledby="treino-do-dia-heading"
          >
            <h3
              id="treino-do-dia-heading"
              className="training-section-title training-section-title--today"
            >
              Treino do dia
            </h3>
            {todayList.length === 0 ? (
              <p className="training-section-empty training-section-empty--today muted small">
                Nenhum treino prescrito para{' '}
                <strong>{WD_LONG_PT[todayWd]}</strong>. Confira a fila abaixo.
              </p>
            ) : (
              <ul className="training-list training-list--spaced training-list--today">
                {todayList.map((row) => (
                  <li key={row.training.id} className="training-item">
                    <TrainingListCard row={row} emphasis="today" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="training-schedule-section"
            aria-labelledby="proximos-treinos-heading"
          >
            <h3 id="proximos-treinos-heading" className="training-section-title">
              Próximos treinos
            </h3>
            {upcomingGroups.length === 0 ? (
              <p className="training-section-empty muted small">
                Todos os seus treinos de hoje já estão na seção acima.
              </p>
            ) : (
              <div className="stack-lg">
                {upcomingGroups.map(({ weekday, rows: groupRows }) => (
                  <div key={weekday} className="training-subsection">
                    <h4 className="training-subsection-title">
                      <span>{WD_LONG_PT[weekday]}</span>
                      {BUSINESS_WD.has(weekday) ? (
                        <span className="training-subsection-badge">dia útil</span>
                      ) : null}
                    </h4>
                    <ul className="training-list training-list--spaced">
                      {groupRows.map((row) => (
                        <li key={row.training.id} className="training-item">
                          <TrainingListCard row={row} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
