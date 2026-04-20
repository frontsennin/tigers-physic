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
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  isManagement: boolean
  isPreparador: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

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

  const bootstrap = (
    import.meta.env.VITE_BOOTSTRAP_ADMIN_EMAIL as string | undefined
  )
    ?.trim()
    .toLowerCase()
  const email = user.email?.trim().toLowerCase() ?? ''
  const role: UserRole =
    bootstrap && email && email === bootstrap ? 'admin' : 'jogador'

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: displayName || user.email?.split('@')[0] || 'Atleta',
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
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setError(null)
      setUser(u)
      if (u) {
        try {
          await loadProfile(u)
        } catch (e) {
          console.error(e)
          setError(
            e instanceof Error ? e.message : 'Erro ao carregar perfil.',
          )
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsub()
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
      logout,
      refreshProfile,
      isManagement: profile ? isManagementRole(profile.role) : false,
      isPreparador: profile?.role === 'preparador',
    }),
    [user, profile, loading, error, login, register, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora de AuthProvider')
  return ctx
}
