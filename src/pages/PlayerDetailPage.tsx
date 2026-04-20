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
  updateUserRoleAndSectors,
} from '../services/db'
import {
  ANALYSIS_CATEGORIES,
  type AnalysisCategory,
  type MeasureKind,
  type PrescriptionMode,
  type Sector,
  SECTORS,
  type TrainingPrescription,
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

  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('jogador')
  const [sectors, setSectors] = useState<Sector[]>([])
  const [savingMeta, setSavingMeta] = useState(false)
  const [err, setErr] = useState<string | null>(null)

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

      {err && (
        <p className="error-text" role="alert">
          {err}
        </p>
      )}

      {(canEditRole || canEditSectors) && isManagement && (
        <form className="card stack" onSubmit={saveMeta}>
          <h3>Cargo &amp; setores</h3>
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
              <div className="chips">
                {SECTORS.map((s) => (
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
            </fieldset>
          )}
          <button className="btn-primary" type="submit" disabled={savingMeta}>
            {savingMeta ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </form>
      )}

      {analysisForm.ui}

      {trainingForm.ui}

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
    } finally {
      setBusy(false)
    }
  }

  const ui = (
    <section className="stack-lg">
      <h3>Análises de performance</h3>
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

      {isPreparador && (
        <form className="card stack" onSubmit={submit}>
          <h4>Nova análise</h4>
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

  useEffect(() => {
    if (!uid) return
    listTrainingsForUser(uid).then(setList).catch(console.error)
  }, [uid, busy])

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
    } finally {
      setBusy(false)
    }
  }

  const ui = (
    <section className="stack-lg">
      <h3>Treinos prescritos</h3>
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

      {isPreparador && (
        <form className="card stack" onSubmit={submit}>
          <h4>Novo treino</h4>
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
