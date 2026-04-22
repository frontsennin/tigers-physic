import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ExerciseSearchSelect } from '../components/ExerciseSearchSelect'
import {
  composeTrainingDescriptionForSave,
  weekdaysToShort,
} from '../data/workoutCatalog'
import type { WorkoutPreset } from '../data/workoutCatalog'
import { useAuth } from '../contexts/AuthContext'
import {
  addAnalysis,
  addTraining,
  getProfile,
  listAnalysesForUser,
  listTrainingsForUser,
  listTrainingTemplatesForCoach,
  updateUserRoleAndSectors,
  updateUserMetrics,
} from '../services/db'
import {
  ANALYSIS_CATEGORIES,
  type AnalysisCategory,
  type MeasureKind,
  type PrescriptionMode,
  type Sector,
  DEFENSE_SECTORS,
  OFFENSE_SECTORS,
  OTHER_SECTORS,
  type TrainingPrescription,
  type TrainingTemplate,
  type UserRole,
} from '../types/models'
import {
  analysisCategoryLabel,
  formatAnalysisMeasure,
} from '../utils/analysisDisplay'
import { dateKeyFromMs, weekdayFromMs } from '../utils/dates'

const ROLES: UserRole[] = [
  'admin',
  'coordenador',
  'preparador',
  'jogador',
]

const WD_LABELS: { d: number; label: string }[] = [
  { d: 0, label: 'Dom' },
  { d: 1, label: 'Seg' },
  { d: 2, label: 'Ter' },
  { d: 3, label: 'Qua' },
  { d: 4, label: 'Qui' },
  { d: 5, label: 'Sex' },
  { d: 6, label: 'Sáb' },
]

const RX_MODE_OPTIONS: { value: PrescriptionMode; label: string }[] = [
  { value: 'reps_load', label: 'Repetições + carga' },
  { value: 'time', label: 'Tempo / velocidade (sem foco em carga)' },
  { value: 'reps_bodyweight', label: 'Repetições — peso corporal' },
  { value: 'distance', label: 'Distância (metros / jardas)' },
  { value: 'skill', label: 'Técnica / habilidade' },
  { value: 'circuit', label: 'Circuito / estações' },
]

export function PlayerDetailPage() {
  const { uid } = useParams<{ uid: string }>()
  const { profile, user, isManagement, isPreparador, refreshProfile } =
    useAuth()

  const [tab, setTab] = useState<'info' | 'analises' | 'treinos'>('info')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('jogador')
  const [sectors, setSectors] = useState<Sector[]>([])
  const [savingMeta, setSavingMeta] = useState(false)
  const [savingMetrics, setSavingMetrics] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [bodyFatPct, setBodyFatPct] = useState('')
  const [leanMassKg, setLeanMassKg] = useState('')
  const [avgSpeed, setAvgSpeed] = useState('')
  const [maxSpeed, setMaxSpeed] = useState('')
  const [targetWeightKg, setTargetWeightKg] = useState('')
  const [targetBodyFatPct, setTargetBodyFatPct] = useState('')
  const [targetLeanMassKg, setTargetLeanMassKg] = useState('')

  const canView = isManagement

  const analysisForm = useAnalysisForm(uid, isPreparador, user?.uid)
  const trainingForm = useTrainingForm(uid, isPreparador, user?.uid)

  useEffect(() => {
    if (!uid) return
    ;(async () => {
      try {
        const p = await getProfile(uid)
        if (!p) {
          setErr('Perfil não encontrado.')
          return
        }
        setName(p.displayName)
        setRole(p.role)
        setSectors(p.sectors ?? [])
        setHeightCm(p.heightCm == null ? '' : String(p.heightCm))
        setWeightKg(p.weightKg == null ? '' : String(p.weightKg))
        setBodyFatPct(p.bodyFatPct == null ? '' : String(p.bodyFatPct))
        setLeanMassKg(p.leanMassKg == null ? '' : String(p.leanMassKg))
        setAvgSpeed(p.avgSpeed == null ? '' : String(p.avgSpeed))
        setMaxSpeed(p.maxSpeed == null ? '' : String(p.maxSpeed))
        setTargetWeightKg(p.targetWeightKg == null ? '' : String(p.targetWeightKg))
        setTargetBodyFatPct(
          p.targetBodyFatPct == null ? '' : String(p.targetBodyFatPct),
        )
        setTargetLeanMassKg(
          p.targetLeanMassKg == null ? '' : String(p.targetLeanMassKg),
        )
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Erro ao carregar')
      }
    })()
  }, [uid])

  const title = useMemo(() => name || 'Atleta', [name])

  if (!uid) return <Navigate to="/atletas" replace />
  if (!canView) return <Navigate to="/" replace />

  async function saveMeta(e: FormEvent) {
    e.preventDefault()
    if (!uid) return
    setErr(null)
    setOk(null)
    setSavingMeta(true)
    try {
      const canEditRole = profile?.role === 'admin'
      const canEditSectors =
        profile?.role === 'admin' || profile?.role === 'preparador'

      await updateUserRoleAndSectors(uid, {
        ...(canEditRole ? { role } : {}),
        ...(canEditSectors ? { sectors } : {}),
      })
      if (uid === profile?.uid) await refreshProfile()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSavingMeta(false)
    }
  }

  const parseNumOrNull = (s: string): number | null => {
    const t = s.trim().replace(',', '.')
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }

  async function saveMetrics(e: FormEvent) {
    e.preventDefault()
    if (!uid) return
    setErr(null)
    setOk(null)
    setSavingMetrics(true)
    try {
      await updateUserMetrics(uid, {
        heightCm: parseNumOrNull(heightCm),
        weightKg: parseNumOrNull(weightKg),
        bodyFatPct: parseNumOrNull(bodyFatPct),
        leanMassKg: parseNumOrNull(leanMassKg),
        avgSpeed: parseNumOrNull(avgSpeed),
        maxSpeed: parseNumOrNull(maxSpeed),
        ...(isPreparador
          ? {
              targetWeightKg: parseNumOrNull(targetWeightKg),
              targetBodyFatPct: parseNumOrNull(targetBodyFatPct),
              targetLeanMassKg: parseNumOrNull(targetLeanMassKg),
            }
          : {}),
      })
      setOk('Informações físicas atualizadas.')
      if (uid === profile?.uid) await refreshProfile()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar informações.')
    } finally {
      setSavingMetrics(false)
    }
  }

  function toggleSector(s: Sector) {
    setSectors((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  const showMgmtForms = isPreparador
  const canEditRole = profile?.role === 'admin'
  const canEditSectors =
    profile?.role === 'admin' || profile?.role === 'preparador'

  return (
    <div className="page-padding stack-lg">
      <Link to="/atletas" className="back-link">
        ← Voltar
      </Link>
      <h2>{title}</h2>

      <div className="tabs-scroll" aria-label="Seções do atleta">
        <button
          type="button"
          className={`pill pill-button ${tab === 'info' ? 'pill-button--on' : ''}`}
          onClick={() => setTab('info')}
        >
          Informações
        </button>
        <button
          type="button"
          className={`pill pill-button ${tab === 'analises' ? 'pill-button--on' : ''}`}
          onClick={() => setTab('analises')}
        >
          Análises
        </button>
        <button
          type="button"
          className={`pill pill-button ${tab === 'treinos' ? 'pill-button--on' : ''}`}
          onClick={() => setTab('treinos')}
        >
          Treinos
        </button>
      </div>

      {err && (
        <p className="error-text" role="alert">
          {err}
        </p>
      )}

      {tab === 'info' && (
        <>
          {(err || ok) && (
            <p className={err ? 'error-text' : 'muted small'} role={err ? 'alert' : undefined}>
              {err ?? ok}
            </p>
          )}

          {(canEditRole || canEditSectors) && isManagement && (
            <form className="card stack" onSubmit={saveMeta}>
              <h3>Informações do atleta</h3>
              <p className="muted small">
                Edite cargo e setores conforme permissões do seu papel.
              </p>
              {canEditRole && (
                <label className="field">
                  <span>Cargo</span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {canEditSectors && (
                <fieldset className="field">
                  <legend>Setores (posições)</legend>
                  <div className="stack">
                    <div>
                      <div className="muted small" style={{ marginBottom: 6 }}>
                        Ataque
                      </div>
                      <div className="chips">
                        {OFFENSE_SECTORS.map((s) => (
                          <label key={s} className="chip">
                            <input
                              type="checkbox"
                              checked={sectors.includes(s)}
                              onChange={() => toggleSector(s)}
                            />
                            {s}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="muted small" style={{ marginBottom: 6 }}>
                        Defesa
                      </div>
                      <div className="chips">
                        {DEFENSE_SECTORS.map((s) => (
                          <label key={s} className="chip">
                            <input
                              type="checkbox"
                              checked={sectors.includes(s)}
                              onChange={() => toggleSector(s)}
                            />
                            {s}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="muted small" style={{ marginBottom: 6 }}>
                        Outros
                      </div>
                      <div className="chips">
                        {OTHER_SECTORS.map((s) => (
                          <label key={s} className="chip">
                            <input
                              type="checkbox"
                              checked={sectors.includes(s)}
                              onChange={() => toggleSector(s)}
                            />
                            {s}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </fieldset>
              )}
              <button className="btn-primary" type="submit" disabled={savingMeta}>
                {savingMeta ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </form>
          )}

          <form className="card stack" onSubmit={saveMetrics}>
            <h3>Informações físicas</h3>
            <p className="muted small">
              O atleta pode atualizar as métricas atuais no próprio perfil. Os
              objetivos são definidos pelo preparador.
            </p>
            <div className="two-col">
              <label className="field">
                <span>Altura (cm)</span>
                <input
                  inputMode="decimal"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  disabled={savingMetrics || !isPreparador}
                />
              </label>
              <label className="field">
                <span>Peso (kg)</span>
                <input
                  inputMode="decimal"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  disabled={savingMetrics || !isPreparador}
                />
              </label>
            </div>
            <div className="two-col">
              <label className="field">
                <span>BF (%)</span>
                <input
                  inputMode="decimal"
                  value={bodyFatPct}
                  onChange={(e) => setBodyFatPct(e.target.value)}
                  disabled={savingMetrics || !isPreparador}
                />
              </label>
              <label className="field">
                <span>Massa magra (kg)</span>
                <input
                  inputMode="decimal"
                  value={leanMassKg}
                  onChange={(e) => setLeanMassKg(e.target.value)}
                  disabled={savingMetrics || !isPreparador}
                />
              </label>
            </div>
            <div className="two-col">
              <label className="field">
                <span>Velocidade média (m/s)</span>
                <input
                  inputMode="decimal"
                  value={avgSpeed}
                  onChange={(e) => setAvgSpeed(e.target.value)}
                  disabled={savingMetrics || !isPreparador}
                />
              </label>
              <label className="field">
                <span>Velocidade máxima (m/s)</span>
                <input
                  inputMode="decimal"
                  value={maxSpeed}
                  onChange={(e) => setMaxSpeed(e.target.value)}
                  disabled={savingMetrics || !isPreparador}
                />
              </label>
            </div>

            <div className="auth-divider" aria-hidden>
              Objetivos
            </div>
            <div className="two-col">
              <label className="field">
                <span>Peso objetivo (kg)</span>
                <input
                  inputMode="decimal"
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(e.target.value)}
                  disabled={savingMetrics || !isPreparador}
                />
              </label>
              <label className="field">
                <span>BF objetivo (%)</span>
                <input
                  inputMode="decimal"
                  value={targetBodyFatPct}
                  onChange={(e) => setTargetBodyFatPct(e.target.value)}
                  disabled={savingMetrics || !isPreparador}
                />
              </label>
            </div>
            <label className="field">
              <span>Massa magra objetivo (kg)</span>
              <input
                inputMode="decimal"
                value={targetLeanMassKg}
                onChange={(e) => setTargetLeanMassKg(e.target.value)}
                disabled={savingMetrics || !isPreparador}
              />
            </label>

            {isPreparador && (
              <button className="btn-primary" type="submit" disabled={savingMetrics}>
                {savingMetrics ? 'Salvando…' : 'Salvar informações físicas'}
              </button>
            )}
          </form>

          <div className="card stack">
            <h3>Resumo</h3>
            <p>
              <strong>Nome:</strong> {title}
            </p>
            <p>
              <strong>Cargo:</strong> {role}
            </p>
            <p>
              <strong>Setores:</strong>{' '}
              {sectors.length ? sectors.join(' · ') : <span className="muted">—</span>}
            </p>
          </div>
        </>
      )}

      {tab === 'analises' && analysisForm.ui}

      {tab === 'treinos' && trainingForm.ui}

      {showMgmtForms && (
        <p className="muted small">
          Somente o <strong>preparador</strong> cria análises e treinos. Admin
          ajusta cargos; preparador ajusta setores dos jogadores.
        </p>
      )}
    </div>
  )
}

function useAnalysisForm(
  uid: string | undefined,
  isPreparador: boolean,
  createdBy: string | undefined,
) {
  const [category, setCategory] = useState<AnalysisCategory>('velocidade')
  const [measureKind, setMeasureKind] = useState<MeasureKind>('time')
  const [valueNumber, setValueNumber] = useState('')
  const [valueText, setValueText] = useState('')
  const [unit, setUnit] = useState('')
  const [protocol, setProtocol] = useState('')
  const [notes, setNotes] = useState('')
  const [list, setList] = useState<Awaited<
    ReturnType<typeof listAnalysesForUser>
  > >([])
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!uid) return
    listAnalysesForUser(uid).then(setList).catch(console.error)
  }, [uid, busy])

  useEffect(() => {
    const meta = ANALYSIS_CATEGORIES.find((c) => c.id === category)
    if (meta) setMeasureKind(meta.suggestedMeasure)
  }, [category])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!uid || !createdBy || !isPreparador) return
    setBusy(true)
    try {
      await addAnalysis({
        userId: uid,
        category,
        measureKind,
        valueNumber: valueNumber ? Number(valueNumber) : undefined,
        valueText: valueText || undefined,
        unit: unit || undefined,
        protocol: protocol || undefined,
        notes: notes || undefined,
        createdBy,
      })
      setValueNumber('')
      setValueText('')
      setProtocol('')
      setNotes('')
      setCreating(false)
    } finally {
      setBusy(false)
    }
  }

  const ui = (
    <section className="stack-lg">
      <div className="card stack">
        <div className="btn-row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Análises</h3>
          {isPreparador && !creating && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCreating(true)}
            >
              Criar nova
            </button>
          )}
        </div>
        <p className="muted small">
          Histórico de medições e protocolos do atleta.
        </p>
      </div>
      <ul className="analysis-list">
        {list.map((a) => (
          <li key={a.id} className="analysis-item">
            <div className="analysis-head">
              <strong>{analysisCategoryLabel(a.category)}</strong>
              <span className="muted small">
                {new Date(a.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="mono small">
              {formatAnalysisMeasure(a)}
            </div>
            {a.protocol && (
              <p className="muted small">Protocolo: {a.protocol}</p>
            )}
            {a.notes && <p className="small">{a.notes}</p>}
          </li>
        ))}
      </ul>

      {isPreparador && creating && (
        <form className="card stack" onSubmit={submit}>
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0 }}>Nova análise</h4>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCreating(false)}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>
          <label className="field">
            <span>Categoria</span>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as AnalysisCategory)
              }
            >
              {ANALYSIS_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <p className="muted small">
            {ANALYSIS_CATEGORIES.find((x) => x.id === category)?.hint}
          </p>
          <label className="field">
            <span>Tipo de medida</span>
            <select
              value={measureKind}
              onChange={(e) => setMeasureKind(e.target.value as MeasureKind)}
            >
              <option value="time">Tempo</option>
              <option value="weight">Peso / carga</option>
              <option value="distance">Distância</option>
              <option value="reps">Repetições</option>
              <option value="score">Score / nota</option>
              <option value="custom">Texto livre</option>
            </select>
          </label>
          <div className="two-col">
            <label className="field">
              <span>Valor numérico</span>
              <input
                inputMode="decimal"
                value={valueNumber}
                onChange={(e) => setValueNumber(e.target.value)}
                placeholder="Ex.: 4.85"
              />
            </label>
            <label className="field">
              <span>Unidade</span>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="s, kg, m…"
              />
            </label>
          </div>
          <label className="field">
            <span>Valor em texto (opcional)</span>
            <input
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Protocolo / teste aplicado</span>
            <input
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Observações</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? 'Salvando…' : 'Registrar análise'}
          </button>
        </form>
      )}
    </section>
  )

  return { ui }
}

function useTrainingForm(
  uid: string | undefined,
  isPreparador: boolean,
  createdBy: string | undefined,
) {
  const [exerciseName, setExerciseName] = useState('')
  const [linked, setLinked] = useState<AnalysisCategory[]>([])
  const [trainingWeekdays, setTrainingWeekdays] = useState<number[]>([
    1, 3, 5,
  ])
  const [rxMode, setRxMode] = useState<PrescriptionMode>('reps_load')
  const [setsStr, setSetsStr] = useState('4')
  const [repsStr, setRepsStr] = useState('8–12')
  const [loadStr, setLoadStr] = useState('')
  const [objectiveStr, setObjectiveStr] = useState('')
  const [rpeStr, setRpeStr] = useState('')
  const [restStr, setRestStr] = useState('')
  const [equipStr, setEquipStr] = useState('')
  const [extrasStr, setExtrasStr] = useState('')
  const [formErr, setFormErr] = useState<string | null>(null)
  const [list, setList] = useState<Awaited<
    ReturnType<typeof listTrainingsForUser>
  > >([])
  const [busy, setBusy] = useState(false)
  const [catalogPreset, setCatalogPreset] = useState<WorkoutPreset | null>(null)
  const [creating, setCreating] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogRows, setCatalogRows] = useState<TrainingTemplate[]>([])
  const [catalogErr, setCatalogErr] = useState<string | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(false)

  useEffect(() => {
    if (!uid) return
    listTrainingsForUser(uid).then(setList).catch(console.error)
  }, [uid, busy])

  useEffect(() => {
    if (!createdBy || !isPreparador) return
    if (!catalogOpen) return
    let alive = true
    setCatalogLoading(true)
    setCatalogErr(null)
    listTrainingTemplatesForCoach(createdBy)
      .then((rows) => {
        if (!alive) return
        setCatalogRows(rows)
      })
      .catch((e) => {
        if (!alive) return
        setCatalogErr(
          e instanceof Error ? e.message : 'Erro ao carregar catálogo.',
        )
      })
      .finally(() => {
        if (alive) setCatalogLoading(false)
      })
    return () => {
      alive = false
    }
  }, [catalogOpen, createdBy, isPreparador])

  useEffect(() => {
    if (
      catalogPreset &&
      exerciseName.trim() !== catalogPreset.name.trim()
    ) {
      setCatalogPreset(null)
    }
  }, [exerciseName, catalogPreset])

  const trainingFormReady =
    Boolean(exerciseName.trim()) &&
    trainingWeekdays.length > 0 &&
    Boolean(setsStr.trim()) &&
    Boolean(repsStr.trim()) &&
    Boolean(objectiveStr.trim())

  function toggleCat(c: AnalysisCategory) {
    setLinked((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }

  function toggleWeekday(d: number) {
    setTrainingWeekdays((prev) => {
      const next = prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d]
      return [...new Set(next)].sort((a, b) => a - b)
    })
  }

  function applyPreset(p: WorkoutPreset) {
    setCatalogPreset(p)
    setExerciseName(p.name)
    setSetsStr(String(p.sets))
    setRepsStr(p.repsOrDuration)
    setLoadStr(p.loadNote ?? '')
    setObjectiveStr(p.objective)
    setRxMode(p.prescriptionMode)
    setTrainingWeekdays([...new Set(p.suggestedWeekdays)].sort((a, b) => a - b))
    setLinked([...new Set(p.linkedCategories)])
    setFormErr(null)
  }

  function applyTemplateToForm(t: TrainingTemplate) {
    setCatalogPreset(null)
    setExerciseName(t.title)
    setRxMode((t.prescription?.mode as PrescriptionMode) ?? 'reps_load')
    setSetsStr(String(t.prescription?.sets ?? '4'))
    setRepsStr(String(t.prescription?.repsOrDuration ?? '8–12'))
    setLoadStr(t.prescription?.loadNote ?? '')
    setObjectiveStr(t.prescription?.objective ?? '')
    setTrainingWeekdays(
      (t.trainingWeekdays?.length ? t.trainingWeekdays : [1, 3, 5]).slice(),
    )
    setLinked([...(t.linkedCategories ?? [])])
    setRpeStr(t.prescription?.rpeTarget ?? '')
    setRestStr(t.prescription?.restBetweenSets ?? '')
    setEquipStr(t.prescription?.equipment ?? '')
    setExtrasStr(t.prescription?.coachNotesExtra ?? '')
    setFormErr(null)
    setCreating(true)
    setCatalogOpen(false)
  }

  async function assignTemplateToAthlete(t: TrainingTemplate) {
    if (!uid || !createdBy || !isPreparador) return
    setFormErr(null)
    const now = Date.now()
    const sortedDays =
      t.trainingWeekdays?.length ? [...t.trainingWeekdays].sort((a, b) => a - b) : [weekdayFromMs(now)]

    const rx = t.prescription
    const fallbackRx: TrainingPrescription = {
      mode: 'reps_load',
      sets: '4',
      repsOrDuration: '8–12',
      loadNote: null,
      objective: '',
      suggestedWeekdays: sortedDays,
    }
    const prescription: TrainingPrescription = {
      ...fallbackRx,
      ...(rx ?? {}),
      suggestedWeekdays: sortedDays,
    }

    const description = composeTrainingDescriptionForSave({
      mode: prescription.mode as PrescriptionMode,
      sets: String(prescription.sets),
      repsOrDuration: prescription.repsOrDuration,
      loadNote: prescription.loadNote ?? '',
      objective: prescription.objective ?? '',
      weekdays: sortedDays,
      restBetweenSets: prescription.restBetweenSets ?? '',
      rpeTarget: prescription.rpeTarget ?? '',
      equipment: prescription.equipment ?? '',
      coachNotesExtra: prescription.coachNotesExtra ?? '',
    })

    setBusy(true)
    try {
      await addTraining({
        userId: uid,
        title: t.title,
        description,
        linkedCategories: t.linkedCategories ?? [],
        scheduledAt: now,
        weekday: weekdayFromMs(now),
        dateKey: dateKeyFromMs(now),
        createdBy,
        trainingWeekdays: sortedDays,
        presetId: t.presetId,
        prescription,
      })
      setCatalogOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!uid || !createdBy || !isPreparador) return
    setFormErr(null)
    const name = exerciseName.trim()
    if (!name) {
      setFormErr('Informe o exercício.')
      return
    }
    const sortedDays = [...trainingWeekdays].sort((a, b) => a - b)
    if (!sortedDays.length) {
      setFormErr('Marque pelo menos um dia da semana.')
      return
    }
    if (!setsStr.trim() || !repsStr.trim() || !objectiveStr.trim()) {
      setFormErr('Preencha séries, repetições/tempo e objetivo.')
      return
    }

    const prescription: TrainingPrescription = {
      mode: rxMode,
      sets: setsStr.trim(),
      repsOrDuration: repsStr.trim(),
      loadNote: loadStr.trim() || null,
      objective: objectiveStr.trim(),
      suggestedWeekdays: sortedDays,
      restBetweenSets: restStr.trim() || undefined,
      rpeTarget: rpeStr.trim() || undefined,
      equipment: equipStr.trim() || undefined,
      coachNotesExtra: extrasStr.trim() || undefined,
    }

    const description = composeTrainingDescriptionForSave({
      mode: rxMode,
      sets: setsStr.trim(),
      repsOrDuration: repsStr.trim(),
      loadNote: loadStr,
      objective: objectiveStr.trim(),
      weekdays: sortedDays,
      restBetweenSets: restStr,
      rpeTarget: rpeStr,
      equipment: equipStr,
      coachNotesExtra: extrasStr,
    })

    const now = Date.now()
    setBusy(true)
    try {
      await addTraining({
        userId: uid,
        title: name,
        description,
        linkedCategories: linked,
        scheduledAt: now,
        weekday: weekdayFromMs(now),
        dateKey: dateKeyFromMs(now),
        createdBy,
        trainingWeekdays: sortedDays,
        presetId: catalogPreset?.id,
        prescription,
      })
      setExerciseName('')
      setLinked([])
      setTrainingWeekdays([1, 3, 5])
      setRxMode('reps_load')
      setSetsStr('4')
      setRepsStr('8–12')
      setLoadStr('')
      setObjectiveStr('')
      setRpeStr('')
      setRestStr('')
      setEquipStr('')
      setExtrasStr('')
      setCatalogPreset(null)
      setCreating(false)
    } finally {
      setBusy(false)
    }
  }

  const ui = (
    <section className="stack-lg">
      <div className="card stack">
        <div className="btn-row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Treinos</h3>
          {isPreparador && !creating && (
            <div className="btn-row">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCatalogOpen((v) => !v)}
                disabled={busy}
              >
                Usar do catálogo
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCreating(true)}
                disabled={busy}
              >
                Criar novo
              </button>
            </div>
          )}
        </div>
        <p className="muted small">
          Treinos prescritos e dias sugeridos de execução.
        </p>
      </div>

      {isPreparador && catalogOpen && (
        <div className="card stack">
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0 }}>Catálogo</h4>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCatalogOpen(false)}
              disabled={busy}
            >
              Fechar
            </button>
          </div>
          {catalogLoading ? (
            <p className="muted">Carregando modelos…</p>
          ) : catalogErr ? (
            <p className="error-text" role="alert">
              {catalogErr}
            </p>
          ) : catalogRows.length === 0 ? (
            <p className="muted small">Nenhum modelo no catálogo ainda.</p>
          ) : (
            <ul className="training-list">
              {catalogRows.map((t) => (
                <li key={t.id} className="training-item">
                  <div className="training-row training-row--rich">
                    <div className="training-row-inner">
                      <div className="training-card-head">
                        <strong className="training-card-title">{t.title}</strong>
                        {t.trainingWeekdays?.length ? (
                          <span className="pill pill-day">
                            {weekdaysToShort(t.trainingWeekdays)}
                          </span>
                        ) : null}
                      </div>
                      <p className="muted small">
                        {t.prescription?.objective || 'Sem objetivo definido.'}
                      </p>
                      <div className="btn-row">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => void assignTemplateToAthlete(t)}
                          disabled={busy}
                        >
                          Atribuir
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => applyTemplateToForm(t)}
                          disabled={busy}
                        >
                          Editar antes
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ul className="training-list">
        {list.map((t) => (
          <li key={t.id} className="training-item">
            <Link to={`/treinos/${t.id}`} className="training-row">
              <div>
                <strong>{t.title}</strong>
                <div className="muted small">
                  {weekdaysToShort(t.trainingWeekdays ?? [t.weekday])}
                </div>
              </div>
              <span className="chev">›</span>
            </Link>
          </li>
        ))}
      </ul>

      {isPreparador && creating && (
        <form className="card stack" onSubmit={submit}>
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0 }}>Novo treino</h4>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCreating(false)}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>
          <p className="muted small">
            Busque um exercício no catálogo ou digite um nome próprio. Ajuste
            séries, carga ou tempo conforme o modo. Marque os dias da semana em
            que o atleta deve executar.
          </p>

          <ExerciseSearchSelect
            value={exerciseName}
            onChangeName={setExerciseName}
            onSelectPreset={applyPreset}
            disabled={busy}
          />

          <label className="field">
            <span>Modo da prescrição</span>
            <select
              value={rxMode}
              onChange={(e) => setRxMode(e.target.value as PrescriptionMode)}
            >
              {RX_MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="two-col">
            <label className="field">
              <span>Séries</span>
              <input
                required
                value={setsStr}
                onChange={(e) => setSetsStr(e.target.value)}
                placeholder="Ex.: 4"
              />
            </label>
            <label className="field">
              <span>Repetições ou tempo</span>
              <input
                required
                value={repsStr}
                onChange={(e) => setRepsStr(e.target.value)}
                placeholder="Ex.: 8–12 rep ou 30 s forte"
              />
            </label>
          </div>

          <label className="field">
            <span>Carga / intensidade (opcional se for tempo ou técnica)</span>
            <input
              value={loadStr}
              onChange={(e) => setLoadStr(e.target.value)}
              placeholder="Ex.: 60 kg, RPE 8, elástico leve…"
              disabled={rxMode === 'time' || rxMode === 'skill'}
            />
            {(rxMode === 'time' || rxMode === 'skill') && (
              <span className="muted small">
                Modo tempo/técnica — foque na qualidade; carga costuma não se
                aplicar.
              </span>
            )}
          </label>

          <label className="field">
            <span>Objetivo do treino</span>
            <textarea
              required
              rows={2}
              value={objectiveStr}
              onChange={(e) => setObjectiveStr(e.target.value)}
              placeholder="Ex.: hipertrofia de peitoral, aceleração máxima…"
            />
          </label>

          <div className="two-col">
            <label className="field">
              <span>RPE ou zona (opcional)</span>
              <input
                value={rpeStr}
                onChange={(e) => setRpeStr(e.target.value)}
                placeholder="Ex.: RPE 7–8, Z2, 85% FCmax"
              />
            </label>
            <label className="field">
              <span>Descanso entre séries (opcional)</span>
              <input
                value={restStr}
                onChange={(e) => setRestStr(e.target.value)}
                placeholder="Ex.: 90 s, 2–3 min"
              />
            </label>
          </div>

          <label className="field">
            <span>Equipamento (opcional)</span>
            <input
              value={equipStr}
              onChange={(e) => setEquipStr(e.target.value)}
              placeholder="Ex.: halteres, cones, elástico mini-band…"
            />
          </label>

          <fieldset className="field">
            <legend>Dias da semana em que o atleta treina</legend>
            <div className="chips">
              {WD_LABELS.map(({ d, label }) => (
                <label key={d} className="chip">
                  <input
                    type="checkbox"
                    checked={trainingWeekdays.includes(d)}
                    onChange={() => toggleWeekday(d)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span>Notas extras (opcional)</span>
            <textarea
              rows={2}
              value={extrasStr}
              onChange={(e) => setExtrasStr(e.target.value)}
              placeholder="Lembrete de técnica, vídeo de referência em texto, progressão da semana…"
            />
          </label>

          <fieldset className="field">
            <legend>Vínculo com análises (foco do treino)</legend>
            <div className="chips">
              {ANALYSIS_CATEGORIES.map((c) => (
                <label key={c.id} className="chip">
                  <input
                    type="checkbox"
                    checked={linked.includes(c.id)}
                    onChange={() => toggleCat(c.id)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>

          {formErr && (
            <p className="error-text" role="alert">
              {formErr}
            </p>
          )}

          <button
            className="btn-primary"
            type="submit"
            disabled={busy || !trainingFormReady}
          >
            {busy ? 'Salvando…' : 'Agendar treino'}
          </button>
        </form>
      )}
    </section>
  )

  return { ui }
}
