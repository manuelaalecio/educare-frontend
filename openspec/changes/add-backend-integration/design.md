# Design

## Context

- O projeto ainda é o template do TanStack Start 1.168: tem só `__root.tsx` e `index.tsx`, TanStack Query integrado ao router com SSR (`setupRouterSsrQueryIntegration`), TanStack Form instalado, shadcn com `button`, `input`, `label` etc., Vitest com jsdom e deploy na Vercel (preset `tanstack-start`, com o Nitro).
- `src/env.ts` usa `@t3-oss/env-core` com `runtimeEnv: import.meta.env`. Em tempo de execução no servidor da Vercel, as variáveis sem `VITE_` vêm de `process.env`, e não do `import.meta.env` resolvido no build.
- API do backend (specs `auth` e `security` do `educare-backend`):
  - `POST /api/v1/auth/login` devolve `{accessToken, tokenType, expiresIn: 28800}`;
  - `GET /api/v1/auth/me` devolve `{id, name, login, role, createdAt, updatedAt}`;
  - `PUT /api/v1/auth/me/password` devolve `204`;
  - erros em `ProblemDetail` (`errors: [{field, message}]` no `400`);
  - `401` para token ausente, inválido, expirado ou de usuário excluído, sem distinguir o motivo;
  - JWT de 8 h, sem refresh.
- O contrato com erros e campos obrigatórios vem da change `add-frontend-integration` do backend, em `openapi/educare-api.json` na `main` (repositório público).

## Goals / Non-Goals

**Goals:**
- Um único caminho até a API, reutilizável pelas próximas telas (crianças, responsáveis): server function → cliente tipado → erro tipado.
- Nenhum segredo nem dado da sessão acessível ao JavaScript do navegador.
- Proteção de rota já na renderização no servidor, sem "piscar" conteúdo protegido.

**Non-Goals:**
- Abstrair o cliente para outros backends ou para GraphQL.
- Guardar dados da API no servidor do frontend (cache compartilhado): o BFF é stateless, e o único estado é o cookie.

## Decisions

### D1. BFF com server functions e cookie `httpOnly`
As chamadas à API ficam em `createServerFn` (`@tanstack/react-start`), em `src/integrations/educare-api/`. O token é lido e gravado com `getCookie` / `setCookie` / `deleteCookie` de `@tanstack/react-start/server`, só dentro dos handlers. O cookie guarda o JWT puro: ele já não tem dados pessoais (só `sub`, `iat` e `exp`) e é `httpOnly`, então cifrar o cookie não traria ganho que justifique uma chave a mais (`SESSION_SECRET`) para gerenciar.

**Alternativas:**
- Token no `localStorage` com chamadas diretas do navegador: exposto a XSS, exige CORS e esbarra no mixed content enquanto a API não tem HTTPS.
- Sessão no servidor do frontend com store (Redis/KV): estado e infraestrutura extras sem necessidade, já que o JWT é o estado.

**CSRF:** as server functions são `POST` para a própria origem, e o cookie é `SameSite=Lax`, então outro site não consegue enviar o cookie num `POST`. Nenhuma server function muda estado por `GET`.

### D2. Cliente tipado com `openapi-fetch`
`createApiClient(token?: string)` cria um cliente `openapi-fetch` tipado pelo `paths` gerado, com `baseUrl = env.EDUCARE_API_URL`. Esse `fetch`:
- injeta `Authorization: Bearer <token>` quando há token;
- aplica `AbortSignal.timeout(10_000)`;
- registra no log só o método, o caminho do template (`/api/v1/auth/me`), o status e a duração, nunca o corpo nem os headers.

O módulo importa `@tanstack/react-start/server-only` (ou equivalente), para que o build falhe se ele for importado no bundle do navegador.

**Alternativas:** `fetch` puro com tipos à mão (os tipos divergem do backend); geradores de SDK completos (`orval`, `openapi-generator`), que trazem mais código gerado e dependências do que o necessário. `openapi-fetch` + `openapi-typescript` geram só tipos e um wrapper de ~6 kB.

### D3. Erros: `ApiError` no servidor, resultado serializável na interface
- O cliente converte respostas não-2xx em `ApiError`, com os tipos `validation` (`400` com `errors` → `fieldErrors: Record<string, string>`), `unauthorized`, `forbidden`, `not-found`, `conflict` e `unavailable` (`5xx`, corpo que não é `ProblemDetail`, falha de rede e timeout).
- **Formulários** (login, troca de senha): a server function captura o `ApiError` e devolve `{ ok: false, error: { kind, message, fieldErrors } }`, um objeto serializável e sem detalhes internos. O componente distribui `fieldErrors` nos campos do TanStack Form, com `setFieldMeta` / `errorMap.onServer`.
- **`401` fora do login**: um middleware de função (`createMiddleware({ type: "function" })`), aplicado a toda server function autenticada:
  1. lê o cookie e o passa como `context.token`;
  2. sem cookie, ou se a API responder `401`, apaga o cookie e lança `redirect({ to: "/login", search: { redirect, motivo: "sessao-expirada" } })`. O `redirect` vem do caminho atual, que a parte cliente do middleware envia por `sendContext` (no SSR, vem da URL da requisição).
  O router trata o `redirect` lançado tanto em loaders quanto em chamadas por `useServerFn`.
- As mensagens fixas da spec ("Não foi possível falar com o servidor...", "Você não tem permissão...") ficam num único módulo `messages.ts`.

### D4. Proteção de rotas com layout sem caminho `_authenticated`
- `src/routes/_authenticated.tsx`: `beforeLoad` chama `context.queryClient.ensureQueryData(currentUserQuery)`. A server function `getCurrentUser` devolve `null` sem cookie, sem chamar a API, e chama `GET /auth/me` com cookie. Com `null`, a rota lança `redirect({ to: "/login", search: { redirect: location.href } })`. O usuário vai para o contexto da rota e é lido pelo cabeçalho.
- `currentUserQuery` tem `staleTime` de 5 minutos: navegações internas não chamam `/auth/me` de novo, e um carregamento completo (SSR) sempre chama. Isso cumpre "a cada carregamento completo da página" sem uma chamada extra por clique.
- `src/routes/login.tsx`: `validateSearch` com Zod (`redirect?`, `motivo?`), e `beforeLoad` que leva a `/` quem já tem sessão.
- Todas as rotas protegidas ficam sob `_authenticated/`. Uma rota nova fora dessa pasta é pública, e isso fica registrado no CLAUDE.md.

### D5. Redirect seguro
A função pura `safeRedirect(value: unknown): string` aplica a regra da spec (começa com `/`, não começa com `//` nem com `/\`, não é `/login`, caso contrário `/`). Ela é usada no `navigate` pós-login e tem testes unitários com os casos de borda.

### D6. Logout e cache
A server function `logout` apaga o cookie. No cliente, depois dela: `queryClient.clear()`, `router.invalidate()` e `navigate({ to: "/login" })`. Para que o "voltar" não mostre a página do cache do navegador (bfcache), as respostas SSR das rotas protegidas recebem `Cache-Control: no-store` (`setResponseHeader` no middleware de requisição). Ao voltar, a página é recarregada e o `beforeLoad` redireciona.

### D7. Ambiente
`src/env.ts`:
- remove o `SERVER_URL`;
- adiciona `EDUCARE_API_URL: z.url()` com um `refine` que exige `https:` quando `process.env.NODE_ENV === "production"`;
- muda o `runtimeEnv` para `{ ...process.env, ...import.meta.env }` no servidor, para ler a variável da Vercel em tempo de execução.
O `.env.example` passa a ter `EDUCARE_API_URL=http://localhost:8080`. O `env-core` já impede o acesso a variáveis de servidor no navegador.

### D8. Geração de tipos
`scripts/generate-api-types.mjs`, chamado por `npm run api:generate`:
1. lê `API_CONTRACT` (caminho local) ou baixa `https://raw.githubusercontent.com/manuelaalecio/educare-backend/main/openapi/educare-api.json`;
2. gera com a API programática do `openapi-typescript` para um arquivo temporário;
3. só então substitui `src/integrations/educare-api/schema.gen.ts`.
Falha em qualquer passo → código de saída 1, sem tocar no arquivo. O arquivo gerado fica fora do Biome (`biome.json`) e é commitado, então o build da Vercel não depende da rede nem do GitHub.

### D9. Formulários e validação no cliente
TanStack Form com validadores Zod que espelham as regras do backend:
- email obrigatório, no máximo 254 caracteres;
- senha obrigatória, no máximo 72 bytes, contados com `new TextEncoder().encode(v).length`;
- nova senha com 8 a 72 caracteres e no máximo 72 bytes.
As regras ficam em `src/integrations/educare-api/validation.ts`, para reaproveitar no futuro CRUD de usuários. Componentes shadcn novos: `card`, `alert`, `form` (se compatível com o TanStack Form; senão, `label` + mensagem). A notificação "Senha alterada." usa `sonner`.

### D10. Testes
- Unitários (Vitest): `safeRedirect`, conversão de respostas em `ApiError` (com `fetch` simulado por `vi.fn`), validação do `env` (https em produção), validadores de formulário (bytes UTF-8) e o script de geração com um contrato inválido (não altera o arquivo).
- Componentes (Testing Library): `LoginForm` e `ChangePasswordForm`, com as server functions simuladas por `vi.mock`, cobrindo os cenários de interface da spec `auth`.
- Handlers das server functions: a lógica fica em funções puras que recebem as dependências (`api`, `cookies`), testadas sem o runtime do Start, e o `createServerFn` só faz a ligação.
- Verificação de build: um script `scripts/check-bundle.mjs`, chamado depois do `npm run build`, confere que `.output/public` não contém o valor de `EDUCARE_API_URL` usado no build nem a string `educare_session`.

## Risks / Trade-offs

- [Latência extra: navegador → Vercel → Oracle] → as chamadas são poucas e pequenas; a região da função na Vercel pode ser fixada perto da VM (`regions` no `vercel.json`) se a latência incomodar.
- [Middleware `sendContext` e `redirect` em server functions mudam entre versões do Start] → as versões do `@tanstack/*` ficam fixas no `package.json`, e os testes dos handlers não dependem do runtime.
- [Tipos desatualizados em relação ao backend] → `api:generate` é manual; o README e o CLAUDE.md pedem para rodá-lo a cada mudança no contrato do backend. Uma verificação automática no CI fica para a change de CI do frontend.
- [Cookie com JWT legível se vazar] → `HttpOnly` + `Secure` + validade de 8 h, e o JWT não tem dados pessoais. A revogação imediata depende do backend (exclusão de usuário já invalida o token).
- [Previews da Vercel apontando para a API de produção] → previews usam a mesma `EDUCARE_API_URL`, já que não há staging. Isso fica documentado no README como cuidado ao testar previews com dados reais.

## Migration Plan

1. Aplicar no backend a change `add-frontend-integration` (contrato + HTTPS).
2. Aplicar esta change e rodar `npm run api:generate`.
3. Na Vercel, configurar `EDUCARE_API_URL=https://<nome>.sslip.io` (Production e Preview) e fazer o deploy.
4. Rollback: reverter o deploy na Vercel. O backend não muda por causa do front.
