export function SetupEnvPage() {
  return (
    <div className="setup-page">
      <h1>Tigers Physic</h1>
      <p className="muted">
        Crie um arquivo <code>.env</code> na raiz do projeto com as chaves do
        Firebase (Console do projeto → Configuração do SDK da Web).
      </p>
      <pre className="code-block">
        {`VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Opcional: primeiro acesso com admin automático
# VITE_BOOTSTRAP_ADMIN_EMAIL=seu@email.com`}
      </pre>
      <p className="muted small">
        Ative Email/senha em Authentication e crie o banco Firestore. Depois
        publique as regras em <code>firestore.rules</code> e{' '}
        <code>storage.rules</code>.
      </p>
    </div>
  )
}
