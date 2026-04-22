import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExerciseSearchSelect } from '../components/ExerciseSearchSelect'
import {
  composeTrainingDescriptionForSave,
  weekdaysToShort,
} from '../data/workoutCatalog'
import type { WorkoutPreset } from '../data/workoutCatalog'
import { useAuth } from '../contexts/AuthContext'
import { addTrainingTemplate, listTrainingTemplatesForCoach } from '../services/db'
import {
  ANALYSIS_CATEGORIES,
  type AnalysisCategory,
  type PrescriptionMode,
  type TrainingPrescription,
  type TrainingTemplate,
} from '../types/models'

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

function truncate(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function CoachTrainingCatalog({
  embedded = false,
}: {
  embedded?: boolean
}) {
  const { user } = useAuth()
  const uid = user?.uid

  const [rows, setRows] = useState<TrainingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)

  const [exerciseName, setExerciseName] = useState('')
  const [linked, setLinked] = useState<AnalysisCategory[]>([])
  const [trainingWeekdays, setTrainingWeekdays] = useState<number[]>([1, 3, 5])
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
  const [catalogPreset, setCatalogPreset] = useState<WorkoutPreset | null>(null)

  useEffect(() => {
    if (!uid) return
    let alive = true
    ;(async () => {
      try {
        const list = await listTrainingTemplatesForCoach(uid)
        if (!alive) return
        setRows(list)
      } catch (e) {
        if (!alive) return
        setErr(e instanceof Error ? e.message : 'Erro ao carregar catálogo.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [uid, busy])

  useEffect(() => {
    if (catalogPreset && exerciseName.trim() !== catalogPreset.name.trim()) {
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
      const next = prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
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

  function resetForm() {
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
    setFormErr(null)
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!uid) return
    setFormErr(null)
    const name = exerciseName.trim()
    if (!name) return setFormErr('Informe o nome do treino.')
    const sortedDays = [...trainingWeekdays].sort((a, b) => a - b)
    if (!sortedDays.length) return setFormErr('Marque pelo menos um dia.')
    if (!setsStr.trim() || !repsStr.trim() || !objectiveStr.trim()) {
      return setFormErr('Preencha séries, reps/tempo e objetivo.')
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

    setBusy(true)
    try {
      await addTrainingTemplate({
        title: name,
        description,
        linkedCategories: linked,
        createdBy: uid,
        trainingWeekdays: sortedDays,
        presetId: catalogPreset?.id,
        prescription,
      })
      resetForm()
      setCreating(false)
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Erro ao salvar modelo.')
    } finally {
      setBusy(false)
    }
  }

  const grouped = useMemo(() => {
    const withDays = rows.filter((r) => r.trainingWeekdays?.length)
    const noDays = rows.filter((r) => !(r.trainingWeekdays?.length))
    return { withDays, noDays }
  }, [rows])

  if (loading) {
    return (
      <div className={embedded ? 'stack' : 'page-padding muted'}>
        {embedded ? <p className="muted">Carregando catálogo…</p> : 'Carregando catálogo…'}
      </div>
    )
  }

  return (
    <div className={embedded ? 'stack-lg' : 'page-padding stack-lg'}>
      {!embedded && (
        <>
          <Link to="/perfil" className="back-link">
            ← Voltar
          </Link>
          <h2>Catálogo de treinos</h2>
          <p className="muted">
            Crie treinos modelo para reutilizar no time. Em breve você poderá
            aplicar um modelo para um atleta com 1 clique.
          </p>
        </>
      )}

      {err && (
        <p className="error-text" role="alert">
          {err}
        </p>
      )}

      <div className="card stack">
        <div className="btn-row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Modelos salvos</h3>
          {!creating && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCreating(true)}
            >
              Criar novo
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="muted small">Nenhum modelo ainda.</p>
        ) : (
          <ul className="training-list">
            {[...grouped.withDays, ...grouped.noDays].map((t) => (
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
                    <p className="training-card-objective muted small">
                      {truncate(t.description || 'Sem descrição.', 140)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating && (
        <form className="card stack" onSubmit={onCreate}>
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Novo modelo</h3>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                resetForm()
                setCreating(false)
              }}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>

          <p className="muted small">
            Busque um exercício no catálogo ou digite um nome próprio. O modelo
            salva a prescrição e os dias sugeridos.
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
            <span>Carga / intensidade (opcional)</span>
            <input
              value={loadStr}
              onChange={(e) => setLoadStr(e.target.value)}
              placeholder="Ex.: 60 kg, RPE 8, elástico leve…"
              disabled={rxMode === 'time' || rxMode === 'skill'}
            />
          </label>

          <label className="field">
            <span>Objetivo do treino</span>
            <textarea
              required
              rows={2}
              value={objectiveStr}
              onChange={(e) => setObjectiveStr(e.target.value)}
              placeholder="Ex.: hipertrofia, aceleração, técnica…"
            />
          </label>

          <div className="two-col">
            <label className="field">
              <span>RPE ou zona (opcional)</span>
              <input
                value={rpeStr}
                onChange={(e) => setRpeStr(e.target.value)}
                placeholder="Ex.: RPE 7–8"
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
              placeholder="Halteres, cones, elástico…"
            />
          </label>

          <label className="field">
            <span>Notas extras (opcional)</span>
            <textarea
              rows={2}
              value={extrasStr}
              onChange={(e) => setExtrasStr(e.target.value)}
              placeholder="Técnica, progressão, link de referência (texto)…"
            />
          </label>

          <fieldset className="field">
            <legend>Dias sugeridos</legend>
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
            {busy ? 'Salvando…' : 'Salvar no catálogo'}
          </button>
        </form>
      )}
    </div>
  )
}

export function CoachTrainingCatalogPage() {
  return <CoachTrainingCatalog embedded={false} />
}

