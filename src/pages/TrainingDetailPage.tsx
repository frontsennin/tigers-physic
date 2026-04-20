import { type ChangeEvent, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { modeLabel, weekdaysToShort } from '../data/workoutCatalog'
import {
  getCompletion,
  getTraining,
  upsertCompletion,
} from '../services/db'
import { uploadTrainingEvidence } from '../services/storage'
import { ANALYSIS_CATEGORIES, type Training } from '../types/models'
import {
  canMarkTrainingFromPlan,
  formatSchedule,
} from '../utils/dates'

export function TrainingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile, isManagement } = useAuth()
  const [training, setTraining] = useState<Training | null | undefined>(
    undefined,
  )
  const [completed, setCompleted] = useState(false)
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id || !user) return
    let alive = true
    ;(async () => {
      try {
        const t = await getTraining(id)
        if (!alive) return
        setTraining(t)
        if (!t) return
        const c = await getCompletion(id, t.userId)
        if (!alive) return
        setCompleted(c?.completed ?? false)
        setMediaUrls(c?.mediaUrls ?? [])
      } catch (e) {
        if (!alive) return
        setErr(e instanceof Error ? e.message : 'Erro ao carregar')
        setTraining(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [id, user])

  if (!id) return <Navigate to="/treinos" replace />
  if (training === undefined) {
    return <div className="page-padding muted">Carregando…</div>
  }
  if (!training) {
    return (
      <div className="page-padding">
        <p className="error-text">Treino não encontrado.</p>
        <Link to="/treinos">Voltar</Link>
      </div>
    )
  }

  const tr = training

  const isOwner = profile?.uid === tr.userId
  const canSee = isOwner || isManagement
  if (!canSee) {
    return <Navigate to="/treinos" replace />
  }

  const canToggle = isOwner && canMarkTrainingFromPlan(tr)

  async function onToggle(next: boolean) {
    if (!canToggle || !user) return
    setBusy(true)
    setErr(null)
    try {
      await upsertCompletion({
        trainingId: tr.id,
        userId: tr.userId,
        completed: next,
        mediaUrls,
      })
      setCompleted(next)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    if (!canToggle || !user) return
    const files = e.target.files
    if (!files?.length) return
    setBusy(true)
    setErr(null)
    try {
      const urls: string[] = [...mediaUrls]
      for (const f of Array.from(files)) {
        const url = await uploadTrainingEvidence(
          tr.userId,
          tr.id,
          f,
        )
        urls.push(url)
      }
      setMediaUrls(urls)
      await upsertCompletion({
        trainingId: tr.id,
        userId: tr.userId,
        completed,
        mediaUrls: urls,
      })
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Falha no envio')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  async function removeMedia(url: string) {
    if (!canToggle) return
    const urls = mediaUrls.filter((u) => u !== url)
    setMediaUrls(urls)
    await upsertCompletion({
      trainingId: tr.id,
      userId: tr.userId,
      completed,
      mediaUrls: urls,
    })
  }

  const focusLabels = tr.linkedCategories.map(
    (c) => ANALYSIS_CATEGORIES.find((x) => x.id === c)?.label ?? c,
  )

  const dayChips = tr.trainingWeekdays?.length
    ? weekdaysToShort(tr.trainingWeekdays).split(', ')
    : null

  return (
    <div className="page-padding stack-lg">
      <header className="training-detail-hero">
        <Link to="/treinos" className="training-detail-back">
          ← Voltar aos treinos
        </Link>
        <h1 className="training-detail-title">{tr.title}</h1>
        <div className="training-detail-meta">
          <div className="training-detail-meta-block">
            <span className="training-detail-meta-label">
              {dayChips ? 'Dias para executar' : 'Agendamento'}
            </span>
            <div className="training-detail-chip-row">
              {dayChips
                ? dayChips.map((label, i) => (
                    <span key={`${label.trim()}-${i}`} className="pill">
                      {label.trim()}
                    </span>
                  ))
                : (
                    <span className="pill pill-muted">
                      {formatSchedule(tr.scheduledAt)}
                    </span>
                  )}
            </div>
          </div>
          {focusLabels.length > 0 && (
            <div className="training-detail-meta-block">
              <span className="training-detail-meta-label">
                Foco do treino
              </span>
              <div className="training-detail-chip-row">
                {focusLabels.map((label) => (
                  <span key={label} className="pill pill-soft">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {tr.prescription && (
        <div className="card stack prescription-card">
          <h3>Prescrição (estruturada)</h3>
          <dl className="prescription-dl">
            <dt>Dias da semana sugeridos</dt>
            <dd>{weekdaysToShort(tr.prescription.suggestedWeekdays)}</dd>
            <dt>Modo</dt>
            <dd>{modeLabel(tr.prescription.mode)}</dd>
            <dt>Séries</dt>
            <dd>{String(tr.prescription.sets)}</dd>
            <dt>Repetições / tempo / volume</dt>
            <dd>{tr.prescription.repsOrDuration}</dd>
            {tr.prescription.loadNote ? (
              <>
                <dt>Carga / intensidade</dt>
                <dd>{tr.prescription.loadNote}</dd>
              </>
            ) : (
              tr.prescription.mode === 'time' && (
                <>
                  <dt>Carga</dt>
                  <dd className="muted">Não aplicável — treino por tempo/velocidade</dd>
                </>
              )
            )}
            <dt>Objetivo</dt>
            <dd>{tr.prescription.objective}</dd>
            {tr.prescription.rpeTarget && (
              <>
                <dt>RPE / zona</dt>
                <dd>{tr.prescription.rpeTarget}</dd>
              </>
            )}
            {tr.prescription.restBetweenSets && (
              <>
                <dt>Descanso</dt>
                <dd>{tr.prescription.restBetweenSets}</dd>
              </>
            )}
            {tr.prescription.equipment && (
              <>
                <dt>Equipamento</dt>
                <dd>{tr.prescription.equipment}</dd>
              </>
            )}
            {tr.prescription.coachNotesExtra && (
              <>
                <dt>Notas extras</dt>
                <dd>{tr.prescription.coachNotesExtra}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      <article className="card prose">{tr.description}</article>

      {err && (
        <p className="error-text" role="alert">
          {err}
        </p>
      )}

      <section className="card stack">
        <h3>Execução</h3>
        {!isOwner && (
          <p className="muted small">
            Visão da comissão — o check é feito pelo atleta no próprio login.
          </p>
        )}
        {isOwner && !canToggle && !completed && (
          <p className="muted small">
            O check só fica disponível nos dias da semana em que este treino foi
            prescrito (e conforme a regra do time).
          </p>
        )}
        {isOwner && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={completed}
              disabled={busy || !canToggle}
              onChange={(e) => onToggle(e.target.checked)}
            />
            <span>Marcar como realizado</span>
          </label>
        )}

        {isOwner && canToggle && (
          <div className="stack">
            <label className="field">
              <span>Anexar foto ou vídeo</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                disabled={busy}
                onChange={onFiles}
              />
            </label>
            <ul className="media-list">
              {mediaUrls.map((u) => (
                <li key={u} className="media-row">
                  <a href={u} target="_blank" rel="noreferrer">
                    Abrir mídia
                  </a>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => removeMedia(u)}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isManagement && !isOwner && (
          <div className="stack small">
            <p>
              Status:{' '}
              <strong>{completed ? 'Realizado' : 'Pendente'}</strong>
            </p>
            {mediaUrls.length > 0 && (
              <ul className="media-list">
                {mediaUrls.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noreferrer">
                      Evidência
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
