# Arquitetura

## Stack

- **React 19** + **TypeScript**
- **Vite 8** (build e dev server)
- **React Router 7** (rotas aninhadas)
- **Firebase 11**: Auth (e-mail/senha), Firestore, Storage
- **date-fns** (datas e dias da semana)

## Entrada da aplicação

- `src/main.tsx` — monta a raiz; se Firebase não estiver configurado, renderiza `SetupEnvPage`.
- `src/App.tsx` — `BrowserRouter`, `AuthProvider`, rotas.
- Envoltórios de layout:
  - `app-root` / `app-routes-shell` (`index.css`) — altura da viewport, scroll só no `<main>`, **menu inferior fixo**.

## Rotas (resumo)

| Caminho | Quem | Descrição |
|---------|------|------------|
| `/login` | Público (redireciona se já logado) | Login / cadastro |
| `/` | Autenticado | Dashboard |
| `/treinos` | Autenticado | Lista de treinos do utilizador logado |
| `/treinos/:id` | Dono ou gestão | Detalhe, prescrição, check e mídia |
| `/analises` | Autenticado | Análises onde `userId` = utilizador logado |
| `/perfil` | Autenticado | Perfil e setores |
| `/atletas` | Gestão | Lista de perfis |
| `/atletas/:uid` | Gestão | Detalhe do atleta: análises, treinos, metadados |

Guardas:

- `ProtectedRoute` — exige utilizador Firebase autenticado.
- `ManagementRoute` — exige `isManagementRole(profile.role)` (admin, coordenador, preparador).

## Pastas principais (`src/`)

| Pasta | Função |
|-------|--------|
| `components/` | Layout (`AppLayout`), rotas, UI reutilizável (`ExerciseSearchSelect`) |
| `contexts/` | `AuthContext` — sessão, perfil Firestore, helpers `isManagement`, `isPreparador` |
| `pages/` | Uma pasta por ecrã principal |
| `services/` | `db.ts` (Firestore), `storage.ts` (uploads) |
| `types/` | `models.ts` — tipos e helpers de papel (`normalizeUserRole`, `showAnalysesInOwnNav`) |
| `utils/` | Datas (`dates.ts`), texto de análises (`analysisDisplay.ts`) |
| `data/workoutCatalog/` | Catálogo de exercícios e helpers de prescrição |
| `lib/` | Inicialização Firebase |

## Serviços

- **`services/db.ts`**: leituras/escritas Firestore; usa `omitUndefinedDeep` antes de `addDoc`/`setDoc` onde aplicável (Firestore não aceita `undefined`).
- **`services/storage.ts`**: evidências de treino em `evidence/{userId}/{trainingId}/...`.

## Estilos

- `src/index.css` — tema escuro global, componentes (cards, pills, treinos, análises, navegação fixa).
