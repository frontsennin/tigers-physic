import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { modeLabelShort, weekdaysToShort } from '../data/workoutCatalog'
import { useAuth } from '../contexts/AuthContext'
import { CoachTrainingCatalog } from './CoachTrainingCatalogPage'
import { getCompletion, listTrainingsForUser } from '../services/db'
import { ANALYSIS_CATEGORIES, type Training } from '../types/models'

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
  const { profile, loading: authLoading, isPreparador } = useAuth()
  const [rows, setRows] = useState<TrainingListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<'meus' | 'catalogo'>('meus')

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

      {isPreparador && (
        <div className="segmented">
          <button
            type="button"
            className={tab === 'meus' ? 'seg seg--on' : 'seg'}
            onClick={() => setTab('meus')}
          >
            Meus treinos
          </button>
          <button
            type="button"
            className={tab === 'catalogo' ? 'seg seg--on' : 'seg'}
            onClick={() => setTab('catalogo')}
          >
            Catálogo
          </button>
        </div>
      )}

      {isPreparador && tab === 'catalogo' ? (
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
