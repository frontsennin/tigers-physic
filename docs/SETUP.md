# Setup e ambiente

## Requisitos

- Node.js compatível com o `package.json` do projeto (LTS recente recomendado).
- Conta no [Firebase Console](https://console.firebase.google.com/) com projeto criado.

## Variáveis de ambiente

1. Copie `.env.example` para `.env` na raiz do projeto.
2. Preencha as chaves do SDK Web (**Configuração do projeto → Seus apps → SDK**):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

3. Opcional:
   - `VITE_BOOTSTRAP_ADMIN_EMAIL` — se o **primeiro** documento `profiles/{uid}` for criado para um utilizador com este e-mail (ignorando maiúsculas), o papel nasce como **admin** em vez de jogador.
   - `VITE_BOOTSTRAP_ADMIN_PHONE` — o mesmo para o **número em formato E.164** (ex.: `+351912345678`), útil quando o login é só por SMS (ver `AuthContext.ensureProfile`).

Sem `.env` válido, a app mostra a página de configuração (`SetupEnvPage`) em vez do app principal.

## Firebase — serviços a ativar

- **Authentication**: provedores **Google** e **E-mail/senha**, usados em `/login`.
  - Em **Authentication → Settings → Authorized domains**, inclua o domínio onde a app corre (ex.: `localhost` em desenvolvimento e o domínio de produção no Vercel/Netlify/etc.).
- **Firestore**: criar base de dados; publicar `firestore.rules` e `firestore.indexes.json` (ver secção Deploy).
- **Storage**: publicar `storage.rules`.

## Deploy no Vercel (SPA / React Router)

Este projeto usa `BrowserRouter` (histórico). Em produção, recarregar a página em rotas como `/login` precisa de **rewrite** para `index.html`.

- Já incluímos `vercel.json` com rewrite global para evitar 404 ao entrar direto em `/login` ou ao voltar do login do Google.

## Scripts npm

```bash
npm install    # dependências
npm run dev    # Vite dev server
npm run build  # tsc + build produção
npm run lint   # ESLint
npm run preview # pré-visualizar build
```

## Deploy de regras e índices (CLI Firebase)

Na raiz do projeto (onde estão `firebase.json`, `firestore.rules`, `storage.rules`):

```bash
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only storage
```

Ou use o link que o Firestore sugere quando uma query exige índice composto. O ficheiro `firestore.indexes.json` já inclui um índice opcional em `analyses` (`userId` + `createdAt`); a listagem atual em código ordena no cliente após `where('userId'==)`, por isso **não depende** desse índice para funcionar.

## Primeiro utilizador

- Cadastro em `/login` cria documento em `profiles/{uid}`.
- Papel padrão: **jogador**, salvo exceção do bootstrap admin acima.
- Promoção a preparador/coordenador/admin: hoje via alteração manual do documento `profiles` no Firestore ou extensão futura na UI (ver `ProfilePage` / gestão).
