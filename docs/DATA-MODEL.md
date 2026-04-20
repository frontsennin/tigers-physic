# Modelo de dados (Firestore + Storage)

Convenção: timestamps no Firestore como `serverTimestamp()` ou `Timestamp`; o código converte para `number` (ms) em `mapTrainingDoc` / leituras.

## Coleção `profiles/{uid}`

| Campo | Tipo | Notas |
|-------|------|--------|
| `email` | string | |
| `displayName` | string | |
| `role` | string | Valores esperados: `admin`, `coordenador`, `preparador`, `jogador`. Na leitura, `normalizeUserRole` corrige sinónimos (`atleta`, etc.). |
| `sectors` | array | Setores do atleta: `QB`, `DL`, `OL`, `WR`, `RB` |
| `createdAt`, `updatedAt` | timestamp | |

## Coleção `analyses/{id}`

| Campo | Tipo | Notas |
|-------|------|--------|
| `userId` | string | Atleta analisado |
| `category` | string | Uma de `ANALYSIS_CATEGORIES` em `models.ts` |
| `measureKind` | string | `time`, `weight`, `distance`, `reps`, `score`, `custom` |
| `valueNumber` | number | Opcional |
| `valueText`, `unit`, `protocol`, `notes` | string | Opcionais |
| `createdBy` | string | `uid` do preparador que registou |
| `createdAt` | timestamp | |

**Leitura:** `listAnalysesForUser(userId)` — query só com `where('userId', '==', userId)`; ordenação `createdAt` descendente feita **em memória** após o `getDocs` (evita índice composto obrigatório).

**Escrita:** apenas preparador (`addAnalysis`), alinhado com `firestore.rules`.

## Coleção `trainings/{id}`

| Campo | Tipo | Notas |
|-------|------|--------|
| `userId` | string | Atleta |
| `title` | string | Nome do exercício / treino |
| `description` | string | Texto longo (inclui descrição composta da prescrição) |
| `linkedCategories` | array de strings | Categorias de análise ligadas ao foco |
| `scheduledAt` | number ou timestamp | Legado / fallback de calendário |
| `weekday`, `dateKey` | número / string | Redundância para filtros |
| `trainingWeekdays` | array de inteiros 0–6 | Dias em que o atleta deve treinar (0=domingo … 6=sábado) |
| `createdBy` | string | Preparador |
| `createdAt` | timestamp | |
| `presetId` | string | Opcional — id do preset do catálogo |
| `prescription` | map | Opcional — ver tipo `TrainingPrescription` em `models.ts` (modo, séries, reps, carga, dias sugeridos, descanso, RPE, equipamento, notas) |

**Importante:** não gravar chaves com valor `undefined` dentro de `prescription` (o `addTraining` passa o payload por `omitUndefinedDeep`).

## Coleção `trainingCompletions/{trainingId_userId}`

Documento id composto em código: `getCompletion` / `upsertCompletion`.

| Campo | Tipo | Notas |
|-------|------|--------|
| `trainingId`, `userId` | string | |
| `completed` | bool | |
| `completedAt` | timestamp ou null | |
| `mediaUrls` | array de strings | URLs do Storage |
| `updatedAt` | timestamp | |

## Storage

- Caminho: `evidence/{userId}/{trainingId}/{timestamp}_{nomeSeguro}`
- Regras: escrita só pelo próprio `userId`; leitura pelo dono ou gestão.

## Índices (`firestore.indexes.json`)

- Índice composto opcional em `analyses` para queries futuras com `orderBy('createdAt')` no servidor.
- `trainings` com `where('userId')` sem `orderBy` no Firestore na listagem atual — ordenação por `createdAt` no cliente em `listTrainingsForUser`.
