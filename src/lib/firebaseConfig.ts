/** Retorna true se as variáveis mínimas do Firebase estiverem definidas */
export function isFirebaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_FIREBASE_API_KEY)
}
