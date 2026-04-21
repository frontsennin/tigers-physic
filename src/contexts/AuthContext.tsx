import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDb, getFirebaseAuth } from '../lib/firebase'
import { getProfile } from '../services/db'
import type { UserProfile, UserRole } from '../types/models'
import { isManagementRole, normalizeUserRole } from '../types/models'

type AuthState = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
}

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  isManagement: boolean
  isPreparador: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Normaliza telefone para comparar com `user.phoneNumber` (E.164). */
function normalizePhoneE164(raw: string | undefined | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim().replace(/\s/g, '')
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  return `+${digits}`
}

function prefersGoogleRedirect(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )
}

async function fetchProfile(uid: string): Promise<UserProfile | null> {
  return getProfile(uid)
}

async function ensureProfile(
  user: User,
  displayName: string,
): Promise<UserProfile> {
  const ref = doc(getDb(), 'profiles', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const d = snap.data() as Omit<UserProfile, 'uid'>
    return { uid: user.uid, ...d, role: normalizeUserRole(d.role) }
  }

  const bootstrapEmail = (
    import.meta.env.VITE_BOOTSTRAP_ADMIN_EMAIL as string | undefined
  )
    ?.trim()
    .toLowerCase()
  const bootstrapPhone = normalizePhoneE164(
    import.meta.env.VITE_BOOTSTRAP_ADMIN_PHONE as string | undefined,
  )
  const email = user.email?.trim().toLowerCase() ?? ''
  const phone = user.phoneNumber ?? ''
  const role: UserRole =
    (bootstrapEmail && email && email === bootstrapEmail) ||
    (bootstrapPhone && phone && phone === bootstrapPhone)
      ? 'admin'
      : 'jogador'

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email ?? '',
    displayName:
      displayName ||
      user.displayName ||
      user.email?.split('@')[0] ||
      user.phoneNumber ||
      'Atleta',
    role,
    sectors: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await setDoc(ref, {
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    sectors: profile.sectors,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return { ...profile, createdAt: Date.now(), updatedAt: Date.now() }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async (u: User) => {
    const p = await fetchProfile(u.uid)
    if (p) {
      setProfile(p)
      return
    }
    const created = await ensureProfile(
      u,
      u.displayName || u.email?.split('@')[0] || '',
    )
    setProfile(created)
  }, [])

  useEffect(() => {
    const auth = getFirebaseAuth()
    let active = true
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!active) return
      setError(null)
      setUser(u)
      if (u) {
        try {
          await loadProfile(u)
        } catch (e) {
          console.error(e)
          setError(e instanceof Error ? e.message : 'Erro ao carregar perfil.')
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    // Processa o retorno do redirect em paralelo, mas sem bloquear o listener.
    void (async () => {
      try {
        const cred = await Promise.race([
          getRedirectResult(auth),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ])
        if (!active || !cred?.user) return
        setError(null)
        setUser(cred.user)
        try {
          await loadProfile(cred.user)
        } catch (e) {
          console.error(e)
          setError(e instanceof Error ? e.message : 'Erro ao carregar perfil.')
          setProfile(null)
        }
        setLoading(false)
      } catch {
        // Sem redirect pendente ou ambiente não suportado — ignorar.
      }
    })()

    return () => {
      active = false
      unsub()
    }
  }, [loadProfile])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
  }, [])

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      setError(null)
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password,
      )
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() })
      }
      await ensureProfile(cred.user, displayName.trim())
      await loadProfile(cred.user)
    },
    [loadProfile],
  )

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    const auth = getFirebaseAuth()
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    if (prefersGoogleRedirect()) {
      await signInWithRedirect(auth, provider)
      return
    }
    try {
      const cred = await signInWithPopup(auth, provider)
      // Em alguns ambientes o onAuthStateChanged pode demorar/não refletir;
      // garantimos a atualização do estado logo após o popup.
      setUser(cred.user)
      try {
        await loadProfile(cred.user)
      } catch (e) {
        console.error(e)
        setError(e instanceof Error ? e.message : 'Erro ao carregar perfil.')
        setProfile(null)
      }
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as any).code) : ''
      // Em alguns browsers/hosts (ou com blockers), popup falha.
      // Redirect é o fluxo mais compatível — tentamos como fallback.
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/unauthorized-domain'
      ) {
        await signInWithRedirect(auth, provider)
        return
      }
      throw e
    }
  }, [loadProfile])

  const logout = useCallback(async () => {
    setError(null)
    await signOut(getFirebaseAuth())
  }, [])

  const refreshProfile = useCallback(async () => {
    const u = getFirebaseAuth().currentUser
    if (!u) return
    const p = await fetchProfile(u.uid)
    setProfile(p)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      error,
      login,
      register,
      signInWithGoogle,
      logout,
      refreshProfile,
      isManagement: profile ? isManagementRole(profile.role) : false,
      isPreparador: profile?.role === 'preparador',
    }),
    [
      user,
      profile,
      loading,
      error,
      login,
      register,
      signInWithGoogle,
      logout,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora de AuthProvider')
  return ctx
}
