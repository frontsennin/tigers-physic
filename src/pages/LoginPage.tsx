import { type FormEvent, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { user, login, register, error } = useAuth()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from ?? '/'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  if (user) {
    return <Navigate to={from} replace />
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
      setLocalErr(
        err instanceof Error ? err.message : 'Não foi possível autenticar.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark brand-mark--lg" />
          <div>
            <h1>Tigers Physic</h1>
            <p className="muted small">Flag Football — preparação física</p>
          </div>
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

          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="muted small">
          Novos cadastros entram como <strong>Atleta</strong>. Peça a um admin
          para promover preparador/coordenador, ou defina{' '}
          <code>VITE_BOOTSTRAP_ADMIN_EMAIL</code> igual ao seu e-mail.
        </p>
      </div>
    </div>
  )
}
