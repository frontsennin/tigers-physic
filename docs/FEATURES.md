# Funcionalidades

## Dashboard (`/`)

- Saudação e tiles para **Treinos**, **Minhas análises** (se não for preparador), **Atletas** (gestão), **Perfil**.

## Treinos — atleta (`/treinos`)

- Lista treinos do utilizador logado com prescrição resumida, estado **Feito / A fazer** (lê `trainingCompletions`).
- Secções **Treino do dia** (hoje ∈ `trainingWeekdays`) e **Próximos treinos** agrupados por dia da semana; preferência de “próximo dia útil” na lógica de agrupamento quando há mistura semana útil / fim de semana.
- Cards de “hoje” com estilo destacado (CSS `training-schedule-section--today`, `training-row--today-highlight`).

## Treino — detalhe (`/treinos/:id`)

- Acesso: dono do treino (`userId`) ou gestão.
- Hero com título, dias, foco (categorias).
- Prescrição estruturada, descrição em texto, check **Marcar como realizado** segundo `canMarkTrainingFromPlan` (`src/utils/dates.ts`): com `trainingWeekdays`, só nos dias prescritos; senão regra por `scheduledAt`.
- Upload de fotos/vídeo para Storage e URLs em `trainingCompletions`.

## Análises — próprio utilizador (`/analises`)

- Lista `listAnalysesForUser(auth.uid)` com nome de quem registou (`getProfile` por `createdBy`).
- Não mostrar link na bottom nav para **preparador** (usa ficha do atleta).

## Atletas (`/atletas`, `/atletas/:uid`)

- Lista de perfis (`listProfiles`).
- Detalhe: metadados (gestão), **análises** (lista + formulário de nova análise para preparador), **treinos prescritos** (lista + formulário com catálogo de exercícios, dias da semana, prescrição, vínculo a categorias).

## Catálogo de exercícios

- `src/data/workoutCatalog/` — presets, `ExerciseSearchSelect`, `composeTrainingDescriptionForSave` para texto persistido em `description`.

## Perfil (`/perfil`)

- Dados do utilizador e setores (evolução conforme regras de negócio).
