# Continuidade — guia para quem mexe no código

Use este ficheiro como **checklist** antes e depois de alterações.

## Antes de implementar

1. **Papel afetado?** — Ler [AUTH-AND-ROLES.md](./AUTH-AND-ROLES.md) e alinhar UI com `firestore.rules` / `storage.rules`.
2. **Novo campo no Firestore?** — Nunca gravar `undefined`. Usar padrão existente (`omitUndefinedDeep` em `db.ts`) ou omitir a chave.
3. **Nova query composta?** — Testar no emulador ou consola; se o Firestore pedir índice, adicionar a `firestore.indexes.json` e fazer deploy.

## Onde mexer por tema

| Tema | Ficheiros típicos |
|------|---------------------|
| Rotas / navegação inferior | `App.tsx`, `AppLayout.tsx`, `index.css` (`.app-shell`, `.bottom-nav`) |
| Sessão / perfil | `AuthContext.tsx`, `services/db.ts` (`getProfile`, `ensureProfile`) |
| Treinos (CRUD, lista) | `services/db.ts`, `pages/MyTrainingsPage.tsx`, `pages/TrainingDetailPage.tsx`, `utils/dates.ts` |
| Prescrição / catálogo | `data/workoutCatalog/*`, `PlayerDetailPage.tsx`, `types/models.ts` (`TrainingPrescription`) |
| Análises | `MyAnalysesPage.tsx`, `PlayerDetailPage.tsx`, `services/db.ts` (`listAnalysesForUser`, `addAnalysis`), `utils/analysisDisplay.ts` |
| Regras servidor | `firestore.rules`, `storage.rules`, `firestore.indexes.json` |

## Testes manuais sugeridos (smoke)

1. Login jogador → `/treinos`, `/analises`, check de treino num dia prescrito, upload de mídia.
2. Login preparador → `/atletas/:uid`, criar análise e treino; **não** deve ver «Análises» na bottom nav.
3. Login gestão → ver treino de atleta em `/treinos/:id` (só leitura/execução conforme regras).
4. `npm run build` sem erros de TypeScript.

## Erros já vistos no projeto

| Sintoma | Causa provável | Mitigação |
|---------|-----------------|-----------|
| `Unsupported field value: undefined` no Firestore | Objeto com chaves `undefined` | `omitUndefinedDeep` ou não incluir o campo |
| Índice composto pedido em `analyses` | Query antiga com `orderBy` + `where` | Listagem atual ordena no cliente; índice em JSON é opcional |
| `isAthleteRole is not defined` | HMR / ficheiro antigo | Garantir `showAnalysesInOwnNav` em `DashboardPage` e reiniciar `npm run dev` |
| Menu «Análises» não aparece | Papel `preparador` ou cache | Preparador é intencional; outros: hard refresh |

## Convenções de código (resumo)

- Preferir alterações **focadas** no pedido; não refatorar ficheiros não relacionados.
- Tipos partilhados em `types/models.ts`.
- Textos de análise / categorias: `utils/analysisDisplay.ts` + `ANALYSIS_CATEGORIES` no modelo.

## Deploy front-end

O repositório é uma SPA Vite: build gera `dist/`. Alojamento típico Firebase Hosting, Netlify, Vercel, etc. — configurar variáveis de ambiente de build com as mesmas chaves `VITE_*`.
