import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getFirebaseAuth } from '../lib/firebase'
import { updateUserMetrics } from '../services/db'

export function ProfilePage() {
  const { profile, user, refreshProfile, isPreparador } = useAuth()
  if (!profile) return null

  const authUser = user ?? getFirebaseAuth().currentUser
  const providerIds = authUser?.providerData?.map((p) => p.providerId) ?? []
  const hasPassword = providerIds.includes('password')
  const hasGoogle = providerIds.includes('google.com')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')

  const [metricsBusy, setMetricsBusy] = useState(false)
  const [heightCm, setHeightCm] = useState(profile.heightCm?.toString() ?? '')
  const [weightKg, setWeightKg] = useState(profile.weightKg?.toString() ?? '')
  const [bodyFatPct, setBodyFatPct] = useState(
    profile.bodyFatPct?.toString() ?? '',
  )
  const [leanMassKg, setLeanMassKg] = useState(
    profile.leanMassKg?.toString() ?? '',
  )
  const [avgSpeed, setAvgSpeed] = useState(profile.avgSpeed?.toString() ?? '')
  const [maxSpeed, setMaxSpeed] = useState(profile.maxSpeed?.toString() ?? '')
  const [targetWeightKg, setTargetWeightKg] = useState(
    profile.targetWeightKg?.toString() ?? '',
  )
  const [targetBodyFatPct, setTargetBodyFatPct] = useState(
    profile.targetBodyFatPct?.toString() ?? '',
  )
  const [targetLeanMassKg, setTargetLeanMassKg] = useState(
    profile.targetLeanMassKg?.toString() ?? '',
  )

  const prefersRedirect =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )

  function setSuccess(message: string) {
    setOk(message)
    setErr(null)
  }

  function setFailure(message: string) {
    setErr(message)
    setOk(null)
  }

  async function onLinkGoogle() {
    if (!authUser) {
      setFailure('Sessão não encontrada. Recarregue a página e tente novamente.')
      return
    }
    setErr(null)
    setOk(null)
    setBusy(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })

      if (prefersRedirect) {
        await linkWithRedirect(authUser, provider)
        return
      }

      try {
        await linkWithPopup(authUser, provider)
      } catch (e) {
        const code =
          e && typeof e === 'object' && 'code' in e ? String((e as any).code) : ''
        if (
          code === 'auth/popup-blocked' ||
          code === 'auth/popup-closed-by-user' ||
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/unauthorized-domain'
        ) {
          await linkWithRedirect(authUser, provider)
          return
        }
        throw e
      }

      setSuccess('Google vinculado com sucesso.')
      await refreshProfile()
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as any).code) : ''
      if (code === 'auth/credential-already-in-use') {
        setFailure('Este Google já está vinculado a outra conta.')
      } else if (code === 'auth/provider-already-linked') {
        setFailure('Google já está vinculado nesta conta.')
      } else if (code === 'auth/unauthorized-domain') {
        setFailure(
          'Domínio não autorizado no Firebase. Adicione o domínio do Vercel em Authentication → Settings → Authorized domains.',
        )
      } else if (e instanceof Error) {
        setFailure(e.message)
      } else {
        setFailure('Não foi possível vincular o Google.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault()
    if (!authUser) {
      setFailure('Sessão não encontrada. Recarregue a página e tente novamente.')
      return
    }
    if (!authUser.email) {
      setFailure('Esta conta não possui e-mail. Troca de senha indisponível.')
      return
    }
    if (newPassword.trim().length < 6) {
      setFailure('A senha nova precisa ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== newPassword2) {
      setFailure('A confirmação da senha nova não confere.')
      return
    }
    setErr(null)
    setOk(null)
    setBusy(true)
    try {
      const cred = EmailAuthProvider.credential(
        authUser.email,
        currentPassword,
      )
      await reauthenticateWithCredential(authUser, cred)
      await updatePassword(authUser, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setNewPassword2('')
      setSuccess('Senha atualizada com sucesso.')
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as any).code) : ''
      if (code === 'auth/wrong-password') {
        setFailure('Senha atual incorreta.')
      } else if (code === 'auth/too-many-requests') {
        setFailure('Muitas tentativas. Aguarde um pouco e tente novamente.')
      } else if (code === 'auth/requires-recent-login') {
        setFailure('Por segurança, faça login novamente e tente de novo.')
      } else if (e instanceof Error) {
        setFailure(e.message)
      } else {
        setFailure('Não foi possível atualizar a senha.')
      }
    } finally {
      setBusy(false)
    }
  }

  const parseNumOrNull = (s: string): number | null => {
    const t = s.trim().replace(',', '.')
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }

  async function onSaveMetrics(e: FormEvent) {
    e.preventDefault()
    if (!profile?.uid) return
    setErr(null)
    setOk(null)
    setMetricsBusy(true)
    try {
      await updateUserMetrics(profile.uid, {
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
      await refreshProfile()
      setSuccess('Informações físicas atualizadas.')
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Erro ao salvar informações.')
    } finally {
      setMetricsBusy(false)
    }
  }

  return (
    <div className="page-padding stack-lg">
      <h2>Perfil</h2>
      <div className="card stack">
        <p>
          <strong>Nome:</strong> {profile.displayName}
        </p>
        <p>
          <strong>E-mail:</strong> {profile.email}
        </p>
        <p>
          <strong>Cargo:</strong> {roleLabel(profile.role)}
        </p>
        <div>
          <strong>Setores:</strong>{' '}
          {profile.sectors?.length ? (
            <span>{profile.sectors.join(', ')}</span>
          ) : (
            <span className="muted">nenhum setor definido</span>
          )}
        </div>
        <p className="muted small">
          Admin altera cargos. Admin e preparador ajustam setores dos jogadores
          na ficha do atleta.
        </p>
      </div>

      <form className="card stack" onSubmit={onSaveMetrics}>
        <h3>Informações físicas</h3>
        <div className="two-col">
          <label className="field">
            <span>Altura (cm)</span>
            <input
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="Ex.: 178"
              disabled={metricsBusy}
            />
          </label>
          <label className="field">
            <span>Peso (kg)</span>
            <input
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Ex.: 84.5"
              disabled={metricsBusy}
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
              placeholder="Ex.: 15"
              disabled={metricsBusy}
            />
          </label>
          <label className="field">
            <span>Massa magra (kg)</span>
            <input
              inputMode="decimal"
              value={leanMassKg}
              onChange={(e) => setLeanMassKg(e.target.value)}
              placeholder="Ex.: 72"
              disabled={metricsBusy}
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
              placeholder="Ex.: 6.4"
              disabled={metricsBusy}
            />
          </label>
          <label className="field">
            <span>Velocidade máxima (m/s)</span>
            <input
              inputMode="decimal"
              value={maxSpeed}
              onChange={(e) => setMaxSpeed(e.target.value)}
              placeholder="Ex.: 8.2"
              disabled={metricsBusy}
            />
          </label>
        </div>

        <div className="auth-divider" aria-hidden>
          Objetivos (preparador)
        </div>

        <div className="two-col">
          <label className="field">
            <span>Peso objetivo (kg)</span>
            <input
              inputMode="decimal"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
              placeholder="Ex.: 82"
              disabled={metricsBusy || !isPreparador}
            />
          </label>
          <label className="field">
            <span>BF objetivo (%)</span>
            <input
              inputMode="decimal"
              value={targetBodyFatPct}
              onChange={(e) => setTargetBodyFatPct(e.target.value)}
              placeholder="Ex.: 12"
              disabled={metricsBusy || !isPreparador}
            />
          </label>
        </div>
        <label className="field">
          <span>Massa magra objetivo (kg)</span>
          <input
            inputMode="decimal"
            value={targetLeanMassKg}
            onChange={(e) => setTargetLeanMassKg(e.target.value)}
            placeholder="Ex.: 74"
            disabled={metricsBusy || !isPreparador}
          />
        </label>
        {!isPreparador && (
          <p className="muted small">
            Objetivos podem ser definidos apenas pelo <strong>preparador</strong>, mas
            ficam visíveis aqui para você acompanhar.
          </p>
        )}

        <button className="btn-primary" type="submit" disabled={metricsBusy}>
          {metricsBusy ? 'Salvando…' : 'Salvar informações físicas'}
        </button>
      </form>

      <div className="card stack">
        <h3>Segurança</h3>

        <p className="muted small">
          <strong>Métodos de login:</strong>{' '}
          {[
            hasGoogle ? 'Google' : null,
            hasPassword ? 'E-mail e senha' : null,
          ]
            .filter(Boolean)
            .join(' · ') || '—'}
        </p>

        {!hasGoogle && (
          <button
            type="button"
            className="btn-google"
            disabled={busy}
            onClick={() => void onLinkGoogle()}
          >
            <GoogleGlyph />
            {busy ? 'Aguarde…' : 'Vincular Google'}
          </button>
        )}

        {hasPassword && (
          <form className="stack" onSubmit={onChangePassword}>
            <div className="auth-divider" aria-hidden>
              Trocar senha
            </div>
            <label className="field">
              <span>Senha atual</span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(x) => setCurrentPassword(x.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Nova senha</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(x) => setNewPassword(x.target.value)}
                minLength={6}
                required
              />
            </label>
            <label className="field">
              <span>Confirmar nova senha</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword2}
                onChange={(x) => setNewPassword2(x.target.value)}
                minLength={6}
                required
              />
            </label>
            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? 'Salvando…' : 'Atualizar senha'}
            </button>
          </form>
        )}

        {!hasPassword && (
          <p className="muted small">
            Troca de senha disponível apenas para contas que usam{' '}
            <strong>e-mail e senha</strong>.
          </p>
        )}

        {(err || ok) && (
          <p
            className={err ? 'error-text' : 'muted small'}
            role={err ? 'alert' : undefined}
          >
            {err ?? ok}
          </p>
        )}
      </div>
    </div>
  )
}

function roleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Administrador'
    case 'coordenador':
      return 'Coordenador'
    case 'preparador':
      return 'Preparador físico'
    case 'jogador':
      return 'Jogador'
    default:
      return role
  }
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}
