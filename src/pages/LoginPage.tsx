import { RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getFirebaseAuth } from '../lib/firebase'

function phoneToE164(input: string): string {
  const t = input.trim().replace(/\s/g, '')
  if (!t) return ''
  const digitsOnly = t.replace(/\D/g, '')
  if (!digitsOnly) return ''
  if (t.startsWith('+')) return `+${digitsOnly}`
  return `+${digitsOnly}`
}

function authErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = String((err as { code: string }).code)
    const map: Record<string, string> = {
      'auth/popup-closed-by-user':
        'A janela do Google foi fechada antes de concluir o login.',
      'auth/popup-blocked':
        'O bloqueador de pop-ups impediu o login. Permita pop-ups para este site ou use o SMS.',
      'auth/cancelled-popup-request':
        'Pedido de login cancelado. Tente novamente.',
      'auth/account-exists-with-different-credential':
        'Já existe uma conta com este e-mail usando outro método de login.',
      'auth/invalid-phone-number':
        'Número inválido. Use código do país, por exemplo +351 ou +55.',
      'auth/too-many-requests':
        'Demasiados pedidos. Aguarde alguns minutos e tente novamente.',
      'auth/invalid-verification-code': 'Código SMS incorreto.',
      'auth/code-expired': 'O código expirou. Peça um novo SMS.',
      'auth/missing-phone-number': 'Indique o número com código do país (+…).',
      'auth/quota-exceeded':
        'Limite de SMS atingido neste projeto. Contacte a equipa técnica.',
      'auth/captcha-check-failed':
        'Validação de segurança falhou. Recarregue a página e tente de novo.',
    }
    if (map[c]) return map[c]
  }
  if (err instanceof Error) return err.message
  return 'Não foi possível autenticar.'
}

export function LoginPage() {
  const {
    user,
    login,
    register,
    signInWithGoogle,
    sendPhoneVerificationCode,
    error,
  } = useAuth()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from ?? '/'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [phoneBusy, setPhoneBusy] = useState(false)
  const [phoneConfirmation, setPhoneConfirmation] =
    useState<ConfirmationResult | null>(null)
  const [localErr, setLocalErr] = useState<string | null>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)

  useEffect(() => {
    return () => {
      try {
        recaptchaVerifierRef.current?.clear()
      } catch {
        /* ignore */
      }
      recaptchaVerifierRef.current = null
    }
  }, [])

  function resetRecaptcha() {
    try {
      recaptchaVerifierRef.current?.clear()
    } catch {
      /* ignore */
    }
    recaptchaVerifierRef.current = null
  }

  function getOrCreateRecaptcha(): RecaptchaVerifier {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        getFirebaseAuth(),
        'phone-recaptcha',
        { size: 'invisible' },
      )
    }
    return recaptchaVerifierRef.current
  }

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
      setLocalErr(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
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

  async function onSendSms(e: FormEvent) {
    e.preventDefault()
    setLocalErr(null)
    const e164 = phoneToE164(phone)
    if (e164.length < 8) {
      setLocalErr('Indique o número completo com código do país (+…).')
      return
    }
    setPhoneBusy(true)
    try {
      const verifier = getOrCreateRecaptcha()
      const cr = await sendPhoneVerificationCode(e164, verifier)
      setPhoneConfirmation(cr)
      setSmsCode('')
    } catch (err) {
      resetRecaptcha()
      setLocalErr(authErrorMessage(err))
    } finally {
      setPhoneBusy(false)
    }
  }

  async function onConfirmSms(e: FormEvent) {
    e.preventDefault()
    if (!phoneConfirmation) return
    setLocalErr(null)
    setPhoneBusy(true)
    try {
      await phoneConfirmation.confirm(smsCode.trim())
    } catch (err) {
      setLocalErr(authErrorMessage(err))
    } finally {
      setPhoneBusy(false)
    }
  }

  function onPhoneBack() {
    setPhoneConfirmation(null)
    setSmsCode('')
    resetRecaptcha()
    setLocalErr(null)
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

        <div className="auth-oauth-row">
          <button
            type="button"
            className="btn-google"
            disabled={googleBusy || busy || phoneBusy}
            onClick={() => void onGoogle()}
          >
            <GoogleGlyph />
            {googleBusy ? 'A abrir Google…' : 'Continuar com Google'}
          </button>
        </div>

        <div className="auth-divider" aria-hidden>
          ou telemóvel (SMS)
        </div>

        <div id="phone-recaptcha" className="phone-recaptcha-host" />

        {!phoneConfirmation ? (
          <form className="stack" onSubmit={onSendSms}>
            <label className="field">
              <span>Telemóvel</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+351 912 345 678"
              />
            </label>
            <button
              className="btn-ghost"
              type="submit"
              disabled={phoneBusy || busy || googleBusy}
            >
              {phoneBusy ? 'A enviar…' : 'Enviar código por SMS'}
            </button>
          </form>
        ) : (
          <form className="stack" onSubmit={onConfirmSms}>
            <p className="muted small">
              Introduza o código de 6 dígitos enviado para{' '}
              <strong>{phoneToE164(phone)}</strong>.
            </p>
            <label className="field">
              <span>Código SMS</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
              />
            </label>
            <div className="btn-row">
              <button
                type="button"
                className="btn-ghost"
                onClick={onPhoneBack}
                disabled={phoneBusy}
              >
                Voltar
              </button>
              <button
                className="btn-primary"
                type="submit"
                disabled={phoneBusy || smsCode.trim().length < 6}
              >
                {phoneBusy ? 'A validar…' : 'Confirmar código'}
              </button>
            </div>
          </form>
        )}

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

          <button
            className="btn-primary"
            type="submit"
            disabled={busy || googleBusy || phoneBusy}
          >
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="muted small">
          Novos cadastros entram como <strong>Atleta</strong>. Peça a um admin
          para promover preparador/coordenador, ou defina{' '}
          <code>VITE_BOOTSTRAP_ADMIN_EMAIL</code> /{' '}
          <code>VITE_BOOTSTRAP_ADMIN_PHONE</code> no ambiente.
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
