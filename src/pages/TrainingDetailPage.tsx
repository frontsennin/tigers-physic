import { type ChangeEvent, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
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
  const loc = useLocation()
  const [training, setTraining] = useState<Training | null | undefined>(
    undefined,
  )
  const [completed, setCompleted] = useState(false)
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [athleteNotes, setAthleteNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [errCode, setErrCode] = useState<string | null>(null)
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
        const c = await getCompletion(id, user.uid)
        if (!alive) return
        setCompleted(c?.completed ?? false)
        setMediaUrls(c?.mediaUrls ?? [])
        setAthleteNotes(c?.athleteNotes ?? '')
      } catch (e) {
        if (!alive) return
        const code =
          e && typeof e === 'object' && 'code' in e ? String((e as any).code) : null
        setErrCode(code)
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
    const expectedUserId = (loc.state as any)?.expectedUserId as
      | string
      | undefined
    const trainingTitle = (loc.state as any)?.trainingTitle as string | undefined
    const isPerm =
      !!err &&
      (err.toLowerCase().includes('missing or insufficient permissions') ||
        err.toLowerCase().includes('permission'))
    const mismatchHint =
      isPerm && expectedUserId && profile?.uid && expectedUserId !== profile.uid
        ? { expectedUserId, currentUid: profile.uid }
        : null

    const msg = err
      ? err
      : `Treino não encontrado (ID: ${id}). Pode ter sido removido ou você não tem permissão.`
    return (
      <div className="page-padding">
        <p className="error-text" role="alert">
          {msg}
        </p>
        {trainingTitle && (
          <p className="muted small">
            Treino: <strong>{trainingTitle}</strong>
          </p>
        )}
        {!err && (
          <p className="muted small">
            Se você chegou aqui por um link, confirme que o treino ainda existe
            no Firestore em <code>trainings/{id}</code>.
          </p>
        )}
        {isPerm && mismatchHint && (
          <div className="card stack">
            <h3>Diagnóstico rápido</h3>
            <p className="muted small">
              Este treino parece pertencer a outro <code>uid</code>.
            </p>
            <p className="muted small">
              <strong>uid do treino:</strong> <code>{mismatchHint.expectedUserId}</code>
              <br />
              <strong>seu uid (logado):</strong> <code>{mismatchHint.currentUid}</code>
            </p>
            <p className="muted small">
              Isso acontece quando o atleta troca de método de login e cria outra
              conta (uid diferente). A correção é <strong>vincular</strong> as
              credenciais (Google ↔ e-mail/senha) para manter o mesmo uid, ou
              recriar/reatribuir os treinos para o uid atual.
            </p>
          </div>
        )}
        {isPerm && !mismatchHint && (
          <p className="muted small">
            Dica: confirme que as regras do Firestore foram publicadas e que o
            treino tem <code>userId</code> igual ao seu <code>auth.uid</code>.
          </p>
        )}
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
    setErrCode(null)
    try {
      await upsertCompletion({
        trainingId: tr.id,
        userId: user.uid,
        completed: next,
        mediaUrls,
        athleteNotes: athleteNotes.trim() ? athleteNotes : null,
        displayName: profile?.displayName ?? '',
      })
      setCompleted(next)
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as any).code) : null
      setErrCode(code)
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
    setErrCode(null)
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
        userId: user.uid,
        completed,
        mediaUrls: urls,
        athleteNotes: athleteNotes.trim() ? athleteNotes : null,
        displayName: profile?.displayName ?? '',
      })
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as any).code) : null
      setErrCode(code)
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
      userId: user?.uid ?? tr.userId,
      completed,
      mediaUrls: urls,
      athleteNotes: athleteNotes.trim() ? athleteNotes : null,
      displayName: profile?.displayName ?? '',
    })
  }

  async function saveNotes(next: string) {
    if (!isOwner || !canToggle || !user) return
    setBusy(true)
    setErr(null)
    setErrCode(null)
    try {
      await upsertCompletion({
        trainingId: tr.id,
        userId: user.uid,
        completed,
        mediaUrls,
        athleteNotes: next.trim() ? next : null,
        displayName: profile?.displayName ?? '',
      })
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as any).code) : null
      setErrCode(code)
      setErr(e instanceof Error ? e.message : 'Erro ao salvar observações')
    } finally {
      setBusy(false)
    }
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
          {errCode ? `${err} (${errCode})` : err}
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
          <div className="toggle-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={completed}
                disabled={busy || !canToggle}
                onChange={(e) => onToggle(e.target.checked)}
              />
              <span className="toggle-track" aria-hidden>
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-label">
                {completed ? 'Treino realizado' : 'Marcar como realizado'}
              </span>
            </label>
            {completed && (
              <span className="pill pill-done" aria-label="Pontuação do dia">
                {mediaUrls.length > 0 ? '+10' : '+5'}
              </span>
            )}
          </div>
        )}

        {errCode === 'permission-denied' && (
          <p className="muted small">
            <strong>Debug:</strong>{' '}
            <span className="mono">
              auth.uid={user?.uid ?? 'null'} · profile.uid={profile?.uid ?? 'null'} · training.userId=
              {tr.userId}
            </span>
          </p>
        )}

        {isOwner && canToggle && (
          <div className="stack">
            <div className="stack">
              <div className="muted small">Observações do atleta</div>
              <textarea
                className="input"
                rows={4}
                placeholder="Ex.: percepção de esforço, dores, lesões, ajustes, observações importantes…"
                value={athleteNotes}
                disabled={busy}
                onChange={(e) => setAthleteNotes(e.target.value)}
                onBlur={() => void saveNotes(athleteNotes)}
              />
              <div className="muted small">
                Salvamos automaticamente quando você sai do campo.
              </div>
            </div>

            <div className="upload-row">
              <div>
                <div className="muted small">Evidência (foto/vídeo)</div>
                <div className="muted small">
                  {mediaUrls.length > 0
                    ? `${mediaUrls.length} arquivo(s) anexado(s)`
                    : 'Nenhum arquivo ainda.'}
                </div>
              </div>
              <label className={busy ? 'upload-btn upload-btn--disabled' : 'upload-btn'}>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  disabled={busy}
                  onChange={onFiles}
                />
                Anexar mídia
              </label>
            </div>
            {mediaUrls.length > 0 && (
              <div className="training-media-grid" aria-label="Prévia das mídias anexadas">
                {mediaUrls.map((u) => {
                  const lower = u.toLowerCase()
                  const isImg =
                    lower.includes('.jpg') ||
                    lower.includes('.jpeg') ||
                    lower.includes('.png') ||
                    lower.includes('.webp') ||
                    lower.includes('.gif')
                  const isVid =
                    lower.includes('.mp4') ||
                    lower.includes('.webm') ||
                    lower.includes('.mov') ||
                    lower.includes('.m4v')
                  return (
                    <div key={u} className="training-media-item">
                      {isImg ? (
                        <img
                          className="training-media-preview"
                          src={u}
                          alt="Mídia anexada"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : isVid ? (
                        <video
                          className="training-media-preview"
                          src={u}
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <div className="training-media-fallback">
                          <span className="pill pill-soft pill-tiny">Mídia</span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="training-media-remove"
                        onClick={() => removeMedia(u)}
                        aria-label="Remover mídia"
                      >
                        Remover
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {isManagement && !isOwner && (
          <div className="stack small">
            <p>
              Status:{' '}
              <strong>{completed ? 'Realizado' : 'Pendente'}</strong>
            </p>
            {athleteNotes.trim() && (
              <div className="card stack">
                <h4 style={{ margin: 0 }}>Observações do atleta</h4>
                <p className="muted small" style={{ margin: 0 }}>
                  {athleteNotes}
                </p>
              </div>
            )}
            {mediaUrls.length > 0 && (
              <div className="training-media-grid" aria-label="Prévia das mídias anexadas">
                {mediaUrls.map((u) => {
                  const lower = u.toLowerCase()
                  const isImg =
                    lower.includes('.jpg') ||
                    lower.includes('.jpeg') ||
                    lower.includes('.png') ||
                    lower.includes('.webp') ||
                    lower.includes('.gif')
                  const isVid =
                    lower.includes('.mp4') ||
                    lower.includes('.webm') ||
                    lower.includes('.mov') ||
                    lower.includes('.m4v')
                  return (
                    <a
                      key={u}
                      className="training-media-item"
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Abrir mídia em nova aba"
                    >
                      {isImg ? (
                        <img
                          className="training-media-preview"
                          src={u}
                          alt="Mídia anexada"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : isVid ? (
                        <video
                          className="training-media-preview"
                          src={u}
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <div className="training-media-fallback">
                          <span className="pill pill-soft pill-tiny">Mídia</span>
                        </div>
                      )}
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
