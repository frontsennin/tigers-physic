import { type FormEvent, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function authErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = String((err as { code: string }).code)
    const map: Record<string, string> = {
      'auth/popup-closed-by-user':
        'A janela do Google foi fechada antes de concluir o login.',
      'auth/popup-blocked':
        'O bloqueador de pop-ups impediu o login. Vamos tentar outro método; se persistir, confira o domínio autorizado no Firebase.',
      'auth/cancelled-popup-request':
        'Pedido de login cancelado. Tente novamente.',
      'auth/account-exists-with-different-credential':
        'Já existe uma conta com este e-mail usando outro método de login.',
      'auth/unauthorized-domain':
        'Domínio não autorizado no Firebase Authentication. Adicione o domínio do Vercel em Authentication → Settings → Authorized domains.',
    }
    if (map[c]) return map[c]
  }
  if (err instanceof Error) return err.message
  return 'Não foi possível autenticar.'
}

export function LoginPage() {
  const { user, login, register, signInWithGoogle, error } = useAuth()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from ?? '/'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  if (user) {
    return <Navigate to={from} replace />
  }

  async function onGoogle() {
    setLocalErr(null)
    setGoogleBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setLocalErr(authErrorMessage(err))
    } finally {
      setGoogleBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalErr(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register(email.trim(), password, name.trim())
      }
    } catch (err) {
      setLocalErr(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img
            className="brand-mark brand-mark--lg"
            src="/tiggers.jpg"
            alt="Tigers"
            width={44}
            height={44}
            loading="eager"
            decoding="async"
          />
          <div>
            <h1>Tigers Physic</h1>
            <p className="muted small">Flag Football — preparação física</p>
          </div>
        </div>

        <div className="auth-oauth-row">
          <button
            type="button"
            className="btn-google"
            disabled={googleBusy || busy}
            onClick={() => void onGoogle()}
          >
            <GoogleGlyph />
            {googleBusy ? 'A abrir Google…' : 'Entrar com Google'}
          </button>
        </div>

        <div className="auth-divider" aria-hidden>
          ou e-mail
        </div>

        <div className="segmented">
          <button
            type="button"
            className={mode === 'login' ? 'seg seg--on' : 'seg'}
            onClick={() => setMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'seg seg--on' : 'seg'}
            onClick={() => setMode('register')}
          >
            Cadastro
          </button>
        </div>

        <form className="stack" onSubmit={onSubmit}>
          {mode === 'register' && (
            <label className="field">
              <span>Nome</span>
              <input
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como aparece no time"
              />
            </label>
          )}
          <label className="field">
            <span>E-mail</span>
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {(localErr || error) && (
            <p className="error-text" role="alert">
              {localErr || error}
            </p>
          )}

          <button className="btn-primary" type="submit" disabled={busy || googleBusy}>
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="muted small">
          Novos cadastros entram como <strong>Atleta</strong>. Peça a um admin
          para promover preparador/coordenador, ou defina{' '}
          <code>VITE_BOOTSTRAP_ADMIN_EMAIL</code> no ambiente.
        </p>
      </div>
    </div>
  )
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
