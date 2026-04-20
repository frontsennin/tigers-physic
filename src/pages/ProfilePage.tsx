import { useAuth } from '../contexts/AuthContext'

export function ProfilePage() {
  const { profile } = useAuth()
  if (!profile) return null

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
