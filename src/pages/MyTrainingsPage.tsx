import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { modeLabelShort, weekdaysToShort } from '../data/workoutCatalog'
import { useAuth } from '../contexts/AuthContext'
import { CoachTrainingCatalog } from './CoachTrainingCatalogPage'
import {
  getCompletion,
  listCompletionsForUser,
  listProfiles,
  listTrainingsForUser,
} from '../services/db'
import { ANALYSIS_CATEGORIES, type Training, type TrainingCompletion } from '../types/models'

type TrainingListRow = {
  training: Training
  completed: boolean
  mediaPreviewUrl?: string | null
  hasMedia: boolean
  athleteNotes?: string | null
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

const WD_SHORT_PT: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
}

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
  const navigate = useNavigate()
  const t = row.training
  const completed = row.completed
  const rx = t.prescription
  const mediaPreviewUrl = row.mediaPreviewUrl ?? null
  const hasMedia = row.hasMedia
  const athleteNotes = (row.athleteNotes ?? '').trim()

  const clean = (v: unknown): string | null => {
    if (v === null || v === undefined) return null
    const s = String(v).trim()
    if (!s) return null
    if (s === '-' || s === '—') return null
    if (s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null
    return s
  }

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

  const setsStr = clean(rx?.sets)
  const repsStr = clean(rx?.repsOrDuration)
  const loadStr = showLoad ? clean(rx?.loadNote) : null
  const rpeStr = clean(rx?.rpeTarget)

  const stats: { label: string; value: string }[] = []
  if (setsStr) stats.push({ label: 'Séries', value: setsStr })
  if (repsStr) stats.push({ label: 'Reps / tempo', value: repsStr })
  if (loadStr) stats.push({ label: 'Carga', value: loadStr })
  if (rpeStr) stats.push({ label: 'RPE', value: rpeStr })

  const isImageUrl = (url: string): boolean => {
    const u = url.toLowerCase()
    return (
      u.includes('.jpg') ||
      u.includes('.jpeg') ||
      u.includes('.png') ||
      u.includes('.webp') ||
      u.includes('.gif')
    )
  }

  const showThumb = Boolean(mediaPreviewUrl && isImageUrl(mediaPreviewUrl))

  return (
    <div className={rowClass} aria-label={aria}>
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
            {stats.length > 0 ? (
              <div className="training-card-stats" aria-label="Resumo do treino">
                {stats.slice(0, 4).map((s) => (
                  <div key={s.label} className="training-stat">
                    <div className="training-stat-label">{s.label}</div>
                    <div className="training-stat-value">{s.value}</div>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="training-card-mode">
              {modeLabelShort(rx.mode)}
              {rx.restBetweenSets ? (
                <span className="training-card-meta-hint">
                  {' '}
                  · desc. {rx.restBetweenSets}
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

        {hasMedia ? (
          showThumb ? (
            <div className="training-media">
              <img
                className="training-media-thumb"
                src={mediaPreviewUrl!}
                alt="Prévia da mídia anexada"
                loading="lazy"
                decoding="async"
              />
              <div className="training-media-meta">
                <span className="pill pill-soft pill-tiny">Mídia anexada</span>
              </div>
            </div>
          ) : (
            <div className="training-media training-media--badge">
              <span className="pill pill-soft pill-tiny">Mídia anexada</span>
            </div>
          )
        ) : null}

        {athleteNotes ? (
          <p className="training-athlete-notes" aria-label="Observações do atleta">
            {truncate(athleteNotes, 110)}
          </p>
        ) : null}

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

      <div className="training-card-footer">
        <button
          type="button"
          className="btn-primary training-card-cta"
          onClick={() =>
            navigate(`/treinos/${t.id}`, {
              state: { expectedUserId: t.userId, trainingTitle: t.title },
            })
          }
          aria-label={`Acessar treino: ${t.title}`}
        >
          Acessar treino
        </button>
      </div>
    </div>
  )
}

export function MyTrainingsPage() {
  const { profile, loading: authLoading, isPreparador, isManagement } = useAuth()
  const [rows, setRows] = useState<TrainingListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<'meus' | 'catalogo' | 'jogadores'>('meus')

  const [playersLoading, setPlayersLoading] = useState(false)
  const [playersErr, setPlayersErr] = useState<string | null>(null)
  const [players, setPlayers] = useState<
    {
      uid: string
      displayName: string
      trainings: Training[]
      completionsByTrainingId: Map<string, TrainingCompletion>
    }[]
  >([])

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
              const mediaUrls = c?.mediaUrls ?? []
              return {
                training,
                completed: Boolean(c?.completed),
                hasMedia: mediaUrls.length > 0,
                mediaPreviewUrl: mediaUrls[0] ?? null,
                athleteNotes: c?.athleteNotes ?? null,
              }
            } catch {
              return {
                training,
                completed: false,
                hasMedia: false,
                mediaPreviewUrl: null,
                athleteNotes: null,
              }
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

  useEffect(() => {
    if (!isManagement) return
    if (tab !== 'jogadores') return
    let alive = true
    setPlayersLoading(true)
    setPlayersErr(null)
    ;(async () => {
      try {
        const all = await listProfiles()
        const athletes = all
          .filter((p) => p.role === 'jogador')
          .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'))

        const payload = await Promise.all(
          athletes.map(async (p) => {
            const [trainings, completions] = await Promise.all([
              listTrainingsForUser(p.uid),
              listCompletionsForUser(p.uid),
            ])
            const map = new Map<string, TrainingCompletion>()
            for (const c of completions) map.set(c.trainingId, c)
            return {
              uid: p.uid,
              displayName: p.displayName || 'Atleta',
              trainings,
              completionsByTrainingId: map,
            }
          }),
        )

        if (!alive) return
        setPlayers(payload)
      } catch (e) {
        if (!alive) return
        setPlayersErr(e instanceof Error ? e.message : 'Erro ao carregar jogadores.')
        setPlayers([])
      } finally {
        if (alive) setPlayersLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [isManagement, tab])

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
        <h2 className="my-trainings-title">
          {isPreparador ? 'Treinos' : 'Meus treinos'}
        </h2>
        <p className="muted small my-trainings-lead">
          {isPreparador
            ? 'Alterna entre seus treinos e o catálogo de modelos.'
            : (
              <>
                <strong>Treino do dia</strong> reúne o que vale para hoje. Em{' '}
                <strong>Próximos treinos</strong>, a ordem segue os dias da semana a
                partir de amanhã, priorizando a próxima ocorrência em{' '}
                <span className="nowrap">dia útil</span> (segunda a sexta) quando o
                plano também inclui fim de semana.
              </>
            )}
        </p>
      </header>

      {(isPreparador || isManagement) && (
        <div className="segmented">
          <button
            type="button"
            className={tab === 'meus' ? 'seg seg--on' : 'seg'}
            onClick={() => setTab('meus')}
          >
            {isPreparador ? 'Meus treinos' : 'Treinos'}
          </button>
          {isPreparador && (
            <button
              type="button"
              className={tab === 'catalogo' ? 'seg seg--on' : 'seg'}
              onClick={() => setTab('catalogo')}
            >
              Catálogo
            </button>
          )}
          {isManagement && (
            <button
              type="button"
              className={tab === 'jogadores' ? 'seg seg--on' : 'seg'}
              onClick={() => setTab('jogadores')}
            >
              Jogadores
            </button>
          )}
        </div>
      )}

      {isManagement && tab === 'jogadores' ? (
        <StaffPlayersWeekView
          loading={playersLoading}
          err={playersErr}
          players={players}
        />
      ) : isPreparador && tab === 'catalogo' ? (
        <CoachTrainingCatalog embedded />
      ) : rows.length === 0 ? (
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

function StaffPlayersWeekView({
  loading,
  err,
  players,
}: {
  loading: boolean
  err: string | null
  players: {
    uid: string
    displayName: string
    trainings: Training[]
    completionsByTrainingId: Map<string, TrainingCompletion>
  }[]
}) {
  const now = new Date()
  const weekStart = startOfWeekMondayMs(now)
  const days = Array.from({ length: 7 }).map((_, i) => {
    const ms = weekStart + i * 24 * 60 * 60 * 1000
    const d = new Date(ms)
    const wd = d.getDay()
    return {
      ms,
      wd,
      key: dateKeyLocal(ms),
      label: `${WD_SHORT_PT[wd]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
      isToday: dateKeyLocal(Date.now()) === dateKeyLocal(ms),
      isPast: ms < new Date().setHours(0, 0, 0, 0),
    }
  })

  const completionDoneOnDay = (c: TrainingCompletion | undefined, dayKey: string) =>
    Boolean(c?.completed && c.completedAt && dateKeyLocal(c.completedAt) === dayKey)

  if (loading) return <p className="muted">Carregando jogadores…</p>
  if (err) return <p className="error-text">{err}</p>
  if (players.length === 0)
    return (
      <div className="empty-state card">
        <h3 className="empty-state-title">Sem atletas</h3>
        <p className="muted small">Nenhum jogador encontrado para exibir treinos.</p>
      </div>
    )

  return (
    <div className="stack-lg">
      <div className="card stack">
        <h3>Treinos dos jogadores (semana)</h3>
        <p className="muted small" style={{ margin: 0 }}>
          A comissão consegue <strong>visualizar</strong> a agenda e a aderência,
          mas não acessa o detalhe do treino por aqui.
        </p>
      </div>

      {players.map((p) => (
        <div key={p.uid} className="card stack">
          <div className="staff-week-head">
            <strong>{p.displayName}</strong>
            <span className="pill pill-soft">semana</span>
          </div>

          {p.trainings.length === 0 ? (
            <p className="muted small">Sem treinos prescritos.</p>
          ) : (
            <div className="staff-week-table-wrap" aria-label="Tabela semanal">
              <table className="staff-week-table">
                <colgroup>
                  <col className="staff-col-title" />
                  {days.map((d) => (
                    <col
                      key={d.key}
                      className={d.isToday ? 'staff-col-day staff-col-day--today' : 'staff-col-day'}
                    />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" className="staff-th staff-th-title">
                      Treinos
                    </th>
                    {days.map((d) => (
                      <th
                        key={d.key}
                        scope="col"
                        className={
                          d.isToday
                            ? 'staff-th staff-th-day staff-th-day--today'
                            : 'staff-th staff-th-day'
                        }
                      >
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.trainings
                    .slice()
                    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
                    .map((t) => {
                      const wds = weekDaysForTraining(t)
                      const c = p.completionsByTrainingId.get(t.id)
                      return (
                        <tr key={t.id} className="staff-tr">
                          <th scope="row" className="staff-td staff-td-title">
                            <div className="staff-week-title">
                              <strong>{t.title}</strong>
                              <div className="muted small">
                                {weekdaysToShort(wds)}
                                {c?.athleteNotes ? ' · com observação' : ''}
                                {c?.mediaUrls?.length ? ' · com mídia' : ''}
                              </div>
                            </div>
                          </th>
                          {days.map((d) => {
                            const scheduled = wds.includes(d.wd)
                            if (!scheduled) {
                              return (
                                <td key={d.key} className="staff-td staff-td-day">
                                  <span className="staff-cell staff-cell--off">—</span>
                                </td>
                              )
                            }
                            const done = completionDoneOnDay(c, d.key)
                            const cls = done
                              ? 'pill pill-done'
                              : d.isPast
                                ? 'pill pill-lost'
                                : d.isToday
                                  ? 'pill pill-pending'
                                  : 'pill pill-muted'
                            const label = done
                              ? 'Feito'
                              : d.isPast
                                ? 'Perdido'
                                : d.isToday
                                  ? 'Pendente'
                                  : 'Previsto'
                            return (
                              <td key={d.key} className="staff-td staff-td-day">
                                <span className={`staff-cell ${cls}`}>{label}</span>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
