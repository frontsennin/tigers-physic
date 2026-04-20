# Autenticação e papéis

## Fluxo

1. Firebase **Authentication**: e-mail/senha, **Google** (popup no desktop; redirect no browser de telemóvel) e **telefone** (SMS + reCAPTCHA invisível na página de login).
2. Documento em **`profiles/{uid}`** é a fonte de verdade do **papel** e dados de perfil.
3. `AuthContext` (`src/contexts/AuthContext.tsx`):
   - `onAuthStateChanged` → carrega perfil com `getProfile`.
   - Se não existir perfil, `ensureProfile` cria um (papel jogador ou admin bootstrap).
4. `isManagement` = `admin | coordenador | preparador`.
5. `isPreparador` = papel exatamente `preparador` (após normalização).

## Normalização de papel (`normalizeUserRole`)

Definido em `src/types/models.ts`, aplicado em `getProfile`, `listProfiles` e no retorno de `ensureProfile` quando o documento já existe.

- Strings em minúsculas; sinónimos `atleta`, `player`, `athlete` → `jogador`.
- Papéis de gestão reconhecidos vêm da lista `MANAGEMENT_ROLES`.
- Valor desconhecido cai em **`jogador`** por defeito (ajustar se quiseres ser mais restritivo).

## UI vs. regras Firestore

| Conceito | App (React Router) | Firestore rules |
|----------|-------------------|-----------------|
| Área de gestão | `ManagementRoute` — só `isManagementRole` | `isManagement()`, `isPreparador()`, etc. |
| Ler treinos/análises de outro | Rotas + verificações nas páginas | `userId == auth.uid` ou gestão |
| Criar análise / treino | Preparador na UI | `create` exige `isPreparador()` e `createdBy == auth.uid` |

A app **não substitui** as regras: qualquer buraco na UI continua protegido pelo servidor.

## Menu «Análises» (`showAnalysesInOwnNav`)

- **Visível** para todos os papéis **exceto** `preparador` (o preparador vê análises na ficha `/atletas/:uid`).
- Implementação: `profile.role !== 'preparador'` centralizada em `showAnalysesInOwnNav` em `models.ts`.

## Perfil e promoção de papéis

- Jogador pode editar campos permitidos em `firestore.rules` no próprio `profiles/{uid}` (sem mudar `role`/`email` fora das regras).
- Admin / fluxos de gestão para mudar `role` de terceiros: ver regras em `profiles` e UI em `ProfilePage` / `PlayerDetailPage` conforme evolução do produto.
