# Design

## Context

- O frontend tem só `__root.tsx` e `index.tsx` do template, TanStack Query integrado ao router com SSR, TanStack Form, shadcn (`button`, `input`, `label`...) e Vitest com jsdom. Os componentes usam `cn` do pacote `cn`.
- Já feito pela `add-backend-integration` (tarefas 1.1, 1.2 e 2.1): `openapi-fetch` e `openapi-typescript` instalados, `EDUCARE_API_URL` validado em `src/env.ts` (https obrigatório em produção, lido do `process.env` no servidor) e o script `npm run api:generate`, que lê `API_CONTRACT` (arquivo local) ou baixa o contrato do GitHub.
- O `openapi/educare-api.json` do backend ainda não existe: a change `add-frontend-integration` do `educare-backend` está em 4/15. Mas o profile `dev` do backend serve o contrato em `/v3/api-docs`, e o customizador que marca os campos de resposta como obrigatórios e o que declara o `401` já estão aplicados.
- API (spec `auth` do backend): `POST /api/v1/auth/login` com `{login, password}` → `200 {accessToken, tokenType, expiresIn: 28800}`; `401 ProblemDetail` igual para email inexistente e senha errada; `400 ProblemDetail` com `errors: [{field, message}]`. `GET /api/v1/auth/me` → `200` ou `401`.
- `@tanstack/react-start` 1.168 expõe `createServerFn` e, em `@tanstack/react-start/server`, `getCookie` / `setCookie` / `deleteCookie`. Há também `@tanstack/react-start/server-only`.

## Goals / Non-Goals

**Goals:**
- Login funcionando de ponta a ponta contra o backend local.
- Seguir as decisões D1, D2, D3, D5 e D9 da `add-backend-integration` (mesmos nomes de arquivo e de funções), para que ela continue em cima desta sem retrabalho.
- Lógica testável sem o runtime do Start.

**Non-Goals:**
- Middleware de função autenticada com redirect no `401` (D3 da outra change), `_authenticated`, `Cache-Control: no-store` e o script de verificação do bundle: ficam para a `add-backend-integration`.

## Decisions

### D1. BFF: server functions + cookie `httpOnly`
O navegador só chama server functions (`createServerFn`, método `POST`), e elas chamam a API. O JWT vai puro no cookie `educare_session` (o token não tem dados pessoais: só `sub`, `iat` e `exp`), gravado com `setCookie` dentro do handler. `secure` vem de `process.env.NODE_ENV === "production"`.

**Alternativa descartada:** token no `localStorage` com chamada direta à API. Fica exposto a XSS, exige CORS (o backend libera só `localhost:5173`, e o front roda na 3000) e esbarra em mixed content em produção.

### D2. Tipos gerados do backend local
Enquanto o backend não commita o contrato, os tipos vêm do backend rodando:
```fish
curl -sf http://localhost:8080/v3/api-docs -o /tmp/educare-api.json
API_CONTRACT=/tmp/educare-api.json npm run api:generate
```
O `src/integrations/educare-api/schema.gen.ts` é commitado (o build não depende do backend). O script não muda; quando o contrato do backend existir, basta rodar `npm run api:generate` sem `API_CONTRACT`. Isso fica no README.

**Alternativa descartada:** escrever os tipos à mão. Divergem do backend sem que o `typecheck` perceba.

### D3. Cliente e erros
- `client.ts`: `createApiClient(token?)` com `openapi-fetch`, `baseUrl = env.EDUCARE_API_URL`, `Authorization: Bearer` só com token, `AbortSignal.timeout(10_000)` e log de método, caminho, status e duração (nunca corpo nem headers). Importa `@tanstack/react-start/server-only`, para que o build quebre se ele for parar no bundle do navegador.
- `errors.ts`: `toApiError(response, body)` e `ApiError` com `kind` `validation` (`400` com `errors` → `fieldErrors: Record<string, string>`), `unauthorized` (`401`), `unavailable` (`5xx`, corpo que não é `ProblemDetail`, falha de rede, timeout) e `unexpected` (outros status). Os outros tipos da D3 original (`forbidden`, `not-found`, `conflict`) entram quando alguma tela precisar.
- `messages.ts`: textos fixos da spec ("Email ou senha inválidos.", "Não foi possível falar com o servidor. Tente de novo em instantes.").

### D4. Server functions com lógica pura
`session.ts` define:
- `loginHandler({ api, cookies }, input)` → `{ ok: true }` ou `{ ok: false, kind: "invalid-credentials" | "validation" | "unavailable", message, fieldErrors? }`. Só grava o cookie no `200`. Nunca devolve o token.
- `sessionStatusHandler({ api, cookies })` → `"none"` (sem cookie, sem chamar a API), `"valid"` (`/auth/me` `200`), `"rejected"` (`401`, apaga o cookie) ou `"unknown"` (API fora; mantém o cookie e mostra o formulário).

As funções recebem `api` e `cookies` por parâmetro e são testadas com dublês. `login` e `getSessionStatus` (o `createServerFn`) só ligam essas funções ao `createApiClient`, ao `getCookie`/`setCookie`/`deleteCookie` e ao validador de entrada (o mesmo schema Zod do formulário, para não confiar no navegador).

`getSessionStatus` devolve um status, e não os dados do usuário: é tudo de que o login precisa. O `getCurrentUser` da outra change pode reaproveitar o mesmo handler.

### D5. Rota `/login`
`src/routes/login.tsx`:
- `validateSearch` com Zod: `redirect?: string` (valores não-string viram `undefined`);
- `beforeLoad` chama `getSessionStatus()`; com `"valid"`, lança `redirect({ href: safeRedirect(search.redirect) })`. Roda no SSR, então o formulário não aparece nem por um instante;
- `head` com o título "Entrar · Educare";
- componente `LoginForm` em `src/components/auth/login-form.tsx`.

Depois do login com sucesso: `router.invalidate()` e `navigate({ href: safeRedirect(redirect) })`.

### D6. Redirect seguro
`safeRedirect(value: unknown): string` em `src/integrations/educare-api/safe-redirect.ts`: devolve `value` se for string que começa com `/`, não começa com `//` nem `/\`, e cujo caminho (antes de `?` e `#`) não é `/login`; senão, `/`.

### D7. Formulário
TanStack Form com validadores Zod em `validation.ts`:
- `loginSchema`: email obrigatório (`trim`, até 254 caracteres; formato de email não é validado, como no backend);
- senha obrigatória, até 72 bytes (`new TextEncoder().encode(v).length`).

Erros da server function: `fieldErrors.login` vai para o campo "Email", `fieldErrors.password` para "Senha" (via `setFieldMeta` com `errorMap.onServer`); `invalid-credentials` e `unavailable` aparecem num `Alert` acima do formulário. Com `invalid-credentials`, a senha é limpa com `form.setFieldValue("password", "")`. O botão usa `form.state.isSubmitting` para ficar desabilitado.

Layout: `Card` centralizado, com o nome "Educare" e os campos com `Label` + `Input` (`type="email"`, `autoComplete="username"` e `type="password"`, `autoComplete="current-password"`). Componentes shadcn novos: `card` e `alert`. Se o `shadcn add` gerar import de `#/lib/utils`, troca-se por `cn` do pacote `cn`.

### D8. Testes
- Unitários: `safeRedirect`, `loginSchema` (vazio, 255 caracteres, 40 `ç`), `toApiError` (`400` com `errors`, `401`, `500` com HTML, falha de rede, timeout), `createApiClient` (header só com token, sem corpo no log) e os handlers da D4 (atributos do cookie em produção e em dev, nenhum cookie no `401`/`400`/indisponível, resposta sem o token, os quatro status da sessão).
- Componente (Testing Library): `LoginForm` com a server function simulada por `vi.mock`, cobrindo os cenários de interface da spec.
- Manual: com o backend local.

## Risks / Trade-offs

- [Tipos gerados do `/v3/api-docs` local podem divergir do contrato que o backend vai commitar] → regenerar com `npm run api:generate` quando o `openapi/educare-api.json` existir; o código do login depende só de `login`, `password`, `accessToken`, `expiresIn` e do status, que não vão mudar.
- [`/` continua pública, então o login leva a uma página sem proteção e sem logout] → aceito para esta etapa; a `add-backend-integration` adiciona a área autenticada. Para sair durante o desenvolvimento, apagar o cookie no DevTools.
- [Duas changes com requisitos de login] → a `add-backend-integration` precisa ser revisada antes de ser aplicada (ver proposal, Impact).
- [`beforeLoad` chamando `/auth/me` a cada abertura de `/login` com cookie] → é uma chamada pequena e só acontece com cookie presente.
- [API dos cookies e do `server-only` pode mudar entre versões do Start] → as versões do `@tanstack/*` estão fixas, e os handlers são testados sem o runtime.

## Migration Plan

Sem migração. Para desenvolver: no `educare-backend`, `docker compose up -d db` e `SPRING_DATASOURCE_PASSWORD=<senha> ./gradlew bootRun`; no front, `.env` com `EDUCARE_API_URL=http://localhost:8080` e `npm run dev`. Rollback: reverter o commit.
